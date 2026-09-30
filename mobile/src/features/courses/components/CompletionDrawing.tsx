import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { completionDrawing, revealStages, stage } from './nodeMotion';

// SVG dash props cannot use RN's native style driver. Update only the two SVG
// nodes from the existing completion clock; no second timer or React frame loop.
export function CompletionDrawing({ progress, size, challenge, destination = false, color = '#8CDBAB' }: { progress: Animated.Value; size: number; challenge: boolean; destination?: boolean; color?: string }) {
  const ring = useRef<Circle>(null);
  const check = useRef<Path>(null);
  useEffect(() => {
    const update = (value: number) => {
      const frame = completionDrawing(value);
      ring.current?.setNativeProps({ strokeDashoffset: 289 * (1 - (destination ? stage(value, ...revealStages.ring) : frame.ring)), opacity: destination ? 1 : 1 - stage(value, .85, 1) });
      check.current?.setNativeProps({ strokeDashoffset: 43 * (1 - frame.check) });
    };
    update(0);
    const listener = progress.addListener(({ value }) => update(value));
    return () => progress.removeListener(listener);
  }, [progress, destination]);
  return <Svg pointerEvents="none" accessible={false} width={size} height={size} viewBox="0 0 100 100">
    <Circle ref={ring} cx={50} cy={50} r={46} fill="none" stroke={color} strokeWidth={3} strokeDasharray="289 289" strokeDashoffset={289} rotation={-90} origin="50,50" strokeLinecap="round" />
    {!challenge ? <Path ref={check} d="M35 50l10 10 20-20" fill="none" stroke="#FFF" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="43 43" strokeDashoffset={43} /> : null}
  </Svg>;
}
