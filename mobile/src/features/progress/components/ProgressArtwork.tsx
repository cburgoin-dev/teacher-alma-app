import { StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Path } from 'react-native-svg';
import { HomeCourseArtwork } from '../../home/components/HomeCourseArtwork';

/** Reuses the real Courses landscape and Home's A1 focal crop, without its catalog badge. */
export function ProgressArtwork({ uri, level }: { uri: string | null; level: string | null }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.art}>
    <Svg width="100%" height="100%" viewBox="0 0 156 124">
      <Path d="M22 20 L145 12 Q154 12 154 24 L150 112 Q150 120 138 120 L15 113 Z" fill="#BDD9FF" /><Path d="M10 21 L140 16 L147 110 Q148 119 136 121 L9 115 Z" fill="#FFFFFF" stroke="#D2E2F7" />
      <Defs><ClipPath id="progressLandscape"><Path d="M21 3 Q5 3 5 20 L5 92 Q5 105 20 106 L129 113 Q144 114 144 98 L150 20 Q151 5 135 5 Z" /></ClipPath></Defs>
      <HomeCourseArtwork uri={uri} level={level} box={{ x: 0, y: 0, width: 150, height: 113 }} clipPath="url(#progressLandscape)" />
    </Svg>
    {level ? <View style={s.badge}><Text maxFontSizeMultiplier={1.3} style={s.level}>{level}</Text></View> : null}
  </View>;
}
const s = StyleSheet.create({
  art: { width: '100%', aspectRatio: 156 / 124 },
  badge: { position: 'absolute', top: 10, left: 12, backgroundColor: '#FFFFFFEE', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  level: { fontSize: 11, lineHeight: 15, fontWeight: '800', color: '#075BB7' },
});
