import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { buildZodSchema, zodResolver } from './schema';
import type { FormField, FormValues } from './types';
import { color } from '@/theme/tokens';

/**
 * Renders ANY form_definitions field list with validation (§5.11). One component
 * drives buyer/agent/KYC/lead/booking forms — nothing about them is hardcoded.
 */
export function DynamicForm({
  fields,
  submitLabel = 'Submit',
  loading,
  defaultValues,
  onSubmit,
}: {
  fields: FormField[];
  submitLabel?: string;
  loading?: boolean;
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => void;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildZodSchema(fields)),
    defaultValues: defaultValues ?? {},
  });

  return (
    <View className="gap-4">
      {fields.map((f) => (
        <Controller
          key={f.name}
          control={control}
          name={f.name}
          render={({ field }) => (
            <FieldView field={f} value={field.value} onChange={field.onChange} error={errors[f.name]?.message as string | undefined} />
          )}
        />
      ))}
      <Button title={submitLabel} loading={loading} onPress={handleSubmit(onSubmit)} />
    </View>
  );
}

function FieldView({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const label = field.required ? `${field.label} *` : field.label;

  if (field.type === 'select') {
    return (
      <View className="gap-1.5">
        <Text variant="label">{label}</Text>
        <View className="flex-row flex-wrap gap-2">
          {(field.options ?? []).map((opt) => (
            <Chip key={opt} label={opt} active={value === opt} onPress={() => onChange(opt)} />
          ))}
        </View>
        {error ? <Text variant="caption" className="text-danger">{error}</Text> : null}
      </View>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <View className="gap-1.5">
        <Pressable onPress={() => onChange(!value)} className="flex-row items-center gap-2">
          <Ionicons name={value ? 'checkbox' : 'square-outline'} size={22} color={value ? color.red : color.muted} />
          <Text variant="body" className="flex-1">{label}</Text>
        </Pressable>
        {error ? <Text variant="caption" className="text-danger">{error}</Text> : null}
      </View>
    );
  }

  const keyboard =
    field.type === 'number'
      ? 'numeric'
      : field.type === 'tel'
        ? 'phone-pad'
        : field.type === 'email'
          ? 'email-address'
          : 'default';

  return (
    <Input
      label={label}
      placeholder={field.placeholder}
      value={value == null ? '' : String(value)}
      onChangeText={onChange}
      error={error}
      keyboardType={keyboard}
      autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
      multiline={field.type === 'textarea'}
      className={field.type === 'textarea' ? 'h-24 py-3' : undefined}
    />
  );
}
