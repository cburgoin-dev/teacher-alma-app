import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { NetworkInterfaceInfo } from 'node:os';
import { demoMediaOrigin } from './demo-media-origin.js';
const address = (ip: string) => ({ address: ip, family: 'IPv4', internal: false } as NetworkInterfaceInfo);
const interfaces = { 'Wi-Fi': [address('192.168.20.4')], 'vEthernet (WSL)': [address('172.20.1.1')] };
test('seed replaces loopback and stale media hosts with current LAN and API port', () => {
  for (const old of [undefined, 'http://localhost:3000', 'http://192.168.1.64:3001']) {
    assert.equal(demoMediaOrigin({ LESSONS_DEMO_ASSET_BASE_URL: old, PORT: '3000' }, interfaces), 'http://192.168.20.4:3000');
  }
  assert.equal(demoMediaOrigin({ PORT: '4000' }, interfaces), 'http://192.168.20.4:4000');
});
test('ambiguous or missing LAN fails instead of persisting an unusable address', () => {
  assert.throws(() => demoMediaOrigin({}, {}));
  const multi = { ...interfaces, Ethernet: [address('10.1.1.2')] };
  assert.throws(() => demoMediaOrigin({}, multi));
  assert.equal(demoMediaOrigin({}, multi, '192.168.20.4'), 'http://192.168.20.4:3000');
  assert.equal(demoMediaOrigin({ LESSONS_DEMO_ASSET_BASE_URL: 'http://10.1.1.2:3001' }, multi), 'http://10.1.1.2:3000');
});
