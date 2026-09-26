export type PlaybackState = 'idle' | 'loading' | 'playing' | 'error';
export type PlaybackStatus = { playing: boolean; isLoaded: boolean; isBuffering: boolean; didJustFinish: boolean; error?: string | null };
export interface LessonPlayer {
  play(): void;
  pause(): void;
  remove(): void;
  addListener(event: 'playbackStatusUpdate', listener: (status: PlaybackStatus) => void): { remove(): void };
}
/** One owner across Lessons. Superseded async starts/events can never revive an old player. */
export class LessonAudio {
  private active: { owner: object; notify: (state: PlaybackState) => void; player?: LessonPlayer; started?: boolean; listener?: { remove(): void }; timer?: ReturnType<typeof setTimeout> } | null = null;
  constructor(private create: (url: string) => LessonPlayer, private prepare: () => Promise<void>, private timeout = 15000) {}
  stop(owner?: object, state: PlaybackState = 'idle') {
    const current = this.active;
    if (!current || (owner && current.owner !== owner)) return;
    this.active = null;
    clearTimeout(current.timer);
    current.listener?.remove();
    try { current.player?.pause(); } finally { current.player?.remove(); current.notify(state); }
  }
  async play(owner: object, url: string, notify: (state: PlaybackState) => void) {
    if (this.active?.owner === owner) { this.stop(owner); return; }
    this.stop();
    const current: NonNullable<LessonAudio['active']> = { owner, notify };
    this.active = current;
    notify('loading');
    const watchdog = () => {
      clearTimeout(current.timer);
      current.timer = setTimeout(() => { if (this.active === current) this.stop(owner, 'error'); }, this.timeout);
    };
    watchdog();
    try {
      await this.prepare();
      if (this.active !== current) return;
      const player = this.create(url);
      current.player = player;
      current.listener = player.addListener('playbackStatusUpdate', status => {
        if (this.active !== current) return;
        if (status.error) { this.stop(owner, 'error'); return; }
        if (status.didJustFinish) { this.stop(owner, 'idle'); return; }
        if (status.isBuffering || !status.isLoaded) { notify('loading'); if (!current.timer) watchdog(); }
        else if (status.playing) { current.started = true; clearTimeout(current.timer); current.timer = undefined; notify('playing'); }
        else if (current.started) this.stop(owner, 'idle');
      });
      player.play();
    } catch { if (this.active === current) this.stop(owner, 'error'); }
  }
}
