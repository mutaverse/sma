export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  greeting: {
    fontFamily: fonts.semibold,
    fontSize: 28,
    lineHeight: 34,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 28,
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  metric: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 38,
  },
  metricSm: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
} as const;
