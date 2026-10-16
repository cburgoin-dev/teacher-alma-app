import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Clock3 from 'lucide-react-native/icons/clock-3';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import { VideoWatchedCoverage, type VideoCompletionMode } from '../videoWatchedCoverage';
import { lessonAudio } from './AudioButton';

const source = require('../../../../assets/video-spike/segments.mp4');
const poster = require('../../../../assets/video-spike/poster.png');

/** DEV fixture: one mounted owner per Lesson run, no durable watch state. */
export function LessonVideoSpike(props: { onCanContinue: (allowed: boolean) => void; onFullscreen: (full: boolean) => void }) {
  const { fontScale } = useWindowDimensions();
  const android = Platform.OS === 'android';
  const player = useVideoPlayer(source, p => {
    p.timeUpdateEventInterval = 0.25;
    p.loop = false;
    p.staysActiveInBackground = false;
    p.showNowPlayingNotification = false;
  }, android ? { seekBackwardIncrement: 5, seekForwardIncrement: 10 } : undefined);
  const coverage = useRef(new VideoWatchedCoverage(player.duration));
  const callbacks = useRef(props); callbacks.current = props;
  const active = useRef(android || AppState.currentState === 'active');
  const alive = useRef(true), usable = useRef(true), retrying = useRef(false);
  const recovery = useRef(0), allowed = useRef<boolean | null>(null);
  const modeRef = useRef<VideoCompletionMode>('REQUIRED_WATCH');
  const [mode, setMode] = useState<VideoCompletionMode>('REQUIRED_WATCH');
  const [firstFrame, setFirstFrame] = useState(false), [failed, setFailed] = useState(false);
  const [debug, setDebug] = useState(false), [watched, setWatched] = useState(0);
  const [position, setPosition] = useState(0), [status, setStatus] = useState(player.status);
  function publish() {
    setWatched(coverage.current.watchedUniqueSeconds);
    const next = coverage.current.canContinue(modeRef.current);
    if (next !== allowed.current) { allowed.current = next; callbacks.current.onCanContinue(next); }
  }
  useEffect(() => {
    alive.current = true;
    publish();
    const subscriptions = [
      player.addListener('timeUpdate', ({ currentTime }) => {
        if (!usable.current) return;
        recovery.current = currentTime; setPosition(currentTime);
        coverage.current.sample(currentTime, performance.now(), active.current && player.playing && player.status === 'readyToPlay', player.playbackRate);
        publish();
      }),
      player.addListener('sourceLoad', ({ duration }) => {
        if (usable.current && Number.isFinite(duration) && duration > 0) { coverage.current.durationSeconds = duration; publish(); }
      }),
      player.addListener('statusChange', ({ status: next }) => {
        setStatus(next);
        if (next !== 'readyToPlay') coverage.current.interrupt();
        if (next === 'error') { usable.current = false; setFailed(true); }
      }),
      player.addListener('playingChange', ({ isPlaying }) => {
        coverage.current.interrupt();
        if (isPlaying) {
          lessonAudio.stop();
          if (usable.current && active.current && player.status === 'readyToPlay') {
            coverage.current.sample(player.currentTime, performance.now(), true, player.playbackRate);
          }
        }
      }),
      player.addListener('playbackRateChange', () => coverage.current.interrupt()),
      AppState.addEventListener('change', next => {
        // Android fullscreen is another Activity: RN AppState is not app visibility.
        // Native VideoManager/FullscreenPlayerActivity already pause real background.
        coverage.current.interrupt();
        if (android) return;
        active.current = next === 'active';
        if (!active.current) player.pause();
      }),
    ];
    return () => { alive.current = false; subscriptions.forEach(s => s.remove()); if (!android) callbacks.current.onFullscreen(false); };
  }, [player]);
  async function retry() {
    if (retrying.current) return;
    setFirstFrame(false);
    retrying.current = true; usable.current = false; player.pause(); coverage.current.interrupt();
    try {
      await player.replaceAsync(source);
      if (!alive.current) return;
      player.currentTime = recovery.current;
      if (Number.isFinite(player.duration) && player.duration > 0) coverage.current.durationSeconds = player.duration;
      usable.current = true; setFailed(false); publish();
    } catch { if (alive.current) setFailed(true); }
    finally { retrying.current = false; }
  }
  async function injectError() {
    if (retrying.current) return;
    usable.current = false; player.pause(); coverage.current.interrupt();
    try { await player.replaceAsync({ uri: 'file:///video-spike-missing.mp4' }); }
    catch { if (alive.current) setFailed(true); }
  }
  const complete = coverage.current.complete;
  const StatusIcon = complete ? CircleCheck : Clock3;
  return <View style={s.card}>
    <Text style={s.heading}>La Teacher Alma te explica esto</Text>
    <Text style={s.body}>Mira la explicación y vuelve a las partes que quieras practicar.</Text>
    <View style={s.media}>
      {!firstFrame && !failed ? <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={poster} style={StyleSheet.absoluteFill} resizeMode="contain" /></View> : null}
      <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls contentFit="contain"
        surfaceType="textureView" onFirstFrameRender={() => setFirstFrame(true)}
        fullscreenOptions={{ enable: true, orientation: 'landscape' }}
        onFullscreenEnter={() => { coverage.current.interrupt(); if (!android) callbacks.current.onFullscreen(true); }}
        onFullscreenExit={() => { coverage.current.interrupt(); if (!android) callbacks.current.onFullscreen(false); }} />
      {status === 'loading' ? <ActivityIndicator style={s.loading} color="white" /> : null}
    </View>
    {failed ? <View><Text style={s.error}>No se pudo reproducir el video.</Text><Pressable accessibilityRole="button" onPress={retry} style={s.action}><Text style={s.link}>Reintentar</Text></Pressable></View> : null}
    <View style={[s.status, { minHeight: 46 * fontScale }]} accessibilityLiveRegion="polite"><StatusIcon size={22} color="#2767BD" /><Text style={[s.body, { flex: 1 }]}>
      {mode === 'OPTIONAL' ? 'Video opcional. Puedes continuar cuando quieras.' : complete ? 'Video completado. Ya puedes continuar.' : 'Mira el video para continuar.'}
    </Text></View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: debug }} onPress={() => setDebug(!debug)} style={s.action}><Text style={s.secondary}>Pruebas DEV {debug ? '−' : '+'}</Text></Pressable>
    {debug ? <View>
      <Text style={s.secondary}>Posición {position.toFixed(2)} s · Únicos {watched.toFixed(2)} / {coverage.current.durationSeconds.toFixed(2)} s</Text>
      <Text style={s.secondary}>Rangos: {coverage.current.watchedRanges.map(([a, b]) => `${a.toFixed(2)}–${b.toFixed(2)}`).join(', ') || 'ninguno'}</Text>
      <Pressable accessibilityRole="button" style={s.action} onPress={() => { const next = mode === 'OPTIONAL' ? 'REQUIRED_WATCH' : 'OPTIONAL'; modeRef.current = next; setMode(next); publish(); }}><Text style={s.link}>Modo: {mode}</Text></Pressable>
      <Pressable accessibilityRole="button" style={s.action} onPress={injectError}><Text style={s.link}>Provocar error local</Text></Pressable>
    </View> : null}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, gap: 12 },
  heading: { fontSize: 20, fontWeight: '700', color: '#18334F' },
  body: { fontSize: 16, lineHeight: 23, color: '#40566D' },
  media: { aspectRatio: 16 / 9, backgroundColor: '#102030', borderRadius: 12, overflow: 'hidden' },
  loading: { position: 'absolute', top: 8, right: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  action: { minHeight: 44, justifyContent: 'center' },
  link: { color: '#2767BD', fontSize: 15, fontWeight: '600' },
  secondary: { color: '#697785', fontSize: 12 },
  error: { color: '#B52835', fontSize: 16 },
});


