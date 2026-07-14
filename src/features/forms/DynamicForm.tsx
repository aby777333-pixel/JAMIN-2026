import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { errMessage } from '@/lib/errors';
import { uploadImageToBucket } from '@/lib/upload';
import { useAuth } from '@/stores/auth';
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

  if (field.type === 'photo') {
    return <PhotoField label={label} help={field.help} value={value} onChange={onChange} error={error} />;
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

/**
 * 'photo' field — pick an image, upload it to the user's own `user-media`
 * folder immediately, and store the public URL as the field value (a plain
 * string, so validation and submission payloads stay unchanged).
 */
function PhotoField({
  label,
  help,
  value,
  onChange,
  error,
}: {
  label: string;
  help?: string;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const profile = useAuth((s) => s.profile);
  const [busy, setBusy] = useState(false);
  const url = typeof value === 'string' ? value : '';

  async function pick() {
    if (!profile?.id) {
      Alert.alert('Not signed in', 'Please sign in again to upload a document.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setBusy(true);
    try {
      const up = await uploadImageToBucket('user-media', `${profile.id}/forms`, {
        uri: a.uri,
        name: a.fileName,
        mimeType: a.mimeType,
      });
      onChange(up.url);
    } catch (e) {
      Alert.alert('Upload failed', errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      {url ? (
        <View className="flex-row items-center gap-3">
          <Image source={{ uri: url }} style={{ width: 72, height: 72, borderRadius: 12 }} contentFit="cover" />
          <View className="flex-1">
            <Text variant="caption" className="text-success">Attached ✓</Text>
            <Pressable onPress={() => onChange('')} hitSlop={6}>
              <Text className="text-[12px] font-semibold text-red">Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Button
          title={busy ? 'Uploading…' : '📎 Attach photo'}
          variant="outline"
          loading={busy}
          left={<Ionicons name="image" size={16} color={color.ink} />}
          onPress={pick}
        />
      )}
      {help ? <Text variant="caption">{help}</Text> : null}
      {error ? <Text variant="caption" className="text-danger">{error}</Text> : null}
    </View>
  );
}
