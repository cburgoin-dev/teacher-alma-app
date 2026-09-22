import { StyleSheet, View } from 'react-native';

// Small native shapes keep navigation independent of an icon/font dependency.
export function NavigationIcon({ name, color, size = 26 }: { name: 'Home' | 'CoursesTab' | 'Progress' | 'Profile'; color: string; size?: number }) {
  return <View accessible={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {name === 'CoursesTab' ? <View style={s.book}><View style={[s.page, { borderColor: color, borderTopLeftRadius: 5, borderBottomLeftRadius: 3 }]} /><View style={[s.page, { borderColor: color, borderTopRightRadius: 5, borderBottomRightRadius: 3 }]} /></View> : null}
    {name === 'Progress' ? <View style={s.bars}>{[10, 17, 24].map(height => <View key={height} style={{ width: 5, height, borderRadius: 3, backgroundColor: color }} />)}</View> : null}
    {name === 'Profile' ? <><View style={[s.head, { borderColor: color }]} /><View style={[s.shoulders, { borderColor: color }]} /></> : null}
    {name === 'Home' ? <><View style={[s.roof, { borderColor: color }]} /><View style={[s.house, { borderColor: color }]} /></> : null}
  </View>;
}
const s = StyleSheet.create({
  book: { flexDirection: 'row', gap: 2 }, page: { width: 11, height: 20, borderWidth: 2 }, bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  head: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, marginBottom: 3 }, shoulders: { width: 22, height: 11, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 2 },
  roof: { width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2, transform: [{ rotate: '45deg' }], position: 'absolute', top: 2 },
  house: { width: 18, height: 15, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: 9 },
});
