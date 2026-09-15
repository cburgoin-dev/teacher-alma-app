import type { Request, RequestHandler } from 'express';
import { HttpError } from './http-error.js';

declare global {
  namespace Express {
    interface Request { auth?: { userId: string } }
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Trusted server configuration only: never reads a client-supplied user ID or token. */
export function developmentAuth(environment: string | undefined, userId: string | undefined): RequestHandler {
  if (environment === 'development' && userId !== undefined && !isUuid(userId)) {
    throw new Error('DEV_AUTH_USER_ID must be an application user UUID');
  }
  return (request, _response, next) => {
    if (environment === 'development' && userId) request.auth = { userId };
    next();
  };
}

export function authenticatedUserId(request: Request): string {
  if (!isUuid(request.auth?.userId)) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
