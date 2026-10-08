import { StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import { mainHeaderTopSpacing } from '../../../components/headerLayout';
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF' },
  content: { paddingHorizontal: 18, paddingTop: mainHeaderTopSpacing, paddingBottom: 24, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -.7, color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 23, color: colors.muted },
  heading: { fontSize: 21, lineHeight: 27, fontWeight: '800', color: colors.ink },
  body: { fontSize: 14, lineHeight: 21, color: colors.muted },
  card: { borderRadius: 20, padding: 16, gap: 13, borderWidth: 1, borderColor: '#D6E8FF', backgroundColor: '#F0F7FF' },
  pink: { backgroundColor: '#FFF3F5', borderColor: '#FFDDE3' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 4 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE5E8' },
  error: { padding: 16, backgroundColor: '#FFF3F5', borderRadius: 16, gap: 12 },
  loading: { paddingVertical: 32, alignItems: 'center', gap: 12 },
});
