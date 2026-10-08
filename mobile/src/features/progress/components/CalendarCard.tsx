import { Pressable, StyleSheet, Text, View } from 'react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { calendarGrid, dayLabel, learningDaysLabel, monthTitle, stateLabels, weekdays } from '../presentation';
import type { CalendarResponse, HistoryState } from '../types';
import { DayMark } from './DayMark';
import { colors } from '../../../theme';
import { s } from './styles';

export function CalendarCard({ month, today, data, onPrevious, onNext }: {
  month: string; today: string; data: CalendarResponse | null; onPrevious: () => void; onNext: () => void;
}) {
  const nextDisabled = month >= today.slice(0, 7), previousDisabled = month === '0001-01';
  return <View style={s.card}>
    <View style={c.navigation}><Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" accessibilityState={{ disabled: previousDisabled }} disabled={previousDisabled} onPress={onPrevious} style={c.arrow}><ChevronLeft color={previousDisabled ? '#BAC7D8' : colors.blue} size={27} /></Pressable>
      <Text accessibilityRole="header" style={c.month}>{monthTitle(month)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" accessibilityState={{ disabled: nextDisabled }} disabled={nextDisabled} onPress={onNext} style={c.arrow}><ChevronRight color={nextDisabled ? '#BAC7D8' : colors.blue} size={27} /></Pressable></View>
    <View style={c.week}>{weekdays.map((day, i) => <Text key={i} style={c.weekday}>{day}</Text>)}</View>
    {data ? <><View style={c.grid}>{calendarGrid(data).map(day => <View key={day.date} style={c.cell} accessible accessibilityLabel={day.inMonth ? dayLabel(day.date, day.state, data.today) : `${day.date}, fuera del mes`}>
      <View style={[c.date, day.state === 'LEARNED' && c.learned, day.state === 'PROTECTED' && c.protected, day.state === 'REPAIRED' && c.protected, day.state === 'BROKEN' && c.broken,
        day.joinLeft && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }, day.joinRight && { borderTopRightRadius: 0, borderBottomRightRadius: 0 }, day.today && c.today]}>
        {day.inMonth && day.state !== 'NONE' ? <DayMark state={day.state} size={27} /> : <View style={c.emptyMark} />}
        <Text style={[c.number, (!day.inMonth || day.future) && c.faint]}>{day.number}</Text>
      </View></View>)}</View><Text style={[s.body, { textAlign: 'center' }]}>{learningDaysLabel(data.learningDaysCount)} en {monthTitle(month).toLowerCase()}</Text></>
      : <View style={c.pending}><Text style={s.body}>El historial del mes aparecerá aquí.</Text></View>}
  </View>;
}
export function CalendarLegend() {
  return <><View style={c.legend}>{(['LEARNED', 'PROTECTED', 'REPAIRED', 'BROKEN'] as HistoryState[]).map(state => <View key={state} style={c.legendItem}><DayMark state={state} size={23} /><Text style={c.legendText}>{stateLabels[state]}</Text></View>)}</View>
    <Text style={s.body}>Los días protegidos y reparados mantienen tu racha, pero no cuentan como días de aprendizaje.</Text></>;
}
const c = StyleSheet.create({
  navigation: { flexDirection: 'row', alignItems: 'center' }, month: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: '800' },
  arrow: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' }, weekday: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }, cell: { width: '14.285714%', paddingVertical: 2 },
  date: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, borderRadius: 30, borderWidth: 1.5, borderColor: 'transparent', minHeight: 65 },
  learned: { backgroundColor: '#FFE5E8' }, protected: { backgroundColor: '#DFEEFF' }, broken: { backgroundColor: '#FFE8EC' }, today: { borderColor: colors.red },
  number: { fontSize: 15, lineHeight: 22, color: colors.ink, fontWeight: '600' }, faint: { color: '#9EAFCA', fontWeight: '400' }, emptyMark: { height: 33 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: '#F0F7FF', borderRadius: 16, padding: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: '44%', flexGrow: 1 }, legendText: { color: colors.ink, fontSize: 12, flexShrink: 1 }, pending: { minHeight: 350, justifyContent: 'center', alignItems: 'center' },
});
