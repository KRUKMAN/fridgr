import { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

import { colors, type ColorScheme, type ThemeColors } from './colors';
import {
  borderWidths,
  componentSizes,
  iconSizes,
  motion,
  opacities,
  radii,
  shadows,
  spacing,
  typography,
} from './tokens';

import type { JSX, PropsWithChildren } from 'react';

export type Theme = Readonly<{
  borderWidths: typeof borderWidths;
  colorScheme: ColorScheme;
  colors: ThemeColors;
  componentSizes: typeof componentSizes;
  iconSizes: typeof iconSizes;
  isDark: boolean;
  motion: typeof motion;
  opacities: typeof opacities;
  radii: typeof radii;
  resolvedColorScheme: ColorScheme;
  shadows: typeof shadows;
  spacing: typeof spacing;
  typography: typeof typography;
}>;

type ThemeContextValue = Theme & {
  setColorScheme: (scheme: ColorScheme | null) => void;
};

const fallbackScheme: ColorScheme = 'light';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialColorScheme = null,
}: PropsWithChildren<{
  initialColorScheme?: ColorScheme | null;
}>): JSX.Element {
  const nativeColorScheme = useNativeColorScheme();
  const [overrideScheme, setOverrideScheme] = useState<ColorScheme | null>(initialColorScheme);

  const resolvedColorScheme =
    overrideScheme ?? (nativeColorScheme === 'dark' ? 'dark' : fallbackScheme);

  const value = useMemo<ThemeContextValue>(
    () => ({
      borderWidths,
      colorScheme: overrideScheme ?? resolvedColorScheme,
      colors: colors[resolvedColorScheme],
      componentSizes,
      iconSizes,
      isDark: resolvedColorScheme === 'dark',
      motion,
      opacities,
      radii,
      resolvedColorScheme,
      setColorScheme: setOverrideScheme,
      shadows,
      spacing,
      typography,
    }),
    [overrideScheme, resolvedColorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

export { colors } from './colors';
export { palette } from './colors';
export {
  borderWidths,
  componentSizes,
  iconSizes,
  motion,
  opacities,
  radii,
  shadows,
  spacing,
  typography,
} from './tokens';
