import { GamificationMetrics } from '../../../components/GamificationMetrics';
import { DevStreakReplay } from '../components/DevStreakReplay';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Check from 'lucide-react-native/icons/check';
import Clock from 'lucide-react-native/icons/clock';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import type { RootStackParamList } from '../../../navigation/types';
import { ContextualHeader } from '../../../components/ContextualHeader';
import { Button } from '../../courses/components/ui';
import { colors, shadows } from '../../../theme';
import { useGamification } from '../hooks/useGamification';
import { gamificationResource } from '../resource';
import { repairDeadline } from '../presentation';
import { GamificationIcon } from '../components/GamificationIcon';

export function GamificationShopScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'GamificationShop'>) {
  const state = useGamification();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 300 || fontScale > 1.3;
  const { data, loading, busy, pending, error, operationError, operationErrorCode, notice } = state;
  const disabled = busy || loading || !!error || !!pending;
  const repair = data?.streak.repair;
  const missingCoins = data ? Math.max(0, 50 - data.coins.balance) : 0;
  const missingRepairCoins = data && repair ? Math.max(0, repair.costCoins - data.coins.balance) : 0;
  const inlineShortage = operationErrorCode === 'INSUFFICIENT_COINS' && (missingCoins > 0 || missingRepairCoins > 0);
  const full = !!data && data.streak.protectorCount >= data.streak.protectorMax;
  return <SafeAreaView edges={['left', 'right']} style={s.page}>
    <ContextualHeader title="Tienda" centered backLabel="Volver desde Tienda" safeTop onBack={() => navigation.goBack()} trailing={<GamificationMetrics data={data} loading={loading} error={error} showStreak={false} />} />
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]} refreshControl={<RefreshControl refreshing={loading && !busy} onRefresh={() => { void state.refresh(); }} tintColor={colors.blue} />}>
      <View style={s.hero}>
        <View style={s.statusRow}>
          <View style={s.habit}><GamificationIcon kind="flame" size={22} /><Text style={s.habitText}>{data ? `${data.streak.currentDays} ${data.streak.currentDays === 1 ? 'día' : 'días'} de racha` : 'Tu hábito de aprender'}</Text></View>

        </View>
        <Text style={s.title}>Pequeñas herramientas.{ '\n' }Grandes hábitos.</Text>
        <Text style={s.subtitle}>Usa tus monedas para cuidar tu racha y seguir aprendiendo.</Text>
      </View>
      {loading && !data ? <View style={[s.product, s.loading]} accessibilityLabel="Cargando protección de racha" accessibilityState={{ busy: true }}>
        <View style={s.skeletonArt}><GamificationIcon kind="protector" size={76} /></View>
        <ActivityIndicator color={colors.blue} /><Text style={s.body}>Preparando tu protección…</Text>
      </View> : null}
      {error ? <View style={s.feedback}><Text accessibilityRole="alert" style={s.feedbackText}>{error}</Text><Button title="Actualizar estado" tone="blue" onPress={() => { void state.refresh(); }} disabled={busy || loading} /></View> : null}
      {notice ? <View style={[s.notice, s.success]} accessibilityLiveRegion="polite"><Check size={19} color={colors.blue} accessible={false} /><Text style={s.feedbackText}>{notice}</Text></View> : null}
      {operationError && !inlineShortage ? <View style={s.feedback}><Text accessibilityRole="alert" style={s.feedbackText}>{operationError}</Text>
        {pending ? <><Text style={s.caption}>Confirma el mismo pedido de forma segura.</Text><Button title="Reintentar operación" tone="blue" busy={busy} disabled={busy || loading} onPress={() => { void gamificationResource.retryOperation(); }} /></> : null}
      </View> : null}
      {data ? <>
        <View style={[s.product, shadows.card]}>
          <View style={[s.productFace, s.protectorFace, stacked && s.faceStacked]}>
            <View style={s.art}><GamificationIcon kind="protector" size={width < 360 || stacked ? 76 : 100} /></View>
            <View style={[s.description, stacked && s.descriptionStacked]}>
              <Text style={s.heading}>Protector de racha</Text>
              <Text style={s.body}>Protege automáticamente un día que no puedas estudiar.</Text>
              <View style={[s.stock, full && s.stockFull]}>{full ? <Check size={16} color={colors.blue} accessible={false} /> : null}<Text style={s.stockText}>Tienes {data.streak.protectorCount} / {data.streak.protectorMax}</Text></View>
            </View>
          </View>
          <View style={[s.purchaseRow, stacked && s.purchaseStacked]}>
            <View accessible accessibilityLabel="Precio: 50 monedas" style={s.priceGroup}><GamificationIcon kind="coin" size={30} /><Text style={s.price}>50</Text></View>
            <View style={[s.action, stacked && s.actionStacked]}><Button title={full ? 'Inventario completo' : 'Comprar protector'} tone={full ? 'gray' : 'red'} disabled={disabled || full || missingCoins > 0} busy={busy && pending?.kind === 'purchase'} onPress={() => { void gamificationResource.purchase(); }} /></View>
          </View>
          {full ? <Text style={s.productNote}>Ya tienes protección para dos días omitidos.</Text> : missingCoins > 0 ? <Shortage amount={missingCoins} /> : null}
        </View>
        {repair ? <View style={[s.product, shadows.card]}>
          <View style={[s.productFace, s.repairFace, stacked && s.faceStacked]}>
            <View style={s.art}><GamificationIcon kind="repair" size={width < 360 || stacked ? 76 : 100} /></View>
            <View style={[s.description, stacked && s.descriptionStacked]}>
              <Text style={s.repairEyebrow}>UNA NUEVA OPORTUNIDAD</Text>
              <Text style={s.heading}>Restaura tu racha</Text>
              <Text style={s.body}>Recupera la continuidad de tus {repair.previousDays} días anteriores.</Text>
              <View style={s.deadline}><Clock size={15} color={colors.gold} accessible={false} /><Text style={s.deadlineText}>Hasta {repairDeadline(repair.expiresAt)}</Text></View>
            </View>
          </View>
          <View style={[s.purchaseRow, stacked && s.purchaseStacked]}>
            <View accessible accessibilityLabel={`Precio: ${repair.costCoins} monedas`} style={s.priceGroup}><GamificationIcon kind="coin" size={30} /><Text style={s.price}>{repair.costCoins}</Text></View>
            <View style={[s.action, stacked && s.actionStacked]}><Button title="Restaurar racha" tone="gold" disabled={disabled || missingRepairCoins > 0} busy={busy && pending?.kind === 'repair'} onPress={() => { void gamificationResource.repair(); }} /></View>
          </View>
          {missingRepairCoins > 0 ? <Shortage amount={missingRepairCoins} /> : null}
        </View> : null}
        <View style={s.tip}><View style={s.bulb}><Lightbulb size={30} fill="#FFD65C" color="#AD7718" strokeWidth={1.8} accessible={false} /></View><View style={s.tipContent}><Text style={s.tipTitle}>Aprender tiene su recompensa</Text><Text style={s.tipText}>Gana monedas al completar lecciones, alcanzar metas y mantener tu racha.</Text></View></View>
        {__DEV__ ? <DevStreakReplay data={data} /> : null}
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}
function Shortage({ amount }: { amount: number }) {
  return <View style={s.shortage} accessibilityLiveRegion="polite"><GamificationIcon kind="coin" size={22} /><View style={s.tipContent}><Text style={s.shortageTitle}>Te {amount === 1 ? 'falta 1 moneda' : `faltan ${amount} monedas`}</Text><Text style={s.caption}>Sigue aprendiendo para conseguirlas.</Text></View></View>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFE' },
  content: { paddingHorizontal: 16, paddingTop: 10, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { gap: 12, paddingHorizontal: 4, paddingBottom: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  habit: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  habitText: { color: colors.muted, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -.6 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23, maxWidth: 420 },
  product: { padding: 8, borderRadius: 24, borderWidth: 1, borderColor: '#EAF0F9', backgroundColor: '#FFF', gap: 4 },
  productFace: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  protectorFace: { backgroundColor: '#E6F3FF' }, repairFace: { backgroundColor: '#FFF2DA' },
  faceStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  art: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  description: { flex: 1, gap: 9, minWidth: 0 },
  descriptionStacked: { flex: 0, width: '100%' },
  heading: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -.3 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  stock: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#D2E9FF', maxWidth: '100%' },
  stockFull: { backgroundColor: '#F5FAFF' }, stockText: { color: '#0759BA', fontWeight: '700', fontSize: 13, flexShrink: 1 },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 14, paddingBottom: 10, gap: 12 },
  purchaseStacked: { flexDirection: 'column', alignItems: 'stretch' },
  priceGroup: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, flexShrink: 1 },
  price: { color: colors.ink, fontWeight: '800', fontSize: 24, fontVariant: ['tabular-nums'] },
  action: { flex: 1, minWidth: 150 }, actionStacked: { flex: 0, width: '100%', minWidth: 0 },
  productNote: { paddingHorizontal: 10, paddingBottom: 10, color: colors.muted, fontSize: 12, lineHeight: 18 },
  repairEyebrow: { color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: .6 },
  deadline: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  deadlineText: { color: colors.gold, fontSize: 12, lineHeight: 18, flex: 1 },
  feedback: { borderLeftWidth: 3, borderLeftColor: '#D7A13E', paddingLeft: 12, gap: 8 },
  feedbackText: { color: colors.ink, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14 },
  success: { backgroundColor: '#EAF4FF' },
  shortage: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 10, marginBottom: 10, padding: 10, borderRadius: 12, backgroundColor: '#FFFAED' },
  shortageTitle: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: '#EAF3FF', borderWidth: 1, borderColor: '#DCEAFF' },
  bulb: { width: 48, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#FFF6D9', borderWidth: 1, borderColor: '#FFF', ...shadows.card },
  tipContent: { flex: 1, gap: 4 },
  tipTitle: { color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  tipText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  loading: { alignItems: 'center', padding: 24, gap: 12 }, skeletonArt: { opacity: .3 },
});
