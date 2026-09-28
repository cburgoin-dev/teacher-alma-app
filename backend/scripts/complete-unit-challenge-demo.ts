import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { UnitChallengeService } from '../src/modules/unit-challenges/unit-challenge.service.js';
import { PrismaUnitChallengeRepository } from '../src/modules/unit-challenges/unit-challenge.repository.js';
import { validateContent } from '../src/modules/unit-challenges/unit-challenge.content.js';

/** Development checks only: exercise the real service, never fabricate consolidated progress. */
export async function completeUnitChallengeDemo(prisma: PrismaClient, userId: string, challengeId: string) {
  const service = new UnitChallengeService(new PrismaUnitChallengeRepository(prisma));
  const opened = await service.start(challengeId, userId, randomUUID());
  const run = await prisma.unitChallengeRun.findUniqueOrThrow({ where: { id: opened.run.id },
    include: { phases: { orderBy: { position: 'asc' } } } });
  for (const p of run.phases.filter(p => !p.submittedAt)) {
    const phase = validateContent(p.type, p.contentSnapshot);
    const answer = phase.type === 'CONVERSATION'
      ? { choices: phase.config.steps.filter(s => s.kind === 'CHOICE').map(s => ({ stepId: s.id, optionId: s.correctOptionId })) }
      : { entries: phase.config.entries.map(e => ({ entryId: e.id, text: e.answer })) };
    await service.submit(challengeId, run.id, p.id, userId, randomUUID(), answer);
  }
}
