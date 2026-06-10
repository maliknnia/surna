/**
 * SURNA DESIGN SYSTEM - iPhone-Native
 *
 * SF Pro font, iOS color system, glass effects, spring animations.
 * Dark: #000000 page / #121212 surfaces. Light: #F2F2F7.
 * Black-and-white primary actions, Coral for urgency.
 * Radius: 8 small, 16 medium, 24 large, 32 pill.
 */

export const colors = {
  void: '#000000',
  base: '#000000',
  elevated: '#121212',
  surface: '#121212',

  black: '#000000',
  darkGrey: '#121212',
  darkGrey2: '#1E1E1E',
  mediumGrey: '#1E1E1E',
  mediumGrey2: '#48484A',
  lightGrey: '#EBEBF5',
  subdued: '#48484A',

  greenCore: '#FFFFFF',
  greenLight: '#FFFFFF',
  greenDeep: '#E5E5EA',
  greenGlow: '#FFFFFF',
  greenDim: '#E5E5EA',

  coral: '#FF6B6B',
  coralLight: '#FF8585',
  coralPress: '#CC5555',
  coralSoft: 'rgba(255, 107, 107, 0.15)',

  white: '#FFFFFF',
  ghost: 'rgba(235, 235, 245, 0.6)',
  mute: 'rgba(235, 235, 245, 0.3)',
  fade: '#38383A',

  grey400: '#EBEBF5',
  grey500: '#48484A',
  grey600: '#38383A',

  gold: '#FFD700',
  redAlert: '#FF4444',
  blueLink: '#4A9EFF',
  pro: '#803FE1',
  proDark: '#5B21B6',
  iosRed: '#FF3B30',
  goldPin: '#FFD60A',

  success: '#FFFFFF',
  warning: '#FFD700',
  error: '#FF4444',
  info: '#4A9EFF',

  separator: '#38383A',
  separatorLight: '#C6C6C8',
} as const;

export const themeColors = {
  dark: {
    bg: '#000000',
    bgElevated: '#121212',
    bgCard: '#121212',
    bgCardHover: '#1E1E1E',
    bgHeader: '#000000',
    bgInput: '#121212',

    text: '#FFFFFF',
    textSecondary: 'rgba(235, 235, 245, 0.6)',
    textMuted: 'rgba(235, 235, 245, 0.3)',
    textDisabled: 'rgba(235, 235, 245, 0.18)',

    accent: '#FFFFFF',
    accentLight: '#FFFFFF',
    accentSoft: 'rgba(255, 255, 255, 0.15)',
    accentHover: '#FFFFFF',

    border: 'rgba(255, 255, 255, 0.06)',
    borderLight: 'rgba(255, 255, 255, 0.03)',
    borderFocus: '#FFFFFF',
    divider: 'rgba(255, 255, 255, 0.06)',
    separator: '#38383A',

    glass: 'rgba(30, 30, 30, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.18)',

    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  light: {
    bg: '#F2F2F7',
    bgElevated: '#FFFFFF',
    bgCard: 'transparent',
    bgCardHover: '#E5E5EA',
    bgHeader: '#F2F2F7',
    bgInput: '#FFFFFF',

    text: '#000000',
    textSecondary: 'rgba(60, 60, 67, 0.6)',
    textMuted: 'rgba(60, 60, 67, 0.3)',
    textDisabled: 'rgba(60, 60, 67, 0.18)',

    accent: '#000000',
    accentLight: '#000000',
    accentSoft: 'rgba(0, 0, 0, 0.1)',
    accentHover: '#000000',

    border: 'rgba(0, 0, 0, 0.08)',
    borderLight: 'rgba(0, 0, 0, 0.04)',
    borderFocus: '#000000',
    divider: 'rgba(0, 0, 0, 0.06)',
    separator: '#C6C6C8',

    glass: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',

    overlay: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const typography = {
  largeTitle: { size: 34, weight: 700, lineHeight: 1.1, letterSpacing: -0.02 },
  title1: { size: 28, weight: 700, lineHeight: 1.15, letterSpacing: -0.015 },
  title2: { size: 22, weight: 700, lineHeight: 1.2, letterSpacing: -0.01 },
  title3: { size: 20, weight: 600, lineHeight: 1.25, letterSpacing: -0.01 },
  body: { size: 17, weight: 400, lineHeight: 1.5, letterSpacing: 0 },
  callout: { size: 16, weight: 400, lineHeight: 1.4, letterSpacing: 0 },
  subhead: { size: 15, weight: 400, lineHeight: 1.35, letterSpacing: 0 },
  footnote: { size: 13, weight: 400, lineHeight: 1.4, letterSpacing: 0 },
  caption1: { size: 12, weight: 500, lineHeight: 1.35, letterSpacing: 0.01 },
  caption2: { size: 11, weight: 500, lineHeight: 1.3, letterSpacing: 0.02 },

  display: { size: 34, weight: 700, lineHeight: 1.1, letterSpacing: -0.02 },
  h1: { size: 28, weight: 700, lineHeight: 1.15, letterSpacing: -0.015 },
  h2: { size: 22, weight: 700, lineHeight: 1.2, letterSpacing: -0.01 },
  h3: { size: 20, weight: 600, lineHeight: 1.25, letterSpacing: -0.01 },
  h4: { size: 17, weight: 600, lineHeight: 1.35, letterSpacing: 0 },
  bodyLarge: { size: 17, weight: 400, lineHeight: 1.5, letterSpacing: 0 },
  bodySmall: { size: 15, weight: 400, lineHeight: 1.45, letterSpacing: 0 },
  caption: { size: 12, weight: 500, lineHeight: 1.4, letterSpacing: 0.01 },
  label: { size: 11, weight: 600, lineHeight: 1.3, letterSpacing: 0.05 },
  micro: { size: 11, weight: 500, lineHeight: 1.2, letterSpacing: 0.02 },
} as const;

export const shadows = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.08)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.6)',
  card: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
  cardHover: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  glass: '0 4px 8px rgba(0, 0, 0, 0.15), 0 12px 24px rgba(0, 0, 0, 0.15)',
  modal: '0 -8px 32px rgba(0, 0, 0, 0.3)',
  playButton: '0 8px 16px rgba(0, 0, 0, 0.3)',
  dark: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.16)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
    card: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    cardHover: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  },
} as const;

export const motion = {
  spring: {
    default: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    gentle: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 400,
    slower: 500,
  },
  easing: {
    default: 'ease',
    in: 'ease-in',
    out: 'ease-out',
    inOut: 'ease-in-out',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

export const glass = {
  dark: {
    background: 'rgba(30, 30, 30, 0.75)',
    border: 'rgba(255, 255, 255, 0.18)',
    blur: '20px',
    saturate: '180%',
  },
  light: {
    background: 'rgba(255, 255, 255, 0.75)',
    border: 'rgba(255, 255, 255, 0.2)',
    blur: '20px',
    saturate: '180%',
  },
} as const;

export const components = {
  header: {
    height: 56,
    heightLarge: 64,
    blur: 'blur(20px) saturate(180%)',
    padding: spacing[4],
  },
  card: {
    padding: spacing[4],
    paddingSmall: spacing[3],
    radius: radii.lg,
    radiusSmall: radii.sm,
    gap: spacing[3],
    height: 240,
    overlayHeight: 100,
  },
  button: {
    heightSmall: 32,
    height: 44,
    heightLarge: 50,
    radiusSmall: radii.full,
    radius: radii.full,
    radiusLarge: radii.full,
    paddingX: spacing[6],
    paddingXLarge: spacing[8],
  },
  input: {
    height: 44,
    heightSmall: 36,
    radius: radii.md,
    paddingX: spacing[4],
  },
  avatar: {
    xs: 28,
    sm: 36,
    md: 44,
    lg: 56,
    xl: 72,
    xxl: 96,
  },
  icon: {
    xs: 14,
    sm: 18,
    md: 22,
    lg: 24,
    xl: 32,
  },
  iconContainer: {
    sm: 36,
    md: 44,
    lg: 52,
  },
  progressBar: {
    height: 4,
    heightSmall: 4,
    radius: radii.full,
  },
  bottomNav: {
    height: 64,
    radius: 32,
    iconSize: 24,
    itemSize: 48,
    itemRadius: 12,
  },
  listItem: {
    height: 56,
    heightSmall: 48,
    padding: spacing[4],
    gap: spacing[3],
  },
  modal: {
    radius: radii.xl,
    padding: spacing[6],
  },
  badge: {
    height: 24,
    heightSmall: 20,
    radius: radii.full,
    paddingX: spacing[2],
  },
} as const;

export const zIndex = {
  base: 0,
  sticky: 10,
  header: 20,
  dropdown: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
} as const;

export const breakpoints = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

export const haptics = {
  light: () => { if (navigator.vibrate) navigator.vibrate(10); },
  medium: () => { if (navigator.vibrate) navigator.vibrate(20); },
  success: () => { if (navigator.vibrate) navigator.vibrate([10, 50, 10]); },
} as const;

export const getTheme = () => themeColors.dark;

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const tw = {
  p: (n: keyof typeof spacing) => `p-[${spacing[n]}px]`,
  px: (n: keyof typeof spacing) => `px-[${spacing[n]}px]`,
  py: (n: keyof typeof spacing) => `py-[${spacing[n]}px]`,
  m: (n: keyof typeof spacing) => `m-[${spacing[n]}px]`,
  gap: (n: keyof typeof spacing) => `gap-[${spacing[n]}px]`,
  rounded: (n: keyof typeof radii) => `rounded-[${radii[n]}px]`,
};

export const cssVars = {
  bg: '--surna-bg',
  bgElevated: '--surna-bg-elevated',
  bgCard: '--surna-bg-card',
  text: '--surna-text',
  textSecondary: '--surna-text-secondary',
  textMuted: '--surna-text-muted',
  accent: '--surna-accent',
  border: '--surna-border',
  coral: '--surna-coral',
  gold: '--surna-gold',
  blueLink: '--surna-blue-link',
  pro: '--surna-pro',
  iosRed: '--surna-ios-red',
} as const;
