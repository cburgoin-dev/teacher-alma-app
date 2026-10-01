import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../courses/components/ui';
import { colors } from '../../../theme';
import { GamificationIcon } from './GamificationIcon';
import type { GamificationDelta } from '../types';
import { STREAK_MOTION as timing, streakMilestones } from '../streakCelebration';

export function StreakCelebration({ delta, onContinue }: { delta: GamificationDelta; onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const entry = useRef(new Animated.Value(0)).current;
  const flame = useRef(new Animated.Value(0)).current;
  const count = useRef(new Animated.Value(0)).current;
  const detail = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    let started = false;
    let animation: Animated.CompositeAnimation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const final = () => { animation?.stop(); clearTimeout(timer); [entry, flame, count, detail].forEach(value => value.setValue(1)); if (alive) setReady(true); };
    const start = (reduced: boolean) => {
      if (!alive) return;
      if (reduced) { started = true; final(); return; }
      if (started) return;
      started = true;
      const tween = (value: Animated.Value, duration: number, delay = 0) => Animated.timing(value, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
      animation = Animated.parallel([
        tween(entry, timing.entry), tween(flame, timing.flame, timing.flameDelay),
        tween(count, timing.count, timing.countDelay),
        Animated.sequence([tween(detail, timing.detail, timing.detailDelay), Animated.delay(timing.settle)]),
      ]);
      animation.start();
      timer = setTimeout(() => { if (alive) setReady(true); }, timing.ready);
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', start);
    // If the preference cannot be read, default to the non-moving final state.
    void AccessibilityInfo.isReduceMotionEnabled().then(start).catch(() => start(true));
    return () => { alive = false; animation?.stop(); clearTimeout(timer); subscription.remove(); };
  }, [entry, flame, count, detail]);
  const milestones = streakMilestones(delta);
  return <Modal visible animationType="none" presentationStyle="fullScreen" onRequestClose={onContinue}>
    <View style={s.page} accessibilityViewIsModal>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View style={[s.art, { opacity: entry, transform: [{ scale: entry.interpolate({ inputRange: [0, 1], outputRange: [.92, 1] }) }] }]} accessible={false}>
          <View style={s.haloOuter} /><View style={s.haloInner} />
          <Animated.View style={{ transform: [{ scale: flame.interpolate({ inputRange: [0, .75, 1], outputRange: [.78, 1.04, 1] }) }] }}><GamificationIcon kind="flame" size={156} /></Animated.View>
        </Animated.View>
        <Animated.View style={[s.message, { opacity: count, transform: [{ translateY: count.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <Text style={s.eyebrow}>TU RACHA SIGUE CRECIENDO</Text>
          <Text accessibilityRole="header" style={s.title}>{delta.streak.currentDays === 1 ? '¡Tu primer día de racha!' : `¡${delta.streak.currentDays} días seguidos!`}</Text>
        </Animated.View>
        <Animated.View style={[s.detail, { opacity: detail }]}>
          <Text style={s.body}>Un día más aprendiendo. Un paso más hacia tu meta.</Text>
          {milestones.map((reward, index) => <View key={index} style={s.milestone}><GamificationIcon kind="coin" size={30} /><View style={s.rewardText}><Text style={s.rewardTitle}>¡Hito de racha alcanzado!</Text><Text style={s.rewardCaption}>+{reward.amount} monedas ganadas</Text></View></View>)}
        </Animated.View>
        <View style={s.action}><Button title="Continuar" disabled={!ready} onPress={onContinue} /></View>
      </ScrollView>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFCF6' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  art: { width: 248, height: 248, maxWidth: '100%', alignItems: 'center', justifyContent: 'center' },
  haloOuter: { position: 'absolute', width: '100%', aspectRatio: 1, borderRadius: 150, backgroundColor: '#FFF3D7' },
  haloInner: { position: 'absolute', width: '80%', aspectRatio: 1, borderRadius: 130, backgroundColor: '#FFE9B5', borderWidth: 1, borderColor: '#FFE2A0' },
  message: { alignItems: 'center', gap: 10, width: '100%' },
  eyebrow: { color: '#B3571D', fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  title: { color: colors.ink, fontSize: 34, lineHeight: 41, fontWeight: '800', textAlign: 'center', letterSpacing: -.8 },
  detail: { gap: 18, width: '100%', alignItems: 'center' },
  body: { color: colors.muted, fontSize: 17, lineHeight: 25, textAlign: 'center', maxWidth: 340 },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 18, backgroundColor: '#FFF0CE', borderWidth: 1, borderColor: '#EDD8A4', maxWidth: '100%' },
  rewardText: { flexShrink: 1, gap: 4 }, rewardTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' }, rewardCaption: { color: colors.gold, fontSize: 14 },
  action: { width: '100%', paddingTop: 12 },
});
