import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AlmaLogo } from './AlmaLogo';
import { GamificationMetrics, type MetricProps } from './GamificationMetrics';
/** Safe-area insets belong to the hosting screen; long values may wrap. */
export function MainAppHeader({ home = false, ...props }: MetricProps & { home?: boolean }) {
  const { width, fontScale } = useWindowDimensions();
  const logoWidth = home ? (width < 360 ? 148 : 164) : width < 360 || fontScale > 1.3 ? 140 : 148;
  return <View style={s.row}><AlmaLogo horizontal horizontalWidth={logoWidth} /><GamificationMetrics {...props} compact={width < 360 || fontScale > 1.3} /></View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
});
