import { rememberDevCelebration } from '../devStreakReplay';
import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { StreakCelebrationGate } from '../streakCelebration';
import { StreakCelebration } from '../components/StreakCelebration';

/** Modal stays over Result until Continue: the existing destination/ticket runs once afterwards. */
export function useStreakCelebration() {
  const gate = useMemo(() => new StreakCelebrationGate(), []);
  const delta = useSyncExternalStore(gate.subscribe, gate.snapshot);
  useEffect(() => gate.dispose, [gate]);
  useEffect(() => { if (__DEV__ && delta) rememberDevCelebration(delta); }, [delta]);
  return {
    continue: gate.continue,
    wrap: (content: ReactNode) => <>{content}{delta ? <StreakCelebration delta={delta} onContinue={gate.finish} /> : null}</>,
  };
}
