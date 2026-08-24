/**
 * Time-of-day ambience.
 *
 * The illustrated backdrops stay exactly as drawn; this layer tints over them
 * so a scene reads as morning, midday or night without a second set of art.
 * Pure data and a clock read - nothing here touches React.
 */

export type AmbiencePhaseId = 'sunrise' | 'day' | 'dusk';

export interface AmbiencePhase {
  id: AmbiencePhaseId;
  name: string;
  /**
   * Top-to-bottom tint laid over the backdrop. The alpha channel is doing the
   * real work: these sit *on top* of the illustration, so anything close to
   * opaque would hide the art the tint is supposed to be flattering.
   */
  gradient: [string, string, string];
  /** Colour of the drifting motes for this phase. */
  particleColor: string;
  /** Short label for the ambient particle, used in copy and accessibility. */
  particle: string;
  /** How strongly the tint sits over the scene, 0..1. */
  intensity: number;
}

/**
 * Boundaries in local hours, half-open: a phase owns `[from, to)`.
 * Dusk wraps past midnight, which is why it is expressed as "not the others".
 */
export const SUNRISE_FROM = 5;
export const DAY_FROM = 9;
export const DUSK_FROM = 18;

export const AMBIENCE_PHASES: Record<AmbiencePhaseId, AmbiencePhase> = {
  sunrise: {
    id: 'sunrise',
    name: 'Morning Sunrise',
    gradient: ['rgba(255,183,110,0.30)', 'rgba(255,138,128,0.16)', 'rgba(120,90,150,0.10)'],
    particleColor: 'rgba(255,224,170,0.75)',
    particle: 'pollen',
    intensity: 0.85,
  },
  day: {
    id: 'day',
    name: 'Day',
    // Daylight is the backdrop's natural look, so this is barely there - just
    // enough warmth to stop midday reading as flat.
    gradient: ['rgba(255,246,214,0.12)', 'rgba(190,235,255,0.07)', 'rgba(255,255,255,0.03)'],
    particleColor: 'rgba(255,255,255,0.55)',
    particle: 'dust',
    intensity: 0.5,
  },
  dusk: {
    id: 'dusk',
    name: 'Cyber Dusk',
    gradient: ['rgba(38,20,84,0.42)', 'rgba(91,233,233,0.12)', 'rgba(12,10,32,0.55)'],
    particleColor: 'rgba(120,240,240,0.7)',
    particle: 'neon drift',
    intensity: 1,
  },
};

/**
 * Which phase an hour belongs to.
 *
 * Takes the hour rather than reading the clock so it is testable at any time of
 * day - a function that calls `new Date()` internally can only be tested at
 * whatever o'clock the test happens to run.
 */
export function phaseForHour(hour: number): AmbiencePhase {
  // Guard the input: an out-of-range or broken hour should land somewhere sane
  // rather than fall through to undefined.
  if (!Number.isFinite(hour)) return AMBIENCE_PHASES.day;
  const h = ((Math.floor(hour) % 24) + 24) % 24;

  if (h >= SUNRISE_FROM && h < DAY_FROM) return AMBIENCE_PHASES.sunrise;
  if (h >= DAY_FROM && h < DUSK_FROM) return AMBIENCE_PHASES.day;
  return AMBIENCE_PHASES.dusk; // 18:00-23:59 and 00:00-04:59
}

/** The phase right now, from the device's local clock. */
export function currentPhase(now: Date = new Date()): AmbiencePhase {
  return phaseForHour(now.getHours());
}

/**
 * Milliseconds until the phase changes, so a timer can sleep exactly that long
 * instead of polling.
 *
 * The day-rollover is written out explicitly rather than leaning on
 * `setHours(29)` overflowing into tomorrow. It does overflow correctly - but
 * then correcting for it afterwards advances the date a *second* time, which
 * silently returns ~32 hours instead of ~8 and makes the evening-to-sunrise
 * transition miss a whole day.
 */
export function msUntilNextPhase(now: Date = new Date()): number {
  const h = now.getHours();
  const boundaries = [SUNRISE_FROM, DAY_FROM, DUSK_FROM];
  const next = boundaries.find((b) => b > h);
  const target = new Date(now);

  if (next === undefined) {
    // Past the last boundary of the day: the next one is the first, tomorrow.
    target.setDate(target.getDate() + 1);
    target.setHours(SUNRISE_FROM, 0, 0, 0);
  } else {
    target.setHours(next, 0, 0, 0);
  }

  return Math.max(1000, target.getTime() - now.getTime());
}
