import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { type SiteVisit } from '@/features/visits/api';
import { useCheckinVisit, useMyVisits, useSetVisitStatus } from '@/features/visits/hooks';
import { can } from '@/lib/access';
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

                {open ? (
                  <View className="flex-row flex-wrap gap-2 pt-1">
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
    </Screen>
  );
}
