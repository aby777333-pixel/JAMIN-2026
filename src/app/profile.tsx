import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Disclosure } from '@/components/ui/Disclosure';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { updateMyProfile } from '@/features/auth/api';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import { uploadImageToBucket } from '@/lib/upload';
import { errMessage } from '@/lib/errors';

/** Roles whose public-facing professional details (agency, RERA…) matter to clients. */
const PRO_SLUGS = ['seller', 'builder', 'developer', 'agent', 'broker', 'promoter', 'sub_promoter'];

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
  const [uploading, setUploading] = useState(false);
  const isPartner = !!profile?.role_slug && profile.role_slug !== 'buyer';
  const isPro =
    (!!profile?.role_slug && PRO_SLUGS.includes(profile.role_slug)) || can(profile, 'sell');

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  /** Pick a photo from the gallery → own folder in the public user-media
      bucket (RLS: first path segment must be auth.uid()) → photo URL. */
  async function onPickPhoto() {
    if (!profile?.id) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    try {
      const a = res.assets[0];
      const { url } = await uploadImageToBucket('user-media', `${profile.id}/profile`, {
        uri: a.uri,
        name: a.fileName ?? 'profile.jpg',
        mimeType: a.mimeType ?? 'image/jpeg',
      });
      setPhotoUrl(url);
    } catch (e) {
      Alert.alert('Could not upload photo', errMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    setSaving(true);
    try {
      await updateMyProfile({ fullName, phone, designation, photoUrl });
      await refreshProfile();
      Alert.alert('Saved', 'Your profile is updated — it now shows on your card.');
      router.back();
    } catch (e) {
      Alert.alert('Could not save', errMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentClassName="pb-12" keyboardAvoiding>
      <BackHeader title="Edit profile" />
      <View>
        <View className="mt-2 gap-4">
          {/* Profile photo — appears on the Account tab, business card & brochures. */}
          <View className="flex-row items-center gap-4">
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={{ width: 72, height: 72, borderRadius: 36 }}
                contentFit="cover"
              />
            ) : (
              <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-charcoal">
                <Text className="font-bold text-[22px] text-white">{initials}</Text>
              </View>
            )}
            <View className="flex-1 gap-1.5">
              <Button
                title={photoUrl ? 'Change photo' : 'Upload photo'}
                variant="outline"
                loading={uploading}
                onPress={onPickPhoto}
              />
              {photoUrl ? (
                <Pressable onPress={() => setPhotoUrl('')} className="self-center py-0.5">
                  <Text className="text-[12px] font-semibold text-muted">Remove photo</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Input label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Your name" />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" inputMode="tel" placeholder="+91 …" />
          <Input label="Designation / title" value={designation} onChangeText={setDesignation} placeholder="e.g. Senior Partner" />
          <Button title="Save profile" loading={saving} onPress={onSave} />
          <Text variant="caption">This is what appears on your Digital Business Card and shared brochures.</Text>

          {isPro ? <ProfessionalProfileSection /> : null}

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

          <Pressable onPress={() => router.push('/tools/valuation')} className="mt-2">
            <Card className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="calculator" size={18} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title">Land valuation</Text>
                <Text variant="caption">Estimate a plot's value from live comparables</Text>
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
      </View>
    </Screen>
  );
}

/**
 * Professional profile (0103) — partner-only, self-editable jsonb doc on
 * profiles.partner_profile: agency/company, RERA & GST, service areas,
 * languages, experience, specialisation, office address and bio. Shown to
 * clients; only non-empty keys are persisted.
 */
function ProfessionalProfileSection() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);

  const doc = ((profile as unknown as { partner_profile?: Record<string, unknown> } | null)
    ?.partner_profile ?? {}) as Record<string, unknown>;
  const str = (k: string): string => {
    const v = doc[k];
    if (v == null) return '';
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  };

  const [agencyName, setAgencyName] = useState(str('agency_name'));
  const [companyName, setCompanyName] = useState(str('company_name'));
  const [reraNumber, setReraNumber] = useState(str('rera_number'));
  const [gstNumber, setGstNumber] = useState(str('gst_number'));
  const [serviceAreas, setServiceAreas] = useState(str('service_areas'));
  const [languages, setLanguages] = useState(str('languages'));
  const [experienceYears, setExperienceYears] = useState(str('experience_years'));
  const [specialisation, setSpecialisation] = useState(str('specialisation'));
  const [officeAddress, setOfficeAddress] = useState(str('office_address'));
  const [bio, setBio] = useState(str('bio'));
  const [savingPro, setSavingPro] = useState(false);

  async function onSavePro() {
    if (!profile?.id) return;
    setSavingPro(true);
    try {
      const next: Record<string, string | number> = {};
      const put = (k: string, v: string) => {
        const s = v.trim();
        if (s) next[k] = s;
      };
      put('agency_name', agencyName);
      put('company_name', companyName);
      put('rera_number', reraNumber);
      put('gst_number', gstNumber);
      put('service_areas', serviceAreas);
      put('languages', languages);
      put('specialisation', specialisation);
      put('office_address', officeAddress);
      put('bio', bio);
      const yrs = Number(experienceYears.trim());
      if (experienceYears.trim() && Number.isFinite(yrs)) next.experience_years = yrs;

      const { error } = await supabase
        .from('profiles')
        .update({ partner_profile: next })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      Alert.alert(
        t('profile.proSavedTitle', { defaultValue: 'Saved' }),
        t('profile.proSavedBody', {
          defaultValue: 'Your professional profile is updated — clients now see these details.',
        }),
      );
    } catch (e) {
      Alert.alert(t('profile.proSaveFailed', { defaultValue: 'Could not save' }), errMessage(e));
    } finally {
      setSavingPro(false);
    }
  }

  return (
    <Disclosure
      title={t('profile.proTitle', { defaultValue: 'Professional profile' })}
      subtitle={t('profile.proSubtitle', {
        defaultValue: 'Agency, RERA, service areas — shown to your clients',
      })}>
      <Input
        label={t('profile.proAgency', { defaultValue: 'Agency name' })}
        value={agencyName}
        onChangeText={setAgencyName}
        autoCapitalize="words"
        placeholder={t('profile.proAgencyPh', { defaultValue: 'e.g. Sunrise Realty' })}
      />
      <Input
        label={t('profile.proCompany', { defaultValue: 'Company name' })}
        value={companyName}
        onChangeText={setCompanyName}
        autoCapitalize="words"
        placeholder={t('profile.proCompanyPh', { defaultValue: 'Registered company (if any)' })}
      />
      <Input
        label={t('profile.proRera', { defaultValue: 'RERA registration no.' })}
        value={reraNumber}
        onChangeText={setReraNumber}
        autoCapitalize="characters"
        placeholder="TN/…"
      />
      <Input
        label={t('profile.proGst', { defaultValue: 'GST no.' })}
        value={gstNumber}
        onChangeText={setGstNumber}
        autoCapitalize="characters"
        placeholder="33…"
      />
      <Input
        label={t('profile.proAreas', { defaultValue: 'Service areas (comma separated)' })}
        value={serviceAreas}
        onChangeText={setServiceAreas}
        placeholder={t('profile.proAreasPh', { defaultValue: 'e.g. Chennai, Coimbatore' })}
      />
      <Input
        label={t('profile.proLanguages', { defaultValue: 'Languages spoken (comma separated)' })}
        value={languages}
        onChangeText={setLanguages}
        placeholder={t('profile.proLanguagesPh', { defaultValue: 'e.g. Tamil, English' })}
      />
      <Input
        label={t('profile.proExperience', { defaultValue: 'Years of experience' })}
        value={experienceYears}
        onChangeText={setExperienceYears}
        keyboardType="numeric"
        inputMode="numeric"
        placeholder="5"
      />
      <Input
        label={t('profile.proSpecialisation', { defaultValue: 'Specialisation' })}
        value={specialisation}
        onChangeText={setSpecialisation}
        placeholder={t('profile.proSpecialisationPh', { defaultValue: 'e.g. Plots & farmland' })}
      />
      <Input
        label={t('profile.proOffice', { defaultValue: 'Office address' })}
        value={officeAddress}
        onChangeText={setOfficeAddress}
        placeholder={t('profile.proOfficePh', { defaultValue: 'Street, area, city' })}
      />
      <Input
        label={t('profile.proBio', { defaultValue: 'Bio' })}
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        className="h-auto min-h-[96px] py-3"
        placeholder={t('profile.proBioPh', {
          defaultValue: 'A short introduction your clients will see',
        })}
      />
      <Button
        title={t('profile.proSave', { defaultValue: 'Save professional profile' })}
        loading={savingPro}
        onPress={onSavePro}
      />
    </Disclosure>
  );
}
