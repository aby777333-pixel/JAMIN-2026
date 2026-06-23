import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/stores/auth';
import { useBuyerForm, useCreateEnquiry } from '../hooks';

/** Enquiry uses the DYNAMIC buyer form (form_definitions) — no hardcoded fields (§11/§13). */
export function EnquirySheet({
  visible,
  onClose,
  propertyId,
  propertyLabel,
}: {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyLabel: string;
}) {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const { data: fields = [] } = useBuyerForm();
  const enquiry = useCreateEnquiry();

  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  async function submit() {
    if (name.trim().length < 2 || phone.trim().length < 7) {
      Alert.alert('Almost there', 'Please add your name and phone so an advisor can reach you.');
      return;
    }
    try {
      await enquiry.mutateAsync({ propertyId, name, phone, answers });
      onClose();
      Alert.alert('Enquiry sent', `Our team will contact you about ${propertyLabel}.`);
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Enquire">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 pb-4">
        <Text variant="caption">{propertyLabel}</Text>
        <Input label="Your name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        {fields.map((f) => {
          if (f.type === 'select') {
            return (
              <View key={f.name} className="gap-1.5">
                <Text variant="label">{f.label}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {(f.options ?? []).map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={answers[f.name] === opt}
                      onPress={() => setAnswers((a) => ({ ...a, [f.name]: opt }))}
                    />
                  ))}
                </View>
              </View>
            );
          }
          return (
            <Input
              key={f.name}
              label={f.label}
              value={answers[f.name] ?? ''}
              onChangeText={(v) => setAnswers((a) => ({ ...a, [f.name]: v }))}
              keyboardType={f.type === 'number' ? 'numeric' : 'default'}
            />
          );
        })}

        <Button title={t('common.continue')} loading={enquiry.isPending} onPress={submit} />
      </ScrollView>
    </Sheet>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-paper p-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text variant="h2">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text className="font-semibold text-muted">Close</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
