import type { GamificationDelta } from './types';

// Presentation-only dedup for the current app session. No local date/history inference.
const presented = new Set<string>();
export class StreakCelebrationGate {
  private state: GamificationDelta | null = null;
  private phase: 'idle' | 'showing' | 'finished' = 'idle';
  private destination?: () => void;
  private listeners = new Set<() => void>();
  constructor(private seen = presented) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit() { this.listeners.forEach(listener => listener()); }
  continue = (delta: GamificationDelta | undefined, source: string, destination: () => void, replay = false) => {
    if (this.phase !== 'idle') return;
    if (replay || delta?.streak.advancedToday !== true || this.seen.has(source)) {
      this.phase = 'finished'; destination(); return;
    }
    this.seen.add(source);
    this.phase = 'showing'; this.destination = destination; this.state = delta; this.emit();
  };
  finish = () => {
    if (this.phase !== 'showing') return;
    const destination = this.destination;
    this.phase = 'finished'; this.destination = undefined; this.state = null; this.emit();
    destination?.();
  };
  dispose = () => { this.destination = undefined; this.listeners.clear(); };
}

export const STREAK_MOTION = { entry: 400, flameDelay: 300, flame: 700, countDelay: 700, count: 700, detailDelay: 1200, detail: 1000, settle: 800, ready: 900 };
export const streakMilestones = (delta: GamificationDelta) => delta.coinRewards.filter(reward => reward.reason === 'STREAK_MILESTONE');
