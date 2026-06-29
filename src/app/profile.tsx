import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { updateMyProfile } from '@/features/auth/api';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

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
  const isPartner = !!profile?.role_slug && profile.role_slug !== 'buyer';

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

          <Pressable onPress={() => router.push('/role')} className="mt-2">
            <Card className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="swap-horizontal" size={18} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title">Switch role</Text>
                <Text variant="caption">Buyer, Seller, Agent, Builder, Surveyor & more</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            </Card>
          </Pressable>

          {isPartner ? (
            <Pressable onPress={() => router.push('/sell')} className="mt-2">
              <Card className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                  <Ionicons name="business" size={18} color={color.red} />
                </View>
                <View className="flex-1">
                  <Text variant="title">My listings</Text>
                  <Text variant="caption">List a property & track views, enquiries and bookings</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={color.muted} />
              </Card>
            </Pressable>
          ) : null}

          <Pressable onPress={() => router.push('/offers')} className="mt-2">
            <Card className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="pricetag" size={18} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title">My offers</Text>
                <Text variant="caption">Offers you've made & seller responses</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/requirements')} className="mt-2">
            <Card className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="radio" size={18} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title">Property requirements</Text>
                <Text variant="caption">Get radar alerts when matching listings go live</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/recent')} className="mt-2">
            <Card className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="time" size={18} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title">Recently viewed</Text>
                <Text variant="caption">Properties you've looked at recently</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/media')} className="mt-2">
            <Card className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="images" size={18} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title">My Images</Text>
                <Text variant="caption">Upload, download & delete your property images</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            </Card>
          </Pressable>

          {isPartner ? (
            <Pressable onPress={() => router.push('/submissions')}>
              <Card className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                  <Ionicons name="cloud-upload" size={18} color={color.red} />
                </View>
                <View className="flex-1">
                  <Text variant="title">My photo submissions</Text>
                  <Text variant="caption">Photos you suggested for properties + review status</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={color.muted} />
              </Card>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
