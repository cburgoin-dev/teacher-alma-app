import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readFileSync } from 'node:fs';
import { demoMedia } from './demo-media.js';

test('demo media serves exact fixture bytes and audio ranges only in development', async () => {
  for (const environment of ['development', 'production']) {
    const app = express();
    app.use('/demo-media', demoMedia(environment));
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const base = `http://127.0.0.1:${address.port}/demo-media/`;
      for (const name of ['greeting.png', 'ball.png', 'nice-to-meet-you.wav', 'sofia-greeting.wav', 'daniel-greeting.wav', 'daniel-intro.wav', 'nice-to-meet-you-too.wav', 'i-am-a-student.wav', 'it-is-a-book.wav']) {
        const response = await fetch(base + name);
        assert.equal(response.status, environment === 'development' ? 200 : 404);
        if (environment === 'development') {
          assert.deepEqual(Buffer.from(await response.arrayBuffer()), readFileSync(new URL('../../scripts/assets/' + name, import.meta.url)));
          assert.match(response.headers.get('content-type')!, name.endsWith('wav') ? /audio/ : /image\/png/);
        }
      }
      assert.equal((await fetch(base + 'generate-audio.ps1')).status, 404);
      if (environment === 'development') {
        const range = await fetch(base + 'nice-to-meet-you.wav', { headers: { Range: 'bytes=0-43' } });
        assert.equal(range.status, 206);
        const bytes = Buffer.from(await range.arrayBuffer());
        assert.equal(bytes.length, 44);
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
        assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
      }
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  }
});
