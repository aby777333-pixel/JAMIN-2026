import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

/**
 * Page wrapper: paper background, safe-area aware, keeps content inside the
 * screen (SuperPrompt: "everything should be inside the screen"). Use scroll
 * for long content; non-scroll for full-bleed/centered layouts.
 */
export function Screen({
  children,
  scroll = true,
  className,
  contentClassName,
  edges = true,
  backdrop,
  keyboardAvoiding = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
  edges?: boolean;
  /** Optional decorative layer rendered behind the content (e.g. a brand backdrop). */
  backdrop?: ReactNode;
  /** Lift inputs above the on-screen keyboard (forms). Opt-in to avoid affecting other screens. */
  keyboardAvoiding?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const pad = edges ? { paddingTop: insets.top, paddingBottom: insets.bottom } : undefined;

  if (scroll) {
    const scroller = (
      <ScrollView
        contentContainerClassName={cn('px-5 pb-8 grow', contentClassName)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    );
    return (
      <View className={cn('flex-1 bg-paper', className)} style={pad}>
        {backdrop}
        {keyboardAvoiding ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {scroller}
          </KeyboardAvoidingView>
        ) : (
          scroller
        )}
      </View>
    );
  }
  return (
    <View className={cn('flex-1 bg-paper px-5', className)} style={pad}>
      {backdrop}
      <View className={cn('flex-1', contentClassName)}>{children}</View>
    </View>
  );
}
