import { StyleSheet, Text, View } from 'react-native';
import Target from 'lucide-react-native/icons/target';
import Check from 'lucide-react-native/icons/check';
import { colors } from '../../../theme';
import type { GamificationDelta } from '../types';
import { presetLabel, rewardLabel } from '../presentation';
import { GamificationIcon } from './GamificationIcon';

export function GamificationDeltaCard({ delta, emphasis = 'standard' }: { delta?: GamificationDelta; emphasis?: 'standard' | 'celebration' | 'quiet' }) {
  if (!delta) return null;
  // Daily Goal has its own row below: never repeat its amount in the breakdown.
  const rewards = delta.coinRewards.filter(reward => reward.reason !== 'DAILY_GOAL');
  const progress = delta.dailyGoal.target > 0 ? Math.min(100, Math.max(0, delta.dailyGoal.progress / delta.dailyGoal.target * 100)) : 0;
  return <View style={s.group}>
    <View style={[s.tile, s.coins, emphasis === 'celebration' && s.celebration, emphasis === 'quiet' && s.quiet]}>
      <GamificationIcon kind="coin" size={emphasis === 'quiet' ? 30 : 38} />
      <View style={s.text}>
        <Text style={s.value}>{delta.coinsEarned > 0 ? `+${delta.coinsEarned}` : '0'} <Text style={s.unit}>monedas</Text></Text>
        <Text style={s.caption}>{delta.coinsEarned > 0 ? 'Ganadas en esta sesión' : 'Sin monedas nuevas'}</Text>
      </View>
    </View>
    {rewards.length ? <View style={s.breakdown}>{rewards.map((reward, index) => <View key={`${reward.reason}-${index}`} style={s.rewardRow}>
      <View style={s.rewardDot} /><Text style={s.rewardLabel}>{rewardLabel(reward.reason)}</Text><Text style={s.amount}>+{reward.amount}</Text>
    </View>)}</View> : null}
    <View style={s.goal}>
      <View style={s.goalHeading}>
        <View style={s.goalIcon}>{delta.dailyGoal.completed ? <Check size={19} color={colors.blue} accessible={false} /> : <Target size={19} color={colors.blue} accessible={false} />}</View>
        <View style={s.text}><Text style={s.goalTitle}>Meta diaria <Text style={s.caption}>· {presetLabel[delta.dailyGoal.preset]}</Text></Text></View>
        <Text style={s.ratio}>{Math.min(delta.dailyGoal.progress, delta.dailyGoal.target)}/{delta.dailyGoal.target}</Text>
      </View>
      <View style={s.track} accessibilityRole="progressbar" accessibilityLabel="Meta diaria" accessibilityValue={{ min: 0, max: delta.dailyGoal.target, now: Math.min(delta.dailyGoal.progress, delta.dailyGoal.target), text: `${delta.dailyGoal.progress} de ${delta.dailyGoal.target} sesiones` }}>
        <View style={[s.fill, { width: `${progress}%` }]} />
      </View>
      <View style={s.goalFooter}>
        <Text style={[s.caption, { flex: 1 }]}>{delta.dailyGoal.completed ? 'Meta completada' : 'Cada sesión cuenta'}</Text>
        {delta.dailyGoal.rewardEarnedNow > 0 ? <View style={s.goalReward}><GamificationIcon kind="coin" size={18} /><Text style={s.amount}>+{delta.dailyGoal.rewardEarnedNow} <Text style={s.caption}>incluidas en el total</Text></Text></View> : null}
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  group: { width: '100%', gap: 9 },
  tile: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 9, borderWidth: 1, borderRadius: 17 },
  text: { flex: 1, minWidth: 0, gap: 3 },
  coins: { backgroundColor: '#FFFAEF', borderColor: '#F7E7C7' },
  celebration: { backgroundColor: '#FFF3D5', borderColor: '#EED294' },
  quiet: { backgroundColor: '#FBFCFE', borderColor: colors.border },
  value: { fontSize: 23, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 14, fontWeight: '600' },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '400' },
  breakdown: { paddingHorizontal: 12, paddingVertical: 3, gap: 5 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#DCA537' },
  rewardLabel: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 },
  amount: { color: colors.gold, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  goal: { backgroundColor: '#F4F8FE', borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 12, gap: 9 },
  goalHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalIcon: { backgroundColor: '#E0EDFF', padding: 6, borderRadius: 10 },
  goalTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  ratio: { color: colors.blue, fontSize: 16, fontWeight: '800', flexShrink: 1, fontVariant: ['tabular-nums'] },
  track: { height: 7, borderRadius: 4, backgroundColor: '#DCE8F8', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.blue },
  goalFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  goalReward: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
});
