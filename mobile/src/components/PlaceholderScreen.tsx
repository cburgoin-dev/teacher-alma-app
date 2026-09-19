import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function PlaceholderScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.description}>Pantalla base. El contenido se implementará más adelante.</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '600', color: '#183b70' },
  description: { fontSize: 16, color: '#4b5563', lineHeight: 24 },
});
