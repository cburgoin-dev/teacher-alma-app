import { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../features/courses/components/ui';
import { diagnosticIdentity } from './diagnosticIdentity';
import { diagnosticDevApi, diagnosticDevState, prepareDiagnosticScenario, type DevAction } from './diagnosticTools';

export function DiagnosticDevPanel({ onReal }: { onReal: () => void }) {
  const [open, setOpen] = useState(false);
  const { busy, notice: sharedNotice } = useSyncExternalStore(diagnosticDevState.subscribe, diagnosticDevState.snapshot);
  const [scenario, setScenario] = useState('Consultar al abrir'), [notice, setNotice] = useState('');
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    diagnosticDevApi.status().then(value => { if (mounted) setScenario(value.scenario); }).catch(error => { if (mounted) setNotice(error.message); });
    return () => { mounted = false; };
  }, [open]);
  const prepare = async (action: DevAction | 'DEFAULT') => {
    if (busy) return;
    setNotice('');
    try { await prepareDiagnosticScenario(action); onReal(); setOpen(false); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'No se confirmó la preparación.'); }

  };
  return <View style={s.panel}>
    <Pressable accessibilityRole="button" style={s.trigger} onPress={() => { setNotice(''); setOpen(true); }}><Text style={s.label}>DEV · Diagnostic · {diagnosticIdentity.selected() ? 'diagnostic-dev' : 'usuario habitual'}</Text></Pressable>
    {sharedNotice ? <Text accessibilityLiveRegion="polite" style={s.text}>{sharedNotice}</Text> : null}
    <Modal visible={open} animationType="slide" onRequestClose={() => { if (!busy) setOpen(false); }}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Text style={s.title}>DEV · Diagnostic</Text><Text style={s.text}>Usuario dedicado: diagnostic-dev. Escenario: {scenario}</Text>
        <Text style={s.text}>Preparar NEW o un resultado restablece sólo CourseProgress y los attempts Diagnostic de este usuario. No modifica catálogo ni otros usuarios. Después verás Home REAL.</Text>
        {notice ? <Text accessibilityLiveRegion="polite" style={s.error}>{notice}</Text> : null}
        <Button title="Preparar NEW / Restablecer Diagnostic NEW" disabled={busy} onPress={() => { void prepare('NEW'); }} />
        <Button title="Preparar ASSESSED · A1" tone="blue" disabled={busy} onPress={() => { void prepare('ASSESSED_A1'); }} />
        <Button title="Preparar ASSESSED · A2" tone="blue" disabled={busy} onPress={() => { void prepare('ASSESSED_A2'); }} />
        <Button title="Limpiar intento activo" tone="blue" disabled={busy} onPress={() => { void prepare('CLEAR_ACTIVE'); }} />
        <Button title="Volver al usuario habitual" tone="blue" disabled={busy} onPress={() => { void prepare('DEFAULT'); }} />
        {busy ? <Text style={s.text}>Preparando escenario real…</Text> : null}
        <Button title="Cerrar" tone="gray" disabled={busy} onPress={() => setOpen(false)} />
      </ScrollView>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  panel: { backgroundColor: '#F0F5FA', borderRadius: 10, paddingHorizontal: 10 },
  trigger: { minHeight: 48, justifyContent: 'center' }, label: { color: '#345270', fontSize: 12, fontWeight: '600' },
  content: { padding: 20, gap: 16, flexGrow: 1 }, title: { fontSize: 24, fontWeight: '700', color: '#345270' },
  text: { fontSize: 14, lineHeight: 21, color: '#345270', paddingBottom: 8 }, error: { color: '#A12538', fontSize: 15 },
});
