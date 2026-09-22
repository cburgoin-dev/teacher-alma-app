import { StyleSheet, View } from 'react-native';

// Scalable native shapes; no font-loading race or extra dependency.
export function NavigationIcon({ name, color, size = 26, filled = false }: {
  name: 'Home' | 'CoursesTab' | 'Progress' | 'Profile'; color: string; size?: number; filled?: boolean;
}) {
  return <View accessible={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[s.canvas, { transform: [{ scale: size / 26 }] }]}>
      {name === 'CoursesTab' ? <View style={s.book}>
        <View style={[s.page, s.leftPage, { borderColor: color, backgroundColor: filled ? color : 'transparent' }]} />
        <View style={[s.page, s.rightPage, { borderColor: color, backgroundColor: filled ? color : 'transparent' }]} />
      </View> : null}
      {name === 'Progress' ? <View style={s.bars}>{[10, 17, 24].map(height => <View key={height} style={{ width: 5, height, borderRadius: 3, backgroundColor: color }} />)}</View> : null}
      {name === 'Profile' ? <><View style={[s.head, { borderColor: color }]} /><View style={[s.shoulders, { borderColor: color }]} /></> : null}
      {name === 'Home' ? <><View style={[s.roof, { borderColor: color }]} /><View style={[s.house, { borderColor: color }]} /><View style={[s.door, { borderColor: color }]} /></> : null}
    </View>
  </View>;
}
const s = StyleSheet.create({
  canvas: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  book: { flexDirection: 'row', gap: 1.5 },
  page: { width: 11.5, height: 20, borderWidth: 1.8 },
  leftPage: { borderTopLeftRadius: 4, borderTopRightRadius: 6, borderBottomLeftRadius: 1, borderBottomRightRadius: 3 },
  rightPage: { borderTopRightRadius: 4, borderTopLeftRadius: 6, borderBottomRightRadius: 1, borderBottomLeftRadius: 3 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  head: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, marginBottom: 3 },
  shoulders: { width: 22, height: 11, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 2 },
  roof: { width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2, transform: [{ rotate: '45deg' }], position: 'absolute', top: 2 },
  house: { width: 18, height: 15, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: 9 },
  door: { position: 'absolute', bottom: 1, width: 7, height: 9, borderWidth: 2, borderBottomWidth: 0, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: '#FFF' },
});
