import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { homePreviewModes, type HomePreviewMode } from '../devPreview';

/** Loaded by HomeScreen only in DEV. Selection/hiding live in screen memory. */
export function HomePreviewControl({ mode, onSelect, onHide }: { mode: HomePreviewMode; onSelect: (mode: HomePreviewMode) => void; onHide: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={s.panel}>
    <View style={s.row}><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={s.button}>
      <Text style={s.text}>DEV · Home: {mode}</Text>
    </Pressable><Pressable accessibilityRole="button" accessibilityLabel="Ocultar preview. Mantén pulsado el saludo para volver a mostrarlo" onPress={onHide} style={s.button}><Text style={s.text}>Ocultar</Text></Pressable></View>
    {expanded ? <View style={s.options}>{homePreviewModes.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} style={s.button}
      onPress={() => { onSelect(value); setExpanded(false); }}><Text style={s.text}>{value === 'COURSE_COMPLETED' ? 'COMPLETED' : value}</Text></Pressable>)}</View> : null}
  </View>;
}
const s = StyleSheet.create({
  panel: { backgroundColor: '#F0F5FA', borderRadius: 10, paddingHorizontal: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  options: { flexDirection: 'row', flexWrap: 'wrap' },
  button: { minHeight: 48, paddingHorizontal: 6, justifyContent: 'center' },
  text: { color: '#345270', fontSize: 12, fontWeight: '600' },
});
