import 'dotenv/config';
import { applyDemoGamification, assertSupported, demoCommand, demoTarget } from './gamification-demo.js';
async function main() {
  const userId = demoTarget(process.env), command = demoCommand(process.argv.slice(2));
  assertSupported(command.action); // Fail before connecting for unsupported resets.
  const { prisma } = await import('../src/shared/prisma.js');
  try {
    const report = await prisma.$transaction(tx => applyDemoGamification(tx, userId, command), { isolationLevel: 'ReadCommitted', timeout: 15000 });
    console.log(JSON.stringify(report, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Demo tooling failed'); process.exitCode = 1; });
