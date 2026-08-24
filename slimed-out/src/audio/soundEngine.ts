/**
 * The sound engine.
 *
 * **This is a wired-up stub, not a silent placeholder.** Every call site in the
 * game routes through it today, the player's `soundEnabled` setting is honoured,
 * and the cue table below is the complete list of sounds the game asks for. What
 * is missing is only the playback backend and the audio files - so shipping
 * sound later means filling in `playCue` and dropping files into
 * `assets/sounds/`, with no call sites to hunt down.
 *
 * That ordering is deliberate. Threading a sound call into thirty screens is
 * where this kind of feature usually rots; doing it now, while the screens are
 * fresh, means the expensive half is already done and verified.
 *
 * Design mirrors `src/feel/haptics.ts`, for the same reasons:
 *  - **Named for the moment, not the file.** Call sites say `sound.tap()`. Which
 *    asset that maps to is a tuning decision that lives here.
 *  - **Never throws.** Audio failing must not break a tap. Every entry point
 *    swallows its errors.
 *  - **Respects the setting at call time**, so a toggle applies to the next tap
 *    rather than needing a reload.
 *
 * ---
 * **When wiring real playback:** use `expo-audio`, not `expo-av`. expo-av is
 * deprecated as of SDK 54. Install with `npx expo install expo-audio` so the
 * version stays on the SDK manifest (see AGENTS.md). Preload every cue once at
 * startup and keep the players alive - creating a player per tap is what makes
 * clicker audio crackle and drift behind the finger.
 */

/** Every sound the game asks for. Adding a cue here is the first step. */
export type SoundCue =
  // Resource generation
  | 'tap'
  | 'tapCrit'
  // Menu and navigation
  | 'menuOpen'
  | 'menuClose'
  | 'tabSwitch'
  // Milestones and mutations
  | 'purchase'
  | 'upgrade'
  | 'levelUp'
  | 'achievement'
  | 'ascend'
  // Events
  | 'visitorAppear'
  | 'visitorCatch'
  | 'rewardClaim'
  | 'denied';

/**
 * Cue definitions. `file` is the intended asset path, relative to
 * `assets/sounds/`; nothing loads it yet.
 *
 * `throttleMs` matters more than it looks: `tap` can fire ten-plus times a
 * second, and retriggering a sample that fast is what turns a pleasant click
 * into a buzzsaw. A short floor keeps rapid tapping percussive.
 */
export interface CueDef {
  file: string;
  /** 0..1, relative to the master level. */
  volume: number;
  /** Minimum gap between retriggers, in ms. */
  throttleMs: number;
}

export const SOUND_CUES: Record<SoundCue, CueDef> = {
  tap: { file: 'tap.m4a', volume: 0.35, throttleMs: 60 },
  tapCrit: { file: 'tap-crit.m4a', volume: 0.7, throttleMs: 0 },
  menuOpen: { file: 'menu-open.m4a', volume: 0.4, throttleMs: 80 },
  menuClose: { file: 'menu-close.m4a', volume: 0.35, throttleMs: 80 },
  tabSwitch: { file: 'tab.m4a', volume: 0.25, throttleMs: 80 },
  purchase: { file: 'purchase.m4a', volume: 0.6, throttleMs: 40 },
  upgrade: { file: 'upgrade.m4a', volume: 0.6, throttleMs: 40 },
  levelUp: { file: 'level-up.m4a', volume: 0.75, throttleMs: 0 },
  achievement: { file: 'achievement.m4a', volume: 0.7, throttleMs: 0 },
  ascend: { file: 'ascend.m4a', volume: 0.9, throttleMs: 0 },
  visitorAppear: { file: 'visitor-appear.m4a', volume: 0.5, throttleMs: 0 },
  visitorCatch: { file: 'visitor-catch.m4a', volume: 0.8, throttleMs: 0 },
  rewardClaim: { file: 'reward.m4a', volume: 0.6, throttleMs: 40 },
  denied: { file: 'denied.m4a', volume: 0.4, throttleMs: 120 },
};

/**
 * Read at every call so the Settings toggle applies immediately, and mirrored
 * out of the store so a tap handler never has to subscribe to it.
 */
let enabled = true;

export function setSoundEnabled(next: boolean): void {
  enabled = next;
}

export function soundEnabled(): boolean {
  return enabled;
}

/** Last time each cue actually played, for throttling. */
const lastPlayed: Partial<Record<SoundCue, number>> = {};

/**
 * The single seam a real backend plugs into.
 *
 * Everything above is finished; this is the only body that changes when audio
 * is wired. It is intentionally the *only* place that would touch a playback
 * library, so the rest of the game never imports one.
 */
function playCue(cue: SoundCue, def: CueDef): void {
  // Intentionally silent for now. Implementation sketch:
  //
  //   const player = players[cue];          // preloaded at startup
  //   player.seekTo(0);
  //   player.volume = def.volume * masterVolume;
  //   player.play();
  //
  // Keep it synchronous and non-awaited: a tap must not wait on audio.
  void cue;
  void def;
}

/** Plays a cue if sound is on and the cue is not still throttled. */
function fire(cue: SoundCue): void {
  if (!enabled) return;
  try {
    const def = SOUND_CUES[cue];
    if (!def) return;

    if (def.throttleMs > 0) {
      const now = Date.now();
      const previous = lastPlayed[cue] ?? 0;
      if (now - previous < def.throttleMs) return;
      lastPlayed[cue] = now;
    }

    playCue(cue, def);
  } catch {
    // Sound is decoration. A failure here must never reach the player.
  }
}

/**
 * The public surface. Named for game moments so screens never reference a cue
 * id or a filename directly.
 */
export const sound = {
  /** A manual goo tap - by far the most frequent cue. */
  tap: () => fire('tap'),
  /** A rare hit: a caught visitor, or the golden variant turning up. */
  tapCrit: () => fire('tapCrit'),

  menuOpen: () => fire('menuOpen'),
  menuClose: () => fire('menuClose'),
  tabSwitch: () => fire('tabSwitch'),

  purchase: () => fire('purchase'),
  upgrade: () => fire('upgrade'),
  /** A slime crossed a level band or gained a production tier. */
  levelUp: () => fire('levelUp'),
  achievement: () => fire('achievement'),
  ascend: () => fire('ascend'),

  visitorAppear: () => fire('visitorAppear'),
  visitorCatch: () => fire('visitorCatch'),
  rewardClaim: () => fire('rewardClaim'),
  denied: () => fire('denied'),
};
