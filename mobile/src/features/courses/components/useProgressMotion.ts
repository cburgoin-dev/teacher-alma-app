import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { motionDuration, type ProgressTransition } from '../completionMotion';

export function useProgressMotion(transition: ProgressTransition | null, ready: boolean, finish: () => void) {
  const [reduced, setReduced] = useState<boolean | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); }, () => { if (alive) setReduced(true); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => {
    progress.setValue(0);
    if (!transition || !ready || reduced === null) return;
    const duration = motionDuration(reduced);
    if (!duration) { progress.setValue(1); finish(); return; }
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: .86, duration: duration * .86, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: duration * .14, easing: Easing.linear, useNativeDriver: true }),
    ]);
    const frame = requestAnimationFrame(() => animation.start(({ finished }) => { if (finished) finish(); }));
    return () => { cancelAnimationFrame(frame); animation.stop(); };
  }, [transition, ready, reduced, finish, progress]);
  return progress;
}
