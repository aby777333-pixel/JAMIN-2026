import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useProjects, usePropertyTypes } from '@/features/buyer/hooks';
import { addDocument } from '@/features/documents/api';
import { useCreateListing } from '@/features/seller/hooks';
import { submitPropertyPhotos } from '@/features/submissions/api';
import { FACINGS } from '@/features/astro/vastu';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

interface PickedMedia {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  kind: 'image' | 'video';
}

interface PickedDoc {
  uri: string;
  name: string;
  mimeType?: string | null;
}

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
  const [facing, setFacing] = useState<string | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [docs, setDocs] = useState<PickedDoc[]>([]);

  async function pickDocs() {
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    setDocs((d) => [
      ...d,
      ...res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType })),
    ]);
  }

  async function pickMedia() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      allowsMultipleSelection: true,
      videoMaxDuration: 90,
    });
    if (res.canceled) return;
    const picked: PickedMedia[] = res.assets.map((a) => ({
      uri: a.uri,
      name: a.fileName,
      mimeType: a.mimeType,
      kind: a.type === 'video' ? 'video' : 'image',
    }));
    setMedia((m) => [...m, ...picked]);
  }

  async function onSubmit() {
    if (!projectId) return Alert.alert('Pick a project', 'Choose which project this plot belongs to.');
    if (!typeId) return Alert.alert('Pick a property type', 'Choose the property type for this plot.');
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) return Alert.alert('Enter a price', 'Add a valid asking price.');
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    try {
      const { id, plot_code } = await create.mutateAsync({
        projectId,
        propertyTypeId: typeId,
        price: priceNum,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        zoning: zoning.trim() || undefined,
        ownership: ownership.trim() || undefined,
        area: area.trim() || undefined,
        facing: facing ?? undefined,
        lat: !isNaN(latNum) ? latNum : null,
        lng: !isNaN(lngNum) ? lngNum : null,
      });
      // Attach the picked photos/videos through the existing submissions
      // pipeline (admin reviews them alongside the listing). Best-effort: a
      // failed upload never loses the listing itself.
      let uploaded = 0;
      let failed = 0;
      for (const m of media) {
        try {
          await submitPropertyPhotos(id, [m]);
          uploaded++;
        } catch {
          failed++;
        }
      }
      // Property documents (deed / patta / EC …) go into the Document Vault
      // linked to this listing, so the admin sees them under the plot's Details.
      let docsUp = 0;
      let docsFail = 0;
      for (const d of docs) {
        try {
          await addDocument({ title: d.name, kind: 'property', propertyId: id, ...d });
          docsUp++;
        } catch {
          docsFail++;
        }
      }
      Alert.alert(
        'Listing submitted',
        `${plot_code} was created and sent for admin approval.` +
          (uploaded > 0 ? ` ${uploaded} photo/video${uploaded === 1 ? '' : 's'} attached.` : '') +
          (docsUp > 0 ? ` ${docsUp} document${docsUp === 1 ? '' : 's'} attached.` : '') +
          (failed + docsFail > 0
            ? ` ${failed + docsFail} upload${failed + docsFail === 1 ? '' : 's'} failed — you can add more from the listing page or Document vault.`
            : '') +
          ' It becomes visible to buyers once approved.',
      );
      router.replace('/sell');
    } catch (e) {
      Alert.alert('Could not submit', errMessage(e));
    }
  }

  return (
    <Screen contentClassName="pb-12 gap-4" keyboardAvoiding>
      <BackHeader title="List a property" />

      <Text variant="caption">
        Submit a plot for review. An admin verifies it before it goes live — you’ll see its status under My listings.
        Add photos and videos below, or later from the listing page.
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

      <View className="gap-1.5">
        <Text variant="label">Facing (Vastu) — optional</Text>
        <View className="flex-row flex-wrap gap-2">
          {FACINGS.map((f) => (
            <Chip key={f} label={f} active={facing === f} onPress={() => setFacing(facing === f ? null : f)} />
          ))}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Latitude (optional)" value={lat} onChangeText={setLat} keyboardType="numeric" inputMode="decimal" placeholder="12.9716" />
        </View>
        <View className="flex-1">
          <Input label="Longitude (optional)" value={lng} onChangeText={setLng} keyboardType="numeric" inputMode="decimal" placeholder="77.5946" />
        </View>
      </View>

      <View className="gap-1.5">
        <Text variant="label">Photos & videos (optional)</Text>
        {media.length > 0 ? (
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {media.map((m, i) => (
              <View key={`${m.uri}-${i}`} style={{ width: 76 }} className="gap-1">
                <View>
                  <Image
                    source={{ uri: m.uri }}
                    style={{ width: 76, height: 76, borderRadius: 10 }}
                    contentFit="cover"
                  />
                  {m.kind === 'video' ? (
                    <View className="absolute bottom-1 right-1 rounded-md bg-black/60 p-0.5">
                      <Ionicons name="videocam" size={12} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>
                <Pressable onPress={() => setMedia((arr) => arr.filter((_, j) => j !== i))} hitSlop={6}>
                  <Text className="text-center text-[11px] font-semibold text-red">Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <Button
          title="📎 Add photos / videos"
          variant="outline"
          onPress={pickMedia}
          left={<Ionicons name="images" size={16} color={color.ink} />}
        />
        <Text variant="caption">
          They’re reviewed by the admin along with your listing and go live once approved.
        </Text>
      </View>

      <View className="gap-1.5">
        <Text variant="label">Property documents (optional)</Text>
        {docs.length > 0 ? (
          <View className="gap-1.5">
            {docs.map((d, i) => (
              <View
                key={`${d.uri}-${i}`}
                className="flex-row items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                <Ionicons name="document-text" size={16} color={color.red} />
                <Text className="flex-1 text-[13px] text-ink" numberOfLines={1}>
                  {d.name}
                </Text>
                <Pressable onPress={() => setDocs((arr) => arr.filter((_, j) => j !== i))} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color={color.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <Button
          title="📄 Add documents (deed, patta, EC…)"
          variant="outline"
          onPress={pickDocs}
          left={<Ionicons name="folder-open" size={16} color={color.ink} />}
        />
        <Text variant="caption">
          Title deed, patta, EC, tax receipts — any file type. Shared with the JAMIN team for
          verification and kept in your Document vault.
        </Text>
      </View>

      <Button title="Submit for approval" loading={create.isPending} onPress={onSubmit} />
    </Screen>
  );
}
