import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { RouteBus } from '../../unit-challenges/ChallengeArt';
import { vehicleOrigin } from './vehicleGeometry';
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
  return <Animated.View style={{ position: 'absolute', left: 0, top: 28, width: 6, height: 6, borderRadius: 3, backgroundColor: '#788DA5',
    opacity: puff.interpolate({ inputRange: [0, .15, 1], outputRange: [0, .48, 0] }),
    transform: [{ translateX: puff.interpolate({ inputRange: [0, 1], outputRange: [0, -19] }) }, { translateY: puff.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }, { scale: puff.interpolate({ inputRange: [0, 1], outputRange: [.65, 1.9] }) }],
  }} />;
}

export function TravelBus({ progress, animate, facingLeft = false }: { progress: Animated.Value; animate: boolean; facingLeft?: boolean }) {
  // Tire contact stays fixed: no whole-vehicle bob lifting the wheels off road.
  const exhaust = progress.interpolate({ inputRange: [0, .001, TRAVEL_END * .2, TRAVEL_END * .7, TRAVEL_END * .94, 1], outputRange: [0, 1, .85, .65, 0, 0] });
  return <View pointerEvents="none" accessible={false} style={{ width: 44, height: 42, transformOrigin: vehicleOrigin, transform: [{ scaleX: facingLeft ? -1 : 1 }] }}>
    {animate ? <Animated.View style={{ position: 'absolute', opacity: exhaust }}><Exhaust delay={0} /><Exhaust delay={330} /><Exhaust delay={660} /></Animated.View> : null}
    <RouteBus />
  </View>;
}
