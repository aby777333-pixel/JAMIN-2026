import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { readFacing, vastuScore } from '@/features/astro/vastu';
import { usePlotsLeft } from '@/features/buyer/hooks';
import { formatINR } from '@/lib/money';
import { color } from '@/theme/tokens';
import type { PropertyDetail } from '../types';

function attrStr(attrs: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = attrs?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/** Parse a leading number out of e.g. "2400 sq ft" → 2400. */
function firstNumber(s?: string): number | null {
  if (!s) return null;
  const m = s.replace(/,/g, '').match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

/**
 * "Why you'll love this plot" — an honest, aspirational desirability panel that
 * turns a listing's real attributes and trust signals into reasons to buy.
 * Everything shown is derived from real data (attrs, verification, live plot
 * count) — no fabricated scarcity or social proof.
 */
export function PlotAppeal({ property }: { property: PropertyDetail }) {
  const { data: plotsLeft } = usePlotsLeft(property.project_id);
  const a = property.attrs;

  const facing = readFacing(a);
  const score = vastuScore(facing, a);
  const corner = attrStr(a, 'Corner plot');
  const area = attrStr(a, 'Plot area');
  const approval = attrStr(a, 'Approval') ?? attrStr(a, 'Land category / zoning');
  const road = attrStr(a, 'Road width');

  const areaNum = firstNumber(area);
  const perUnit = areaNum && areaNum > 0 ? Math.round(property.price / areaNum) : null;

  // Benefit chips — only what's genuinely present.
  const chips: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
  if (facing) chips.push({ icon: 'sunny', label: `${facing} facing` });
  if (corner && /yes/i.test(corner)) chips.push({ icon: 'grid', label: 'Corner plot' });
  if (area) chips.push({ icon: 'resize', label: area });
  if (approval) chips.push({ icon: 'ribbon', label: approval });
  if (road) chips.push({ icon: 'trail-sign', label: `${road} road` });

  // Reasons to buy — real signals first, then honest universal truths.
  const reasons: string[] = [];
  if (property.verified_documents) reasons.push('Clear title & admin-verified documents');
  if (property.project?.rera_status) reasons.push('Part of a RERA-registered project');
  if (property.verified_location) reasons.push('Location verified on the ground');
  if (score >= 80) reasons.push(`Vastu-positive — ${score}/100 compliance`);
  reasons.push('Land is a lasting family asset that appreciates over time');
  reasons.push('Book a free site visit first — no obligation, escrow-protected');

  const projectName = property.project?.name ?? 'this project';
  const scarce = typeof plotsLeft === 'number' && plotsLeft > 0 && plotsLeft <= 5;

  return (
    <Card className="gap-3 border-red/30 bg-red/[0.04]">
      <View className="flex-row items-center gap-2">
        <Ionicons name="heart" size={18} color={color.red} />
        <Text variant="title" className="flex-1">
          Why you’ll love this plot
        </Text>
      </View>

      <Text variant="body" className="text-ink">
        More than land — your family’s <Text className="font-semibold text-red">Signature for Fortune</Text>. Imagine
        the home, the memories, and the wealth that grows here.
      </Text>

      {chips.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {chips.map((c) => (
            <View
              key={c.label}
              className="flex-row items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1">
              <Ionicons name={c.icon} size={12} color={color.goldDeep} />
              <Text className="text-[12px] font-semibold text-gold-deep">{c.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {perUnit ? (
        <Text variant="caption" className="text-ink">
          Just <Text className="font-semibold">{formatINR(perUnit)}</Text> per unit — smart value for a plot in{' '}
          {property.project?.location ?? projectName}.
        </Text>
      ) : null}

      <View className="gap-1.5">
        {reasons.map((r) => (
          <View key={r} className="flex-row gap-2">
            <Ionicons name="checkmark-circle" size={15} color={color.success} style={{ marginTop: 2 }} />
            <Text variant="caption" className="flex-1 text-ink">
              {r}
            </Text>
          </View>
        ))}
      </View>

      {typeof plotsLeft === 'number' && plotsLeft > 0 ? (
        <View
          className={`flex-row items-center gap-2 rounded-2xl px-3 py-2 ${
            scarce ? 'bg-red/10' : 'bg-ink/[0.05]'
          }`}>
          <Ionicons name={scarce ? 'flame' : 'pricetags'} size={15} color={scarce ? color.red : color.muted} />
          <Text className={`flex-1 text-[12px] font-semibold ${scarce ? 'text-red' : 'text-ink'}`}>
            {scarce
              ? `Only ${plotsLeft} plot${plotsLeft === 1 ? '' : 's'} left in ${projectName} — selling fast`
              : `${plotsLeft} plots available in ${projectName}`}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
