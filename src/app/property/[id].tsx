import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Share, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { CommissionPreview } from '@/features/commission/components/CommissionPreview';
import { EmiCalculator } from '@/features/buyer/components/EmiCalculator';
import { EnquirySheet } from '@/features/buyer/components/EnquirySheet';
import { NearbyAmenities } from '@/features/buyer/components/NearbyAmenities';
import { PropertyGallery } from '@/features/buyer/components/PropertyGallery';
import { RoiCalculator } from '@/features/buyer/components/RoiCalculator';
import { SiteVisitSheet } from '@/features/buyer/components/SiteVisitSheet';
import { OfferSheet } from '@/features/offers/OfferSheet';
import { ReportSheet } from '@/features/offers/ReportSheet';
import {
  useLogPropertyView,
  useProperty,
  useReserveProperty,
  useToggleWishlist,
  useWishlistIds,
} from '@/features/buyer/hooks';
import { useSubmitPhotos } from '@/features/submissions/hooks';
import { SITE_URL } from '@/lib/site';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: property, isLoading } = useProperty(id);
  useLogPropertyView(id);
  const { data: saved } = useWishlistIds();
  const role = useAuth((s) => s.profile?.role_slug);
  const myId = useAuth((s) => s.profile?.id);
  const isPartner = !!role && role !== 'buyer';
  const toggle = useToggleWishlist();
  const reserve = useReserveProperty();
  const submitPhotos = useSubmitPhotos();

  const [enquiry, setEnquiry] = useState(false);
  const [visit, setVisit] = useState(false);
  const [offer, setOffer] = useState(false);
  const [report, setReport] = useState(false);

  async function onSuggestPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
    });
    if (res.canceled || !property) return;
    try {
      const n = await submitPhotos.mutateAsync({
        propertyId: property.id,
        assets: res.assets.map((a) => ({ uri: a.uri, name: a.fileName, mimeType: a.mimeType })),
      });
      Alert.alert('Submitted', `${n} photo${n === 1 ? '' : 's'} sent for admin review.`);
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : String(e));
    }
  }

  if (isLoading) {
    return (
      <Screen scroll={false} contentClassName="justify-center">
        <ActivityIndicator color={color.red} />
      </Screen>
    );
  }
  if (!property) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Property" />
        <Text variant="body" className="mt-8 text-center text-muted">
          This property is no longer available.
        </Text>
      </Screen>
    );
  }

  const isSaved = saved?.has(property.id) ?? false;
  const label = `${property.project?.name ?? 'Property'} · ${property.plot_code}`;

  // Tours are data-driven: the admin sets URLs on the property's attrs.
  const a = (property.attrs ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) if (typeof a[k] === 'string' && a[k]) return a[k] as string;
    return undefined;
  };
  const tours = (
    [
      { label: 'Video tour', icon: 'play-circle' as const, url: pick('video_tour', 'video_url', 'video') },
      { label: 'Virtual tour', icon: 'compass' as const, url: pick('virtual_tour', 'virtual_tour_url', 'tour_360') },
      { label: '3D walkthrough', icon: 'cube' as const, url: pick('walkthrough', 'tour_3d', 'walkthrough_3d') },
    ] as const
  ).filter((t) => !!t.url) as { label: string; icon: keyof typeof Ionicons.glyphMap; url: string }[];

  const customTitle = pick('title');
  const description = pick('description');
  // Keys with dedicated rendering — excluded from the generic key/value detail list.
  const RESERVED_KEYS = ['featured', 'title', 'description', 'video_tour', 'video_url', 'video', 'virtual_tour', 'virtual_tour_url', 'tour_360', 'walkthrough', 'tour_3d', 'walkthrough_3d'];
  const attrs = Object.entries(property.attrs ?? {}).filter(([k]) => !RESERVED_KEYS.includes(k));
  const lat = property.coordinates?.lat;
  const lng = property.coordinates?.lng;
  const hasCoords = lat != null && lng != null;

  // Verification badges (migration 0037) — admin-set trust signals.
  const verifiedBadges: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [];
  if (property.verified_seller) verifiedBadges.push({ label: 'Verified Seller', icon: 'shield-checkmark' });
  if (property.verified_documents) verifiedBadges.push({ label: 'Verified Docs', icon: 'document-text' });
  if (property.verified_location) verifiedBadges.push({ label: 'Verified Location', icon: 'location' });
  if (property.is_premium) verifiedBadges.push({ label: 'Premium', icon: 'star' });
  const isPending = property.approval_status === 'pending';
  const isRejected = property.approval_status === 'rejected';

  function onReserve() {
    Alert.alert('Reserve this plot?', `${label}\nThis places a soft reservation.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reserve',
        onPress: () =>
          reserve
            .mutateAsync({ propertyId: property!.id, amount: property!.price })
            .then(() => Alert.alert('Reserved', 'Our team will follow up to confirm.'))
            .catch((e) => Alert.alert('Could not reserve', e instanceof Error ? e.message : String(e))),
      },
    ]);
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader
        right={
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() =>
                Share.share({
                  message: `${customTitle ?? property.project?.name ?? 'Property'} (${property.plot_code}) on JAMIN Properties\n${SITE_URL}/p/${property.id}`,
                  url: `${SITE_URL}/p/${property.id}`,
                }).catch(() => {})
              }
              hitSlop={10}>
              <Ionicons name="share-social-outline" size={22} color={color.ink} />
            </Pressable>
            <Pressable onPress={() => toggle.mutate({ propertyId: property.id, saved: isSaved })} hitSlop={10}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={24} color={isSaved ? color.red : color.ink} />
            </Pressable>
          </View>
        }
      />

      <PropertyGallery media={property.media} code={property.plot_code} />

      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-mono-bold text-[14px] text-gold-deep">{property.plot_code}</Text>
          <Badge
            label={property.status}
            tone={property.status === 'available' ? 'available' : property.status === 'reserved' ? 'reserved' : 'sold'}
          />
        </View>
        <Text variant="h1">{customTitle ?? property.project?.name ?? 'Property'}</Text>
        {customTitle && property.project?.name ? (
          <Text variant="caption">{property.project.name}</Text>
        ) : null}
        {property.project?.location ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="location-outline" size={14} color={color.muted} />
            <Text variant="caption">{property.project.location}</Text>
          </View>
        ) : null}
        <MoneyText value={property.price} className="mt-1 text-[28px]" />
      </View>

      {verifiedBadges.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {verifiedBadges.map((b) => (
            <View
              key={b.label}
              className="flex-row items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1">
              <Ionicons name={b.icon} size={13} color={color.goldDeep} />
              <Text className="text-[11px] font-semibold text-gold-deep">{b.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {isPending || isRejected ? (
        <Card className={`flex-row items-center gap-2.5 ${isRejected ? 'border-danger/40 bg-danger/5' : 'border-gold/40 bg-gold/5'}`}>
          <Ionicons name={isRejected ? 'close-circle' : 'time'} size={18} color={isRejected ? color.red : color.goldDeep} />
          <Text variant="caption" className="flex-1">
            {isRejected
              ? 'This listing was not approved. Edit it and contact support if you think this is a mistake.'
              : 'Awaiting admin approval — this listing isn’t visible to buyers yet.'}
          </Text>
        </Card>
      ) : null}

      {description ? (
        <View className="gap-1">
          <Text variant="label">About this property</Text>
          <Text variant="body" className="text-ink">{description}</Text>
        </View>
      ) : null}

      <Card className="flex-row flex-wrap gap-y-3">
        <Detail label="Type" value={property.type?.name ?? '—'} />
        <Detail label="Plan" value={property.plan?.name ?? '—'} />
        <Detail label="Project code" value={property.project?.code ?? '—'} />
        {property.coordinates?.lat ? (
          <Detail
            label="Location"
            value={`${property.coordinates.lat.toFixed(3)}, ${property.coordinates.lng?.toFixed(3)}`}
          />
        ) : null}
        {attrs.map(([k, v]) => (
          <Detail key={k} label={k} value={String(v)} />
        ))}
      </Card>

      {isPartner ? (
        <CommissionPreview
          ctx={{
            price: property.price,
            project_id: property.project_id,
            plan_id: property.plan_id,
            property_type_id: property.property_type_id,
          }}
        />
      ) : null}

      {isPartner ? (
        <Pressable onPress={onSuggestPhoto} disabled={submitPhotos.isPending}>
          <Card className="flex-row items-center gap-3 border-gold/40 bg-gold/5">
            <Ionicons name="cloud-upload" size={20} color={color.goldDeep} />
            <View className="flex-1">
              <Text variant="title" className="text-[14px]">
                {submitPhotos.isPending ? 'Uploading…' : 'Suggest a photo'}
              </Text>
              <Text variant="caption">Add photos for this plot — an admin reviews before they go live.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.muted} />
          </Card>
        </Pressable>
      ) : null}

      {tours.length > 0 || hasCoords ? (
        <View className="gap-2">
          <Text variant="label">Tours & location</Text>
          <View className="flex-row flex-wrap gap-2">
            {tours.map((tr) => (
              <Pressable
                key={tr.label}
                onPress={() => router.push({ pathname: '/webview', params: { url: tr.url, title: tr.label } })}
                className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
                <Ionicons name={tr.icon} size={16} color={color.red} />
                <Text className="text-[13px] font-semibold text-ink">{tr.label}</Text>
              </Pressable>
            ))}
            {hasCoords ? (
              <Pressable
                onPress={() =>
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
                }
                className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
                <Ionicons name="navigate" size={16} color={color.red} />
                <Text className="text-[13px] font-semibold text-ink">Nearby & directions</Text>
              </Pressable>
            ) : null}
            {hasCoords ? (
              <Pressable
                onPress={() => router.push({ pathname: '/ar', params: { id: property.id } })}
                className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
                <Ionicons name="scan" size={16} color={color.red} />
                <Text className="text-[13px] font-semibold text-ink">AR boundary (beta)</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {hasCoords ? <NearbyAmenities lat={lat as number} lng={lng as number} /> : null}

      <EmiCalculator price={property.price} />
      <RoiCalculator price={property.price} />

      <View className="gap-3">
        <Button title="Enquire now" onPress={() => setEnquiry(true)} />
        <Button title="Book a site visit" variant="outline" onPress={() => setVisit(true)} />
        {property.status === 'available' && property.seller_id !== myId ? (
          <Button title="Make an offer" variant="outline" onPress={() => setOffer(true)} />
        ) : null}
        {property.status === 'available' ? (
          <Button title="Reserve this plot" variant="secondary" loading={reserve.isPending} onPress={onReserve} />
        ) : null}
        <Pressable onPress={() => setReport(true)} className="items-center pt-1">
          <Text className="text-[13px] font-semibold text-muted">Report a problem with this listing</Text>
        </Pressable>
      </View>

      <EnquirySheet visible={enquiry} onClose={() => setEnquiry(false)} propertyId={property.id} propertyLabel={label} />
      <SiteVisitSheet visible={visit} onClose={() => setVisit(false)} propertyId={property.id} propertyLabel={label} />
      <OfferSheet visible={offer} onClose={() => setOffer(false)} propertyId={property.id} propertyLabel={label} listPrice={property.price} />
      <ReportSheet visible={report} onClose={() => setReport(false)} propertyId={property.id} propertyLabel={label} />
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 pr-3">
      <Text variant="caption" className="capitalize">
        {label}
      </Text>
      <Text variant="title" className="text-[14px]">
        {value}
      </Text>
    </View>
  );
}
