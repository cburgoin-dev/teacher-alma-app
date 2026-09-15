import type { ErrorRequestHandler } from 'express';

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
    response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Invalid JSON request' } });
    return;
  }
  // Never expose Prisma errors, SQL, stack traces or connection details to clients.
  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  });
};
