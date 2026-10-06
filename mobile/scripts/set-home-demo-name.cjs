// Development-only: change the configured local demo user's display name, never learning state.
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const backendRequire = createRequire(path.resolve(__dirname, '../../backend/package.json'));
const config = backendRequire('dotenv').parse(readFileSync(path.resolve(__dirname, '../../backend/.env')));
const target = new URL(config.DATABASE_URL);
if (config.NODE_ENV !== 'development' || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.port !== '5433' || target.pathname !== '/teacher_alma_dev'
  || !/^[0-9a-f-]{36}$/i.test(config.DEV_AUTH_USER_ID ?? '')) throw Error('Requires configured local development demo user');
const displayName = process.argv[2] || 'Sofía';
if (displayName.length > 40 || !displayName.trim()) throw Error('Provide a short human demo display name');
(async () => {
  const client = new (backendRequire('pg').Client)({ connectionString: config.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query('UPDATE users SET display_name = $1 WHERE id = $2::uuid RETURNING display_name', [displayName.trim(), config.DEV_AUTH_USER_ID]);
    if (result.rowCount !== 1) throw Error('Configured demo user not found');
    console.log('Demo displayName: ' + result.rows[0].display_name + '. Learning and rewards unchanged.');
  } finally { await client.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
