import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ContextualHeader({ title, position, onBack, disabled = false, safeTop = false, backLabel = 'Volver', children }: {
  title: string; position?: string; onBack: () => void; disabled?: boolean; safeTop?: boolean; backLabel?: string; children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return <View style={[s.surface, safeTop && { paddingTop: insets.top }]}><View style={s.content}>
    <View style={s.row}>
      <Pressable onPress={onBack} disabled={disabled} accessibilityRole="button" accessibilityLabel={backLabel}
        accessibilityState={{ disabled }} style={({ pressed }) => [s.back, { opacity: disabled ? .4 : pressed ? .6 : 1 }]}>
        <ChevronLeft size={31} color="#0062E9" strokeWidth={2.8} />
      </Pressable>
      <Text style={s.title}>{title}</Text>
      {position ? <Text style={s.position}>{position}</Text> : null}
    </View>
    {children}
  </View></View>;
}
const s = StyleSheet.create({
  surface: { backgroundColor: '#FFF' }, content: { paddingHorizontal: 20, paddingBottom: 10, width: '100%', maxWidth: 640, alignSelf: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 54 },
  back: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  title: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#101B4D', paddingVertical: 6 },
  position: { flexShrink: 0, fontSize: 12, lineHeight: 18, color: '#61759D', maxWidth: '26%' },
});
