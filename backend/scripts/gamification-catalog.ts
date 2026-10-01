import type { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

// Shared by the explicit seed command and persistence tests; never deletes legacy items.
export function seedGamificationCatalog(db: Pick<PrismaClient | Prisma.TransactionClient, 'shopItem'>) {
  const data = { itemType: 'CONSUMABLE', coinCost: 50, maxOwned: 2, active: true };
  return db.shopItem.upsert({
    where: { code: 'STREAK_PROTECTOR' },
    create: { code: 'STREAK_PROTECTOR', name: 'Streak Protector', ...data },
    update: data,
  });
}
