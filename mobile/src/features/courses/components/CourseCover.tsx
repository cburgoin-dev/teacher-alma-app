import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '../../../theme';
import { CourseVisualIcon } from './CourseVisualIcon';

const covers = {
  A1: require('../../../../assets/courses/a1-london.png'),
  A2: require('../../../../assets/courses/a2-new-york.png'),
  B1: require('../../../../assets/courses/b1-tower-bridge.png'),
  B2: require('../../../../assets/courses/b1-tower-bridge.png'),
  C1: require('../../../../assets/courses/c1-manhattan.png'),
  C2: require('../../../../assets/courses/c1-manhattan.png'),
};
const captions: Record<string, string[]> = { A1: ['Good things', 'start here'], A2: ['Bigger', 'conversations', 'await'] };

export function CourseCover({ uri, level, style, hero = false, badge }: {
  uri: string | null; level: string | null; style?: ViewStyle; hero?: boolean; badge?: 'premium' | 'soon' | undefined;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const key = level?.trim().toUpperCase() ?? '';
  const fallback = !uri || uri === failedUri;
  const source = fallback ? covers[key as keyof typeof covers] ?? covers.A1 : { uri };
  return (
    <View style={[s.cover, style]}>
      <Image source={source} resizeMode="cover" style={[s.image, hero && fallback && s.heroImage]}
        onError={() => setFailedUri(uri)} accessibilityIgnoresInvertColors accessible={false} />
      {fallback && !hero && !badge && captions[key] ? <View pointerEvents="none" style={s.captionShade}>
        {captions[key].map((line, index) => <Text key={line} maxFontSizeMultiplier={1.2} style={[s.caption, index === captions[key].length - 1 && s.captionLast]}>{line}</Text>)}
        <View style={s.captionRule} />
      </View> : null}
      {!hero && badge ? <View pointerEvents="none" style={[s.statusBadge, badge === 'soon' && s.soonBadge]}>
        <CourseVisualIcon name={badge === 'soon' ? 'clock' : 'lock'} color={badge === 'soon' ? '#FFF' : colors.gold} size={15} />
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[s.statusText, badge === 'soon' && { color: '#FFF' }]}>{badge === 'soon' ? 'Próximamente' : 'Premium'}</Text>
      </View> : null}
      {level ? <View style={[s.badge, hero && s.heroBadge, badge && { backgroundColor: badge === 'premium' ? '#70501F' : '#56677D' }]}><Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[s.level, hero && s.heroLevel]}>{level}</Text></View> : null}
    </View>
  );
}
const s = StyleSheet.create({
  cover: { backgroundColor: '#DDEBFA', overflow: 'hidden' },
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  // Preserve the skyline/landmark tops when the local landscape cover becomes a wide hero.
  heroImage: { height: '133.333%' },
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#0056CE', borderRadius: 30, paddingHorizontal: 9, paddingVertical: 4, maxWidth: '85%' },
  level: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#FFF' },
  heroBadge: { top: 14, left: 14, borderRadius: 30, paddingHorizontal: 12, paddingVertical: 6 },
  heroLevel: { fontSize: 19, lineHeight: 25 },
  captionShade: { position: 'absolute', bottom: -3, left: -3, right: -3, backgroundColor: '#004BA9A6', padding: 10, paddingTop: 15, paddingBottom: 13, borderTopRightRadius: 42, transform: [{ rotate: '-5deg' }] },
  caption: { color: colors.white, fontSize: 14, lineHeight: 16, letterSpacing: -.3, fontWeight: '900', fontStyle: 'italic', textShadowColor: '#002D69', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  captionLast: { fontSize: 17, lineHeight: 21, marginLeft: 6 },
  captionRule: { height: 2, width: 34, borderRadius: 2, backgroundColor: '#BCE3FF', marginLeft: 9, marginTop: 3 },
  statusBadge: { position: 'absolute', bottom: 10, left: 7, right: 7, paddingHorizontal: 6, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10, backgroundColor: '#FFE9B5' },
  soonBadge: { backgroundColor: '#172C49C9' },
  statusText: { flexShrink: 1, fontSize: 11, lineHeight: 15, fontWeight: '700', color: colors.gold },
});
