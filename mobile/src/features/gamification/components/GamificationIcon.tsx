import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

/** Small layered vectors; decorative, with meaning supplied by adjacent text. */
export function GamificationIcon({ kind, size = 28 }: { kind: 'coin' | 'flame' | 'protector' | 'repair'; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 80 80" accessible={false} pointerEvents="none">
    {kind === 'coin' ? <>
      <Circle cx={40} cy={42} r={34} fill="#DC9005" />
      <Circle cx={40} cy={38} r={33} fill="#FFC631" stroke="#FFE89A" strokeWidth={2} />
      <Circle cx={40} cy={38} r={25} fill="#FFB31A" stroke="#FFDF70" strokeWidth={3} />
      <Path d="M48 25c-11-7-22 7-10 12l5 2c13 6 1 20-11 11m8-30v37" fill="none" stroke="#FFF0A1" strokeWidth={6} strokeLinecap="round" />
      <Path d="M17 27a28 28 0 0 1 21-17" fill="none" stroke="#FFF5BF" strokeWidth={3} strokeLinecap="round" />
    </> : kind === 'protector' || kind === 'repair' ? <>
      <Ellipse cx={40} cy={73} rx={23} ry={4} fill={kind === 'repair' ? '#EAD8B5' : '#C9DEF7'} />
      <Path d="M40 4C28 14 16 17 8 19v23c0 16 15 28 32 34 17-6 32-18 32-34V19C60 16 48 11 40 4Z" fill={kind === 'repair' ? '#F4B53B' : '#2589F5'} stroke={kind === 'repair' ? '#FFE7AE' : '#8ED3FF'} strokeWidth={2} />
      <Path d="M40 13c-10 7-18 10-24 12v17c0 12 11 22 24 28 13-6 24-16 24-28V25c-8-2-16-6-24-12Z" fill={kind === 'repair' ? '#CF8617' : '#0764D9'} />
      {kind === 'repair' ? <Path d="M27 36a15 15 0 1 1-1 16m0-25v12h12" fill="none" stroke="#FFF6D8" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /> : <>
        <Path d="M41 23c3 14 15 18 15 29a16 16 0 0 1-32 0c0-8 7-13 10-20 1 7 3 8 3 8 5-5 5-10 4-17Z" fill="#FFAE20" />
        <Path d="M41 42c1 7 7 10 7 15a8 8 0 0 1-16 0c0-5 6-7 9-15Z" fill="#FFE47B" />
      </>}
    </> : <>
      <Path d="M40 3c4 18 22 24 25 43C70 81 9 83 13 47c1-10 10-20 17-28 0 10 5 16 5 16C43 25 43 14 40 3Z" fill="#FF7826" />
      <Path d="M48 35c0 12-8 12-5 23-8-2-12-10-11-16-11 13-10 31 9 31 16 0 20-21 7-38Z" fill="#FFC936" />
      <Path d="M39 53c1 6 8 9 7 15-1 9-15 8-15 0 0-6 6-9 8-15Z" fill="#FFF0A1" />
    </>}
  </Svg>;
}
