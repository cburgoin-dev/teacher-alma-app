import 'dotenv/config';
import { prisma } from '../src/shared/prisma.js';
import { seedGamificationCatalog } from './gamification-catalog.js';

try {
  await seedGamificationCatalog(prisma);
  console.log('STREAK_PROTECTOR upserted (CONSUMABLE, 50 coins, maxOwned 2, active).');
} finally {
  await prisma.$disconnect();
}
