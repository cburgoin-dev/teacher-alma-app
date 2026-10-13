let selected = false;
let revision = 0;
const listeners = new Set<() => void>();
/** Memory only. Fixed alias, never an arbitrary user id or a production credential. */
export const diagnosticIdentity = {
  selected: () => selected,
  select(value: boolean) { selected = value; },
  remount() { revision++; listeners.forEach(fn => fn()); },
  snapshot: () => revision,
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};
