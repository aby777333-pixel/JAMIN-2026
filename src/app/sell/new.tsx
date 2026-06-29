import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useProjects, usePropertyTypes } from '@/features/buyer/hooks';
import { useCreateListing } from '@/features/seller/hooks';
import { color } from '@/theme/tokens';

export default function NewListing() {
  const { data: projects, isLoading: projLoading } = useProjects();
  const { data: types, isLoading: typeLoading } = usePropertyTypes();
  const create = useCreateListing();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [zoning, setZoning] = useState('');
  const [ownership, setOwnership] = useState('');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  async function onSubmit() {
    if (!projectId) return Alert.alert('Pick a project', 'Choose which project this plot belongs to.');
    if (!typeId) return Alert.alert('Pick a property type', 'Choose the property type for this plot.');
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) return Alert.alert('Enter a price', 'Add a valid asking price.');
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    try {
      const code = await create.mutateAsync({
        projectId,
        propertyTypeId: typeId,
        price: priceNum,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        zoning: zoning.trim() || undefined,
        ownership: ownership.trim() || undefined,
        area: area.trim() || undefined,
        lat: !isNaN(latNum) ? latNum : null,
        lng: !isNaN(lngNum) ? lngNum : null,
      });
      Alert.alert(
        'Listing submitted',
        `${code} was created and sent for admin approval. It becomes visible to buyers once approved.`,
      );
      router.replace('/sell');
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen contentClassName="pb-12 gap-4" keyboardAvoiding>
      <BackHeader title="List a property" />

      <Text variant="caption">
        Submit a plot for review. An admin verifies it before it goes live — you’ll see its status under My listings.
        Add photos from the listing page after it’s created.
      </Text>

      <View className="gap-1.5">
        <Text variant="label">Project</Text>
        {projLoading ? (
          <ActivityIndicator color={color.red} />
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {(projects ?? []).map((p) => (
              <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(p.id)} />
            ))}
            {(projects ?? []).length === 0 ? <Text variant="caption">No projects available.</Text> : null}
          </View>
        )}
      </View>

      <View className="gap-1.5">
        <Text variant="label">Property type</Text>
        {typeLoading ? (
          <ActivityIndicator color={color.red} />
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {(types ?? []).map((t) => (
              <Chip key={t.id} label={t.name} active={typeId === t.id} onPress={() => setTypeId(t.id)} />
            ))}
          </View>
        )}
      </View>

      <Input label="Asking price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" inputMode="numeric" placeholder="1500000" />
      <Input label="Title / name (optional)" value={title} onChangeText={setTitle} placeholder="e.g. Premium corner plot" />
      <Input label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Highlights, surroundings, connectivity…" multiline className="h-auto min-h-[88px] py-3" />
      <Input label="Full address (optional)" value={address} onChangeText={setAddress} placeholder="Door/plot no, street, area, city, PIN" />
      <Input label="Plot area (optional)" value={area} onChangeText={setArea} placeholder="e.g. 2400 sq ft" />
      <Input label="Land category / zoning (optional)" value={zoning} onChangeText={setZoning} placeholder="Residential / Commercial / Agricultural" />
      <Input label="Ownership / document status (optional)" value={ownership} onChangeText={setOwnership} placeholder="Clear title / Patta / Khata-A" />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Latitude (optional)" value={lat} onChangeText={setLat} keyboardType="numeric" inputMode="decimal" placeholder="12.9716" />
        </View>
        <View className="flex-1">
          <Input label="Longitude (optional)" value={lng} onChangeText={setLng} keyboardType="numeric" inputMode="decimal" placeholder="77.5946" />
        </View>
      </View>

      <Button title="Submit for approval" loading={create.isPending} onPress={onSubmit} />
    </Screen>
  );
}
