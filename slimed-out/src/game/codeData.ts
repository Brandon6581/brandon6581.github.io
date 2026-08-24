/**
 * Redemption codes: one-time offline rewards, no network involved.
 *
 * ============================================================================
 * KEEP EVERY CODE UPPERCASE. This is not a style preference.
 * ============================================================================
 * `scripts/check-no-dev-mode.js` fails the build if the literal lowercase
 * string `slimetime` survives into a production bundle - that is the developer
 * mode activation code, and a shipped backdoor is an App Store problem.
 *
 * `SLIMETIME2026` lowercased is `slimetime2026`, which *contains* `slimetime`.
 * So the moment any lowercase form of that code reaches the bundle - a
 * pre-lowercased constant, a `.toLowerCase()` on a literal, a lowercase alias
 * in a test fixture - the release safeguard fails and the build is blocked.
 *
 * The rule that avoids it: store codes uppercase, and normalise the *player's
 * input* upward with `.toUpperCase()` at comparison time. No lowercase form
 * ever exists as a constant.
 *
 * ---
 *
 * A note on secrecy: unlike the dev code, these are meant to be shared, so it
 * does not matter that anyone can find them by unpacking the bundle. Keep the
 * rewards sized on that basis - small enough that discovery is a nice surprise
 * rather than a way around the game.
 */

export type CodeReward =
  | { kind: 'goo'; amount: number }
  | { kind: 'essence'; amount: number }
  | { kind: 'skin'; skinId: string };

export interface RedemptionCodeDef {
  /** Uppercase. See the warning above. */
  code: string;
  /** Shown after a successful redemption. */
  label: string;
  reward: CodeReward;
}

export const REDEMPTION_CODES: RedemptionCodeDef[] = [
  {
    code: 'NORSETH_BONUS',
    label: 'A little something from the studio',
    reward: { kind: 'goo', amount: 25_000 },
  },
  {
    code: 'SLIMETIME2026',
    label: 'Slime Time 2026',
    reward: { kind: 'essence', amount: 15 },
  },
  {
    code: 'CYBER_GLITCH',
    label: 'Neon Glitch collectible',
    reward: { kind: 'skin', skinId: 'skin_neon_glitch' },
  },
];

export const CODE_BY_KEY: Record<string, RedemptionCodeDef> = Object.fromEntries(
  REDEMPTION_CODES.map((c) => [c.code, c])
);

/** Trims and upper-cases player input so codes are typed case-insensitively. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase();
}
