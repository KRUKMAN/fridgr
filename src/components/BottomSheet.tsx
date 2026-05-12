/* eslint-disable react-native/no-inline-styles */

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../theme';

import type { JSX, ReactNode } from 'react';

export type FridgrBottomSheetProviderProps = Readonly<{
  children: ReactNode;
}>;

export function FridgrBottomSheetProvider({
  children,
}: FridgrBottomSheetProviderProps): React.JSX.Element {
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>;
}

export type BottomSheetProps = Readonly<{
  children: ReactNode;
  onClose: () => void;
  snapPoints?: readonly string[];
  subtitle?: string;
  title: string;
  visible: boolean;
}>;

export function BottomSheet({
  children,
  onClose,
  snapPoints = ['50%'],
  subtitle,
  title,
  visible,
}: BottomSheetProps): JSX.Element {
  const theme = useTheme();
  const modalRef = useRef<BottomSheetModal>(null);
  const resolvedSnapPoints = useMemo(() => [...snapPoints], [snapPoints]);

  useEffect(() => {
    if (visible) {
      modalRef.current?.present();
      return;
    }

    modalRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={theme.opacities.subtle}
        />
      )}
      backgroundStyle={{
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.border,
        borderTopLeftRadius: theme.radii.xxxl,
        borderTopRightRadius: theme.radii.xxxl,
        borderWidth: theme.borderWidths.thick,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme.colors.borderStrong,
      }}
      onDismiss={onClose}
      ref={modalRef}
      snapPoints={resolvedSnapPoints}
    >
      <BottomSheetView
        style={{
          flex: 1,
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        }}
      >
        <View style={{ gap: theme.spacing.xxs }}>
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
      </BottomSheetView>
    </BottomSheetModal>
  );
}
