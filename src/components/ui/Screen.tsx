import { type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BG } from '@/components/brand/backgrounds';
import { ImageBackdrop } from '@/components/brand/ImageBackdrop';
import { ScreenPetals } from '@/components/brand/LeafDecor';
import { cn } from '@/lib/cn';

/** Subtle serene backdrop applied to scrollable screens that don't set their own —
    nature hero + soft botanical corner sprigs (decorative, behind content). */
const DEFAULT_BACKDROP = (
  <>
    <ImageBackdrop source={BG.nature} height={220} opacity={0.55} />
    <ScreenPetals />
  </>
);

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

  // Scrollable screens that don't set a backdrop fall back to the serene default
  // so every page has a brand backdrop. Pass `backdrop={null}` to opt out.
  const resolvedBackdrop = backdrop === undefined ? DEFAULT_BACKDROP : backdrop;

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
        {resolvedBackdrop}
        {keyboardAvoiding ? (
          // 'padding' on BOTH platforms: with Android edgeToEdgeEnabled the window
          // no longer resizes, so 'height' is a no-op and the keyboard covers inputs.
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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
