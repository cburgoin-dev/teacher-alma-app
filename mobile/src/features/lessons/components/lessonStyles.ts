import { StyleSheet } from 'react-native';
import { colors, radius, shadows, type } from '../../../theme';
export const lessonStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { padding: 20, gap: 18, width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 32 },
  card: { padding: 20, gap: 12, backgroundColor: colors.pale, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  title: type.title, heading: type.heading,
  body: { ...type.body, fontSize: 16, lineHeight: 24 },
  caption: { ...type.caption, fontSize: 14, lineHeight: 20 },
  chip: { color: colors.blue, fontWeight: '700', alignSelf: 'flex-start', backgroundColor: '#E3F0FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  link: { color: colors.blue, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingVertical: 12 },
  error: { color: '#A12538', backgroundColor: '#FFF1F3', padding: 14, borderRadius: 12, fontSize: 15, lineHeight: 22 },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 18 },
});
