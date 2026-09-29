import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { Conversation } from './types';
import { conversationTimeline, type ChatFrame } from './conversationTimeline';

export function useConversationReveal(content: Conversation, boundary: number) {
  const [reduced, setReduced] = useState(true);
  const [frame, setFrame] = useState<ChatFrame>({ at: 0, visible: boundary, typing: null, latest: null, done: true });
  const revealed = useRef(boundary);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); }, () => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; subscription.remove(); };
  }, []);
  useLayoutEffect(() => {
    if (revealed.current >= boundary) {
      setFrame({ at: 0, visible: boundary, typing: null, latest: null, done: true });
      return;
    }
    const frames = conversationTimeline(content.steps, revealed.current, boundary, reduced);
    const timers = frames.map(next => {
      const show = () => { revealed.current = next.visible; setFrame(next); };
      if (next.at === 0) { show(); return undefined; }
      return setTimeout(show, next.at);
    });
    return () => timers.forEach(timer => { if (timer !== undefined) clearTimeout(timer); });
  }, [boundary, content, reduced]);
  // Switching Reduce Motion on during the final entrance must release the CTA too.
  useEffect(() => {
    if (reduced) { revealed.current = boundary; setFrame({ at: 0, visible: boundary, typing: null, latest: null, done: true }); }
  }, [reduced, boundary]);
  return { ...frame, reduced, pending: frame.visible < boundary || !frame.done };
}
