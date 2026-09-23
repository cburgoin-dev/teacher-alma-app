import { StyleSheet, View } from 'react-native';

// Decorative only: small native silhouettes, excluded from touch/accessibility.
// Placement uses the empty lower corner of a stop, never its label or connector.
export function PathScenery({ variant, right }: { variant: number; right: boolean }) {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[s.scene, right ? { right: -10 } : { left: -10 }]}>
    {variant === 0 ? <View style={s.cloud}><View style={s.cloudTop} /><View style={s.cloudSmall} /></View> : null}
    {variant === 1 ? <View style={s.books}>
      <View style={[s.book, { backgroundColor: '#559FDA', transform: [{ rotate: '5deg' }] }]}><View style={s.pages} /></View>
      <View style={[s.book, { backgroundColor: '#F17B8D', marginTop: -29, marginLeft: 8, transform: [{ rotate: '-9deg' }] }]}><View style={s.pages} /></View>
    </View> : null}
    {variant === 2 ? <View style={s.garden}>
      <View style={[s.leaf, { left: 0, transform: [{ rotate: '-30deg' }] }]} />
      <View style={[s.leaf, { left: 22, height: 48, top: -9, backgroundColor: '#8FC6AD' }]} />
      <View style={[s.leaf, { left: 42, transform: [{ rotate: '30deg' }] }]} />
      <View style={s.ground} />
    </View> : null}
    {variant === 3 ? <View style={s.calendar}>
      <View style={s.calendarTop} />
      <View style={s.days}>{[0, 1, 2, 3, 4, 5].map(day => <View key={day} style={s.day} />)}</View>
    </View> : null}
    {variant === 4 ? <View style={s.globeStand}><View style={s.globe}>
      <View style={s.meridian} /><View style={s.equator} /><View style={s.land} />
    </View><View style={s.stem} /><View style={s.base} /></View> : null}
  </View>;
}
const s = StyleSheet.create({
  scene: { position: 'absolute', bottom: -4, width: 76, height: 53, transform: [{ scale: .7 }] },
  cloud: { position: 'absolute', bottom: 8, width: 72, height: 23, borderRadius: 16, backgroundColor: '#DDEFFA' },
  cloudTop: { position: 'absolute', bottom: 8, left: 19, width: 34, height: 34, borderRadius: 20, backgroundColor: '#DDEFFA' },
  cloudSmall: { position: 'absolute', bottom: 6, left: 6, width: 24, height: 25, borderRadius: 15, backgroundColor: '#DDEFFA' },
  books: { marginTop: 18, marginLeft: 8 },
  book: { width: 49, height: 22, borderRadius: 5, paddingVertical: 4, paddingLeft: 7, paddingRight: 2 },
  pages: { flex: 1, backgroundColor: '#F5FAFF', borderRadius: 2, borderBottomWidth: 2, borderColor: '#DCE5EE' },
  garden: { marginTop: 15 },
  leaf: { position: 'absolute', width: 27, height: 37, borderRadius: 18, backgroundColor: '#ADD5BB' },
  ground: { position: 'absolute', top: 28, left: -3, width: 78, height: 13, borderRadius: 10, backgroundColor: '#C8E4D5' },
  calendar: { width: 39, height: 43, marginLeft: 16, backgroundColor: '#F7FBFF', borderWidth: 1, borderColor: '#D6E2EE', borderRadius: 5, transform: [{ rotate: '9deg' }], overflow: 'hidden' },
  calendarTop: { height: 10, backgroundColor: '#EC8497' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 5 },
  day: { width: 6, height: 7, backgroundColor: '#8DBBE2', borderRadius: 2 },
  globeStand: { alignItems: 'center', transform: [{ rotate: '-8deg' }] },
  globe: { width: 38, height: 38, borderRadius: 21, backgroundColor: '#6DB5E5', borderWidth: 2, borderColor: '#438ABB', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  meridian: { position: 'absolute', width: 18, height: 37, borderRadius: 18, borderWidth: 1, borderColor: '#C2E8FC' },
  equator: { position: 'absolute', width: 37, height: 12, borderRadius: 18, borderWidth: 1, borderColor: '#C2E8FC' },
  land: { position: 'absolute', width: 12, height: 19, top: 3, left: 4, borderRadius: 7, backgroundColor: '#A5D1A5', transform: [{ rotate: '-24deg' }] },
  stem: { width: 4, height: 5, backgroundColor: '#438ABB' },
  base: { width: 26, height: 5, borderRadius: 4, backgroundColor: '#438ABB' },
});
