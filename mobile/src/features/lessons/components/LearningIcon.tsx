import { StyleSheet, View } from 'react-native';
export function LearningIcon({ kind, rose = false }: { kind: 'bulb' | 'chat' | 'pencil'; rose?: boolean }) {
  const color = rose ? '#F52A46' : '#0062E9';
  return <View accessible={false} style={[s.circle, { backgroundColor: rose ? '#FFE4E9' : '#DDEEFF' }]}>
    {kind === 'bulb' ? <><View style={[s.bulb, { borderColor: color }]} /><View style={[s.base, { backgroundColor: color }]} /></>
      : kind === 'chat' ? <View style={[s.chat, { backgroundColor: color }]}><View style={s.dot} /><View style={s.dot} /><View style={[s.tail, { backgroundColor: color }]} /></View>
        : <View style={[s.pencil, { backgroundColor: color }]} />}
  </View>;
}
const s = StyleSheet.create({
  circle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  bulb: { width: 17, height: 21, borderRadius: 10, borderWidth: 2.5 },
  base: { width: 9, height: 3, borderRadius: 2, marginTop: 2 },
  chat: { width: 25, height: 20, borderRadius: 10, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
  tail: { position: 'absolute', bottom: -3, left: 3, width: 7, height: 7, transform: [{ rotate: '20deg' }] },
  pencil: { width: 7, height: 26, borderRadius: 2, transform: [{ rotate: '40deg' }], borderBottomWidth: 4, borderBottomColor: '#A9CCF8' },
});
