import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Ellipse, Path, Text as SvgText } from 'react-native-svg';

/** Decorative study materials, independent of course cover photography. */
export function ProgressArtwork({ level }: { level: string | null }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.art}>
    <Svg width="100%" height="100%" viewBox="0 0 170 132">
      <Defs>
        <LinearGradient id="progressBookBlue" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#268AFF" /><Stop offset="1" stopColor="#0753D7" /></LinearGradient>
        <LinearGradient id="progressBookCoral" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FF6A78" /><Stop offset="1" stopColor="#F12B4E" /></LinearGradient>
      </Defs>
      <Ellipse cx="93" cy="119" rx="64" ry="7" fill="#CDDEF6" opacity=".65" />
      <Path d="M24 83 111 68 155 83 155 109 68 123 24 108Z" fill="url(#progressBookCoral)" />
      <Path d="M27 87 68 99 150 86 149 104 68 117 27 104Z" fill="#FFF9F3" />
      <Path d="M69 104 146 91M69 109 146 96" fill="none" stroke="#E4DCCC" strokeWidth="1.5" />
      <Path d="M24 83 68 96 155 82M24 108 68 121 155 108" fill="none" stroke="#EF3455" strokeWidth="4" strokeLinejoin="round" />
      <Path d="M45 38 124 23 160 37 160 73 81 88 45 74Q40 72 40 65V47Q40 40 45 38Z" fill="url(#progressBookBlue)" />
      <Path d="M81 49 157 35 157 67 81 82Z" fill="#FCFDFF" />
      <Path d="M88 55 153 43M88 61 153 49M88 67 153 55" stroke="#D5E2F5" strokeWidth="1.4" />
      <Path d="M45 38 81 49V85L45 73Q40 72 40 65V47Q40 40 45 38Z" fill="#1264E8" />
      <Path d="M47 39 82 48 158 35M82 85 158 71" stroke="#2984FF" strokeWidth="3" fill="none" strokeLinejoin="round" />
      <Path d="M121 43 132 41V59L126 55 121 61Z" fill="#FFB940" />
      {level ? <SvgText x="60" y="64" fill="#FFF" fontWeight="800" fontSize={level.length > 3 ? 11 : 17} textAnchor="middle" transform="rotate(16 60 64)">{level}</SvgText> : null}
      <Path d="M23 44 13 39M28 29 24 18M21 59 10 61" stroke="#1680FF" strokeWidth="4" strokeLinecap="round" />
      <Path d="m143 13 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" fill="#6CADFF" />
    </Svg>
  </View>;
}
const s = StyleSheet.create({ art: { width: '100%', aspectRatio: 170 / 132 } });
