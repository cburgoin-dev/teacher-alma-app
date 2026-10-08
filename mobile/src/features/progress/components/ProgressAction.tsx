import { Pressable, StyleSheet, Text } from 'react-native';
import ArrowRight from 'lucide-react-native/icons/arrow-right';

/** Compact visual pill with a full 48dp action target. */
export function ProgressAction({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
    style={({ pressed }) => [s.action, pressed && { opacity: .7 }]}>
    <Text style={s.label}>{title}</Text><ArrowRight accessible={false} size={18} color="#0062E9" />
  </Pressable>;
}
const s = StyleSheet.create({
  action: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, backgroundColor: '#DCEEFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%' },
  label: { fontSize: 14, lineHeight: 20, color: '#0062E9', fontWeight: '800', flexShrink: 1 },
});
