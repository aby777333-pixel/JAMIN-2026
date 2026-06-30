import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useForms, useSaveFormFields } from '@/features/admin/hooks';
import { DynamicForm } from '@/features/forms/DynamicForm';
import { FIELD_TYPES, type FieldType, type FormField } from '@/features/forms/types';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

export default function FormBuilder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: forms = [] } = useForms();
  const form = forms.find((f) => f.id === id);
  const save = useSaveFormFields();

  const [fields, setFields] = useState<FormField[]>([]);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (form) setFields(form.fields ?? []);
  }, [form?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function patch(i: number, p: Partial<FormField>) {
    setFields((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
  }
  function move(i: number, dir: -1 | 1) {
    setFields((fs) => {
      const j = i + dir;
      if (j < 0 || j >= fs.length) return fs;
      const next = [...fs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(i: number) {
    setFields((fs) => fs.filter((_, idx) => idx !== i));
  }
  function add() {
    const n = fields.length + 1;
    setFields((fs) => [...fs, { name: `field_${n}`, label: `New field ${n}`, type: 'text' }]);
  }

  async function onSave() {
    if (!form) return;
    // basic integrity: unique, non-empty names
    const names = fields.map((f) => f.name.trim());
    if (names.some((n) => !n) || new Set(names).size !== names.length) {
      Alert.alert('Fix field keys', 'Each field needs a unique, non-empty key.');
      return;
    }
    try {
      await save.mutateAsync({ id: form.id, fields });
      Alert.alert('Saved', 'Form updated. It applies everywhere instantly.');
    } catch (e) {
      Alert.alert('Save failed', errMessage(e));
    }
  }

  if (!form) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Form Builder" />
        <Text variant="body" className="mt-8 text-center text-muted">
          Loading form…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pb-10 gap-3" keyboardAvoiding>
      <BackHeader
        title={form.name}
        right={
          <Pressable onPress={() => setPreview((p) => !p)} hitSlop={8}>
            <Text className="font-semibold text-red">{preview ? 'Edit' : 'Preview'}</Text>
          </Pressable>
        }
      />

      {preview ? (
        <Card>
          <Text variant="label" className="mb-3">
            Live preview
          </Text>
          <DynamicForm fields={fields} submitLabel="Submit (preview)" onSubmit={() => {}} />
        </Card>
      ) : (
        <>
          {fields.map((f, i) => (
            <Card key={i} className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text variant="label">Field {i + 1}</Text>
                <View className="flex-row items-center gap-3">
                  <Pressable onPress={() => move(i, -1)} hitSlop={6}>
                    <Ionicons name="arrow-up" size={18} color={color.muted} />
                  </Pressable>
                  <Pressable onPress={() => move(i, 1)} hitSlop={6}>
                    <Ionicons name="arrow-down" size={18} color={color.muted} />
                  </Pressable>
                  <Pressable onPress={() => remove(i)} hitSlop={6}>
                    <Ionicons name="trash" size={18} color={color.danger} />
                  </Pressable>
                </View>
              </View>

              <Input label="Label" value={f.label} onChangeText={(v) => patch(i, { label: v })} />
              <Input
                label="Key"
                value={f.name}
                onChangeText={(v) => patch(i, { name: v.replace(/\s+/g, '_').toLowerCase() })}
                autoCapitalize="none"
              />

              <View className="gap-1.5">
                <Text variant="label">Type</Text>
                <View className="flex-row flex-wrap gap-2">
                  {FIELD_TYPES.map((t) => (
                    <Chip key={t} label={t} active={f.type === t} onPress={() => patch(i, { type: t as FieldType })} />
                  ))}
                </View>
              </View>

              {f.type === 'select' ? (
                <Input
                  label="Options (comma-separated)"
                  value={(f.options ?? []).join(', ')}
                  onChangeText={(v) => patch(i, { options: v.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              ) : null}

              <Pressable
                onPress={() => patch(i, { required: !f.required })}
                className="flex-row items-center gap-2">
                <Ionicons
                  name={f.required ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={f.required ? color.red : color.muted}
                />
                <Text variant="body">Required</Text>
              </Pressable>
            </Card>
          ))}

          <Button title="+ Add field" variant="outline" onPress={add} />
        </>
      )}

      <Button title="Save form" loading={save.isPending} onPress={onSave} />
    </Screen>
  );
}
