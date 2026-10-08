import { StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Path } from 'react-native-svg';
import { HomeCourseArtwork } from '../../home/components/HomeCourseArtwork';

/** Reuses the real Courses landscape and Home's A1 focal crop, without its catalog badge. */
export function ProgressArtwork({ uri, level }: { uri: string | null; level: string | null }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.art}>
    <Svg width="100%" height="100%" viewBox="0 0 156 146">
      <Defs><ClipPath id="progressLandscape"><Path d="M24 4 Q6 4 6 26 L0 109 Q0 135 26 138 L131 145 Q156 145 156 119 L156 22 Q156 0 134 1 Z" /></ClipPath></Defs>
      <HomeCourseArtwork uri={uri} level={level} box={{ x: 0, y: 0, width: 156, height: 146 }} clipPath="url(#progressLandscape)" />
    </Svg>
    {level ? <View style={s.badge}><Text maxFontSizeMultiplier={1.3} style={s.level}>{level}</Text></View> : null}
  </View>;
}
const s = StyleSheet.create({
  art: { width: '100%', aspectRatio: 156 / 146 },
  badge: { position: 'absolute', top: 10, left: 12, backgroundColor: '#FFFFFFEE', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  level: { fontSize: 11, lineHeight: 15, fontWeight: '800', color: '#075BB7' },
});
