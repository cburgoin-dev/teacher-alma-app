import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import type { RootStackParamList } from '../../../navigation/types';
import { ContextualHeader } from '../../../components/ContextualHeader';
import { Button } from '../../courses/components/ui';
import { colors } from '../../../theme';
import { useGamification } from '../hooks/useGamification';
import { gamificationResource } from '../resource';
import { repairDeadline } from '../presentation';

export function GamificationShopScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'GamificationShop'>) {
  const state = useGamification();
  const insets = useSafeAreaInsets();
  const { data, loading, busy, pending, error, operationError, notice } = state;
  const disabled = busy || loading || !!error || !!pending;
  const repair = data?.streak.repair;
  return <SafeAreaView edges={['left', 'right']} style={s.page}>
    <ContextualHeader title="Protege tu racha" safeTop onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]} refreshControl={<RefreshControl refreshing={loading && !busy} onRefresh={() => { void state.refresh(); }} />}>
      <Text style={s.title}>Sigue construyendo tu hábito</Text>
      <Text style={s.body}>Usa las monedas que ganas aprendiendo para cuidar tu racha.</Text>
      {loading && !data ? <ActivityIndicator color={colors.blue} accessibilityLabel="Cargando protección de racha" /> : null}
      {error ? <View style={s.card}><Text accessibilityRole="alert" style={s.body}>{error}</Text><Button title="Actualizar estado" onPress={() => { void state.refresh(); }} disabled={busy || loading} /></View> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={s.success}>{notice}</Text> : null}
      {operationError ? <View style={s.card}><Text accessibilityRole="alert" style={s.body}>{operationError}</Text>
        {pending ? <><Text style={s.body}>La operación aún no está confirmada. Reintenta para consultar el mismo pedido sin cobrarlo dos veces.</Text><Button title="Reintentar operación" busy={busy} disabled={busy || loading} onPress={() => { void gamificationResource.retryOperation(); }} /></> : null}
      </View> : null}
      {data ? <>
        <View style={[s.card, s.balance]}><Text style={s.body}>Tu saldo{error || loading ? ' · pendiente de actualizar' : ''}</Text><Text style={s.balanceNumber}>{data.coins.balance} monedas</Text><Text style={s.body}>Racha actual: {data.streak.currentDays} días</Text></View>
        <View style={s.card}>
          <ShieldCheck size={40} color={colors.blue} accessible={false} />
          <Text style={s.heading}>Protector de racha</Text>
          <Text style={s.body}>Protege automáticamente un día que no puedas estudiar. Cada protector cubre un día omitido.</Text>
          <Text style={s.stock}>Disponibles: {data.streak.protectorCount} / {data.streak.protectorMax}</Text>
          <Text style={s.price}>50 monedas</Text>
          <Button title={data.streak.protectorCount >= data.streak.protectorMax ? 'Inventario completo' : 'Comprar protector'} disabled={disabled || data.streak.protectorCount >= data.streak.protectorMax} busy={busy && pending?.kind === 'purchase'} onPress={() => { void gamificationResource.purchase(); }} />
        </View>
        {repair ? <View style={[s.card, s.repair]}>
          <RotateCcw size={36} color={colors.gold} accessible={false} />
          <Text style={s.heading}>Restaura tu racha</Text>
          <Text style={s.body}>Recupera la continuidad de tu racha anterior de {repair.previousDays} días.</Text>
          <Text style={s.body}>Disponible hasta {repairDeadline(repair.expiresAt)}.</Text>
          <Text style={s.price}>{repair.costCoins} monedas</Text>
          <Button title="Restaurar racha" tone="gold" disabled={disabled} busy={busy && pending?.kind === 'repair'} onPress={() => { void gamificationResource.repair(); }} />
        </View> : null}
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { padding: 18, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  heading: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 18, gap: 12 },
  balance: { backgroundColor: colors.goldLight, borderColor: '#EED9A8' },
  balanceNumber: { color: colors.gold, fontSize: 26, fontWeight: '800' },
  stock: { color: colors.blue, fontWeight: '700', fontSize: 16 },
  price: { color: colors.gold, fontWeight: '700', fontSize: 18 },
  repair: { backgroundColor: '#FFFAF0', borderColor: '#EED9A8' },
  success: { color: colors.blue, fontWeight: '600', fontSize: 16 },
});
