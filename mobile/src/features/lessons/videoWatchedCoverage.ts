export type WatchedRange = readonly [start: number, end: number];
export type VideoCompletionMode = 'REQUIRED_WATCH' | 'OPTIONAL';

/** In-memory coverage for one run, never serialized. Native seek events are not
 * public in expo-video: reject implausible deltas. Sub-sampling seeks that look
 * exactly like playback remain an explicit measurement limitation. */
export class VideoWatchedCoverage {
  private ranges: WatchedRange[] = [];
  private previous: { position: number; timeMs: number; rate: number } | null = null;
  constructor(public durationSeconds = 0) {}
  get watchedRanges(): readonly WatchedRange[] { return this.ranges.map(([a, b]) => [a, b] as const); }
  get watchedUniqueSeconds() { return this.ranges.reduce((sum, [a, b]) => sum + b - a, 0); }
  get complete() { return this.durationSeconds > 0 && this.watchedUniqueSeconds / this.durationSeconds >= 0.9; }
  canContinue(mode: VideoCompletionMode) { return mode === 'OPTIONAL' || this.complete; }
  interrupt() { this.previous = null; }
  reset() { this.ranges = []; this.interrupt(); }
  sample(position: number, timeMs: number, playing: boolean, rate = 1) {
    if (!playing || !Number.isFinite(position) || !Number.isFinite(timeMs) || !Number.isFinite(rate)
      || rate <= 0 || !Number.isFinite(this.durationSeconds) || this.durationSeconds <= 0 || position < 0 || position > this.durationSeconds) {
      this.interrupt(); return;
    }
    const previous = this.previous;
    this.previous = { position, timeMs, rate };
    if (!previous) return; // an anchor is not a watched interval
    const elapsed = (timeMs - previous.timeMs) / 1000, delta = position - previous.position;
    // 250ms sampling, 100ms scheduling tolerance; never bridge >1s event silence.
    // Rejected jumps anchor the destination; only subsequent playback can count.
    if (elapsed <= 0 || elapsed > 1 || delta <= 0 || rate !== previous.rate || delta > elapsed * rate + 0.1) return;
    const merged: WatchedRange[] = [];
    let start = previous.position, end = position;
    for (const range of this.ranges) {
      if (range[1] < start) merged.push(range);
      else if (end < range[0]) { merged.push([start, end]); start = range[0]; end = range[1]; }
      else { start = Math.min(start, range[0]); end = Math.max(end, range[1]); }
    }
    merged.push([start, end]);
    this.ranges = merged; // merge overlap/exact adjacency; never fill real gaps
  }
}
