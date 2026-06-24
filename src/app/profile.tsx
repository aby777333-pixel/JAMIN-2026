import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { updateMyProfile } from '@/features/auth/api';
import { useAuth } from '@/stores/auth';

/**
 * Edit profile (§6) — the fields shown on the Digital Business Card and brochures:
 * name, phone, designation, photo. Self-editable (RLS); protected columns untouched.
 */
export default function EditProfile() {
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [designation, setDesignation] = useState(profile?.designation ?? '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url ?? '');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      await updateMyProfile({ fullName, phone, designation, photoUrl });
      await refreshProfile();
      Alert.alert('Saved', 'Your profile is updated — it now shows on your card.');
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentClassName="pb-12">
      <BackHeader title="Edit profile" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="mt-2 gap-4">
          <Input label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Your name" />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" inputMode="tel" placeholder="+91 …" />
          <Input label="Designation / title" value={designation} onChangeText={setDesignation} placeholder="e.g. Senior Partner" />
          <Input
            label="Photo URL (optional)"
            value={photoUrl}
            onChangeText={setPhotoUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://…"
          />
          <Button title="Save profile" loading={saving} onPress={onSave} />
          <Text variant="caption">This is what appears on your Digital Business Card and shared brochures.</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
