import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useBuyerPrefs, useSaveBuyerPrefs, type BuyerPrefs } from '@/features/buyer/enhancements';
import { usePropertyTypes } from '@/features/buyer/hooks';
import { errMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

interface Opt {
  value: string;
  label: string;
}

/** One labelled row of single-select chips over a string preference. */
function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Opt[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.value} label={o.label} active={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}

/**
 * My preferences — one jsonb document (buyer_preferences.prefs, migration 0100)
 * describing what the buyer wants, plus "Buying as" written straight to
 * profiles.buyer_type. Everything is optional; Save persists the whole doc.
 */
export default function Preferences() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const { data: prefs, isLoading } = useBuyerPrefs();
  const save = useSaveBuyerPrefs();
  const { data: types = [] } = usePropertyTypes();

  // Chip/boolean selections live in one doc; numeric fields keep their own
  // string state so typing "25" doesn't fight the parser mid-keystroke.
  const [doc, setDoc] = useState<BuyerPrefs>({});
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [locations, setLocations] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [plotSizeMin, setPlotSizeMin] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [savedTick, setSavedTick] = useState(false);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!prefs || hydrated.current) return;
    hydrated.current = true;
    setDoc(prefs);
    const s = (v: unknown) => (v == null ? '' : String(v));
    setBudgetMin(s(prefs.budgetMin));
    setBudgetMax(s(prefs.budgetMax));
    setLocations(typeof prefs.locations === 'string' ? prefs.locations : '');
    setRadiusKm(s(prefs.radiusKm));
    setPlotSizeMin(s(prefs.plotSizeMin));
    setBedrooms(s(prefs.bedrooms));
    setBathrooms(s(prefs.bathrooms));
  }, [prefs]);

  const setKey = (key: string, value: unknown) => {
    setSavedTick(false);
    setDoc((d) => ({ ...d, [key]: value }));
  };
  const str = (key: string) => (typeof doc[key] === 'string' ? (doc[key] as string) : undefined);
  const bool = (key: string) => doc[key] === true;

  // "Buying as" — written directly to profiles.buyer_type, not into the doc.
  const profileBuyerType =
    (profile as unknown as { buyer_type?: string | null } | null)?.buyer_type ?? 'individual';
  const [buyerType, setBuyerType] = useState<string>(profileBuyerType);
  const [buyerTypeSaving, setBuyerTypeSaving] = useState(false);

  async function changeBuyerType(v: string) {
    if (v === buyerType || buyerTypeSaving) return;
    const previous = buyerType;
    setBuyerType(v);
    setBuyerTypeSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const me = data.user?.id;
      if (!me) throw new Error('Not authenticated');
      const { error } = await supabase.from('profiles').update({ buyer_type: v }).eq('id', me);
      if (error) throw error;
      await refreshProfile();
    } catch (e) {
      setBuyerType(previous);
      Alert.alert(t('prefs.buyerTypeFailed', { defaultValue: 'Could not update' }), errMessage(e));
    } finally {
      setBuyerTypeSaving(false);
    }
  }

  async function onSave() {
    const num = (s: string): number | undefined => {
      const v = parseFloat(s.replace(/,/g, '').trim());
      return Number.isFinite(v) ? v : undefined;
    };
    const next: BuyerPrefs = {
      ...doc,
      budgetMin: num(budgetMin),
      budgetMax: num(budgetMax),
      locations: locations.trim() || undefined,
      radiusKm: num(radiusKm),
      plotSizeMin: num(plotSizeMin),
      bedrooms: num(bedrooms),
      bathrooms: num(bathrooms),
    };
    // Drop empty keys so the stored doc stays clean.
    Object.keys(next).forEach((k) => {
      if (next[k] === undefined || next[k] === '') delete next[k];
    });
    try {
      await save.mutateAsync(next);
      setDoc(next);
      setSavedTick(true);
    } catch (e) {
      Alert.alert(t('prefs.saveFailed', { defaultValue: 'Could not save' }), errMessage(e));
    }
  }

  const anyOpt = t('prefs.any', { defaultValue: 'Any' });

  return (
    <Screen contentClassName="pb-12 gap-4" keyboardAvoiding>
      <BackHeader title={t('prefs.title', { defaultValue: 'My preferences' })} />
      <Text variant="caption">
        {t('prefs.subtitle', {
          defaultValue:
            'Tell us what you’re looking for — we use this to personalise your recommendations and alerts.',
        })}
      </Text>

      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-8" />
      ) : (
        <>
          <Card className="gap-3">
            <ChipRow
              label={t('prefs.buyingAs', { defaultValue: 'Buying as' })}
              options={[
                { value: 'individual', label: t('prefs.buyerType.individual', { defaultValue: 'Individual' }) },
                { value: 'joint', label: t('prefs.buyerType.joint', { defaultValue: 'Joint' }) },
                { value: 'nri', label: t('prefs.buyerType.nri', { defaultValue: 'NRI' }) },
                { value: 'investor', label: t('prefs.buyerType.investor', { defaultValue: 'Investor' }) },
                { value: 'company', label: t('prefs.buyerType.company', { defaultValue: 'Company' }) },
              ]}
              value={buyerType}
              onChange={(v) => void changeBuyerType(v)}
            />
            {buyerTypeSaving ? (
              <Text variant="caption">{t('prefs.updating', { defaultValue: 'Updating…' })}</Text>
            ) : null}
          </Card>

          <Card className="gap-3">
            <ChipRow
              label={t('prefs.propertyType', { defaultValue: 'Property type' })}
              options={[
                { value: 'any', label: anyOpt },
                ...types.map((ty) => ({ value: ty.slug as string, label: ty.name as string })),
              ]}
              value={str('propertyType') ?? 'any'}
              onChange={(v) => setKey('propertyType', v)}
            />
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <Input
                  label={t('prefs.budgetMin', { defaultValue: 'Budget min (₹)' })}
                  value={budgetMin}
                  onChangeText={(v) => {
                    setSavedTick(false);
                    setBudgetMin(v);
                  }}
                  keyboardType="numeric"
                  inputMode="numeric"
                  placeholder="2000000"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Input
                  label={t('prefs.budgetMax', { defaultValue: 'Budget max (₹)' })}
                  value={budgetMax}
                  onChangeText={(v) => {
                    setSavedTick(false);
                    setBudgetMax(v);
                  }}
                  keyboardType="numeric"
                  inputMode="numeric"
                  placeholder="5000000"
                />
              </View>
            </View>
            <Input
              label={t('prefs.locations', { defaultValue: 'Preferred locations' })}
              value={locations}
              onChangeText={(v) => {
                setSavedTick(false);
                setLocations(v);
              }}
              placeholder={t('prefs.locationsPh', {
                defaultValue: 'Cities, localities or villages — comma separated',
              })}
            />
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <Input
                  label={t('prefs.radiusKm', { defaultValue: 'Search radius (km)' })}
                  value={radiusKm}
                  onChangeText={(v) => {
                    setSavedTick(false);
                    setRadiusKm(v);
                  }}
                  keyboardType="numeric"
                  inputMode="numeric"
                  placeholder="10"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Input
                  label={t('prefs.plotSizeMin', { defaultValue: 'Min plot size (sqft)' })}
                  value={plotSizeMin}
                  onChangeText={(v) => {
                    setSavedTick(false);
                    setPlotSizeMin(v);
                  }}
                  keyboardType="numeric"
                  inputMode="numeric"
                  placeholder="1200"
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <Input
                  label={t('prefs.bedrooms', { defaultValue: 'Bedrooms' })}
                  value={bedrooms}
                  onChangeText={(v) => {
                    setSavedTick(false);
                    setBedrooms(v);
                  }}
                  keyboardType="numeric"
                  inputMode="numeric"
                  placeholder="3"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Input
                  label={t('prefs.bathrooms', { defaultValue: 'Bathrooms' })}
                  value={bathrooms}
                  onChangeText={(v) => {
                    setSavedTick(false);
                    setBathrooms(v);
                  }}
                  keyboardType="numeric"
                  inputMode="numeric"
                  placeholder="2"
                />
              </View>
            </View>
          </Card>

          <Card className="gap-3">
            <ChipRow
              label={t('prefs.possession', { defaultValue: 'Possession' })}
              options={[
                { value: 'any', label: anyOpt },
                { value: 'ready', label: t('prefs.possessionReady', { defaultValue: 'Ready to move' }) },
                {
                  value: 'under_construction',
                  label: t('prefs.possessionUC', { defaultValue: 'Under construction' }),
                },
              ]}
              value={str('possession') ?? 'any'}
              onChange={(v) => setKey('possession', v)}
            />
            <ChipRow
              label={t('prefs.saleType', { defaultValue: 'Sale type' })}
              options={[
                { value: 'any', label: anyOpt },
                { value: 'new', label: t('prefs.saleNew', { defaultValue: 'New' }) },
                { value: 'resale', label: t('prefs.saleResale', { defaultValue: 'Resale' }) },
              ]}
              value={str('saleType') ?? 'any'}
              onChange={(v) => setKey('saleType', v)}
            />
            <ChipRow
              label={t('prefs.facing', { defaultValue: 'Facing' })}
              options={[
                { value: 'any', label: anyOpt },
                { value: 'E', label: t('prefs.facingE', { defaultValue: 'East' }) },
                { value: 'W', label: t('prefs.facingW', { defaultValue: 'West' }) },
                { value: 'N', label: t('prefs.facingN', { defaultValue: 'North' }) },
                { value: 'S', label: t('prefs.facingS', { defaultValue: 'South' }) },
              ]}
              value={str('facing') ?? 'any'}
              onChange={(v) => setKey('facing', v)}
            />
            <ChipRow
              label={t('prefs.purpose', { defaultValue: 'Purpose' })}
              options={[
                { value: 'any', label: anyOpt },
                { value: 'investment', label: t('prefs.purposeInvestment', { defaultValue: 'Investment' }) },
                { value: 'self_use', label: t('prefs.purposeSelfUse', { defaultValue: 'Self use' }) },
              ]}
              value={str('purpose') ?? 'any'}
              onChange={(v) => setKey('purpose', v)}
            />
            <ChipRow
              label={t('prefs.landUse', { defaultValue: 'Land use' })}
              options={[
                { value: 'any', label: anyOpt },
                {
                  value: 'agricultural',
                  label: t('prefs.landAgri', { defaultValue: 'Agricultural' }),
                },
                {
                  value: 'non_agricultural',
                  label: t('prefs.landNonAgri', { defaultValue: 'Non-agricultural' }),
                },
              ]}
              value={str('landUse') ?? 'any'}
              onChange={(v) => setKey('landUse', v)}
            />
            <ChipRow
              label={t('prefs.category', { defaultValue: 'Category' })}
              options={[
                { value: 'any', label: anyOpt },
                {
                  value: 'residential',
                  label: t('prefs.catResidential', { defaultValue: 'Residential' }),
                },
                {
                  value: 'commercial',
                  label: t('prefs.catCommercial', { defaultValue: 'Commercial' }),
                },
              ]}
              value={str('category') ?? 'any'}
              onChange={(v) => setKey('category', v)}
            />
          </Card>

          <Card className="gap-3">
            <Text variant="label">{t('prefs.mustHaves', { defaultValue: 'Must-haves' })}</Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label={t('prefs.gated', { defaultValue: 'Gated community' })}
                active={bool('gated')}
                onPress={() => setKey('gated', !bool('gated'))}
              />
              <Chip
                label={t('prefs.cornerPlot', { defaultValue: 'Corner plot' })}
                active={bool('cornerPlot')}
                onPress={() => setKey('cornerPlot', !bool('cornerPlot'))}
              />
              <Chip
                label={t('prefs.reraOnly', { defaultValue: 'RERA only' })}
                active={bool('reraOnly')}
                onPress={() => setKey('reraOnly', !bool('reraOnly'))}
              />
              <Chip
                label={t('prefs.verifiedOnly', { defaultValue: 'Verified only' })}
                active={bool('verifiedOnly')}
                onPress={() => setKey('verifiedOnly', !bool('verifiedOnly'))}
              />
            </View>
          </Card>

          <Button
            title={t('prefs.save', { defaultValue: 'Save preferences' })}
            loading={save.isPending}
            onPress={() => void onSave()}
          />
          {savedTick ? (
            <Text variant="caption" className="text-center text-success">
              {t('prefs.saved', { defaultValue: 'Preferences saved.' })}
            </Text>
          ) : null}
        </>
      )}
    </Screen>
  );
}
