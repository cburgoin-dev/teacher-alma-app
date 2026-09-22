import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ApiError } from '../../../services/api/client';

export const colors = { ink: '#101B4D', muted: '#60759C', blue: '#0063EE', pale: '#EFF6FF', border: '#DEEAFA', red: '#F52642', gold: '#8A590C', goldLight: '#FFF0CF', gray: '#7E91AC' };
export function Button({ title, onPress, disabled, busy, tone = 'red' }: { title: string; onPress?: () => void; disabled?: boolean; busy?: boolean; tone?: 'red' | 'blue' | 'gold' | 'gray' }) {
  const backgroundColor = tone === 'red' ? colors.red : tone === 'blue' ? '#DEEDFF' : tone === 'gold' ? colors.goldLight : '#E3EAF3';
  const color = tone === 'red' ? '#FFF' : tone === 'blue' ? colors.blue : tone === 'gold' ? colors.gold : colors.muted;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor, opacity: pressed ? .75 : 1 }]}>
    {busy ? <ActivityIndicator color={color} /> : <Text style={[styles.buttonText, { color }]}>{title}</Text>}
  </Pressable>;
}
export function ProgressBar({ percentage, red = false }: { percentage: number; red?: boolean }) {
  const value = Math.max(0, Math.min(100, percentage));
  return <View style={styles.progressRow} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: value }}>
    <View style={styles.track}><View style={[styles.fill, { width: `${value}%`, backgroundColor: red ? colors.red : colors.blue }]} /></View>
    <Text style={styles.percent}>{Math.round(value)}%</Text>
  </View>;
}
export function Cover({ uri, level, style }: { uri: string | null; level: string | null; style?: ViewStyle }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <View style={[styles.cover, style]}>
    {uri && uri !== failedUri ? <Image source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFill} onError={() => setFailedUri(uri)} accessibilityIgnoresInvertColors /> : <View style={styles.coverFallback} accessible={false}><View style={styles.orbit} /><View style={styles.orbitSmall} /><Text style={styles.coverMark}>Aa</Text></View>}
    {level ? <View style={styles.level}><Text style={styles.levelText}>{level}</Text></View> : null}
  </View>;
}
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'No pudimos validar tu sesión. Vuelve a intentarlo cuando tu acceso esté disponible.';
    const messages: Record<string, string> = {
      COURSE_NOT_FOUND: 'Este curso ya no está disponible.', INVALID_COURSE_ID: 'No pudimos identificar este curso.',
      COURSE_ACCESS_REQUIRED: 'Necesitas acceso a este curso para comenzar.', COURSE_NOT_AVAILABLE: 'Este curso estará disponible próximamente.',
      COURSE_HAS_NO_CONTENT: 'Este curso todavía no tiene lecciones disponibles.',
    };
    return messages[error.code] ?? 'No pudimos cargar la información. Inténtalo nuevamente.';
  }
  return 'No pudimos conectar con los cursos. Comprueba tu conexión e inténtalo nuevamente.';
}
export function ResourceState({ loading, error, retry, empty }: { loading?: boolean; error?: unknown; retry?: () => void; empty?: string }) {
  return <View style={styles.state} accessibilityLiveRegion="polite">
    {loading ? <><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.body}>Cargando cursos…</Text></> : <>
      <Text style={styles.stateTitle}>{error ? 'Algo salió mal' : 'Todo a su tiempo'}</Text>
      <Text style={[styles.body, { textAlign: 'center' }]}>{error ? errorMessage(error) : empty}</Text>
      {retry ? <Button title="Reintentar" tone="blue" onPress={retry} /> : null}
    </>}
  </View>;
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF' }, content: { padding: 20, paddingBottom: 32, gap: 18, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontSize: 29, fontWeight: '800', color: colors.ink, letterSpacing: -.7 }, heading: { fontSize: 21, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: colors.muted },
  button: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, track: { height: 10, flex: 1, backgroundColor: '#DBE6F3', borderRadius: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 10 }, percent: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  cover: { backgroundColor: '#D9ECFF', overflow: 'hidden', minHeight: 165 }, coverFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#D9ECFF' },
  coverMark: { fontSize: 54, fontWeight: '800', color: '#669BDD', transform: [{ rotate: '-12deg' }] },
  orbit: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#BFDDFB', position: 'absolute', left: -60, bottom: -70 },
  orbitSmall: { width: 130, height: 130, borderRadius: 65, borderWidth: 24, borderColor: '#EBF5FF', position: 'absolute', right: -45, top: -50 },
  level: { position: 'absolute', left: 12, top: 12, borderRadius: 17, backgroundColor: colors.blue, paddingHorizontal: 14, paddingVertical: 9 },
  levelText: { fontSize: 20, fontWeight: '800', color: '#FFF' }, state: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 18 },
  stateTitle: { fontSize: 22, color: colors.ink, fontWeight: '700' },
});
