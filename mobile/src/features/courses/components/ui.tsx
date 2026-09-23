import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../../services/api/client';
import { colors, radius, type } from '../../../theme';
import { CourseVisualIcon } from './CourseVisualIcon';
export { colors } from '../../../theme';
export { CourseCover as Cover } from './CourseCover';

export type ButtonTone = 'red' | 'blue' | 'gold' | 'gray';
export function Button({ title, onPress, disabled, busy, tone = 'red', compact = false, arrow = false }: {
  title: string; onPress?: () => void; disabled?: boolean; busy?: boolean; tone?: ButtonTone; compact?: boolean; arrow?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={onPress} accessibilityLabel={title}
    style={({ pressed }) => [styles.button, compact && styles.compactButton, buttonColors[tone], { opacity: pressed ? .78 : 1 }]}>
    {busy ? <ActivityIndicator color={tone === 'red' ? '#FFF' : colors.blue} /> :
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Text maxFontSizeMultiplier={1.5} style={[styles.buttonText, { flexShrink: 1 }, compact && { fontSize: 14, lineHeight: 19 }, { color: textColors[tone] }]}>{title}</Text>
        {arrow ? <CourseVisualIcon name="arrow" color={textColors[tone]} size={compact ? 18 : 21} /> : null}
      </View>}
  </Pressable>;
}
const buttonColors = StyleSheet.create({
  red: { backgroundColor: colors.red, borderBottomColor: '#DE1A35' },
  blue: { backgroundColor: '#DFEEFF', borderBottomColor: '#CADFFB' },
  gold: { backgroundColor: colors.goldLight, borderBottomColor: '#F2DEB2' },
  gray: { backgroundColor: '#E3EAF3', borderBottomColor: '#D8E0EC' },
});
const textColors = { red: '#FFF', blue: colors.blue, gold: colors.gold, gray: colors.muted };

export function ProgressBar({ percentage, red = false, compact = false }: { percentage: number; red?: boolean; compact?: boolean }) {
  const value = Math.max(0, Math.min(100, percentage));
  return <View style={styles.progressRow} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: value }}>
    <View style={[styles.track, compact && { height: 11 }]}><View style={[styles.fill, { width: `${value}%`, backgroundColor: red ? colors.red : colors.blue }]}><View style={styles.progressShine} /></View></View>
    <Text maxFontSizeMultiplier={1.4} style={[styles.percent, compact && { fontSize: 12, lineHeight: 16 }]}>{Math.round(value)}%</Text>
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
  page: { flex: 1, backgroundColor: '#FFF' },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  title: type.title, heading: type.heading, body: type.body,
  button: { minHeight: 48, paddingVertical: 11, paddingHorizontal: 18, borderRadius: radius.pill, borderBottomWidth: 2, justifyContent: 'center', alignItems: 'center' },
  compactButton: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 10 },
  buttonText: { fontSize: 17, lineHeight: 23, fontWeight: '700', textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 12, flex: 1, backgroundColor: '#DDE7F3', borderRadius: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 10, overflow: 'hidden' },
  progressShine: { position: 'absolute', top: 2, left: 5, right: 5, height: 2, borderRadius: 2, backgroundColor: '#FFFFFF35' },
  percent: { color: colors.muted, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 18 },
  stateTitle: { fontSize: 22, color: colors.ink, fontWeight: '700' },
});
