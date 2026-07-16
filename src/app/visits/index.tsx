import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { type SiteVisit } from '@/features/visits/api';
import { VisitPassSheet } from '@/features/visits/VisitPassSheet';
import { useCheckinVisit, useMyVisits, useSetVisitStatus } from '@/features/visits/hooks';
import { can } from '@/lib/access';
import { supabase } from '@/lib/supabase';
import { uploadFileToBucket, type PickedImage } from '@/lib/upload';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** My site visits — buyers check in; agents confirm / complete / mark no-show. */
export default function Visits() {
  const profile = useAuth((s) => s.profile);
  const myId = profile?.id;
  const { data: visits = [], isLoading, refetch, isRefetching } = useMyVisits();
  const checkin = useCheckinVisit();
  const setStatus = useSetVisitStatus();
  const [passVisit, setPassVisit] = useState<SiteVisit | null>(null);

  async function doCheckin(v: SiteVisit) {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Location needed', 'Allow location access to check in at the property.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const res = await checkin.mutateAsync({
        id: v.id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      if (res.ok) {
        Alert.alert('Checked in ✓', res.distance_m != null ? `You're ${res.distance_m} m from the plot.` : 'Check-in recorded.');
      } else {
        Alert.alert(
          'Too far to check in',
          `You appear to be ${res.distance_m} m away (must be within ${res.radius_m} m of the plot).`,
        );
      }
    } catch (e) {
      Alert.alert('Check-in failed', errMessage(e));
    }
  }

  function changeStatus(v: SiteVisit, status: Parameters<typeof setStatus.mutate>[0]['status']) {
    setStatus.mutate({ id: v.id, status }, { onError: (e) => Alert.alert('Could not update', errMessage(e)) });
  }

  return (
    <Screen contentClassName="pb-10">
      <BackHeader
        title="Site visits"
        right={
          <View className="flex-row items-center gap-3">
            {can(profile, 'sell') ? (
              <Pressable onPress={() => router.push('/visits/scan')} hitSlop={10} accessibilityLabel="Scan visit pass">
                <Ionicons name="qr-code-outline" size={19} color={color.red} />
              </Pressable>
            ) : null}
            {can(profile, 'sell') ? (
              <Pressable onPress={() => router.push('/availability')} hitSlop={10}>
                <Ionicons name="time-outline" size={20} color={color.ink} />
              </Pressable>
            ) : null}
            <Pressable onPress={() => refetch()} hitSlop={10}>
              <Ionicons name={isRefetching ? 'sync' : 'refresh'} size={18} color={color.ink} />
            </Pressable>
          </View>
        }
      />
      {isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={color.red} />
        </View>
      ) : visits.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No visits yet"
          body="Book a site visit from any property and it'll show up here for check-in."
        />
      ) : (
        <View>
          {visits.map((v) => {
            const isAgent = v.agent_id === myId;
            const isBuyer = v.buyer_id === myId;
            const when = new Date(v.scheduled_at);
            const label = v.property ? `${v.property.project?.name ?? ''} · ${v.property.plot_code}` : 'Property';
            const open = !['completed', 'cancelled', 'no_show'].includes(v.status);
            return (
              <Card key={v.id} className="mb-2 gap-2">
                <View className="flex-row items-center justify-between">
                  <Pressable className="flex-1" onPress={() => router.push(`/property/${v.property_id}`)}>
                    <Text variant="title" className="text-[14px]" numberOfLines={1}>
                      {label}
                    </Text>
                  </Pressable>
                  <StatusPill status={v.status} />
                </View>
                <Text variant="caption">
                  {when.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                  {when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {isAgent && v.buyer?.full_name ? ` · ${v.buyer.full_name}` : ''}
                  {isBuyer && v.agent?.full_name ? ` · Agent: ${v.agent.full_name}` : ''}
                </Text>
                {v.checkin_at ? (
                  <Text variant="caption" className="text-success">
                    Checked in
                    {v.checkin_distance_m != null ? ` · ${v.checkin_distance_m} m from plot` : ''}
                  </Text>
                ) : null}

                <VisitFeedbackSection visit={v} isAgent={isAgent} />


                {open ? (
                  <View className="flex-row flex-wrap gap-2 pt-1">
                    {isBuyer ? (
                      <Button
                        title="🎫 Pass"
                        variant="secondary"
                        onPress={() => setPassVisit(v)}
                        className="h-10 flex-grow"
                      />
                    ) : null}
                    {v.status !== 'checked_in' ? (
                      <Button
                        title="Check in"
                        variant="outline"
                        loading={checkin.isPending}
                        onPress={() => doCheckin(v)}
                        className="h-10 flex-grow"
                      />
                    ) : null}
                    {isAgent && v.status === 'requested' ? (
                      <Button title="Confirm" variant="secondary" onPress={() => changeStatus(v, 'confirmed')} className="h-10 flex-grow" />
                    ) : null}
                    {isAgent ? (
                      <Button title="Completed" variant="outline" onPress={() => changeStatus(v, 'completed')} className="h-10 flex-grow" />
                    ) : null}
                    {isAgent ? (
                      <Button title="No-show" variant="ghost" onPress={() => changeStatus(v, 'no_show')} className="h-10 flex-grow" />
                    ) : null}
                    <Button title="Cancel" variant="ghost" onPress={() => changeStatus(v, 'cancelled')} className="h-10 flex-grow" />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
      <VisitPassSheet visit={passVisit} visible={!!passVisit} onClose={() => setPassVisit(null)} />
    </Screen>
  );
}

/**
 * Post-visit feedback (0102). Existing feedback + photos render for everyone on
 * the visit; the assigned agent can add/update via an inline expander (no
 * Alert.prompt — iOS-only). Writes ONLY through rpc record_visit_feedback.
 */
function VisitFeedbackSection({ visit, isAgent }: { visit: SiteVisit; isAgent: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const uid = useAuth((s) => s.profile?.id);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(visit.feedback ?? '');
  const [assets, setAssets] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  const photos = Array.isArray(visit.visit_photos) ? visit.visit_photos : [];
  const canWrite = isAgent && (visit.status === 'checked_in' || visit.status === 'completed');

  async function pickPhotos() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.8,
    });
    if (res.canceled) return;
    setAssets((prev) => [
      ...prev,
      ...res.assets.map((a) => ({ uri: a.uri, name: a.fileName, mimeType: a.mimeType })),
    ]);
  }

  async function save() {
    setSaving(true);
    try {
      const urls: string[] = [...photos];
      for (const a of assets) {
        const { url } = await uploadFileToBucket(
          'property-media',
          `${uid ?? 'agent'}/visit-feedback`,
          a,
          'visit.jpg',
          'image/jpeg',
        );
        urls.push(url);
      }
      const { error } = await supabase.rpc('record_visit_feedback', {
        p_visit: visit.id,
        p_feedback: text.trim(),
        p_photos: urls,
      });
      if (error) throw error;
      setOpen(false);
      setAssets([]);
      void qc.invalidateQueries({ queryKey: ['site-visits'] });
    } catch (e) {
      Alert.alert(t('visits.feedbackTitle', { defaultValue: 'Visit feedback' }), errMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!canWrite && !visit.feedback && photos.length === 0) return null;

  return (
    <View className="gap-2">
      {visit.feedback && !open ? (
        <View className="rounded-xl bg-paper p-3">
          <Text variant="caption">{t('visits.feedbackLabel', { defaultValue: 'Feedback' })}</Text>
          <Text className="text-[13px] text-ink">{visit.feedback}</Text>
        </View>
      ) : null}
      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {photos.map((p, i) => (
              <Image
                key={`${p}-${i}`}
                source={{ uri: p }}
                style={{ width: 64, height: 64, borderRadius: 10 }}
                contentFit="cover"
              />
            ))}
          </View>
        </ScrollView>
      ) : null}

      {canWrite && !open ? (
        <Button
          title={
            visit.feedback
              ? t('visits.editFeedback', { defaultValue: 'Edit feedback' })
              : t('visits.addFeedback', { defaultValue: 'Add feedback' })
          }
          variant="outline"
          className="h-10 self-start px-4"
          onPress={() => {
            setText(visit.feedback ?? '');
            setOpen(true);
          }}
        />
      ) : null}

      {open ? (
        <View className="gap-2 rounded-xl bg-paper p-3">
          <Input
            placeholder={t('visits.feedbackPlaceholder', {
              defaultValue: 'How did the visit go? Buyer interest, objections, next step…',
            })}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={3}
            className="min-h-[84px] py-3"
            textAlignVertical="top"
          />
          {assets.length > 0 ? (
            <Text variant="caption">
              {t('visits.photosSelected', {
                defaultValue: '{{count}} photo(s) ready to upload',
                count: assets.length,
              })}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            <Button
              title={t('visits.addPhotos', { defaultValue: 'Add photos' })}
              variant="ghost"
              className="h-10 flex-grow"
              onPress={pickPhotos}
            />
            <Button
              title={t('visits.saveFeedback', { defaultValue: 'Save' })}
              variant="secondary"
              className="h-10 flex-grow"
              loading={saving}
              onPress={save}
            />
            <Button
              title={t('common.cancel', { defaultValue: 'Cancel' })}
              variant="ghost"
              className="h-10 flex-grow"
              onPress={() => {
                setOpen(false);
                setAssets([]);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
