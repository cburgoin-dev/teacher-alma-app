import { useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button } from '../../courses/components/ui';
import type { Block } from '../types';
import { mediaUrl, summaryTakeaways } from '../contentPresentation';
import { AudioButton, DialogueRow, RichText } from './RichContent';
import { LearningIcon } from './LearningIcon';
import { lessonStyles as s } from './lessonStyles';

export function LessonImage({ url, alt, wide = false }: { url: string; alt: string; wide?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return failedUrl === url ? <Text style={s.body}>{alt} · Imagen no disponible</Text> :
    <Image source={{ uri: url }} accessibilityLabel={alt} accessible resizeMode="contain"
      style={{ width: '100%', aspectRatio: wide ? 16 / 9 : 4 / 3, borderRadius: 14 }} onError={() => setFailedUrl(url)} />;
}
function Example({ block }: { block: Extract<Block, { type: 'EXAMPLE' }> }) {
  return <View style={[local.card, local.example]}>
    <View style={local.row}><LearningIcon kind="chat" rose /><Text style={[s.heading, local.flex]}>{block.title ?? 'Ejemplos'}</Text></View>
    {block.variant === 'DIALOGUE' ? block.turns.map((turn, i) => <DialogueRow key={i} turn={turn} alternate={i % 2 === 1} />) : <>
      <View style={local.bubble}>
        {block.primaryText ? <Text style={[s.heading, local.blue]}>{block.primaryText}</Text> : null}
        {block.secondaryText ? <Text style={s.body}>{block.secondaryText}</Text> : null}
      </View>
      {block.note ? <Text style={s.caption}>{block.note}</Text> : null}
    </>}
  </View>;
}
export function SummaryContent({ block }: { block: Extract<Block, { type: 'SUMMARY' }> }) {
  const { width, fontScale } = useWindowDimensions();
  const indent = width >= 360 && fontScale <= 1.3 ? 54 : 0;
  return <>
    {block.subtitle ? <Text style={[s.body, { marginTop: -8 }]}>{block.subtitle}</Text> : null}
    <View style={[local.card, { gap: 0 }]}>
      {summaryTakeaways(block).map((point, i) => <View key={i} style={[local.point, i > 0 && local.divider]}>
        <View style={local.number}><Text style={local.numberText}>{i + 1}</Text></View>
        <View style={local.flex}><RichText text={point.text} segments={point.segments} /></View>
      </View>)}
    </View>
    {block.keyPhrases?.length ? <View style={[local.card, local.example]}>
      <View style={local.row}><LearningIcon kind="chat" rose /><View style={local.flex}><Text style={s.heading}>Frases clave de la lección</Text><Text style={s.caption}>Practica y memoriza estas frases clave.</Text></View></View>
      {block.keyPhrases.map((phrase, i) => <View key={i} style={[local.bubble, local.row, { marginLeft: indent }]}>
        <View style={local.flex}><Text style={[s.heading, local.blue]}>{phrase.text}</Text>
          {phrase.translation ? <Text style={s.body}>{phrase.translation}</Text> : null}</View>
        <AudioButton {...phrase} />
      </View>)}
    </View> : null}
  </>;
}
export function ContentBlocks({ blocks }: { blocks: Block[] }) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.25;
  return <>{blocks.map(block => {
    if (block.type === 'ACTIVITY') return null;
    if (block.type === 'EXAMPLE') return <Example key={block.id} block={block} />;
    if (block.type === 'TEXT') return <View key={block.id} style={[local.card, local.concept]}>
      <LearningIcon kind="bulb" /><View style={local.conceptText}>
        <Text style={[s.heading, local.blue]}>{block.title ?? 'En resumen'}</Text>
        <RichText text={block.body} segments={block.segments} />
      </View>
    </View>;
    if (block.type === 'VIDEO') return <View key={block.id} style={[local.card, { padding: 12 }]}>
      <View style={[local.mediaRow, stacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={[local.preview, stacked && { width: '100%' }]}>
          {block.posterUrl ? <LessonImage url={block.posterUrl} alt={block.title ?? 'Video de la lección'} /> :
            <View style={local.poster} accessible accessibilityLabel="Vista previa de video"><LearningIcon kind="video" plain size={42} color="#73A1CC" /></View>}
        </View>
        <View style={local.mediaText}><Text style={[s.heading, { fontSize: 16, lineHeight: 22 }]}>{block.title ?? 'Una explicación en video'}</Text>
          {block.caption ? <Text style={s.caption}>{block.caption}</Text> : null}
        </View>
      </View>
      {mediaUrl(block.url) ? <Button title="Ver video ↗" tone="blue" onPress={() => {
        void Linking.openURL(block.url!).catch(() => Alert.alert('No pudimos abrir el video', 'Puedes continuar con el contenido de la lección.'));
      }} /> : null}
    </View>;
    if (block.type === 'SUMMARY') return <SummaryContent key={block.id} block={block} />;
    return <View key={block.id} style={local.card}>
      {block.url ? <LessonImage url={block.url} alt={block.alt ?? 'Imagen de la lección'} /> : null}
      {block.caption ? <Text style={s.caption}>{block.caption}</Text> : null}
    </View>;
  })}</>;
}
const local = StyleSheet.create({
  card: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#DFEAFA', backgroundColor: '#F0F6FF', gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, flex: { flex: 1 }, blue: { color: '#0062E9' },
  concept: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, conceptText: { flex: 1, gap: 8 },
  example: { backgroundColor: '#FFF8F9', borderColor: '#FFF8F9' },
  bubble: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E0EAF8', padding: 14, gap: 10 },
  mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  preview: { width: '57%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#E0EDFA' },
  mediaText: { flex: 1, gap: 6 }, poster: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', gap: 14, paddingVertical: 14, alignItems: 'flex-start' },
  divider: { borderTopWidth: 1, borderTopColor: '#DCE8F9' },
  number: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DCEBFF', alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 22, fontWeight: '800', color: '#0062E9' },
});
