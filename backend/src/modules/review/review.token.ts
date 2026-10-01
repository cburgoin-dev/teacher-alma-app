import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { isUuid } from '../../shared/auth.js';
import { HttpError } from '../../shared/http-error.js';

export type AuthorizedItem = { id: string; activityId: string; sourceLessonId: string | null };
type Claims = { batchId: string; userId: string; expiresAt: number; items: AuthorizedItem[] };
/** Authenticated encryption; share a stable key across server processes. */
export class ReviewBatchToken {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error('REVIEW_BATCH_SECRET must encode 32 bytes');
  }
  issue(userId: string, items: AuthorizedItem[], now: Date): string {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from('review-v1'));
    const data = Buffer.concat([cipher.update(JSON.stringify({ batchId: randomUUID(), userId, items, expiresAt: now.getTime() + 15 * 60_000 })), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
  }
  verify(token: unknown, userId: string, itemId: string, now: Date): AuthorizedItem & { batchId: string; batchItemIds: string[] } {
    try {
      if (typeof token !== 'string' || token.length > 4096 || !/^[\w-]+$/.test(token)) throw new Error();
      const bytes = Buffer.from(token, 'base64url');
      const decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
      decipher.setAAD(Buffer.from('review-v1'));
      decipher.setAuthTag(bytes.subarray(12, 28));
      const claims = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString()) as Claims;
      if (!isUuid(claims.batchId) || claims.userId !== userId || !Number.isFinite(claims.expiresAt) || claims.expiresAt <= now.getTime()) throw new Error();
      const item = claims.items.find(i => i.id === itemId);
      if (!item) throw new Error();
      return { ...item, batchId: claims.batchId, batchItemIds: claims.items.map(i => i.id) };
    } catch { throw new HttpError(403, 'REVIEW_BATCH_INVALID', 'Invalid Review batch'); }
  }
}
export function configuredReviewToken() {
  const secret = process.env.REVIEW_BATCH_SECRET;
  if (secret !== undefined && !/^[a-f0-9]{64}$/i.test(secret)) throw new Error('REVIEW_BATCH_SECRET must be 64 hex characters');
  if (!secret && process.env.NODE_ENV !== 'development') throw new Error('REVIEW_BATCH_SECRET is required');
  return new ReviewBatchToken(secret ? Buffer.from(secret, 'hex') : randomBytes(32));
}
