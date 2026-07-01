import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useProjects, useProperties, usePropertyTypes } from '@/features/buyer/hooks';
import { color } from '@/theme/tokens';

function parseArea(v: unknown): number {
  if (v == null) return 0;
  const m = String(v).match(/[\d,.]+/);
  return m ? parseFloat(m[0].replace(/,/g, '')) : 0;
}

/** Land valuation estimator (§ advanced tools) — derives an estimate from
 *  comparable available listings (same project / type). Informational only. */
export default function Valuation() {
  const { t } = useTranslation();
  const { data: projects = [] } = useProjects();
  const { data: types = [] } = usePropertyTypes();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [area, setArea] = useState('');

  const { data: comps = [], isLoading } = useProperties({
    status: 'available',
    projectId: projectId ?? undefined,
    propertyTypeId: typeId,
  });

  const stats = useMemo(() => {
    const prices = comps.map((c) => Number(c.price)).filter((n) => n > 0);
    if (!prices.length) return null;
    const avg = prices.reduce((s, x) => s + x, 0) / prices.length;
    const perUnits: number[] = [];
    comps.forEach((c) => {
      const a = parseArea((c.attrs ?? {})['Plot area']);
      if (a > 0 && Number(c.price) > 0) perUnits.push(Number(c.price) / a);
    });
    const perUnit = perUnits.length ? perUnits.reduce((s, x) => s + x, 0) / perUnits.length : null;
    return { avg, perUnit, count: prices.length };
  }, [comps]);

  const enteredArea = parseFloat(area);
  const estimate =
    stats && stats.perUnit && enteredArea > 0 ? stats.perUnit * enteredArea : stats ? stats.avg : 0;

  return (
    <Screen contentClassName="pb-12 gap-4" keyboardAvoiding>
      <BackHeader title={t('tools.valuation.title')} />
      <Text variant="caption">{t('tools.valuation.intro')}</Text>

      <View className="gap-1.5">
        <Text variant="label">{t('tools.valuation.project')}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Chip label={t('tools.valuation.all')} active={!projectId} onPress={() => setProjectId(null)} />
          {projects.map((p) => (
            <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(p.id)} />
          ))}
        </View>
      </View>

      <View className="gap-1.5">
        <Text variant="label">{t('tools.valuation.type')}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Chip label={t('tools.valuation.any')} active={!typeId} onPress={() => setTypeId(null)} />
          {types.map((ty) => (
            <Chip key={ty.id} label={ty.name} active={typeId === ty.id} onPress={() => setTypeId(ty.id)} />
          ))}
        </View>
      </View>

      <Input
        label={t('tools.valuation.area')}
        value={area}
        onChangeText={setArea}
        keyboardType="numeric"
        inputMode="decimal"
        placeholder="e.g. 2400"
      />

      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-4" />
      ) : !stats ? (
        <Card>
          <Text variant="caption">{t('tools.valuation.noComps')}</Text>
        </Card>
      ) : (
        <Card className="gap-3">
          <View>
            <Text variant="label">{t('tools.valuation.estimated')}</Text>
            <MoneyText value={Math.round(estimate)} className="text-[26px]" />
            <Text variant="caption">
              {t('tools.valuation.range')} ₹{Math.round(estimate * 0.9).toLocaleString('en-IN')} – ₹
              {Math.round(estimate * 1.1).toLocaleString('en-IN')}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-y-2">
            <View className="w-1/2">
              <Text variant="caption">{t('tools.valuation.comparables')}</Text>
              <Text variant="title" className="text-[15px]">{stats.count}</Text>
            </View>
            <View className="w-1/2">
              <Text variant="caption">{t('tools.valuation.avgPrice')}</Text>
              <Text variant="title" className="text-[15px]">₹{Math.round(stats.avg).toLocaleString('en-IN')}</Text>
            </View>
            {stats.perUnit ? (
              <View className="w-1/2">
                <Text variant="caption">{t('tools.valuation.avgPerUnit')}</Text>
                <Text variant="title" className="text-[15px]">₹{Math.round(stats.perUnit).toLocaleString('en-IN')}</Text>
              </View>
            ) : null}
          </View>
        </Card>
      )}
    </Screen>
  );
}
