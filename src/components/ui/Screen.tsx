import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
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
}: {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
  edges?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const pad = edges ? { paddingTop: insets.top, paddingBottom: insets.bottom } : undefined;

  if (scroll) {
    return (
      <View className={cn('flex-1 bg-paper', className)} style={pad}>
        <ScrollView
          contentContainerClassName={cn('px-5 pb-8 grow', contentClassName)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    );
  }
  return (
    <View className={cn('flex-1 bg-paper px-5', className)} style={pad}>
      <View className={cn('flex-1', contentClassName)}>{children}</View>
    </View>
  );
}
