export const colors = {
  primary: '#176B4D',
  primaryPressed: '#12563E',
  accent: '#F4B740',
  background: '#F8FAF9',
  surface: '#FFFFFF',
  text: '#17221D',
  textSecondary: '#66736C',
  border: '#E2E8E4',
  error: '#C93C37',
  overlay: 'rgba(23, 34, 29, 0.45)',
  accentMuted: '#FDF6E3',
  accentText: '#8A6508',
  primaryMuted: '#E7F3EE',
} as const;

export type ColorName = keyof typeof colors;
