import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { motionDuration, COMPLETION_MS, SETTLE_MS, REVEAL_MS, TRAVEL_MS, ARRIVAL_MS, TRAVEL_END, type ProgressTransition } from '../completionMotion';

export function useProgressMotion(transition: ProgressTransition | null, ready: boolean, finish: () => void, onProgress?: (value: number) => void) {
  const [reduced, setReduced] = useState<boolean | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const completion = useRef(new Animated.Value(0)).current;
  const orientation = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); }, () => { if (alive) setReduced(true); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => {
    progress.setValue(0);
    completion.setValue(0);
    reveal.setValue(0);
    orientation.setValue(0);
    if (!transition || !ready || reduced === null) return;
    const duration = motionDuration(reduced);
    if (!duration) { completion.setValue(1); reveal.setValue(1); orientation.setValue(1); progress.setValue(1); onProgress?.(1); finish(); return; }
    onProgress?.(0);
    const listener = progress.addListener(({ value }) => onProgress?.(value));
    const animation = Animated.sequence([
      Animated.timing(completion, { toValue: 1, duration: COMPLETION_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(orientation, { toValue: 1, duration: SETTLE_MS, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(progress, { toValue: TRAVEL_END, duration: TRAVEL_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: ARRIVAL_MS, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(reveal, { toValue: 1, duration: REVEAL_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);
    const frame = requestAnimationFrame(() => animation.start(({ finished }) => { if (finished) finish(); }));
    return () => { cancelAnimationFrame(frame); animation.stop(); progress.removeListener(listener); };
  }, [transition, ready, reduced, finish, progress, completion, reveal, orientation, onProgress]);
  return { progress, completion, reveal, orientation, animate: ready && !!transition && reduced === false };
}
