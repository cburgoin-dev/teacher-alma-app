import { Pressable, StyleSheet, Text, View } from 'react-native';
import Coins from 'lucide-react-native/icons/coins';
import Flame from 'lucide-react-native/icons/flame';
import { AlmaLogo } from './AlmaLogo';
import { colors } from '../theme';
import type { GamificationAggregate } from '../features/gamification/types';

type Props = { data: GamificationAggregate | null; loading: boolean; error: string | null; onOpenShop: () => void };
/** Safe-area insets belong to the hosting screen. */
export function MainAppHeader({ data, loading, error, onOpenShop }: Props) {
  const available = !!data && !error && !loading;
  return <View style={s.row}>
    <AlmaLogo />
    <View style={s.pills}>
      <Pressable accessibilityRole="button" accessibilityLabel={available ? `${data.coins.balance} monedas. Abrir protección de racha` : 'Abrir protección de racha. Saldo no disponible'} accessibilityState={{ busy: loading }} onPress={onOpenShop} style={({ pressed }) => [s.pill, s.coin, pressed && { opacity: .7 }]}>
        <Coins size={20} color={colors.gold} accessible={false} /><Text maxFontSizeMultiplier={1.5} style={s.coinText}>{available ? data.coins.balance : '—'}</Text>
      </Pressable>
      <View accessible accessibilityLabel={available ? `Racha de ${data.streak.currentDays} días` : loading ? 'Cargando racha' : 'Racha no disponible'} style={[s.pill, s.streak]}>
        <Flame size={20} color="#C34A21" accessible={false} /><Text maxFontSizeMultiplier={1.5} style={s.streakText}>{available ? data.streak.currentDays : '—'}</Text>
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 'auto', flexShrink: 1, justifyContent: 'flex-end' },
  pill: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 1 },
  coin: { backgroundColor: colors.goldLight, borderColor: '#EED9A8' },
  streak: { backgroundColor: '#FFF1E9', borderColor: '#F5D8C7' },
  coinText: { color: colors.gold, fontWeight: '700', fontSize: 15, flexShrink: 1 },
  streakText: { color: '#A23D1C', fontWeight: '700', fontSize: 15, flexShrink: 1 },
});
