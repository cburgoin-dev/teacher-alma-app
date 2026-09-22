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
  </View>;
}
const s = StyleSheet.create({
  scene: { position: 'absolute', bottom: 5, width: 76, height: 53, opacity: .85 },
  cloud: { position: 'absolute', bottom: 8, width: 72, height: 23, borderRadius: 16, backgroundColor: '#DDEFFA' },
  cloudTop: { position: 'absolute', bottom: 8, left: 19, width: 34, height: 34, borderRadius: 20, backgroundColor: '#DDEFFA' },
  cloudSmall: { position: 'absolute', bottom: 6, left: 6, width: 24, height: 25, borderRadius: 15, backgroundColor: '#DDEFFA' },
  books: { marginTop: 18, marginLeft: 8 },
  book: { width: 49, height: 22, borderRadius: 5, paddingVertical: 4, paddingLeft: 7, paddingRight: 2 },
  pages: { flex: 1, backgroundColor: '#F5FAFF', borderRadius: 2, borderBottomWidth: 2, borderColor: '#DCE5EE' },
  garden: { marginTop: 15 },
  leaf: { position: 'absolute', width: 27, height: 37, borderRadius: 18, backgroundColor: '#ADD5BB' },
  ground: { position: 'absolute', top: 28, left: -3, width: 78, height: 13, borderRadius: 10, backgroundColor: '#C8E4D5' },
});
