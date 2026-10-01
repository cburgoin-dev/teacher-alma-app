import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GamificationIcon } from '../features/gamification/components/GamificationIcon';
import { AlmaLogo } from './AlmaLogo';
import { colors } from '../theme';
import type { GamificationAggregate } from '../features/gamification/types';

type Props = { data: GamificationAggregate | null; loading: boolean; error: string | null; onOpenShop: () => void };
/** Safe-area insets belong to the hosting screen. */
export function MainAppHeader({ data, loading, error, onOpenShop }: Props) {
  const available = !!data && !error && !loading;
  return <View style={s.row}>
    <AlmaLogo horizontal />
    <View style={s.pills}>
      <Pressable accessibilityRole="button" accessibilityLabel={available ? `${data.coins.balance} monedas. Abrir protección de racha` : 'Abrir protección de racha. Saldo no disponible'} accessibilityState={{ busy: loading }} onPress={onOpenShop} style={({ pressed }) => [s.pill, pressed && { opacity: .7 }]}>
        <View style={[s.surface, s.coin]}><GamificationIcon kind="coin" size={26} /><Text maxFontSizeMultiplier={1.5} style={s.coinText}>{available ? data.coins.balance : '—'}</Text></View>
      </Pressable>
      <View accessible accessibilityLabel={available ? `Racha de ${data.streak.currentDays} días` : loading ? 'Cargando racha' : 'Racha no disponible'} style={s.pill}>
        <View style={[s.surface, s.streak]}><GamificationIcon kind="flame" size={25} /><Text maxFontSizeMultiplier={1.5} style={s.streakText}>{available ? data.streak.currentDays : '—'}</Text></View>
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 'auto', flexShrink: 1, justifyContent: 'flex-end' },
  pill: { minHeight: 48, justifyContent: 'center', maxWidth: '100%' },
  surface: { minHeight: 36, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, flexDirection: 'row', gap: 5, alignItems: 'center', borderWidth: 1 },
  coin: { backgroundColor: '#FFFBF2', borderColor: '#F6E9C8', shadowColor: '#A57624', shadowOffset: { width: 0, height: 1 }, shadowOpacity: .08, shadowRadius: 3, elevation: 1 },
  streak: { backgroundColor: '#FFF5EF', borderColor: '#F9E4D8' },
  coinText: { color: colors.ink, fontWeight: '800', fontSize: 16, flexShrink: 1, fontVariant: ['tabular-nums'] },
  streakText: { color: colors.ink, fontWeight: '800', fontSize: 16, flexShrink: 1, fontVariant: ['tabular-nums'] },
});
