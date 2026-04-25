/* eslint-disable react-native/no-inline-styles */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import { useTheme } from '../theme';

import type { JSX, PropsWithChildren } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastPayload = Readonly<{
  durationMs?: number;
  message: string;
  title: string;
  variant?: ToastVariant;
}>;

type ToastContextValue = Readonly<{
  hideToast: () => void;
  showToast: (payload: ToastPayload) => void;
}>;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren): JSX.Element {
  const [payload, setPayload] = useState<ToastPayload | null>(null);
  const [translateY] = useState(() => new Animated.Value(-1));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();
    Animated.timing(translateY, {
      duration: 180,
      toValue: -1,
      useNativeDriver: true,
    }).start(() => {
      setPayload(null);
    });
  }, [clearTimer, translateY]);

  const showToast = useCallback(
    (nextPayload: ToastPayload) => {
      clearTimer();
      setPayload(nextPayload);
      translateY.setValue(-1);
      Animated.timing(translateY, {
        duration: 220,
        toValue: 0,
        useNativeDriver: true,
      }).start();

      hideTimer.current = setTimeout(hideToast, nextPayload.durationMs ?? 2800);
    },
    [clearTimer, hideToast, translateY],
  );

  const value = useMemo(
    () => ({
      hideToast,
      showToast,
    }),
    [hideToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport payload={payload} translateY={translateY} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

type ToastViewportProps = Readonly<{
  payload: ToastPayload | null;
  translateY: Animated.Value;
}>;

function ToastViewport({ payload, translateY }: ToastViewportProps): JSX.Element | null {
  const theme = useTheme();

  if (!payload) {
    return null;
  }

  const palette = getToastPalette(theme, payload.variant ?? 'info');

  return (
    <View
      pointerEvents="box-none"
      style={{
        left: theme.spacing.lg,
        position: 'absolute',
        right: theme.spacing.lg,
        top: theme.spacing.xxxl,
      }}
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={{
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderRadius: theme.radii.xl,
          borderWidth: theme.borderWidths.thin,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          shadowColor: theme.colors.shadow,
          transform: [
            {
              translateY: translateY.interpolate({
                inputRange: [-1, 0],
                outputRange: [-32, 0],
              }),
            },
          ],
          ...theme.shadows.sheet,
        }}
      >
        <Text
          allowFontScaling
          style={{
            color: palette.titleColor,
            fontSize: theme.typography.captionStrong.fontSize,
            fontWeight: theme.typography.captionStrong.fontWeight,
            lineHeight: theme.typography.captionStrong.lineHeight,
          }}
        >
          {payload.title}
        </Text>
        <Text
          allowFontScaling
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: theme.typography.caption.fontWeight,
            lineHeight: theme.typography.caption.lineHeight,
            marginTop: theme.spacing.xxs,
          }}
        >
          {payload.message}
        </Text>
      </Animated.View>
    </View>
  );
}

function getToastPalette(
  theme: ReturnType<typeof useTheme>,
  variant: ToastVariant,
): Readonly<{
  backgroundColor: string;
  borderColor: string;
  titleColor: string;
}> {
  switch (variant) {
    case 'success':
      return {
        backgroundColor: theme.colors.successSoft,
        borderColor: theme.colors.success,
        titleColor: theme.colors.success,
      };
    case 'error':
      return {
        backgroundColor: theme.colors.destructiveSoft,
        borderColor: theme.colors.destructive,
        titleColor: theme.colors.destructive,
      };
    case 'info':
    default:
      return {
        backgroundColor: theme.colors.infoSoft,
        borderColor: theme.colors.info,
        titleColor: theme.colors.info,
      };
  }
}
