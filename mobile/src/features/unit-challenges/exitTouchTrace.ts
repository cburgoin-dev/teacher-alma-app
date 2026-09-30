// Temporary physical diagnostic. Call sites are DEV-only; remove after A/B evidence.
export function exitTouchTrace(stage: string, detail?: unknown) {
  console.info('[UC_EXIT]', Date.now(), stage, detail ?? '');
}
