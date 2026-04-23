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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  title: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  heading: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
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
    elevation: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  sheet: {
    elevation: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
} as const satisfies Record<string, ShadowToken>;
