import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Disclosure } from '@/components/ui/Disclosure';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useProjects, usePropertyTypes } from '@/features/buyer/hooks';
import { addDocument, listDocumentTypes } from '@/features/documents/api';
import { useCreateListing } from '@/features/seller/hooks';
import { submitPropertyPhotos } from '@/features/submissions/api';
import { FACINGS } from '@/features/astro/vastu';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

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
  docType: string;
}

/**
 * Common Indian land documents — tags each upload so the admin knows what it is.
 * Fallback only: the picker prefers the DB catalogue (document_types, 0101) and
 * uses this list while it loads, on error, or if the table comes back empty.
 */
const FALLBACK_DOC_TYPES = [
  'Patta',
  'Chitta / Adangal',
  'EC (Encumbrance)',
  'Title deed',
  'Tax receipt',
  'Layout approval',
  'Other',
];

/** Canonical option values — stored as-is in attrs (labels may be translated). */
const LISTING_FOR_OPTIONS = ['Sale', 'Rent'] as const;
const PRICE_TYPE_OPTIONS = ['Negotiable', 'Fixed'] as const;
const AREA_UNIT_OPTIONS = ['Sq.ft', 'Sq.yd', 'Cent', 'Acre', 'Hectare'] as const;
const FURNISHING_OPTIONS = ['Furnished', 'Semi-furnished', 'Unfurnished'] as const;

export default function NewListing() {
  const { t } = useTranslation();
  const { data: projects, isLoading: projLoading } = useProjects();
  const { data: types, isLoading: typeLoading } = usePropertyTypes();
  const create = useCreateListing();

  // DB-driven document-type catalogue; falls back to the hardcoded list while
  // loading, on error, or if the table is empty.
  const { data: dbDocTypes } = useQuery({
    queryKey: ['document_types'],
    queryFn: listDocumentTypes,
    staleTime: 5 * 60_000,
  });
  const docTypeNames =
    dbDocTypes && dbDocTypes.length > 0 ? dbDocTypes.map((d) => d.name) : FALLBACK_DOC_TYPES;

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
  const [docType, setDocType] = useState(FALLBACK_DOC_TYPES[0]);
  const [surveyNo, setSurveyNo] = useState('');
  const [pattaNo, setPattaNo] = useState('');
  const [khataNo, setKhataNo] = useState('');
  const [dtcpNo, setDtcpNo] = useState('');

  // ── Optional extras (all folded into attrs only when non-empty) ──
  // Listing details
  const [listingFor, setListingFor] = useState<string | null>(null);
  const [priceType, setPriceType] = useState<string | null>(null);
  const [areaUnit, setAreaUnit] = useState<string | null>(null);
  const [ageOfProperty, setAgeOfProperty] = useState('');
  // Home details
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [floors, setFloors] = useState('');
  const [furnishing, setFurnishing] = useState<string | null>(null);
  const [parking, setParking] = useState('');
  const [amenities, setAmenities] = useState('');
  // Land & utilities
  const [plotDimensions, setPlotDimensions] = useState('');
  const [roadWidth, setRoadWidth] = useState('');
  const [cornerPlot, setCornerPlot] = useState(false);
  const [waterSource, setWaterSource] = useState('');
  const [electricity, setElectricity] = useState(false);
  const [drainage, setDrainage] = useState(false);
  // Neighbourhood
  const [nearbySchools, setNearbySchools] = useState('');
  const [nearbyHospitals, setNearbyHospitals] = useState('');
  const [publicTransport, setPublicTransport] = useState('');
  const [shoppingCentres, setShoppingCentres] = useState('');
  const [pinCode, setPinCode] = useState('');

  async function pickDocs() {
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    setDocs((d) => [
      ...d,
      ...res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, docType })),
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
        surveyNo: surveyNo.trim() || undefined,
        pattaNo: pattaNo.trim() || undefined,
        khataNo: khataNo.trim() || undefined,
        dtcpNo: dtcpNo.trim() || undefined,
      });
      // Fold the optional extras into attrs (Title-case keys, non-empty only).
      // Merged via a follow-up update on the just-created row so the existing
      // create pipeline stays untouched. Best-effort: never loses the listing.
      const extraAttrs: Record<string, string> = {};
      if (listingFor) extraAttrs['Listing for'] = listingFor;
      if (priceType) extraAttrs['Price type'] = priceType;
      if (areaUnit) extraAttrs['Area unit'] = areaUnit;
      if (ageOfProperty.trim()) extraAttrs['Age of property'] = ageOfProperty.trim();
      if (bedrooms.trim()) extraAttrs['Bedrooms'] = bedrooms.trim();
      if (bathrooms.trim()) extraAttrs['Bathrooms'] = bathrooms.trim();
      if (floors.trim()) extraAttrs['Floors'] = floors.trim();
      if (furnishing) extraAttrs['Furnishing'] = furnishing;
      if (parking.trim()) extraAttrs['Parking'] = parking.trim();
      if (amenities.trim()) extraAttrs['Amenities'] = amenities.trim();
      if (plotDimensions.trim()) extraAttrs['Plot dimensions'] = plotDimensions.trim();
      if (roadWidth.trim()) extraAttrs['Road width'] = roadWidth.trim();
      if (cornerPlot) extraAttrs['Corner plot'] = 'Yes';
      if (waterSource.trim()) extraAttrs['Water source'] = waterSource.trim();
      if (electricity) extraAttrs['Electricity connection'] = 'Yes';
      if (drainage) extraAttrs['Drainage'] = 'Yes';
      if (nearbySchools.trim()) extraAttrs['Nearby schools'] = nearbySchools.trim();
      if (nearbyHospitals.trim()) extraAttrs['Nearby hospitals'] = nearbyHospitals.trim();
      if (publicTransport.trim()) extraAttrs['Public transport'] = publicTransport.trim();
      if (shoppingCentres.trim()) extraAttrs['Shopping centres'] = shoppingCentres.trim();
      if (pinCode.trim()) extraAttrs['PIN code'] = pinCode.trim();
      if (Object.keys(extraAttrs).length > 0) {
        try {
          const { data: row, error: readErr } = await supabase
            .from('properties')
            .select('attrs')
            .eq('id', id)
            .single();
          // Only merge when the base attrs were read back successfully — never
          // overwrite what the create pipeline just stored.
          if (!readErr && row) {
            const base =
              row.attrs && typeof row.attrs === 'object' && !Array.isArray(row.attrs)
                ? (row.attrs as Record<string, string>)
                : {};
            await supabase
              .from('properties')
              .update({ attrs: { ...base, ...extraAttrs } })
              .eq('id', id);
          }
        } catch {
          // best-effort — the listing itself is already created
        }
      }
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
          await addDocument({
            title: `${d.docType} — ${d.name}`,
            kind: d.docType.toLowerCase(),
            propertyId: id,
            uri: d.uri,
            name: d.name,
            mimeType: d.mimeType,
          });
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

      <Text variant="label" className="mt-1">Land records (optional)</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Survey no." value={surveyNo} onChangeText={setSurveyNo} placeholder="e.g. 123/4B" />
        </View>
        <View className="flex-1">
          <Input label="Patta no." value={pattaNo} onChangeText={setPattaNo} placeholder="e.g. 456" />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Khata no." value={khataNo} onChangeText={setKhataNo} placeholder="e.g. 789" />
        </View>
        <View className="flex-1">
          <Input label="DTCP / layout no." value={dtcpNo} onChangeText={setDtcpNo} placeholder="Approval no." />
        </View>
      </View>

      <Disclosure
        title={t('sellNew.listingDetails.title', { defaultValue: 'Listing details' })}
        subtitle={t('sellNew.listingDetails.subtitle', { defaultValue: 'Sale or rent, price type, area unit, age' })}>
        <View className="gap-1.5">
          <Text variant="label">{t('sellNew.listingFor', { defaultValue: 'Listing for' })}</Text>
          <View className="flex-row flex-wrap gap-2">
            {LISTING_FOR_OPTIONS.map((v) => (
              <Chip key={v} label={v} active={listingFor === v} onPress={() => setListingFor(listingFor === v ? null : v)} />
            ))}
          </View>
        </View>
        <View className="gap-1.5">
          <Text variant="label">{t('sellNew.priceType', { defaultValue: 'Price type' })}</Text>
          <View className="flex-row flex-wrap gap-2">
            {PRICE_TYPE_OPTIONS.map((v) => (
              <Chip key={v} label={v} active={priceType === v} onPress={() => setPriceType(priceType === v ? null : v)} />
            ))}
          </View>
        </View>
        <View className="gap-1.5">
          <Text variant="label">{t('sellNew.areaUnit', { defaultValue: 'Area unit' })}</Text>
          <View className="flex-row flex-wrap gap-2">
            {AREA_UNIT_OPTIONS.map((v) => (
              <Chip key={v} label={v} active={areaUnit === v} onPress={() => setAreaUnit(areaUnit === v ? null : v)} />
            ))}
          </View>
        </View>
        <Input
          label={t('sellNew.ageOfProperty', { defaultValue: 'Age of property (years)' })}
          value={ageOfProperty}
          onChangeText={setAgeOfProperty}
          keyboardType="numeric"
          inputMode="numeric"
          placeholder="5"
        />
      </Disclosure>

      <Disclosure
        title={t('sellNew.homeDetails.title', { defaultValue: 'Home details' })}
        subtitle={t('sellNew.homeDetails.subtitle', { defaultValue: 'Bedrooms, bathrooms, furnishing, parking' })}>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label={t('sellNew.bedrooms', { defaultValue: 'Bedrooms' })}
              value={bedrooms}
              onChangeText={setBedrooms}
              keyboardType="numeric"
              inputMode="numeric"
              placeholder="3"
            />
          </View>
          <View className="flex-1">
            <Input
              label={t('sellNew.bathrooms', { defaultValue: 'Bathrooms' })}
              value={bathrooms}
              onChangeText={setBathrooms}
              keyboardType="numeric"
              inputMode="numeric"
              placeholder="2"
            />
          </View>
        </View>
        <Input
          label={t('sellNew.floors', { defaultValue: 'Floors' })}
          value={floors}
          onChangeText={setFloors}
          keyboardType="numeric"
          inputMode="numeric"
          placeholder="2"
        />
        <View className="gap-1.5">
          <Text variant="label">{t('sellNew.furnishing', { defaultValue: 'Furnishing' })}</Text>
          <View className="flex-row flex-wrap gap-2">
            {FURNISHING_OPTIONS.map((v) => (
              <Chip key={v} label={v} active={furnishing === v} onPress={() => setFurnishing(furnishing === v ? null : v)} />
            ))}
          </View>
        </View>
        <Input
          label={t('sellNew.parking', { defaultValue: 'Parking' })}
          value={parking}
          onChangeText={setParking}
          placeholder={t('sellNew.parkingPh', { defaultValue: 'e.g. 2 covered' })}
        />
        <Input
          label={t('sellNew.amenities', { defaultValue: 'Amenities' })}
          value={amenities}
          onChangeText={setAmenities}
          placeholder={t('sellNew.amenitiesPh', { defaultValue: 'Lift, gym, borewell… (comma separated)' })}
        />
      </Disclosure>

      <Disclosure
        title={t('sellNew.landUtilities.title', { defaultValue: 'Land & utilities' })}
        subtitle={t('sellNew.landUtilities.subtitle', { defaultValue: 'Dimensions, road, water, power, drainage' })}>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label={t('sellNew.plotDimensions', { defaultValue: 'Plot dimensions' })}
              value={plotDimensions}
              onChangeText={setPlotDimensions}
              placeholder={t('sellNew.plotDimensionsPh', { defaultValue: 'e.g. 40×60' })}
            />
          </View>
          <View className="flex-1">
            <Input
              label={t('sellNew.roadWidth', { defaultValue: 'Road width (ft)' })}
              value={roadWidth}
              onChangeText={setRoadWidth}
              placeholder="30"
            />
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Chip
            label={t('sellNew.cornerPlot', { defaultValue: 'Corner plot' })}
            active={cornerPlot}
            onPress={() => setCornerPlot((v) => !v)}
          />
          <Chip
            label={t('sellNew.electricity', { defaultValue: 'Electricity connection' })}
            active={electricity}
            onPress={() => setElectricity((v) => !v)}
          />
          <Chip
            label={t('sellNew.drainage', { defaultValue: 'Drainage' })}
            active={drainage}
            onPress={() => setDrainage((v) => !v)}
          />
        </View>
        <Input
          label={t('sellNew.waterSource', { defaultValue: 'Water source' })}
          value={waterSource}
          onChangeText={setWaterSource}
          placeholder={t('sellNew.waterSourcePh', { defaultValue: 'Borewell / Corporation / Both' })}
        />
      </Disclosure>

      <Disclosure
        title={t('sellNew.neighbourhood.title', { defaultValue: 'Neighbourhood' })}
        subtitle={t('sellNew.neighbourhood.subtitle', { defaultValue: 'Schools, hospitals, transport, PIN code' })}>
        <Input
          label={t('sellNew.nearbySchools', { defaultValue: 'Nearby schools' })}
          value={nearbySchools}
          onChangeText={setNearbySchools}
          placeholder={t('sellNew.nearbySchoolsPh', { defaultValue: 'e.g. DAV School (1 km)' })}
        />
        <Input
          label={t('sellNew.nearbyHospitals', { defaultValue: 'Nearby hospitals' })}
          value={nearbyHospitals}
          onChangeText={setNearbyHospitals}
          placeholder={t('sellNew.nearbyHospitalsPh', { defaultValue: 'e.g. Apollo Clinic (2 km)' })}
        />
        <Input
          label={t('sellNew.publicTransport', { defaultValue: 'Public transport' })}
          value={publicTransport}
          onChangeText={setPublicTransport}
          placeholder={t('sellNew.publicTransportPh', { defaultValue: 'e.g. Bus stop 200 m, metro 3 km' })}
        />
        <Input
          label={t('sellNew.shoppingCentres', { defaultValue: 'Shopping centres' })}
          value={shoppingCentres}
          onChangeText={setShoppingCentres}
          placeholder={t('sellNew.shoppingCentresPh', { defaultValue: 'e.g. DMart (1.5 km)' })}
        />
        <Input
          label={t('sellNew.pinCode', { defaultValue: 'PIN code' })}
          value={pinCode}
          onChangeText={setPinCode}
          keyboardType="numeric"
          inputMode="numeric"
          placeholder="600001"
        />
      </Disclosure>

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
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] text-ink" numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text variant="caption">{d.docType}</Text>
                </View>
                <Pressable onPress={() => setDocs((arr) => arr.filter((_, j) => j !== i))} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color={color.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <Text variant="caption">Pick the document type, then attach the file(s):</Text>
        <View className="flex-row flex-wrap gap-2">
          {docTypeNames.map((k) => (
            <Chip key={k} label={k} active={docType === k} onPress={() => setDocType(k)} />
          ))}
        </View>
        <Button
          title={`📄 Add ${docType} document`}
          variant="outline"
          onPress={pickDocs}
          left={<Ionicons name="folder-open" size={16} color={color.ink} />}
        />
        <Text variant="caption">
          Any file type (PDF or photo). Shared with the JAMIN team for verification and kept in
          your Document vault.
        </Text>
      </View>

      <Button title="Submit for approval" loading={create.isPending} onPress={onSubmit} />
    </Screen>
  );
}
