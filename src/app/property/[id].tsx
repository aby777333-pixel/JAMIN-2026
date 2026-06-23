import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

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
import { PropertyGallery } from '@/features/buyer/components/PropertyGallery';
import { RoiCalculator } from '@/features/buyer/components/RoiCalculator';
import { SiteVisitSheet } from '@/features/buyer/components/SiteVisitSheet';
import {
  useProperty,
  useReserveProperty,
  useToggleWishlist,
  useWishlistIds,
} from '@/features/buyer/hooks';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: property, isLoading } = useProperty(id);
  const { data: saved } = useWishlistIds();
  const role = useAuth((s) => s.profile?.role_slug);
  const isPartner = !!role && role !== 'buyer';
  const toggle = useToggleWishlist();
  const reserve = useReserveProperty();

  const [enquiry, setEnquiry] = useState(false);
  const [visit, setVisit] = useState(false);

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
  const attrs = Object.entries(property.attrs ?? {}).filter(([k]) => k !== 'featured');

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
          <Pressable onPress={() => toggle.mutate({ propertyId: property.id, saved: isSaved })} hitSlop={10}>
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={24} color={isSaved ? color.red : color.ink} />
          </Pressable>
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
        <Text variant="h1">{property.project?.name ?? 'Property'}</Text>
        {property.project?.location ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="location-outline" size={14} color={color.muted} />
            <Text variant="caption">{property.project.location}</Text>
          </View>
        ) : null}
        <MoneyText value={property.price} className="mt-1 text-[28px]" />
      </View>

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

      <EmiCalculator price={property.price} />
      <RoiCalculator price={property.price} />

      <View className="gap-3">
        <Button title="Enquire now" onPress={() => setEnquiry(true)} />
        <Button title="Book a site visit" variant="outline" onPress={() => setVisit(true)} />
        {property.status === 'available' ? (
          <Button title="Reserve this plot" variant="secondary" loading={reserve.isPending} onPress={onReserve} />
        ) : null}
      </View>

      <EnquirySheet visible={enquiry} onClose={() => setEnquiry(false)} propertyId={property.id} propertyLabel={label} />
      <SiteVisitSheet visible={visit} onClose={() => setVisit(false)} propertyId={property.id} propertyLabel={label} />
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
