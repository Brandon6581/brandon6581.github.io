// Text tokens are tuned for contrast against the dark illustrated backdrops.
// textMuted was #6E759C, which fell below a comfortable ratio on the darker
// scenes; both muted tones were lifted rather than adding a separate palette.
export const theme = {
  bgTop: '#141626',
  bgBottom: '#1B1E33',
  card: '#1E2233',
  cardAlt: '#242849',
  cardBorder: '#2C3050',
  textPrimary: '#FFFFFF',
  textSecondary: '#C3CDE4',
  textMuted: '#9AA4C2',
  accentGreen: '#8FD694',
  accentBlue: '#5B8CFF',
  accentGold: '#F5C451',
  danger: '#E36767',
  locked: '#3A4066',
} as const;
