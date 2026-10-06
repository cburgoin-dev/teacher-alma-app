import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AlmaLogo } from './AlmaLogo';
import { GamificationMetrics, type MetricProps } from './GamificationMetrics';
/** Safe-area insets belong to the hosting screen; long values may wrap. */
export function MainAppHeader(props: MetricProps) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 390 || fontScale > 1.3;
  const logoWidth = width < 360 || fontScale > 1.3 ? 150 : 172;
  return <View style={s.row}><AlmaLogo horizontal horizontalWidth={logoWidth} trimHorizontal /><GamificationMetrics {...props} compact={compact} /></View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', minHeight: 48, columnGap: 6, rowGap: 2 },
});
