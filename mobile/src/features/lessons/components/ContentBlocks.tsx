import { useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button } from '../../courses/components/ui';
import type { Block } from '../types';
import { LearningIcon } from './LearningIcon';
import { lessonStyles as s } from './lessonStyles';

export function LessonImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <Text style={s.body}>{alt} · Imagen no disponible</Text> :
    <Image source={{ uri: url }} accessibilityLabel={alt} accessible resizeMode="contain"
      style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} onError={() => setFailed(true)} />;
}
// Isolated example composition leaves room for audio when a real contract supports it.
function Example({ block }: { block: Extract<Block, { type: 'EXAMPLE' }> }) {
  return <View style={[s.card, local.refined, local.example]}>
    <View style={local.row}><LearningIcon kind="chat" rose /><Text style={[s.heading, local.flex]}>{block.title ?? 'Ejemplos'}</Text></View>
    <View style={local.bubble}>
      {block.primaryText ? <Text style={[s.heading, { color: '#0062E9', fontSize: 18 }]}>{block.primaryText}</Text> : null}
      {block.secondaryText ? <View style={local.secondary}><Text style={s.body}>{block.secondaryText}</Text></View> : null}
    </View>
    {block.note ? <Text style={s.caption}>{block.note}</Text> : null}
  </View>;
}
export function ContentBlocks({ blocks }: { blocks: Block[] }) {
  const { width, fontScale } = useWindowDimensions();
  return <>{blocks.map(block => {
    if (block.type === 'ACTIVITY') return null;
    if (block.type === 'EXAMPLE') return <Example key={block.id} block={block} />;
    if (block.type === 'TEXT') return <View key={block.id} style={[s.card, local.refined]}>
      <View style={local.row}><LearningIcon kind="bulb" /><Text style={[s.heading, local.flex, { color: '#0062E9' }]}>{block.title ?? 'En resumen'}</Text></View>
      <Text style={[s.body, { lineHeight: 25 }]}>{block.body}</Text>
    </View>;
    if (block.type === 'VIDEO') return <View key={block.id} style={[s.card, local.refined, local.video]}>
      <View style={[local.mediaRow, (width < 350 || fontScale > 1.4) && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[local.preview, (width < 350 || fontScale > 1.4) && { width: 120 }]}>
          {block.posterUrl ? <LessonImage url={block.posterUrl} alt={block.title ?? 'Video de la lección'} /> :
            <View style={local.poster} accessible accessibilityLabel="Vista previa de video"><LearningIcon kind="video" plain size={38} /></View>}
        </View>
        <View style={local.mediaText}><Text style={s.heading}>{block.title ?? 'Una explicación en video'}</Text>
          {block.caption ? <Text style={s.caption}>{block.caption}</Text> : null}
        </View>
      </View>
      {block.url && /^https?:\/\//i.test(block.url) ? <Button title="Ver video ↗" tone="blue" onPress={() => {
        void Linking.openURL(block.url!).catch(() => Alert.alert('No pudimos abrir el video', 'Puedes continuar con el contenido de la lección.'));
      }} /> : <Text style={s.caption}>El video aún no está disponible. Puedes continuar con la lección.</Text>}
    </View>;
    if (block.type === 'SUMMARY') return <View key={block.id} style={s.card}>
      <Text style={[s.heading, { color: '#0062E9' }]}>{!block.title || block.title === 'Resumen de la lección' ? 'Lo que aprendiste' : block.title}</Text>
      {block.points?.map((point, i) => <View key={i} style={[local.row, local.point]}>
        <View style={local.number}><Text style={local.numberText}>{i + 1}</Text></View><Text style={[s.body, local.flex]}>{point}</Text>
      </View>)}
    </View>;
    return <View key={block.id} style={s.card}>
      {block.url ? <LessonImage url={block.url} alt={block.alt ?? 'Imagen de la lección'} /> : null}
      {block.caption ? <Text style={s.caption}>{block.caption}</Text> : null}
    </View>;
  })}</>;
}
const local = StyleSheet.create({
  refined: { elevation: 0, shadowOpacity: 0, borderRadius: 20, borderColor: '#E0EAF8', gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, flex: { flex: 1 },
  example: { backgroundColor: '#FFF7F8', borderColor: '#F9E8EC' },
  bubble: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E0EAF8', padding: 16, gap: 14 },
  secondary: { borderTopWidth: 1, borderColor: '#E7EEF8', paddingTop: 12 },
  video: { padding: 14 },
  mediaRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  preview: { width: '40%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#DCEEFE' },
  mediaText: { flexShrink: 1, gap: 8 },
  poster: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  point: { paddingVertical: 10, alignItems: 'flex-start' },
  number: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCEBFF', alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 19, fontWeight: '700', color: '#0062E9' },
});
