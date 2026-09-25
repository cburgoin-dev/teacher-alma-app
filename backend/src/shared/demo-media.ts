import express from 'express';
import { fileURLToPath } from 'node:url';

/** Local fixture media only; never enabled in production. No learning state is involved. */
export function demoMedia(environment: string | undefined) {
  const router = express.Router();
  if (environment !== 'development') return router;
  const assets = fileURLToPath(new URL('../../scripts/assets/', import.meta.url));
  for (const name of ['greeting.png', 'nice-to-meet-you.wav', 'sofia-greeting.wav']) {
    router.get('/' + name, (_request, response) => {
      response.sendFile(name, { root: assets });
    });
  }
  return router;
}
