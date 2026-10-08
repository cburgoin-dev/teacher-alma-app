import { StyleSheet, Text, View } from 'react-native';
import { GamificationIcon } from '../../gamification/components/GamificationIcon';
import type { GamificationAggregate } from '../../gamification/types';
import type { CalendarResponse } from '../types';
import { monthTitle } from '../presentation';

export function CalendarSummary({ gamification, calendar }: { gamification: GamificationAggregate | null; calendar: CalendarResponse | null }) {
  return <View style={s.summary}>
    <View style={s.streak}><View accessible={false}><GamificationIcon kind="flame" size={39} /></View><View style={s.copy}>
      <Text style={s.label}>Racha actual</Text><Text style={s.value}>{gamification ? `${gamification.streak.currentDays} ${gamification.streak.currentDays === 1 ? 'día' : 'días'}` : 'Sin datos'}</Text>
    </View></View>
    <View style={s.month} accessible accessibilityLabel={calendar ? `${calendar.learningDaysCount} días de aprendizaje en ${monthTitle(calendar.month)}` : 'Días de aprendizaje: cargando'}>
      <Text style={s.monthValue}>{calendar ? `${calendar.learningDaysCount} ${calendar.learningDaysCount === 1 ? 'día' : 'días'}` : '…'}</Text>
      <Text style={s.monthLabel}>de aprendizaje{calendar ? ` en ${monthTitle(calendar.month).toLowerCase()}` : ' este mes'}</Text>
    </View>
  </View>;
}
const s = StyleSheet.create({
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderRadius: 20, padding: 14, gap: 12, backgroundColor: '#FFF6F4', borderWidth: 1, borderColor: '#FBE1DE' },
  streak: { flex: 1.2, minWidth: 130, flexDirection: 'row', alignItems: 'center', gap: 7 }, copy: { flex: 1, gap: 3 },
  label: { color: '#6E6375', fontSize: 12, lineHeight: 17 }, value: { color: '#101B4D', fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -.5 },
  month: { flex: 1, minWidth: 108, backgroundColor: '#FFE9EA', borderRadius: 13, paddingVertical: 9, paddingHorizontal: 11, gap: 3 },
  monthValue: { color: '#94394C', fontSize: 18, lineHeight: 23, fontWeight: '800' }, monthLabel: { color: '#79536A', fontSize: 11, lineHeight: 16 },
});
