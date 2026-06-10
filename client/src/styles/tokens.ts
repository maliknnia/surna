/**
 * SURNA DESIGN SYSTEM - iPhone-Native Theme Tokens
 * 
 * SF Pro font, iOS color system, glass effects, spring animations.
 * Dark mode #000000 / #121212, light mode #F2F2F7.
 * Black-and-white primary actions, Coral (#FF6B6B) for urgency.
 */

export const brandColors = {
  void: '#000000',
  black: '#000000',
  darkGrey: '#121212',
  cardBg: '#121212',
  highlight: '#1E1E1E',
  press: '#48484A',
  subdued: '#48484A',
  lightGrey: '#EBEBF5',

  greenCore: '#FFFFFF',
  greenLight: '#FFFFFF',
  greenDeep: '#E5E5EA',
  greenGlow: '#FFFFFF',
  greenDim: '#E5E5EA',

  coral: '#FF6B6B',
  coralLight: '#FF8585',
  coralPress: '#CC5555',

  gold: '#FFD700',
  redAlert: '#FF4444',
  blueLink: '#4A9EFF',
  pro: '#803FE1',
  proDark: '#5B21B6',
  iosRed: '#FF3B30',
  goldPin: '#FFD60A',

  white: '#FFFFFF',
  ghost: '#EBEBF5',
  mute: '#48484A',
  fade: '#38383A',
  textLight: '#FFFFFF',
  textDark: '#000000',
} as const;

export const colors = {
  dark: {
    bgVoid: '#000000',
    bgMain: '#000000',
    bgCard: '#121212',
    bgCardSoft: '#121212',
    bgHeader: '#000000',
    bgHighlight: '#1E1E1E',
    bgPress: '#48484A',

    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(235, 235, 245, 0.6)',
    textMuted: 'rgba(235, 235, 245, 0.3)',
    textDisabled: 'rgba(235, 235, 245, 0.18)',

    greenCore: '#FFFFFF',
    greenLight: '#FFFFFF',
    greenDeep: '#E5E5EA',
    greenGlow: '#FFFFFF',

    accent: '#FFFFFF',
    accentLight: '#FFFFFF',
    accentSoft: 'rgba(255, 255, 255, 0.15)',
    accentBg: 'rgba(255, 255, 255, 0.1)',

    coral: '#FF6B6B',
    coralLight: '#FF8585',

    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderCard: 'none',
    divider: 'rgba(255, 255, 255, 0.06)',
    separator: '#38383A',

    glass: 'rgba(30, 30, 30, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.18)',

    progressBg: '#1E1E1E',
    progressFill: '#FFFFFF',
    progressDot: '#FFFFFF',
  },
  light: {
    bgVoid: '#FFFFFF',
    bgMain: '#F2F2F7',
    bgCard: 'transparent',
    bgCardSoft: '#FFFFFF',
    bgHeader: '#F2F2F7',
    bgHighlight: '#E5E5EA',
    bgPress: '#D1D1D6',

    textPrimary: '#000000',
    textSecondary: 'rgba(60, 60, 67, 0.6)',
    textMuted: 'rgba(60, 60, 67, 0.3)',
    textDisabled: 'rgba(60, 60, 67, 0.18)',

    greenCore: '#000000',
    greenLight: '#000000',
    greenDeep: '#1C1C1E',
    greenGlow: '#000000',

    accent: '#000000',
    accentLight: '#000000',
    accentSoft: 'rgba(0, 0, 0, 0.1)',
    accentBg: 'rgba(0, 0, 0, 0.06)',

    coral: '#FF6B6B',
    coralLight: '#FF8585',

    borderSubtle: 'rgba(0, 0, 0, 0.08)',
    borderCard: 'none',
    divider: 'rgba(0, 0, 0, 0.06)',
    separator: '#C6C6C8',

    glass: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',

    progressBg: '#E5E5EA',
    progressFill: '#000000',
    progressDot: '#000000',
  },
} as const;

export const layout = {
  radiusSmall: 8,
  radiusMedium: 16,
  radiusLarge: 24,
  radiusPill: 32,
  radiusCard: 16,
  radiusButton: 9999,
  radiusBubble: 16,
  radiusChip: 9999,
  radiusMicro: 4,

  spacingXS: 4,
  spacingS: 8,
  spacingM: 16,
  spacingL: 24,
  spacingXL: 32,
  spacingXXL: 48,

  headerPadding: '12px 16px',
  cardPadding: 16,
  statCardPadding: 16,

  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 24,
  iconContainer: 44,
  iconContainerLarge: 52,
} as const;

export const typography = {
  largeTitle: { size: '34px', weight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },
  title1: { size: '28px', weight: 700, lineHeight: 1.15, letterSpacing: '-0.015em' },
  title2: { size: '22px', weight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' },
  title3: { size: '20px', weight: 600, lineHeight: 1.25, letterSpacing: '-0.01em' },
  body: { size: '17px', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
  callout: { size: '16px', weight: 400, lineHeight: 1.4, letterSpacing: '0' },
  subhead: { size: '15px', weight: 400, lineHeight: 1.35, letterSpacing: '0' },
  footnote: { size: '13px', weight: 400, lineHeight: 1.4, letterSpacing: '0' },
  caption1: { size: '12px', weight: 500, lineHeight: 1.35, letterSpacing: '0.01em' },
  caption2: { size: '11px', weight: 500, lineHeight: 1.3, letterSpacing: '0.02em' },

  hero: { size: '34px', weight: 700, lineHeight: 1.1 },
  sectionTitle: { size: '20px', weight: 600, lineHeight: 1.25 },
  cardTitle: { size: '20px', weight: 600, lineHeight: 1.25 },
  cardSubtext: { size: '15px', weight: 400, lineHeight: 1.4 },
  caption: { size: '12px', weight: 500, lineHeight: 1.4 },
  micro: { size: '11px', weight: 500, lineHeight: 1.3 },
} as const;

export const shadows = {
  dark: {
    card: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    cardHover: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    modal: '0 -8px 32px rgba(0, 0, 0, 0.3)',
    glass: '0 4px 8px rgba(0, 0, 0, 0.15), 0 12px 24px rgba(0, 0, 0, 0.15)',
    playButton: '0 8px 16px rgba(0, 0, 0, 0.3)',
  },
  light: {
    card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
    cardHover: '0 4px 6px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.03)',
    modal: '0 -8px 32px rgba(0, 0, 0, 0.15)',
    glass: '0 4px 8px rgba(0, 0, 0, 0.08), 0 12px 24px rgba(0, 0, 0, 0.06)',
    playButton: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
} as const;

export const motion = {
  spring: {
    default: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    gentle: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  duration: {
    press: '0.1s',
    fast: '0.2s',
    normal: '0.3s',
    spring: '0.4s',
    modal: '0.5s',
  },
} as const;

export const components = {
  header: {
    height: 56,
    iconContainer: { size: 44, radius: 12 },
  },
  statCard: {
    radius: 16,
    padding: 16,
    iconContainer: { size: 48, radius: 12 },
  },
  progressBar: {
    height: 4,
    radius: 9999,
  },
  button: {
    paddingSmall: '8px 16px',
    paddingMedium: '12px 32px',
    radiusSmall: 9999,
    radiusMedium: 9999,
  },
  card: {
    height: 240,
    radius: 16,
    overlayHeight: 100,
  },
  bottomNav: {
    height: 64,
    radius: 32,
    iconSize: 24,
    itemSize: 48,
    itemRadius: 12,
  },
} as const;

export const haptics = {
  light: () => { if (navigator.vibrate) navigator.vibrate(10); },
  medium: () => { if (navigator.vibrate) navigator.vibrate(20); },
  success: () => { if (navigator.vibrate) navigator.vibrate([10, 50, 10]); },
} as const;

export const getThemeColors = () => colors.dark;
export const getThemeShadows = () => shadows.dark;

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
