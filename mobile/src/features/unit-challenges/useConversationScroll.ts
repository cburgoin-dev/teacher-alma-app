import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { conversationScrollOffset, type ChatTarget } from './conversationScroll';

export function useConversationScroll(phaseId?: string) {
  const ref = useRef<ScrollView>(null);
  const measurements = useRef({ viewport: 0, contentHeight: 0, offset: 0 });
  const controller = useMemo(() => {
    let origin = 0;
    let { viewport, contentHeight, offset } = measurements.current;
    let following = true, target: ChatTarget | null = null, frame: number | undefined;
    let dragging = false, dragStart = offset, requested: number | undefined;
    const cancel = () => { if (frame !== undefined) cancelAnimationFrame(frame); frame = undefined; };
    const flush = () => {
      if (!phaseId || !following || !target) return;
      const absolute = { ...target, y: target.y + origin };
      const next = conversationScrollOffset(offset, viewport, contentHeight, absolute, following);
      if (next !== null && next !== requested) {
        requested = next;
        ref.current?.scrollTo({ y: next, animated: !target.reduced });
      }
    };
    const nearActive = () => {
      const bottom = target ? Math.min(contentHeight, origin + target.y + target.height + 16) : contentHeight;
      return bottom - viewport - offset < 48;
    };
    const schedule = () => {
      cancel();
      if (!phaseId || !following) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        flush();
      });
    };
    return {
      cancel,
      onRootLayout: (event: LayoutChangeEvent) => { origin = event.nativeEvent.layout.y; schedule(); },
      // Follow each mounted bubble/typing/card immediately; content-size/layout
      // notifications reconcile native scroll bounds once they have settled.
      onTarget: (next: ChatTarget) => { if (!target || next.order >= target.order) { target = next; flush(); schedule(); } },
      onFollow: () => { following = true; requested = undefined; },
      onLayout: (event: LayoutChangeEvent) => { measurements.current.viewport = viewport = event.nativeEvent.layout.height; schedule(); },
      onContentSizeChange: (_width: number, height: number) => { measurements.current.contentHeight = contentHeight = height; schedule(); },
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const previous = offset;
        measurements.current.offset = offset = event.nativeEvent.contentOffset.y;
        if (!following && !dragging && offset > previous && nearActive()) { following = true; requested = undefined; schedule(); }
      },
      onScrollBeginDrag: () => { dragging = true; dragStart = offset; following = false; requested = undefined; cancel(); },
      onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        measurements.current.offset = offset = event.nativeEvent.contentOffset.y;
        dragging = false;
        following = offset >= dragStart && nearActive();
        if (following) schedule();
      },
      onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        measurements.current.offset = offset = event.nativeEvent.contentOffset.y;
        if (!following && offset >= dragStart && nearActive()) { following = true; requested = undefined; schedule(); }
      },
    };
  }, [phaseId]);
  useEffect(() => controller.cancel, [controller]);
  return { ref, ...controller };
}
