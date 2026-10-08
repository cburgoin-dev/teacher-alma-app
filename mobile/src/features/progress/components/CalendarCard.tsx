import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { calendarGrid, dayLabel, monthTitle, stateLabels, weekdays } from '../presentation';
import type { CalendarResponse, HistoryState } from '../types';
import { DayMark } from './DayMark';
import { GamificationIcon } from '../../gamification/components/GamificationIcon';
import { colors } from '../../../theme';
import { s } from './styles';

type Day = ReturnType<typeof calendarGrid>[number];
/** One compact visual unit; number remains readable over the real Gamification icon. */
export function CalendarDay({ day, today }: { day: Day; today: string }) {
  const { fontScale } = useWindowDimensions();
  const large = fontScale > 1.3;
  return <View style={[c.cell, large && { minHeight: 60 }]} accessible accessibilityLabel={day.inMonth ? dayLabel(day.date, day.state, today) : `${day.date}, fuera del mes`}>
    {day.state === 'LEARNED' ? <View testID="learned-band" style={[c.band, !day.joinLeft && c.bandStart, !day.joinRight && c.bandEnd]} /> : null}
    <View style={[c.date, day.today && c.today, day.state === 'PROTECTED' && c.protected, day.state === 'REPAIRED' && c.repaired, day.state === 'BROKEN' && c.broken]}>
      {day.state !== 'NONE' && day.state !== 'BROKEN' ? <View style={c.stateArt} accessible={false} importantForAccessibility="no-hide-descendants">
        <GamificationIcon kind={day.state === 'LEARNED' ? 'flame' : day.state === 'PROTECTED' ? 'protector' : 'repair'} size={38} />
      </View> : null}
      {day.state === 'BROKEN' ? <Text accessible={false} allowFontScaling={false} style={c.cross}>×</Text> : null}
      <Text maxFontSizeMultiplier={2} style={[c.number, day.state !== 'NONE' && day.state !== 'BROKEN' && c.overIcon, day.state === 'BROKEN' && c.brokenNumber, (!day.inMonth || day.future) && c.faint]}>{day.number}</Text>
    </View>
  </View>;
}
export function CalendarCard({ month, today, data, onPrevious, onNext }: {
  month: string; today: string; data: CalendarResponse | null; onPrevious: () => void; onNext: () => void;
}) {
  const nextDisabled = month >= today.slice(0, 7), previousDisabled = month === '0001-01';
  const days = data ? calendarGrid(data) : [];
  const rows = Array.from({ length: days.length / 7 }, (_, row) => days.slice(row * 7, row * 7 + 7));
  return <View style={[s.card, c.card]}>
    <View style={c.navigation}><Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" accessibilityState={{ disabled: previousDisabled }} disabled={previousDisabled} onPress={onPrevious} style={c.arrow}><ChevronLeft color={previousDisabled ? '#BAC7D8' : colors.blue} size={25} /></Pressable>
      <Text accessibilityRole="header" style={c.month}>{monthTitle(month)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" accessibilityState={{ disabled: nextDisabled }} disabled={nextDisabled} onPress={onNext} style={c.arrow}><ChevronRight color={nextDisabled ? '#BAC7D8' : colors.blue} size={25} /></Pressable></View>
    <View style={c.week}>{weekdays.map((day, i) => <Text key={i} style={c.weekday}>{day}</Text>)}</View>
    {data ? <View style={c.grid}>{rows.map(row => <View testID="calendar-week" key={row[0].date} style={c.week}>
      {row.map(day => <CalendarDay key={day.date} day={day} today={data.today} />)}
    </View>)}</View> : <View style={c.pending}><Text style={s.body}>El historial del mes aparecerá aquí.</Text></View>}
  </View>;
}
export function CalendarLegend() {
  return <View style={c.legend}>{(['LEARNED', 'PROTECTED', 'REPAIRED', 'BROKEN'] as HistoryState[]).map(state => <View key={state} style={c.legendItem}><DayMark state={state} size={17} /><Text style={c.legendText}>{stateLabels[state]}</Text></View>)}</View>;
}
const c = StyleSheet.create({
  card: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 14, gap: 8, backgroundColor: '#F0F7FF', borderColor: '#D5E7FC' },
  navigation: { flexDirection: 'row', alignItems: 'center' }, month: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  arrow: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' }, weekday: { flex: 1, textAlign: 'center', color: '#637DA4', fontSize: 12, fontWeight: '600', paddingVertical: 4 },
  grid: { gap: 2 }, cell: { flex: 1, minWidth: 0, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  date: { width: '100%', maxWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  band: { position: 'absolute', left: 0, right: 0, height: 32, backgroundColor: '#FFDBDF' }, bandStart: { borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }, bandEnd: { borderTopRightRadius: 18, borderBottomRightRadius: 18 },
  protected: { backgroundColor: '#DEEDFF' }, repaired: { backgroundColor: '#FFF0D0' }, broken: { backgroundColor: '#FFE7EC' }, today: { borderColor: '#E74C67' },
  stateArt: { position: 'absolute', top: -1, alignSelf: 'center' },
  number: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700', paddingHorizontal: 2 },
  overIcon: { marginTop: 16, backgroundColor: '#FFFC', borderRadius: 6, color: '#172743', lineHeight: 18, minWidth: 20, textAlign: 'center' },
  brokenNumber: { paddingTop: 7 }, cross: { position: 'absolute', top: -4, right: 3, color: '#DE294C', fontSize: 18, lineHeight: 20 }, faint: { color: '#95A8C3', fontWeight: '400' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 10, rowGap: 2, paddingHorizontal: 2, paddingVertical: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 2 }, legendText: { color: '#526A90', fontSize: 10, lineHeight: 15 }, pending: { minHeight: 258, justifyContent: 'center', alignItems: 'center' },
});
