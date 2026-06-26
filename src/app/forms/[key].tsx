import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { DynamicForm } from '@/features/forms/DynamicForm';
import { useFormDef, useSubmitForm } from '@/features/forms/api';
import type { FormValues } from '@/features/forms/types';
import { color } from '@/theme/tokens';

/** Generic submission screen for ANY dynamic form — fields come from form_definitions. */
export default function DynamicFormScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { data: form, isLoading } = useFormDef(key);
  const submit = useSubmitForm();

  async function onSubmit(values: FormValues) {
    try {
      await submit.mutateAsync({ key, data: values });
      Alert.alert(
        'Submitted',
        'Thank you — our team has received your submission and will be in touch.',
      );
      router.back();
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title={form?.name ?? 'Form'} />

      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : form && form.fields?.length ? (
        <Card>
          <DynamicForm
            fields={form.fields}
            submitLabel="Submit"
            loading={submit.isPending}
            onSubmit={onSubmit}
          />
        </Card>
      ) : (
        <Text variant="body" className="text-muted">
          This form is not available yet.
        </Text>
      )}
    </Screen>
  );
}
