import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { calendarPreview, calendarPreviewPresentation, type CalendarMode } from '../devPreview';
import { CalendarCard, CalendarLegend } from './CalendarCard';
import { CalendarSummaryView } from './CalendarSummary';
import { shiftMonth } from '../presentation';

export function ProgressPreviewControl<T extends string>({ mode, modes, onSelect, onHide }: { mode: T; modes: readonly T[]; onSelect: (mode: T) => void; onHide: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={s.panel}><View style={s.row}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={s.button}><Text style={s.text}>DEV · Progress: {mode}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Ocultar controles de vista previa" onPress={onHide} style={s.button}><Text style={s.text}>Ocultar</Text></Pressable>
  </View>{expanded ? <View style={s.row}>{modes.map(value => <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === value }} key={value} style={s.button} onPress={() => { onSelect(value); setExpanded(false); }}><Text style={s.text}>{value}</Text></Pressable>)}</View> : null}</View>;
}
/** DEV-only independent calendar navigation: never invokes APIs or writes to the real cache. */
export function CalendarPreview({ mode }: { mode: Exclude<CalendarMode, 'REAL'> }) {
  const [month, setMonth] = useState('2026-10');
  const data = calendarPreview(mode, month);
  return <><CalendarSummaryView currentStreakDays={calendarPreviewPresentation[mode].currentStreakDays} calendar={data} />
    <CalendarCard month={month} today={data.today} data={data} onPrevious={() => { if (month > '0001-01') setMonth(shiftMonth(month, -1)); }} onNext={() => { if (month < '2026-10') setMonth(shiftMonth(month, 1)); }} /><CalendarLegend /></>;
}
const s = StyleSheet.create({
  panel: { backgroundColor: '#F0F5FA', borderRadius: 10, paddingHorizontal: 6 }, row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 6 }, text: { fontSize: 11, color: '#345270', fontWeight: '600' },
});
