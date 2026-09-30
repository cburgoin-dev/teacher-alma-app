import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { challengeStyles as s } from './styles';

export function ChatBubble({ children, reply = false, enter = false }: { children: ReactNode; reply?: boolean; enter?: boolean }) {
  const entrance = useRef(new Animated.Value(enter ? 0 : 1)).current;
  useEffect(() => {
    if (!enter) { entrance.setValue(1); return; }
    const animation = Animated.timing(entrance, { toValue: 1, duration: 200, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [enter, entrance]);
  return <Animated.View style={[s.bubble, reply && s.reply, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}>
    {children}
    <Svg pointerEvents="none" accessible={false} width={12} height={18} viewBox="0 0 12 18" style={{ position: 'absolute', top: 18, ...(reply ? { right: -10, transform: [{ scaleX: -1 }] } : { left: -10 }) }}>
      <Path d="M12 1Q9 9 1 14Q0 17 4 17H12" fill={reply ? '#E8F2FF' : '#FFFFFF'} stroke={reply ? '#C6DFFF' : '#DFEAF8'} />
    </Svg>
  </Animated.View>;
}
function TypingDot({ delay }: { delay: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.sequence([Animated.delay(delay), Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 240, useNativeDriver: true, isInteraction: false }),
      Animated.timing(pulse, { toValue: 0, duration: 240, useNativeDriver: true, isInteraction: false }),
    ]))]);
    animation.start();
    return () => animation.stop();
  }, [delay, pulse]);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#829FC8', opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [.4, 1] }), transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }} />;
}
export function TypingBubble({ name }: { name?: string }) {
  return <View accessibilityLabel={`${name ?? ''} está escribiendo`} accessibilityLiveRegion="polite" style={{ alignSelf: 'flex-start', marginLeft: 42 }}>
    <ChatBubble><View pointerEvents="none" accessible={false} style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}><TypingDot delay={0} /><TypingDot delay={90} /><TypingDot delay={180} /></View></ChatBubble>
  </View>;
}
