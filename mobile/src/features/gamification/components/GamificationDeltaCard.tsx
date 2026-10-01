import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme';
import type { GamificationDelta } from '../types';
import { presetLabel, rewardLabel } from '../presentation';

export function GamificationDeltaCard({ delta }: { delta?: GamificationDelta }) {
  if (!delta) return null;
  return <View style={s.card}>
    <Text style={s.heading}>Tu progreso de hoy</Text>
    <Text style={s.coins}>{delta.coinsEarned > 0 ? `+${delta.coinsEarned} monedas ganadas` : 'Sin monedas nuevas en esta sesión'}</Text>
    {delta.coinRewards.map((reward, index) => <Text key={`${reward.reason}-${index}`} style={s.detail}>{rewardLabel(reward.reason)} · +{reward.amount}</Text>)}
    <Text style={s.body}>Racha de {delta.streak.currentDays} {delta.streak.currentDays === 1 ? 'día' : 'días'}</Text>
    <Text style={s.detail}>{delta.streak.advancedToday ? '¡Tu racha avanzó hoy!' : 'Sin avance adicional de racha en esta sesión.'}</Text>
    {delta.streak.protectedDate ? <Text style={s.detail}>Día protegido: {delta.streak.protectedDate}</Text> : null}
    <Text style={s.body}>Meta diaria · {presetLabel[delta.dailyGoal.preset]} · {delta.dailyGoal.progress}/{delta.dailyGoal.target}</Text>
    {delta.dailyGoal.completed ? <Text style={s.detail}>Meta completada{delta.dailyGoal.rewardEarnedNow > 0 ? ` · +${delta.dailyGoal.rewardEarnedNow} monedas en esta sesión` : ''}</Text> : null}
  </View>;
}
const s = StyleSheet.create({
  card: { width: '100%', backgroundColor: colors.pale, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, gap: 6 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.ink },
  coins: { color: colors.gold, fontSize: 17, fontWeight: '700' },
  body: { color: colors.ink, fontSize: 15, fontWeight: '600', marginTop: 6 },
  detail: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
