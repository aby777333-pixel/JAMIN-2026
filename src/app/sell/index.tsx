import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { ContactCard } from '@/features/buyer/components/ContactCard';
import { SellJourney } from '@/features/seller/components/SellJourney';
import type { ListingPatch, SellerListingStat } from '@/features/seller/api';
import { useMyListingStats, useUpdateListing } from '@/features/seller/hooks';
import { errMessage } from '@/lib/errors';
import { color } from '@/theme/tokens';

function apprTone(s: string): 'available' | 'reserved' | 'sold' | 'neutral' {
  if (s === 'approved') return 'available';
  if (s === 'rejected') return 'sold';
  if (s === 'pending') return 'reserved';
  return 'neutral';
}

export default function MyListings() {
  const { t } = useTranslation();
  const { data, isLoading, refetch, isRefetching } = useMyListingStats();
  const update = useUpdateListing();
  const listings = data ?? [];

  function applyPatch(id: string, patch: ListingPatch, successMessage?: string) {
    update.mutate(
      { id, patch },
      {
        onSuccess: () => {
          if (successMessage) {
            Alert.alert(t('sell.actions.doneTitle', { defaultValue: 'Done' }), successMessage);
          }
        },
        onError: (e) =>
          Alert.alert(t('sell.actions.failedTitle', { defaultValue: 'Update failed' }), errMessage(e)),
      },
    );
  }

  function confirmPatch(title: string, message: string, id: string, patch: ListingPatch) {
    Alert.alert(title, message, [
      { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
      { text: t('common.confirm', { defaultValue: 'Confirm' }), onPress: () => applyPatch(id, patch) },
    ]);
  }

  function onToggleHidden(l: SellerListingStat) {
    const hiding = !l.is_hidden;
    confirmPatch(
      hiding
        ? t('sell.actions.hideTitle', { defaultValue: 'Hide listing?' })
        : t('sell.actions.unhideTitle', { defaultValue: 'Unhide listing?' }),
      hiding
        ? t('sell.actions.hideBody', {
            defaultValue: 'Hidden listings are not visible to buyers. You can unhide it anytime.',
          })
        : t('sell.actions.unhideBody', {
            defaultValue: 'The listing will be visible to buyers again.',
          }),
      l.property_id,
      { is_hidden: hiding },
    );
  }

  function onStatus(l: SellerListingStat, status: 'available' | 'sold' | 'rented') {
    const titles: Record<string, string> = {
      available: t('sell.actions.relistTitle', { defaultValue: 'Relist this property?' }),
      sold: t('sell.actions.soldTitle', { defaultValue: 'Mark as sold?' }),
      rented: t('sell.actions.rentedTitle', { defaultValue: 'Mark as rented?' }),
    };
    const bodies: Record<string, string> = {
      available: t('sell.actions.relistBody', {
        defaultValue: 'The listing goes back to Available and shows to buyers again.',
      }),
      sold: t('sell.actions.soldBody', {
        defaultValue: 'Buyers will see this property as sold.',
      }),
      rented: t('sell.actions.rentedBody', {
        defaultValue: 'Buyers will see this property as rented.',
      }),
    };
    confirmPatch(titles[status], bodies[status], l.property_id, { status });
  }

  function onToggleArchive(l: SellerListingStat) {
    const archiving = !l.archived_at;
    confirmPatch(
      archiving
        ? t('sell.actions.archiveTitle', { defaultValue: 'Archive listing?' })
        : t('sell.actions.unarchiveTitle', { defaultValue: 'Unarchive listing?' }),
      archiving
        ? t('sell.actions.archiveBody', {
            defaultValue: 'Archived listings are removed from public browse. You can unarchive anytime.',
          })
        : t('sell.actions.unarchiveBody', {
            defaultValue: 'The listing returns to public browse.',
          }),
      l.property_id,
      { archived_at: archiving ? new Date().toISOString() : null },
    );
  }

  function onRenew(l: SellerListingStat) {
    applyPatch(
      l.property_id,
      { renewed_at: new Date().toISOString() },
      t('sell.actions.renewedBody', {
        defaultValue: 'Listing renewed — it will show as recently updated.',
      }),
    );
  }

  const inv = {
    total: listings.length,
    available: listings.filter((l) => l.status === 'available').length,
    reserved: listings.filter((l) => l.status === 'reserved').length,
    sold: listings.filter((l) => l.status === 'sold').length,
  };

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title="My listings" />

      {/* The production lifecycle, made visible: submit → review → live. */}
      <SellJourney />

      {listings.length > 0 ? (
        <Card className="gap-2">
          <Text variant="label">Inventory</Text>
          <View className="flex-row">
            <InvStat label="Total" value={inv.total} />
            <InvStat label="Available" value={inv.available} tone="text-success" />
            <InvStat label="Reserved" value={inv.reserved} tone="text-gold-deep" />
            <InvStat label="Sold" value={inv.sold} tone="text-danger" />
          </View>
        </Card>
      ) : null}

      <Button
        title="List a new property"
        left={<Ionicons name="add-circle" size={18} color="#FFFFFF" />}
        onPress={() => router.push('/sell/new')}
      />

      {/* Seller contact routing (Seller module spec): direct installs reach
          Jamin Bazaar; promoter-referral installs reach ONLY their promoter. */}
      <ContactCard />

      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-8" />
      ) : listings.length === 0 ? (
        <Card className="items-center gap-2 py-8">
          <Ionicons name="home-outline" size={28} color={color.muted} />
          <Text variant="title" className="text-[15px]">No listings yet</Text>
          <Text variant="caption" className="text-center">
            Tap “List a new property” to submit your first plot. An admin reviews it before it goes live.
          </Text>
        </Card>
      ) : (
        <View className="gap-3">
          <Pressable onPress={() => refetch()} className="flex-row items-center gap-1 self-end">
            <Ionicons name="refresh" size={14} color={color.muted} />
            <Text variant="caption">{isRefetching ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
          {listings.map((l) => (
            <Pressable key={l.property_id} onPress={() => router.push(`/property/${l.property_id}`)}>
              <Card className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-mono-bold text-[14px] text-gold-deep">{l.plot_code}</Text>
                  <View className="flex-row gap-1.5">
                    <Badge label={l.approval_status} tone={apprTone(l.approval_status)} />
                    <Badge
                      label={l.status}
                      tone={l.status === 'available' ? 'available' : l.status === 'reserved' ? 'reserved' : 'sold'}
                    />
                  </View>
                </View>
                <MoneyText value={l.price} className="text-[20px]" />
                <View className="flex-row flex-wrap gap-y-2">
                  <Stat label="Views" value={l.views} />
                  <Stat label="Enquiries" value={l.enquiries} />
                  <Stat label="Saved" value={l.saves} />
                  <Stat label="Offers" value={l.offers} />
                  <Stat label="Bookings" value={l.bookings} />
                </View>

                {l.is_hidden ? (
                  <Text variant="caption" className="text-warn">
                    {t('sell.captions.hidden', { defaultValue: 'Hidden from buyers' })}
                  </Text>
                ) : null}
                {l.archived_at ? (
                  <Text variant="caption" className="text-muted">
                    {t('sell.captions.archived', { defaultValue: 'Archived' })}
                  </Text>
                ) : null}
                {l.approval_status === 'rejected' && l.approval_note ? (
                  <Text variant="caption" className="text-danger">
                    {t('sell.captions.rejected', {
                      defaultValue: 'Rejected: {{note}}',
                      note: l.approval_note,
                    })}
                  </Text>
                ) : null}

                <View className="flex-row flex-wrap gap-2">
                  <ActionPill
                    label={t('sell.actions.edit', { defaultValue: 'Edit' })}
                    icon="create-outline"
                    onPress={() => router.push(`/sell/edit/${l.property_id}`)}
                  />
                  <ActionPill
                    label={
                      l.is_hidden
                        ? t('sell.actions.unhide', { defaultValue: 'Unhide' })
                        : t('sell.actions.hide', { defaultValue: 'Hide' })
                    }
                    icon={l.is_hidden ? 'eye-outline' : 'eye-off-outline'}
                    onPress={() => onToggleHidden(l)}
                  />
                  {l.status === 'available' ? (
                    <>
                      <ActionPill
                        label={t('sell.actions.markSold', { defaultValue: 'Mark sold' })}
                        icon="checkmark-done-outline"
                        onPress={() => onStatus(l, 'sold')}
                      />
                      <ActionPill
                        label={t('sell.actions.markRented', { defaultValue: 'Mark rented' })}
                        icon="key-outline"
                        onPress={() => onStatus(l, 'rented')}
                      />
                    </>
                  ) : (
                    <ActionPill
                      label={t('sell.actions.relist', { defaultValue: 'Relist' })}
                      icon="arrow-undo-outline"
                      onPress={() => onStatus(l, 'available')}
                    />
                  )}
                  <ActionPill
                    label={
                      l.archived_at
                        ? t('sell.actions.unarchive', { defaultValue: 'Unarchive' })
                        : t('sell.actions.archive', { defaultValue: 'Archive' })
                    }
                    icon={l.archived_at ? 'refresh-outline' : 'archive-outline'}
                    onPress={() => onToggleArchive(l)}
                  />
                  <ActionPill
                    label={t('sell.actions.renew', { defaultValue: 'Renew' })}
                    icon="sparkles-outline"
                    onPress={() => onRenew(l)}
                  />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

/** Compact outline pill for per-listing quick actions. */
function ActionPill({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={4}
      className="flex-row items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 active:bg-gold/20">
      <Ionicons name={icon} size={13} color={color.ink} />
      <Text className="text-[12px] font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="w-1/4 items-center">
      <Text className="font-mono-bold text-[18px] text-ink">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

function InvStat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <View className="w-1/4 items-center">
      <Text className={`font-mono-bold text-[20px] ${tone ?? 'text-ink'}`}>{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}
