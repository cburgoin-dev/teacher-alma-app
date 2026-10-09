import { StyleSheet, Text, View } from 'react-native';
import { GamificationIcon } from '../../gamification/components/GamificationIcon';
import type { GamificationAggregate } from '../../gamification/types';
import type { CalendarResponse } from '../types';
import { monthTitle } from '../presentation';

export function CalendarSummary({ gamification, calendar }: { gamification: GamificationAggregate | null; calendar: CalendarResponse | null }) {
  return <CalendarSummaryView currentStreakDays={gamification?.streak.currentDays ?? null} calendar={calendar} />;
}

/** Presentation only: REAL is adapted above; DEV supplies an explicit fixture value. */
export function CalendarSummaryView({ currentStreakDays, calendar }: { currentStreakDays: number | null; calendar: CalendarResponse | null }) {
  return <View style={s.summary}>
    <View style={s.streak}><View accessible={false} importantForAccessibility="no-hide-descendants" style={s.flame}><GamificationIcon kind="flame" size={52} /></View><View style={s.copy}>
      <Text style={s.label}>Racha actual</Text><Text style={s.value}>{currentStreakDays !== null ? `${currentStreakDays} ${currentStreakDays === 1 ? 'día' : 'días'}` : 'Sin datos'}</Text>
    {currentStreakDays !== null ? <Text style={s.encouragement}>{currentStreakDays > 0 ? 'Sigue así, vas muy bien.' : 'Cada día es un nuevo comienzo.'}</Text> : null}
    </View></View>
    <View style={s.month} accessible accessibilityLabel={calendar ? `${calendar.learningDaysCount} días de aprendizaje en ${monthTitle(calendar.month)}` : 'Días de aprendizaje: cargando'}>
      <Text style={s.monthValue}>{calendar ? `${calendar.learningDaysCount} ${calendar.learningDaysCount === 1 ? 'día' : 'días'}` : '…'}</Text>
      <Text style={s.monthLabel}>de aprendizaje este mes</Text>
    </View>
  </View>;
}
const s = StyleSheet.create({
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderRadius: 20, padding: 14, gap: 12, backgroundColor: '#FFF6F4', borderWidth: 1, borderColor: '#FBE1DE' },
  streak: { flex: 1.7, minWidth: 185, flexDirection: 'row', alignItems: 'center', gap: 9 }, copy: { flex: 1, gap: 3 },
  label: { color: '#273354', fontSize: 13, lineHeight: 18, fontWeight: '700' }, value: { color: '#101B4D', fontSize: 29, lineHeight: 36, fontWeight: '800', letterSpacing: -.5 },
  month: { flex: 1, minWidth: 96, backgroundColor: '#FFEBEF', borderRadius: 13, paddingVertical: 9, paddingHorizontal: 11, gap: 3 },
  flame: { width: 60, height: 66, borderRadius: 33, backgroundColor: '#FFE7E9', alignItems: 'center', justifyContent: 'center' },
  encouragement: { color: '#627DA5', fontSize: 12, lineHeight: 17 },
  monthValue: { color: '#94394C', fontSize: 18, lineHeight: 23, fontWeight: '800' }, monthLabel: { color: '#79536A', fontSize: 11, lineHeight: 16 },
});
