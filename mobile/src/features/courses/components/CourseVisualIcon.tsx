import { StyleSheet, View } from 'react-native';

// Small presentation-only symbols, independent of text glyphs and font availability.
export function CourseVisualIcon({ name, color, size = 22 }: { name: 'arrow' | 'lock' | 'clock'; color: string; size?: number }) {
  return <View accessible={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[s.canvas, { transform: [{ scale: size / 24 }] }]}>
      {name === 'arrow' ? <><View style={[s.shaft, { backgroundColor: color }]} /><View style={[s.tip, { borderColor: color }]} /></> : null}
      {name === 'clock' ? <View style={[s.clock, { borderColor: color }]}><View style={[s.minute, { backgroundColor: color }]} /><View style={[s.hour, { backgroundColor: color }]} /></View> : null}
      {name === 'lock' ? <><View style={[s.shackle, { borderColor: color }]} /><View style={[s.lock, { backgroundColor: color }]} /></> : null}
    </View>
  </View>;
}
const s = StyleSheet.create({
  canvas: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  shaft: { position: 'absolute', width: 21, height: 2.7, borderRadius: 2 },
  tip: { position: 'absolute', right: 2, width: 12, height: 12, borderRightWidth: 2.7, borderTopWidth: 2.7, transform: [{ rotate: '45deg' }] },
  clock: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  minute: { position: 'absolute', left: 8, top: 3, height: 7, width: 2, borderRadius: 1 },
  hour: { position: 'absolute', left: 8, top: 9, height: 2, width: 6, borderRadius: 1, transform: [{ rotate: '25deg' }] },
  shackle: { width: 12, height: 13, borderRadius: 7, borderWidth: 2.5, position: 'absolute', top: 1 },
  lock: { width: 18, height: 13, borderRadius: 3, position: 'absolute', bottom: 1 },
});
