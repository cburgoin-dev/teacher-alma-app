import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { RouteBus } from '../../unit-challenges/ChallengeArt';
import { TRAVEL_END } from '../completionMotion';

function Exhaust({ delay }: { delay: number }) {
  const puff = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.sequence([Animated.delay(delay), Animated.loop(Animated.timing(puff, {
      toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    }))]);
    animation.start();
    return () => animation.stop();
  }, [delay, puff]);
  return <Animated.View style={{ position: 'absolute', left: 8, top: 27, width: 5, height: 5, borderRadius: 3, backgroundColor: '#9AAAB9',
    opacity: puff.interpolate({ inputRange: [0, .15, 1], outputRange: [0, .22, 0] }),
    transform: [{ translateX: puff.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }, { translateY: puff.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }, { scale: puff.interpolate({ inputRange: [0, 1], outputRange: [.6, 1.7] }) }],
  }} />;
}

export function TravelBus({ progress, animate }: { progress: Animated.Value; animate: boolean }) {
  const suspension = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(suspension, { toValue: 1.2, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(suspension, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); suspension.setValue(0); };
  }, [animate, suspension]);
  const travel = progress.interpolate({ inputRange: [0, TRAVEL_END - .02, TRAVEL_END, 1], outputRange: [1, 1, 0, 0] });
  return <View pointerEvents="none" accessible={false}>
    {animate ? <Animated.View style={{ position: 'absolute', opacity: travel }}><Exhaust delay={0} /><Exhaust delay={330} /><Exhaust delay={660} /></Animated.View> : null}
    <Animated.View style={{ transform: [{ translateY: Animated.multiply(suspension, travel) }] }}><RouteBus /></Animated.View>
  </View>;
}
