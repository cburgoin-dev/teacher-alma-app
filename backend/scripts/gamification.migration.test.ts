import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedGamificationCatalog } from './gamification-catalog.js';

const migration = '20260930000000_gamification_v1';
const migrations = new URL('../prisma/migrations/', import.meta.url);

for (const legacy of [false, true]) test(`Gamification persistence: ${legacy ? 'legacy history and backfill' : 'clean schema'}`, {
  skip: process.env.RUN_GAMIFICATION_DB_TESTS !== '1',
}, async () => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const schema = 'gamification_migration_test_' + randomUUID().replaceAll('-', '');
  assert.match(schema, /^gamification_migration_test_[a-f0-9]{32}$/);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema }) });
  await db.connect();
  const user = randomUUID(), otherUser = randomUUID(), item = randomUUID();
  const preserved = new Map<string, unknown[]>();
  try {
    await db.query('CREATE SCHEMA "' + schema + '"');
    await db.query('SET search_path TO "' + schema + '"');
    for (const name of (await readdir(migrations)).filter(n => /^\d{14}_/.test(n) && n < migration).sort()) {
      const sql = await readFile(new URL(name + '/migration.sql', migrations), 'utf8');
      await db.query(sql.replace('CREATE SCHEMA IF NOT EXISTS "public";', ''));
    }
    if (legacy) {
      await db.query('INSERT INTO users(id,email) VALUES ($1,$2)', [user, user + '@test.invalid']);
      for (const [type, amount] of [['EARN', 20], ['SPEND', -5], ['CREDIT', 3], ['DEBIT', -1]]) {
        await db.query('INSERT INTO coin_transactions(id,user_id,amount,type,reason,reference_type,reference_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [randomUUID(), user, amount, type, 'LEGACY_REASON', 'LEGACY_REFERENCE', randomUUID()]);
      }
      await db.query("INSERT INTO learning_days(id,user_id,activity_date) VALUES ($1,$2,'2026-09-01')", [randomUUID(), user]);
      await db.query("INSERT INTO shop_items(id,code,name,item_type,coin_cost,max_owned) VALUES ($1,'LEGACY_ITEM','Legacy','CONSUMABLE',10,2)", [item]);
      await db.query('INSERT INTO user_inventory(id,user_id,shop_item_id,quantity) VALUES ($1,$2,$3,1)', [randomUUID(), user, item]);
      await db.query("INSERT INTO streak_challenges(id,user_id,shop_item_id,status,started_on,ends_on,entry_cost,reward_amount) VALUES ($1,$2,$3,'ACTIVE','2026-09-01','2026-09-07',10,20)", [randomUUID(), user, item]);
      for (const table of ['learning_days', 'coin_transactions', 'shop_items', 'user_inventory', 'streak_challenges']) {
        preserved.set(table, (await db.query('SELECT * FROM ' + table + ' ORDER BY id')).rows);
      }
    }
    await db.query(await readFile(new URL(migration + '/migration.sql', migrations), 'utf8'));
    for (const [table, before] of preserved) {
      const expected = table === 'coin_transactions' ? before.map((row: any) => ({ ...row,
        type: ({ EARN: 'CREDIT', SPEND: 'DEBIT' } as Record<string, string>)[row.type] ?? row.type,
        idempotency_key: 'legacy:' + row.id, reference_value: null,
      })) : before;
      assert.deepEqual((await db.query('SELECT * FROM ' + table + ' ORDER BY id')).rows, expected);
    }
    for (const table of ['gamification_learning_events', 'user_streaks', 'gamification_settings', 'streak_protection_events', 'streak_repairs']) {
      assert.equal((await db.query('SELECT * FROM ' + table)).rowCount, 0);
    }
    if (!legacy) await db.query('INSERT INTO users(id,email) VALUES ($1,$2)', [user, user + '@test.invalid']);
    await db.query('INSERT INTO users(id,email) VALUES ($1,$2)', [otherUser, otherUser + '@test.invalid']);

    // Exercise the real Prisma upsert twice, including correction of catalog configuration.
    const protector = await seedGamificationCatalog(prisma);
    await prisma.shopItem.update({ where: { id: protector.id }, data: { coinCost: 1, maxOwned: 9, active: false, itemType: 'LEGACY', name: 'Custom name', config: { retained: true } } });
    const reseeded = await seedGamificationCatalog(prisma);
    assert.equal(reseeded.id, protector.id);
    assert.deepEqual([reseeded.itemType, reseeded.coinCost, reseeded.maxOwned, reseeded.active], ['CONSUMABLE', 50, 2, true]);
    assert.equal(reseeded.name, 'Custom name');
    assert.deepEqual(reseeded.config, { retained: true });
    assert.equal(await prisma.shopItem.count({ where: { code: 'STREAK_PROTECTOR' } }), 1);
    if (legacy) assert.ok(await prisma.shopItem.findUnique({ where: { id: item } }));

    const invalid = async (sql: string, constraint: string) => {
      await assert.rejects(db.query(sql), (error: any) => error.code === '23514' && error.constraint === constraint);
    };
    await prisma.userStreak.create({ data: { userId: user } });
    for (const set of ['current_days=-1', 'longest_days=-1', 'current_days=2,longest_days=1']) {
      await invalid('UPDATE user_streaks SET ' + set, 'user_streaks_days_check');
    }
    await db.query('UPDATE user_streaks SET current_days=1,longest_days=2');
    assert.equal((await prisma.gamificationSettings.create({ data: { userId: user } })).dailyGoalPreset, 'NORMAL');
    await invalid("UPDATE gamification_settings SET daily_goal_preset='UNKNOWN'", 'gamification_settings_preset_check');
    await invalid("UPDATE gamification_settings SET pending_daily_goal_preset='UNKNOWN',pending_effective_date=CURRENT_DATE", 'gamification_settings_pending_preset_check');
    for (const set of ["pending_daily_goal_preset='CASUAL'", 'pending_effective_date=CURRENT_DATE']) {
      await invalid('UPDATE gamification_settings SET ' + set, 'gamification_settings_pending_pair_check');
    }
    for (const preset of ['CASUAL', 'NORMAL', 'INTENSE']) await prisma.gamificationSettings.update({ where: { userId: user }, data: { dailyGoalPreset: preset, pendingDailyGoalPreset: preset, pendingEffectiveDate: new Date('2026-10-01') } });

    const event = { userId: user, eventType: 'LESSON_COMPLETION', sourceType: 'LESSON_RUN', sourceId: randomUUID(), learningDate: new Date('2026-09-30'), occurredAt: new Date() };
    await prisma.gamificationLearningEvent.create({ data: event });
    await assert.rejects(prisma.gamificationLearningEvent.create({ data: { ...event, eventType: 'LESSON_REPLAY_COMPLETION' } }), { code: 'P2002' });
    await prisma.gamificationLearningEvent.create({ data: { ...event, userId: otherUser } });
    await invalid("UPDATE gamification_learning_events SET event_type='UNKNOWN'", 'gamification_learning_events_event_type_check');
    await invalid("UPDATE gamification_learning_events SET source_type='UNKNOWN'", 'gamification_learning_events_source_type_check');
    for (const [eventType, sourceType] of [['LESSON_REPLAY_COMPLETION', 'LESSON_RUN'], ['UNIT_CHALLENGE_COMPLETION', 'UNIT_CHALLENGE_RUN'], ['REVIEW_COMPLETION', 'REVIEW_BATCH'], ['PRACTICE_COMPLETION', 'PRACTICE_SESSION']]) {
      await prisma.gamificationLearningEvent.create({ data: { ...event, eventType: eventType!, sourceType: sourceType!, sourceId: randomUUID() } });
    }
    const coin = { userId: user, amount: -120, type: 'DEBIT', reason: 'STREAK_REPAIR', idempotencyKey: 'repair:test' };
    const debit = await prisma.coinTransaction.create({ data: coin });
    await assert.rejects(prisma.coinTransaction.create({ data: coin }), { code: 'P2002' });
    await prisma.coinTransaction.create({ data: { ...coin, userId: otherUser } });
    for (const set of ["amount=0", "type='CREDIT',amount=-1", "type='DEBIT',amount=1", "type='UNKNOWN'"]) {
      await invalid('UPDATE coin_transactions SET ' + set, 'coin_transactions_amount_type_check');
    }
    await assert.rejects(db.query('UPDATE coin_transactions SET idempotency_key=NULL'), { code: '23502' });
    for (const set of ['coin_cost=-1', 'max_owned=0', 'max_owned=-1']) {
      await invalid('UPDATE shop_items SET ' + set, set.startsWith('coin_cost') ? 'shop_items_cost_check' : 'shop_items_max_owned_check');
    }
    await prisma.userInventory.create({ data: { userId: user, shopItemId: protector.id, quantity: 0 } });
    await invalid('UPDATE user_inventory SET quantity=-1', 'user_inventory_quantity_check');
    const protection = { userId: user, shopItemId: protector.id, protectedDate: new Date('2026-09-29') };
    await prisma.streakProtectionEvent.create({ data: protection });
    await assert.rejects(prisma.streakProtectionEvent.create({ data: protection }), { code: 'P2002' });
    await assert.rejects(prisma.shopItem.delete({ where: { id: protector.id } }), { code: 'P2003' });

    const repair = { userId: user, brokenDate: new Date('2026-09-29'), previousStreakDays: 3, createdAt: new Date('2026-09-30'), eligibleUntil: new Date('2026-10-01') };
    const candidate = await prisma.streakRepair.create({ data: repair });
    await assert.rejects(prisma.streakRepair.create({ data: repair }), { code: 'P2002' });
    await prisma.streakRepair.create({ data: { ...repair, userId: otherUser } });
    for (const set of ['previous_streak_days=0', 'previous_streak_days=-1', 'eligible_until=created_at', "eligible_until=created_at - interval '1 second'", "status='USED'", "status='UNKNOWN'", 'repaired_at=now()', `coin_transaction_id='${debit.id}'`]) {
      await invalid('UPDATE streak_repairs SET ' + set, set.startsWith('previous') ? 'streak_repairs_previous_days_check' : set.startsWith('eligible') ? 'streak_repairs_window_check' : 'streak_repairs_lifecycle_check');
    }
    await prisma.streakRepair.update({ where: { id: candidate.id }, data: { status: 'USED', repairedAt: new Date(), coinTransactionId: debit.id } });
    await assert.rejects(prisma.coinTransaction.delete({ where: { id: debit.id } }), { code: 'P2003' });
    await assert.rejects(prisma.streakRepair.create({ data: { ...repair, status: 'USED', repairedAt: new Date(), coinTransactionId: debit.id } }), { code: 'P2002' });
    for (const set of ['repaired_at=NULL', 'coin_transaction_id=NULL', "status='INVALIDATED'"]) {
      await invalid(`UPDATE streak_repairs SET ${set} WHERE id='${candidate.id}'`, 'streak_repairs_lifecycle_check');
    }
    const next = await prisma.streakRepair.create({ data: repair });
    await prisma.streakRepair.update({ where: { id: next.id }, data: { status: 'INVALIDATED' } });
    await prisma.streakRepair.create({ data: repair });
    const index = (await db.query('SELECT indexdef FROM pg_indexes WHERE schemaname=$1 AND indexname=$2', [schema, 'streak_repairs_one_eligible'])).rows[0];
    assert.match(index.indexdef, /UNIQUE.*WHERE.*ELIGIBLE/);
    await prisma.user.deleteMany({ where: { id: { in: [user, otherUser] } } });
    for (const table of ['gamification_learning_events', 'user_streaks', 'gamification_settings', 'streak_protection_events', 'streak_repairs', 'coin_transactions']) assert.equal((await db.query('SELECT * FROM ' + table)).rowCount, 0);
  } finally {
    await prisma.$disconnect();
    await db.query('ROLLBACK');
    await db.query('SET search_path TO public');
    await db.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    await db.end();
  }
});
