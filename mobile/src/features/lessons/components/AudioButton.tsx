import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import Volume2 from 'lucide-react-native/icons/volume-2';
import Square from 'lucide-react-native/icons/square';
import { LessonAudio, type PlaybackState } from '../lessonAudio';
import { mediaUrl } from '../contentPresentation';
import type { AudioMetadata } from '../types';

export const lessonAudio = new LessonAudio(
  url => createAudioPlayer({ uri: url }, { updateInterval: 200 }),
  () => setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, allowsRecording: false, interruptionMode: 'doNotMix' }),
);
export function AudioButton(props: AudioMetadata) {
  const url = mediaUrl(props.audioUrl);
  return url ? <PlayableAudio key={url} url={url} label={props.audioAlt} /> : null;
}
function PlayableAudio({ url, label }: { url: string; label?: string }) {
  const owner = useRef({}).current;
  const [state, setState] = useState<PlaybackState>('idle');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => { if (next !== 'active') lessonAudio.stop(owner); });
    return () => { lessonAudio.stop(owner); subscription.remove(); };
  }, [owner]);
  const playing = state === 'playing', loading = state === 'loading';
  const action = playing || loading ? 'Detener audio' : state === 'error' ? 'Reintentar audio' : 'Escuchar esta frase';
  const Icon = playing ? Square : Volume2;
  return <View style={s.control}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${action}${label ? ': ' + label : ''}`}
      accessibilityState={{ busy: loading }} accessibilityHint="Se reproduce dentro de la lección"
      onPress={() => { void lessonAudio.play(owner, url, setState); }}
      style={({ pressed }) => [s.button, playing && s.playing, { opacity: pressed ? .7 : 1 }]}>
      {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Icon color="#FFF" size={23} strokeWidth={2.5} />}
    </Pressable>
    {state === 'error' ? <Text accessibilityLiveRegion="polite" style={s.error}>No se pudo reproducir. Toca para reintentar.</Text> : null}
  </View>;
}
const s = StyleSheet.create({
  control: { alignItems: 'center', flexShrink: 0, maxWidth: 92, gap: 4 },
  button: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0062E9', alignItems: 'center', justifyContent: 'center' },
  playing: { backgroundColor: '#004CB8', borderWidth: 3, borderColor: '#9CCAFF' },
  error: { color: '#A33C25', fontSize: 12, lineHeight: 16, textAlign: 'center' },
});
