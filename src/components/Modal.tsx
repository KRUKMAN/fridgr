/* eslint-disable react-hooks/set-state-in-effect, react-native/no-inline-styles */

import { useEffect, useMemo, useState } from 'react';
import { Animated, Modal as NativeModal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';

import type { JSX, ReactNode } from 'react';

export type ModalProps = Readonly<{
  children: ReactNode;
  dismissLabel?: string;
  onClose: () => void;
  subtitle?: string;
  title: string;
  visible: boolean;
}>;

export function Modal({
  children,
  dismissLabel = 'Dismiss modal',
  onClose,
  subtitle,
  title,
  visible,
}: ModalProps): JSX.Element | null {
  const theme = useTheme();
  const [translateY] = useState(() => new Animated.Value(visible ? 0 : 1));
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(translateY, {
        duration: theme.motion.standard,
        toValue: 0,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(translateY, {
      duration: theme.motion.quick,
      toValue: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [theme.motion.quick, theme.motion.standard, translateY, visible]);

  const animatedTranslateY = useMemo(
    () =>
      translateY.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 48],
      }),
    [translateY],
  );

  if (!mounted) {
    return null;
  }

  return (
    <NativeModal animationType="none" onRequestClose={onClose} transparent visible={mounted}>
      <View
        accessibilityViewIsModal
        style={{
          backgroundColor: theme.colors.backdrop,
          flex: 1,
          justifyContent: 'flex-end',
          padding: theme.spacing.lg,
        }}
      >
        <Pressable
          accessibilityLabel={dismissLabel}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View
          style={{
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.xxl,
            borderWidth: theme.borderWidths.thick,
            maxWidth: theme.componentSizes.modal.maxWidth,
            padding: theme.spacing.lg,
            shadowColor: theme.colors.shadow,
            transform: [{ translateY: animatedTranslateY }],
            ...theme.shadows.sheet,
          }}
        >
          <View style={{ gap: theme.spacing.xxs, marginBottom: theme.spacing.lg }}>
            <Text
              allowFontScaling
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.heading.fontSize,
                fontWeight: theme.typography.heading.fontWeight,
                lineHeight: theme.typography.heading.lineHeight,
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                allowFontScaling
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.body.fontSize,
                  fontWeight: theme.typography.body.fontWeight,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children}
        </Animated.View>
      </View>
    </NativeModal>
  );
}
