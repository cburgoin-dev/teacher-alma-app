import 'dotenv/config';
import { isDeepStrictEqual } from 'node:util';
import { diagnosticDemoData } from './diagnostic-demo-data.js';
import { demoId } from './courses-demo-data.js';
import { availableDiagnostic, usefulDestinations, validDefinition } from '../src/modules/diagnostics/diagnostic.availability.js';
import { DiagnosticSession, definitionInclude } from '../src/modules/diagnostics/diagnostic.repository.js';

async function main() {
  const action = process.argv[2];
  if (!['--apply', '--check', '--check-unavailable'].includes(action ?? '')) throw new Error('Use --apply, --check or --check-unavailable');
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (process.env.NODE_ENV !== 'development' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.port !== '5433' || url.pathname !== '/teacher_alma_dev') throw new Error('Requires local teacher_alma_dev:5433 in development');
  const { prisma } = await import('../src/shared/prisma.js');
  const data = diagnosticDemoData();
  try {
    if (action === '--apply') await prisma.$transaction(async tx => {
      await tx.$executeRaw`LOCK TABLE diagnostics, diagnostic_questions, activities, courses IN SHARE ROW EXCLUSIVE MODE`;
      const current = await tx.diagnostic.findMany({ where: { status: 'PUBLISHED' } });
      const previousDemos = [{ id: demoId(80000), version: 1, title: 'Descubre tu nivel (demo)' }, { id: demoId(81000), version: 2, title: 'Diagnóstico de nivel' }];
      if (current.some(d => d.id !== data.diagnostic.id && !previousDemos.some(old => d.id === old.id && d.version === old.version && d.title === old.title))) throw new Error('Another Diagnostic is published; demo seed will not replace it');
      const existing = await tx.diagnostic.findUnique({ where: { id: data.diagnostic.id } });
      if (existing && existing.status !== 'PUBLISHED') throw new Error('Demo version already exists but is not published; create a new authored version');
      if (!existing) {
        await tx.diagnostic.create({ data: data.diagnostic });
        await tx.activity.createMany({ data: data.activities });
        await tx.diagnosticQuestion.createMany({ data: data.questions });
        const definition = await tx.diagnostic.findUniqueOrThrow({ where: { id: data.diagnostic.id }, include: definitionInclude });
        const destinations = usefulDestinations(await new DiagnosticSession(tx).destinations());
        if (!validDefinition(definition, destinations)) throw new Error('Requires valid PUBLISHED A1 and A2 courses. Apply the Courses demo first.');
        // Preserve immutable previous versions and all attempts bound to them.
        await tx.diagnostic.updateMany({ where: { id: { in: previousDemos.map(d => d.id) }, status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } });
        await tx.diagnostic.update({ where: { id: data.diagnostic.id }, data: { status: 'PUBLISHED' } });
      }
    });
    const definition = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return availableDiagnostic(new DiagnosticSession(tx));
    }, { isolationLevel: 'RepeatableRead' });
    if (action === '--check-unavailable') {
      if (definition) throw new Error('Expected unavailable Diagnostic');
      console.log('Diagnostic unavailable as expected. No data changed.');
    } else {
      if (definition?.id !== data.diagnostic.id) throw new Error('Demo Diagnostic is unavailable or a different version is published');
      if (definition.diagnosticQuestions.length !== data.questions.length || definition.diagnosticQuestions.some((q, index) => {
        const expected = data.activities[index]!;
        return q.id !== data.questions[index]!.id || q.activity.prompt !== expected.prompt || !isDeepStrictEqual(q.activity.config, expected.config);
      })) throw new Error('Published demo does not match the expected acceptance content');
      console.log(JSON.stringify({ demoOnly: true, available: true, id: definition.id, version: definition.version,
        questionCount: definition.diagnosticQuestions.length, estimatedMinutes: definition.estimatedMinutes }));
    }
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Diagnostic demo failed'); process.exitCode = 1; });
