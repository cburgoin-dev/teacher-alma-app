import { apiRequest, ApiError } from '../services/api/client';
import { diagnosticIdentity } from './diagnosticIdentity';
import { homeResource, resetDevIdentityResource as resetHome } from '../features/home/resource';
import { resetDevIdentityResource as resetProgress } from '../features/progress/resource';
import { gamificationResource, resetDevIdentityResource as resetGamification } from '../features/gamification/resource';
export type DevScenario = { userId: string; scenario: string };
export type DevAction = 'NEW' | 'ASSESSED_A1' | 'ASSESSED_A2' | 'CLEAR_ACTIVE';
let busy = false;
let state = { busy: false, notice: '' };
const listeners = new Set<() => void>();
function publish(notice: string) { state = { busy, notice }; listeners.forEach(fn => fn()); }
export const diagnosticDevState = { snapshot: () => state, subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; } };
function requireDev() { if (typeof __DEV__ === 'undefined' || !__DEV__) throw Error('DEV only'); }
async function request(options?: RequestInit) {
  requireDev();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try { return await apiRequest<DevScenario>('/dev/diagnostic', { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}
export const diagnosticDevApi = {
  status: () => { requireDev(); return request(); },
  prepare: (action: DevAction) => { requireDev(); return request({ method: 'POST', body: JSON.stringify({ action }) }); },
};
async function selectIdentity(selected: boolean) {
  diagnosticIdentity.select(selected);
  resetHome(); resetProgress(); resetGamification();
  diagnosticIdentity.remount();
  await homeResource.refresh();
  if (homeResource.snapshot().error) throw Error('El escenario se preparó, pero Home no pudo actualizarse. Reintenta actualizar Inicio.');
}
export async function prepareDiagnosticScenario(action: DevAction | 'DEFAULT') {
  requireDev();
  if (busy) throw Error('Espera a que termine la preparación.');
  if (gamificationResource.snapshot().busy || gamificationResource.snapshot().pending) throw Error('Resuelve primero la operación pendiente de la tienda antes de cambiar de usuario DEV.');
  busy = true; publish('');
  try {
    const scenario = action === 'DEFAULT' ? null : await diagnosticDevApi.prepare(action);
    await selectIdentity(action !== 'DEFAULT');
    publish(scenario ? `Preparado: ${scenario.scenario}. Home usa datos reales.` : 'Usuario habitual restaurado.');
    return scenario;
  } catch (error) {
    const notice = error instanceof ApiError ? error.status === 404 ? 'Tooling no disponible. Requiere Backend development y DB local teacher_alma_dev.' : error.message
      : error instanceof Error ? error.message : 'No se pudo confirmar la preparación. Consulta el estado antes de reintentar.';
    publish(notice);
    throw Error(notice);
  } finally { busy = false; publish(state.notice); }
}
