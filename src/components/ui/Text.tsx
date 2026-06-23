import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '@/lib/cn';

type Variant = 'display' | 'h1' | 'h2' | 'title' | 'body' | 'label' | 'caption';

const VARIANT: Record<Variant, string> = {
  display: 'font-black text-[34px] leading-[40px] text-ink tracking-tight',
  h1: 'font-bold text-[26px] leading-[32px] text-ink',
  h2: 'font-semibold text-[20px] leading-[26px] text-ink',
  title: 'font-semibold text-[16px] leading-[22px] text-ink',
  body: 'font-sans text-[15px] leading-[22px] text-ink',
  label: 'font-medium text-[13px] leading-[18px] text-muted',
  caption: 'font-sans text-[12px] leading-[16px] text-muted',
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  className?: string;
}

export function Text({ variant = 'body', className, ...rest }: AppTextProps) {
  return <RNText className={cn(VARIANT[variant], className)} {...rest} />;
}
