export type ChatTarget = { y: number; height: number; order: number; reduced: boolean };

// Minimum movement for a measured message/card. Tall accessible cards start at
// their top; the learner can then inspect them manually without forced scrolling.
export function conversationScrollOffset(offset: number, viewport: number, contentHeight: number, target: ChatTarget, following: boolean) {
  if (!following || viewport <= 0 || target.height <= 0) return null;
  const margin = 16;
  let next = offset;
  if (target.height > viewport - 2 * margin || target.y < offset + margin) next = target.y - margin;
  else if (target.y + target.height > offset + viewport - margin) next = target.y + target.height - viewport + margin;
  next = Math.max(0, Math.min(next, Math.max(0, contentHeight - viewport)));
  return Math.abs(next - offset) > 1 ? next : null;
}
