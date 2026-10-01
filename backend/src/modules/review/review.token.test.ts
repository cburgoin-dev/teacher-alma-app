import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, randomBytes, randomUUID } from 'node:crypto';
import { ReviewBatchToken } from './review.token.js';

test('batch authorization is opaque, integrity protected, scoped and expires at 15 minutes', () => {
  const tokens = new ReviewBatchToken(randomBytes(32)), now = new Date();
  const user = randomUUID(), item = { id: randomUUID(), activityId: randomUUID(), sourceLessonId: randomUUID() };
  const token = tokens.issue(user, [item], now);
  assert.ok(!Buffer.from(token, 'base64url').toString().includes(item.id));
  const { batchId, batchItemIds, ...authorized } = tokens.verify(token, user, item.id, now);
  assert.deepEqual(authorized, item);
  assert.deepEqual(batchItemIds, [item.id]);
  const other = { id: randomUUID(), activityId: randomUUID(), sourceLessonId: item.sourceLessonId };
  assert.deepEqual(tokens.verify(tokens.issue(user, [item, other], now), user, other.id, now).batchItemIds, [item.id, other.id]);
  assert.equal(tokens.verify(token, user, item.id, now).batchId, batchId);
  assert.notEqual(tokens.verify(tokens.issue(user, [item], now), user, item.id, now).batchId, batchId);
  for (const [value, owner, id, time] of [
    [token.slice(0, 20) + (token[20] === 'a' ? 'b' : 'a') + token.slice(21), user, item.id, now],
    [token, randomUUID(), item.id, now], [token, user, randomUUID(), now],
    [token, user, item.id, new Date(now.getTime() + 900_000)], [null, user, item.id, now],
  ] as const) assert.throws(() => tokens.verify(value, owner, id, time), { code: 'REVIEW_BATCH_INVALID' });
});

test('pre-fix tokens without batch identity are rejected', () => {
  const key = randomBytes(32), tokens = new ReviewBatchToken(key), now = new Date();
  const userId = randomUUID(), item = { id: randomUUID(), activityId: randomUUID(), sourceLessonId: randomUUID() };
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('review-v1'));
  const data = Buffer.concat([cipher.update(JSON.stringify({ userId, items: [item], expiresAt: now.getTime() + 900_000 })), cipher.final()]);
  const legacy = Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
  assert.throws(() => tokens.verify(legacy, userId, item.id, now), { code: 'REVIEW_BATCH_INVALID' });
});
