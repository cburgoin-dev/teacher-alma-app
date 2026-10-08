import { StyleSheet, Text, View } from 'react-native';
import { GamificationIcon } from '../../gamification/components/GamificationIcon';
import type { WeekState } from '../types';
import { colors } from '../../../theme';

export function DayMark({ state, size = 30, future = false }: { state: WeekState; size?: number; future?: boolean }) {
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.mark, { width: size + 6, height: size + 6, opacity: future ? .3 : 1 }]}>
    {state === 'LEARNED' || state === 'PROTECTED' || state === 'REPAIRED'
      ? <GamificationIcon kind={state === 'LEARNED' ? 'flame' : state === 'PROTECTED' ? 'protector' : 'repair'} size={size} />
      : <Text allowFontScaling={false} style={{ color: state === 'BROKEN' ? colors.red : '#8195B5', fontSize: state === 'BROKEN' ? size : 20, lineHeight: size + 4 }}>{state === 'BROKEN' ? '×' : '·'}</Text>}
  </View>;
}
const styles = StyleSheet.create({ mark: { alignItems: 'center', justifyContent: 'center' } });
