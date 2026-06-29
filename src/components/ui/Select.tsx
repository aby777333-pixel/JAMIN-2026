import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Text } from './Text';
import { cn } from '@/lib/cn';
import { color } from '@/theme/tokens';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

/** A simple tap-to-open dropdown (modal list) — no extra dependency. */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
}: {
  label?: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="gap-1.5">
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        className="h-13 min-h-[52px] flex-row items-center justify-between rounded-2xl border border-line bg-surface px-4">
        <Text className={cn('text-[16px]', selected ? 'text-ink' : 'text-muted')}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={color.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} className="flex-1 justify-center bg-black/40 px-6">
          <Pressable className="max-h-[70%] overflow-hidden rounded-2xl bg-surface" onPress={() => {}}>
            {label ? (
              <Text variant="label" className="px-4 pb-1 pt-4">
                {label}
              </Text>
            ) : null}
            <ScrollView className="p-2" keyboardShouldPersistTaps="handled">
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn('rounded-xl px-3 py-3', o.value === value ? 'bg-red/10' : '')}>
                  <Text className={cn('text-[15px] font-semibold', o.value === value ? 'text-red' : 'text-ink')}>
                    {o.label}
                  </Text>
                  {o.hint ? <Text variant="caption">{o.hint}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
