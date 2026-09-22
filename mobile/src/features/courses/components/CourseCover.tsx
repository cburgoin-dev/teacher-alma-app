import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '../../../theme';

const covers = {
  A1: require('../../../../assets/courses/a1-london.png'),
  A2: require('../../../../assets/courses/a2-new-york.png'),
  B1: require('../../../../assets/courses/b1-tower-bridge.png'),
  B2: require('../../../../assets/courses/b1-tower-bridge.png'),
  C1: require('../../../../assets/courses/c1-manhattan.png'),
  C2: require('../../../../assets/courses/c1-manhattan.png'),
};
const captions: Record<string, string> = { A1: 'Good things\nstart here', A2: 'Bigger conversations\nawait' };

export function CourseCover({ uri, level, style, hero = false }: {
  uri: string | null; level: string | null; style?: ViewStyle; hero?: boolean;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const key = level?.trim().toUpperCase() ?? '';
  const fallback = !uri || uri === failedUri;
  const source = fallback ? covers[key as keyof typeof covers] ?? covers.A1 : { uri };
  return (
    <View style={[s.cover, style]}>
      <Image source={source} resizeMode="cover" style={[s.image, hero && fallback && s.heroImage]}
        onError={() => setFailedUri(uri)} accessibilityIgnoresInvertColors accessible={false} />
      {fallback && !hero && captions[key] ? <View pointerEvents="none" style={s.captionShade}>
        <Text maxFontSizeMultiplier={1.2} style={s.caption}>{captions[key]}</Text>
      </View> : null}
      {level ? <View style={[s.badge, hero && s.heroBadge]}><Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[s.level, hero && s.heroLevel]}>{level}</Text></View> : null}
    </View>
  );
}
const s = StyleSheet.create({
  cover: { backgroundColor: '#DDEBFA', overflow: 'hidden' },
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  // Preserve the skyline/landmark tops when the local landscape cover becomes a wide hero.
  heroImage: { height: '133.333%' },
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#0056CE', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 7, maxWidth: '85%' },
  level: { fontSize: 19, lineHeight: 24, fontWeight: '800', color: '#FFF' },
  heroBadge: { top: 14, left: 14, borderRadius: 19, paddingHorizontal: 17, paddingVertical: 11 },
  heroLevel: { fontSize: 25, lineHeight: 31 },
  captionShade: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#004BA9B8', padding: 9, paddingBottom: 12 },
  caption: { color: colors.white, fontSize: 14, lineHeight: 17, fontWeight: '700', fontStyle: 'italic' },
});
