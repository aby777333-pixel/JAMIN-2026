import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMyListing, useUpdateListing } from '@/features/seller/hooks';
import { errMessage } from '@/lib/errors';
import { color } from '@/theme/tokens';

interface AttrRow {
  key: string;
  value: string;
}

/**
 * Edit listing (0101): the seller corrects price, title, description and any
 * descriptive attrs on their own listing. Verification/approval columns are
 * protected by the DB guard trigger, so only seller-editable fields appear.
 */
export default function EditListing() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useMyListing(id ?? '');
  const update = useUpdateListing();

  const [hydrated, setHydrated] = useState(false);
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [extras, setExtras] = useState<AttrRow[]>([]);
  const [priceError, setPriceError] = useState<string | undefined>();

  // Hydrate the form once when the listing arrives (never clobber edits on refetch).
  useEffect(() => {
    if (!data || hydrated) return;
    const attrs = (data.attrs ?? {}) as Record<string, unknown>;
    setPrice(String(data.price));
    setTitle(typeof attrs.title === 'string' ? attrs.title : '');
    setDescription(typeof attrs.description === 'string' ? attrs.description : '');
    setExtras(
      Object.entries(attrs)
        .filter(([k]) => k !== 'title' && k !== 'description')
        .map(([key, value]) => ({ key, value: value == null ? '' : String(value) })),
    );
    setHydrated(true);
  }, [data, hydrated]);

  function setExtra(index: number, value: string) {
    setExtras((rows) => rows.map((r, i) => (i === index ? { ...r, value } : r)));
  }

  function onSave() {
    if (!data) return;
    const priceNum = Number(price.replace(/[,\s]/g, ''));
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setPriceError(t('sell.edit.priceError', { defaultValue: 'Enter a valid price' }));
      return;
    }
    setPriceError(undefined);

    const attrs: Record<string, string> = {};
    if (title.trim()) attrs.title = title.trim();
    if (description.trim()) attrs.description = description.trim();
    for (const row of extras) {
      if (row.value.trim()) attrs[row.key] = row.value.trim();
    }

    update.mutate(
      { id: data.id, patch: { price: priceNum, attrs } },
      {
        onSuccess: () => {
          Alert.alert(
            t('sell.edit.savedTitle', { defaultValue: 'Saved' }),
            t('sell.edit.savedBody', { defaultValue: 'Your listing has been updated.' }),
          );
          router.back();
        },
        onError: (e) =>
          Alert.alert(t('sell.edit.failedTitle', { defaultValue: 'Save failed' }), errMessage(e)),
      },
    );
  }

  return (
    <Screen contentClassName="pb-12 gap-4" keyboardAvoiding>
      <BackHeader title={t('sell.edit.title', { defaultValue: 'Edit listing' })} />

      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-8" />
      ) : !data ? (
        <Card className="items-center gap-2 py-8">
          <Text variant="title" className="text-[15px]">
            {t('sell.edit.notFoundTitle', { defaultValue: 'Listing not found' })}
          </Text>
          <Text variant="caption" className="text-center">
            {t('sell.edit.notFoundBody', {
              defaultValue: 'This listing does not exist or does not belong to you.',
            })}
          </Text>
        </Card>
      ) : (
        <>
          <Card className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="font-mono-bold text-[14px] text-gold-deep">{data.plot_code}</Text>
              <Badge
                label={data.status}
                tone={
                  data.status === 'available'
                    ? 'available'
                    : data.status === 'reserved'
                      ? 'reserved'
                      : 'sold'
                }
              />
            </View>
            {data.approval_status === 'rejected' && data.approval_note ? (
              <Text variant="caption" className="text-danger">
                {t('sell.captions.rejected', {
                  defaultValue: 'Rejected: {{note}}',
                  note: data.approval_note,
                })}
              </Text>
            ) : null}
          </Card>

          <Card className="gap-4">
            <Input
              label={t('sell.edit.price', { defaultValue: 'Price (₹)' })}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              inputMode="numeric"
              error={priceError}
            />
            <Input
              label={t('sell.edit.listingTitle', { defaultValue: 'Title' })}
              value={title}
              onChangeText={setTitle}
              autoCapitalize="sentences"
            />
            <Input
              label={t('sell.edit.description', { defaultValue: 'Description' })}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              className="h-auto min-h-[120px] py-3"
            />
          </Card>

          {extras.length > 0 ? (
            <Card className="gap-4">
              <Text variant="label">
                {t('sell.edit.details', { defaultValue: 'Property details' })}
              </Text>
              {extras.map((row, i) => (
                <Input
                  key={row.key}
                  label={row.key}
                  value={row.value}
                  onChangeText={(v) => setExtra(i, v)}
                />
              ))}
            </Card>
          ) : null}

          <Button
            title={t('sell.edit.save', { defaultValue: 'Save changes' })}
            loading={update.isPending}
            onPress={onSave}
          />
          <Text variant="caption" className="text-center">
            {t('sell.edit.verificationNote', {
              defaultValue: 'Verification status and badges can only be changed by JAMIN.',
            })}
          </Text>
        </>
      )}
    </Screen>
  );
}
