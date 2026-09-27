import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';
import { createSocket } from 'node:dgram';

// Seed tooling only. Never persist loopback or an address from a previous LAN.
export function demoMediaOrigin(env: NodeJS.ProcessEnv = process.env,
  interfaces: Record<string, NetworkInterfaceInfo[] | undefined> = networkInterfaces(), routedAddress?: string) {
  const candidates = Object.entries(interfaces).flatMap(([name, entries]) =>
    /loopback|vethernet|virtual|docker|wsl|vpn|tun|tap/i.test(name) ? [] : (entries ?? [])
      .filter(i => i.family === 'IPv4' && !i.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address))
      .map(i => i.address));
  const addresses = [...new Set(candidates)];
  let configured: URL | undefined;
  try { configured = new URL(env.LESSONS_DEMO_ASSET_BASE_URL ?? ''); } catch { /* Derive current LAN below. */ }
  const host = routedAddress && addresses.includes(routedAddress) ? routedAddress
    : configured && addresses.includes(configured.hostname) ? configured.hostname
    : addresses.length === 1 ? addresses[0] : undefined;
  if (!host) throw new Error('Demo media requires one active LAN interface (or LESSONS_DEMO_ASSET_BASE_URL matching a current LAN address).');
  const port = env.PORT ?? '3000';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid local API port.');
  return 'http://' + host + ':' + port;
}

export async function currentDemoMediaOrigin() {
  // UDP connect asks the OS for its outbound interface; no packet is sent.
  const socket = createSocket('udp4');
  let routedAddress: string | undefined;
  try {
    routedAddress = await new Promise<string>((resolve, reject) => {
      socket.once('error', reject);
      socket.connect(9, '1.1.1.1', () => resolve(socket.address().address));
    });
  } catch { /* Fall back to a unique local interface or a current explicit address. */ }
  finally { socket.close(); }
  return demoMediaOrigin(process.env, networkInterfaces(), routedAddress);
}
