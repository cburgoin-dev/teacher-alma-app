import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AlmaLogo } from './AlmaLogo';
import { GamificationMetrics, type MetricProps } from './GamificationMetrics';
/** Safe-area insets belong to the hosting screen; long values may wrap. */
export function MainAppHeader(props: MetricProps) {
  const { width, fontScale } = useWindowDimensions();
  const logoWidth = width < 360 || fontScale > 1.3 ? 140 : 148;
  return <View style={s.row}><AlmaLogo horizontal horizontalWidth={logoWidth} /><GamificationMetrics {...props} compact={width < 360 || fontScale > 1.3} /></View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
});
