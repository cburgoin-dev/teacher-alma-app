// Development-only static media, independent of the application/API server.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const greeting = readFileSync(new URL('./assets/greeting.png', import.meta.url));
createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  if (req.url !== '/greeting.png') { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': greeting.length, 'Cache-Control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : greeting);
}).listen(3001, '0.0.0.0', () => console.log('Lesson demo media: http://<PC-LAN-IP>:3001/greeting.png'));
