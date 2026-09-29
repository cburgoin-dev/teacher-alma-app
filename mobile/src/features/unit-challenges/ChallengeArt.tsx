import { brandColors, colors } from '../../theme';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
export function Trophy({ size = 76, color = '#FFF', accent = colors.red }: { size?: number; color?: string; accent?: string }) {
  return <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 80 80" accessible={false}>
    <Path d="M22 18H10v12c0 12 12 16 19 16M58 18h12v12c0 12-12 16-19 16" fill="none" stroke={color} strokeWidth="6" />
    <Path d="M22 10h36v25c0 12-8 20-18 20s-18-8-18-20ZM36 52h8v14H32v5h16v-5h-4" fill={color} />
    <Rect x="24" y="68" width="32" height="6" rx="2" fill={color} />
    <Path d="m40 19 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" fill={accent} />
  </Svg>;
}
export function ChallengeHero() {
  return <Svg pointerEvents="none" width="100%" height={148} viewBox="0 0 350 180" accessible={false}>
    <Path d="M0 167Q90 68 170 133T350 105" fill="none" stroke="#64B6F6" strokeWidth="4" strokeDasharray="5 9" strokeLinecap="round" />
    <Circle cx="175" cy="88" r="75" fill="#FFE4E9" stroke="#FFF" strokeWidth="3" />
    <Circle cx="175" cy="88" r="65" fill={colors.red} />
    <Path d="M153 56h-16v17q0 23 24 23m36-40h16v17q0 23-24 23" stroke={colors.white} strokeWidth="6" fill="none" />
    <Path d="M152 43h46v38q0 28-23 28t-23-28Zm18 61h10v23h15v9h-40v-9h15" fill={colors.white} />
    <Path d="m175 56 6 12 13 2-10 9 2 13-11-6-11 6 2-13-10-9 13-2Z" fill={colors.red} />
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
