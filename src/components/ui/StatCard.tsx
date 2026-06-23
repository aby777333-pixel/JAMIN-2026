import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Card } from './Card';
import { Text } from './Text';
import { cn } from '@/lib/cn';
import { color } from '@/theme/tokens';

export function StatCard({
  label,
  children,
  icon,
  dark,
  className,
}: {
  label: string;
  children: ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  dark?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn('flex-1', dark && 'bg-charcoal', className)}>
      {icon ? (
        <Ionicons name={icon} size={18} color={dark ? color.gold : color.red} />
      ) : null}
      <Text variant="label" className={cn('mt-1', dark && 'text-white/70')}>
        {label}
      </Text>
      <View className="mt-1">{children}</View>
    </Card>
  );
}
