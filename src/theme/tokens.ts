import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

type TypographyToken = Readonly<{
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  lineHeight: number;
}>;

type ShadowToken = Readonly<
  Pick<ViewStyle, 'elevation' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius'>
>;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  xxl: 36,
  xxxl: 44,
  full: 9999,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '800', lineHeight: 42 },
  title: { fontSize: 25, fontWeight: '700', lineHeight: 33 },
  heading: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  captionStrong: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
} as const satisfies Record<string, TypographyToken>;

export const borderWidths = {
  none: 0,
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  thick: 2,
  chunky: 3,
} as const;

export const iconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
} as const;

export const componentSizes = {
  button: {
    sm: 36,
    md: 44,
    lg: 52,
  },
  iconButton: {
    sm: 36,
    md: 44,
    lg: 52,
  },
  avatar: {
    sm: 32,
    md: 44,
    lg: 64,
  },
  input: {
    minHeight: 52,
  },
  modal: {
    maxWidth: 560,
  },
} as const;

export const opacities = {
  disabled: 0.45,
  pressed: 0.8,
  subtle: 0.72,
} as const;

export const motion = {
  quick: 160,
  standard: 220,
  slow: 320,
} as const;

export const shadows = {
  none: {
    elevation: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  card: {
    elevation: 2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  sheet: {
    elevation: 8,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
  },
  glow: {
    elevation: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
  },
} as const satisfies Record<string, ShadowToken>;
