import { useEffect, useRef, type Ref } from 'react';
import type { Animated } from 'react-native';
import { completionDrawing } from '../courses/components/nodeMotion';
import { brandColors, colors } from '../../theme';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
export function TrophyShape({ color = '#FFF', accent = colors.red, starOpacity = 1, starRef }: { color?: string; accent?: string; starOpacity?: number; starRef?: Ref<Path> }) {
  return <G>
    <Path d="M18 13H2v17q0 23 24 23m36-40h16v17q0 23-24 23" stroke={color} strokeWidth="6" fill="none" />
    <Path d="M17 0h46v38q0 28-23 28T17 38Z" fill={color} />
    <Rect x="35" y="61" width="10" height="23" fill={color} />
    <Rect x="20" y="84" width="40" height="9" fill={color} />
    <Path ref={starRef} d="m40 13 6 12 13 2-10 9 2 13-11-6-11 6 2-13-10-9 13-2Z" fill={accent} opacity={starOpacity} />
  </G>;
}
export function Trophy({ size = 76, color = '#FFF', accent = colors.red, starOpacity = 1, starProgress }: { size?: number; color?: string; accent?: string; starOpacity?: number; starProgress?: Animated.Value }) {
  const star = useRef<Path>(null);
  useEffect(() => {
    if (!starProgress) return;
    const id = starProgress.addListener(({ value }) => star.current?.setNativeProps({ opacity: completionDrawing(value).star }));
    return () => starProgress.removeListener(id);
  }, [starProgress]);
  return <Svg pointerEvents="none" width={size} height={size} viewBox="-3 -3 86 99" accessible={false}><TrophyShape color={color} accent={accent} starOpacity={starProgress ? 0 : starOpacity} starRef={star} /></Svg>;
}
export function ChallengeHero() {
  return <Svg pointerEvents="none" width="100%" height={148} viewBox="0 0 350 180" accessible={false}>
    <Path d="M0 167Q90 68 170 133T350 105" fill="none" stroke="#64B6F6" strokeWidth="4" strokeDasharray="5 9" strokeLinecap="round" />
    <Circle cx="175" cy="88" r="75" fill="#FFE4E9" stroke="#FFF" strokeWidth="3" />
    <Circle cx="175" cy="88" r="65" fill={colors.red} />
    <G transform="translate(135 43)"><TrophyShape color={colors.white} accent={colors.red} /></G>
    <Path d="m93 30-12-11m21 1-3-14m148 122 13 5m-19 1 8 15" stroke="#8CCAFF" strokeWidth="7" strokeLinecap="round" />
    <Path d="M24 51h35q15 0 15 15v19q0 15-13 15l-2 10-9-10H24Q9 100 9 85V66q0-15 15-15Z" fill="#FFF" stroke="#CCE7FF" strokeLinejoin="round" />
    <Circle cx="27" cy="74" r="4" fill="#0980F5" /><Circle cx="42" cy="74" r="4" fill="#0980F5" /><Circle cx="57" cy="74" r="4" fill="#0980F5" />
    <Path d="M290 42h32q15 0 15 15v23q0 15-15 15h-25l-15 9 4-10q-11-2-11-14V57q0-15 15-15Z" fill="#FFF" stroke="#FFC7D3" strokeLinejoin="round" /><Path d="M289 58h32m-32 12h25m-25 12h19" stroke={brandColors.red} strokeWidth="4" strokeLinecap="round" />
  </Svg>;
}
export function RouteBus() {
  return <Svg pointerEvents="none" width={44} height={42} viewBox="0 0 60 50" accessible={false}>
    <Rect x="4" y="4" width="52" height="38" rx="7" fill="#F4374C" /><Path d="M8 8h44v8H8Z" fill="#FF7989" />
    <Path d="M9 18h10v8H9Zm14 0h10v8H23Zm14 0h14v8H37ZM9 29h10v7H9Zm14 0h10v7H23Zm14 0h14v7H37Z" fill="#D1EFFF" />
    <Circle cx="15" cy="42" r="6" fill="#344B6C" /><Circle cx="46" cy="42" r="6" fill="#344B6C" />
  </Svg>;
}
// Same local SVG family for both phase previews; solid silhouette with cutouts.
export function PhaseIcon({ conversation }: { conversation: boolean }) {
  return <Svg pointerEvents="none" accessible={false} width={26} height={26} viewBox="0 0 24 24">
    {conversation ? <><Path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l5-1.6A10 10 0 1 0 12 2Z" fill={colors.blue} /><Circle cx="7" cy="12" r="1.2" fill="#FFF" /><Circle cx="12" cy="12" r="1.2" fill="#FFF" /><Circle cx="17" cy="12" r="1.2" fill="#FFF" /></>
      : <><Rect x="2" y="2" width="20" height="20" rx="4" fill={colors.blue} /><Path d="M6 6h5v5H6Zm7 0h5v5h-5ZM6 13h5v5H6Z" fill="#FFF" /><Rect x="13" y="13" width="5" height="5" rx=".5" fill="#9CD3FF" /></>}
  </Svg>;
}
export function ChallengeBackdrop() {
  return <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMin slice" accessible={false}>
    <Circle cx="413" cy="115" r="100" fill="#E4F3ED" /><Circle cx="-45" cy="300" r="100" fill="#DFF1FD" /><Circle cx="420" cy="680" r="110" fill="#E6F3ED" />
    <Path d="M284 147q-1-18 17-20 10-28 30-13 16 1 16 18 22 2 22 18 0 13-18 13h-51q-20 0-16-16ZM12 492q0-14 15-16 10-24 28-11 15 0 15 17 18 0 18 15 0 10-17 10H29q-18 0-17-15" fill="#D7EDFC" />
    <Path d="M351 230v-25m-20 80 20-56 20 56Zm-2 0h44v46h-44Zm-6 46h56v137h-56Z" fill="#C3E3F7" stroke="#C3E3F7" strokeWidth="4" strokeLinejoin="round" />
    <Circle cx="351" cy="355" r="20" fill="#EFF9FF" /><Path d="M351 343v14l10 5m-24 31v57m14-57v57m14-57v57" stroke="#AAD3EE" strokeWidth="4" fill="none" strokeLinecap="round" />
  </Svg>;
}
