// Reuse the real backend service and shared development content; no copied domain rules.
const { spawn } = require('node:child_process');
const path = require('node:path');
const backend = path.resolve(__dirname, '../../backend');
const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/preview-courses.ts', ...process.argv.slice(2)], {
  cwd: backend, stdio: 'inherit', windowsHide: true,
});
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
