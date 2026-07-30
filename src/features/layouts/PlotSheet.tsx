import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { LayoutHeader, LayoutPlot, PaymentMethod } from './api';
import { useReservePlot } from './hooks';
import { formatCoords, mapLinks } from './mapLinks';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import { errMessage } from '@/lib/errors';
import { emi, formatINR, money } from '@/lib/money';
import { SITE_URL } from '@/lib/site';
import { color } from '@/theme/tokens';

const SQM_TO_SQFT = 10.7639;

const STATUS_LABEL: Record<string, string> = {
  available: 'Available',
  reserved: 'On hold',
  booked: 'Booked',
  sold: 'Sold',
  blocked: 'Not released',
};
const STATUS_TINT: Record<string, string> = {
  available: color.success,
  reserved: color.warn,
  booked: color.red,
  sold: '#4A4A4A',
  blocked: color.muted,
};

const METHODS: Array<{ key: PaymentMethod; label: string; hint: string }> = [
  { key: 'upi', label: 'UPI', hint: 'Pay from any UPI app, then upload the receipt' },
  { key: 'bank_transfer', label: 'Bank transfer', hint: 'NEFT / RTGS / IMPS to the company account' },
  { key: 'net_banking', label: 'Net banking', hint: 'Transfer from your bank, then upload the receipt' },
];

/** One label/value line. Renders an em dash rather than hiding an unset field. */
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3 border-b border-line py-2.5">
      <Text variant="label">{label}</Text>
      <Text className="flex-1 text-right font-semibold text-[13px] text-ink">{value || '—'}</Text>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Text className="mb-1 mt-6 text-[11px] font-semibold uppercase tracking-[1px] text-muted">{title}</Text>
  );
}

export interface PlotSheetProps {
  visible: boolean;
  onClose: () => void;
  plot: LayoutPlot | null;
  layout: LayoutHeader | null;
  slug?: string;
  /** Shown after a successful hold so the buyer can go and pay. */
  onPay?: (plot: LayoutPlot, bookingRef: string) => void;
}

/**
 * Everything a buyer needs about one plot, plus the reserve flow.
 *
 * Reserving does NOT move money — JAMIN has no payment gateway. It holds the
 * plot for the layout's hold window and records how the buyer intends to pay;
 * the booking amount is transferred manually and an admin verifies it, which is
 * what finally flips the plot to Booked.
 */
export function PlotSheet({ visible, onClose, plot, layout, slug, onPay }: PlotSheetProps) {
  const [confirming, setConfirming] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [showQR, setShowQR] = useState(false);
  const reserve = useReservePlot(slug);

  const shareUrl = plot ? `${SITE_URL}/layout.html?plot=${plot.number}` : SITE_URL;
  // Maps / satellite / street view / Earth, derived from the layout's pin.
  // Null until an admin sets coordinates, so the section simply stays hidden.
  const links = mapLinks(layout);
  const coords = formatCoords(layout);

  // EMI is indicative only and always computed through decimal.js.
  const monthly = useMemo(() => {
    if (!plot || !plot.totalCost) return null;
    const principal = money(plot.totalCost).times(0.8); // 20% down
    return emi(principal, 8.5, 240);
  }, [plot]);

  if (!plot || !layout) return null;

  const price = plot.offerPrice ?? plot.price;
  const sqft = plot.areaSqm ? Math.round(plot.areaSqm * SQM_TO_SQFT).toLocaleString('en-IN') : null;

  async function doReserve() {
    if (!plot) return;
    try {
      const res = await reserve.mutateAsync({ plotId: plot.id, method });
      setConfirming(false);
      Alert.alert(
        'Plot held',
        `Plot ${plot.number} is held for you until ${new Date(res.expiresAt).toLocaleString('en-IN')}.\n\n` +
          `Reference ${res.bookingRef}. Transfer the booking amount and upload your receipt — ` +
          `our team confirms it within 24 hours.`,
        [
          { text: 'Later' },
          { text: 'Pay now', onPress: () => onPay?.(plot, res.bookingRef) },
        ],
      );
    } catch (e) {
      Alert.alert('Could not reserve', errMessage(e));
    }
  }

  return (
    <>
    <Sheet visible={visible} onClose={onClose} title={`Plot ${plot.number}`}>
      <ScrollView showsVerticalScrollIndicator={false} className="max-h-[70vh]">
        <View className="mb-1 flex-row items-center justify-between">
          <Text variant="label">Block {plot.block}</Text>
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: `${STATUS_TINT[plot.status]}1A` }}>
            <Text className="text-[11px] font-semibold" style={{ color: STATUS_TINT[plot.status] }}>
              {STATUS_LABEL[plot.status]}
            </Text>
          </View>
        </View>

        <View className="flex-row items-baseline gap-2">
          <Text variant="display" className="text-[27px]">
            {price ? formatINR(price) : 'Price on request'}
          </Text>
          {plot.offerPrice && plot.price ? (
            <Text className="text-[14px] text-muted line-through">{formatINR(plot.price)}</Text>
          ) : null}
        </View>

        <Section title="Plot" />
        <Row label="Area" value={plot.areaSqm ? `${plot.areaSqm} Sq.m · ${sqft} Sq.ft` : null} />
        <Row
          label="Dimensions"
          value={plot.widthM && plot.depthM ? `${plot.widthM} m × ${plot.depthM} m` : null}
        />
        <Row label="Facing" value={plot.facing ? plot.facing[0].toUpperCase() + plot.facing.slice(1) : null} />
        <Row label="Road width" value={plot.roadWidthM ? `${plot.roadWidthM.toFixed(2)} m` : null} />
        <Row label="Corner plot" value={plot.isCorner ? 'Yes' : 'No'} />

        <Section title="Cost breakdown" />
        <Row label="Plot price" value={price ? formatINR(price) : null} />
        <Row label="Booking amount" value={plot.bookingAmount ? formatINR(plot.bookingAmount) : null} />
        <Row
          label="Registration charges"
          value={plot.registrationCharges ? formatINR(plot.registrationCharges) : null}
        />
        <Row
          label="Development charges"
          value={plot.developmentCharges ? formatINR(plot.developmentCharges) : null}
        />
        <View className="flex-row items-baseline justify-between pt-3">
          <Text variant="title">Total cost</Text>
          <Text variant="title" className="text-red">
            {plot.totalCost ? formatINR(plot.totalCost) : '—'}
          </Text>
        </View>

        {monthly ? (
          <View className="mt-4 rounded-2xl border border-line bg-paper p-3">
            <Text variant="label">Indicative EMI</Text>
            <Text variant="h2">{formatINR(monthly)} / month</Text>
            <Text variant="caption">
              20% down · 8.5% p.a. · 20 years. Indicative only — not an offer of finance.
            </Text>
          </View>
        ) : null}

        <Section title="Approval" />
        <Row label="DTCP application" value={layout.approvalNo} />
        <Row label="Authority" value={layout.authority} />
        <Row label="Survey nos." value={layout.surveyNos} />
        <Row label="Village / Taluk" value={[layout.village, layout.taluk].filter(Boolean).join(' / ')} />

        {layout.landmarks?.length ? (
          <>
            <Section title="Nearby" />
            <View className="flex-row flex-wrap gap-2">
              {layout.landmarks.map((l, i) => (
                <View key={i} className="rounded-full border border-line bg-paper px-3 py-1.5">
                  <Text variant="caption">{l.distance ? `${l.name} · ${l.distance}` : l.name}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {plot.media?.length ? (
          <>
            <Section title="Gallery" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              {plot.media.map((m, i) => {
                const uri = typeof m === 'string' ? m : m.url;
                return (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={{ width: 108, height: 108, borderRadius: 12, marginHorizontal: 4 }}
                    contentFit="cover"
                  />
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {plot.documents?.length || layout.documents?.length ? (
          <>
            <Section title="Documents" />
            {[...(plot.documents ?? []), ...(layout.documents ?? [])].map((d, i) => (
              <Pressable
                key={i}
                onPress={() => void WebBrowser.openBrowserAsync(d.url)}
                className="flex-row items-center gap-2 border-b border-line py-2.5">
                <Ionicons name="document-text-outline" size={16} color={color.muted} />
                <Text className="flex-1 text-[13px] text-ink">{d.name || 'Document'}</Text>
                <Ionicons name="open-outline" size={15} color={color.muted} />
              </Pressable>
            ))}
          </>
        ) : null}

        <View className="mt-4 flex-row items-center gap-2">
          <View className="h-5 w-5 items-center justify-center rounded-full bg-gold">
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <Text className="text-[12px] font-semibold text-gold-deep">Verified Jamin Partner listing</Text>
        </View>

        {/* quick links — only rendered when there is somewhere to go */}
        {links ? (
          <>
            <Section title="See the site" />
            <View className="flex-row flex-wrap gap-2">
              <LinkChip icon="map-outline" label="Google Maps" onPress={() => void WebBrowser.openBrowserAsync(links.maps)} />
              <LinkChip icon="globe-outline" label="Satellite" onPress={() => void WebBrowser.openBrowserAsync(links.satellite)} />
              <LinkChip icon="eye-outline" label="Street view" onPress={() => void WebBrowser.openBrowserAsync(links.streetView)} />
              <LinkChip icon="earth-outline" label="Google Earth" onPress={() => void WebBrowser.openBrowserAsync(links.earth)} />
            </View>
            {coords ? (
              <Text variant="caption" className="mt-2">
                Site pin {coords}
              </Text>
            ) : null}
          </>
        ) : null}

        <View className="mt-4 flex-row flex-wrap gap-2">
          {layout.brochureUrl ? (
            <LinkChip icon="download-outline" label="Brochure" onPress={() => void WebBrowser.openBrowserAsync(layout.brochureUrl as string)} />
          ) : null}
          <LinkChip
            icon="share-social-outline"
            label="Share"
            onPress={() => void Share.share({ message: `Plot ${plot.number} — ${layout.name}\n${shareUrl}` })}
          />
          <LinkChip icon="qr-code-outline" label="QR" onPress={() => setShowQR((v) => !v)} />
        </View>

        {showQR ? (
          <View className="mt-4 items-center rounded-2xl border border-line bg-surface p-4">
            <QRCode value={shareUrl} size={160} />
            <Text variant="caption" className="mt-2">
              Plot {plot.number} · {layout.name}
            </Text>
          </View>
        ) : null}

        <Text variant="caption" className="mt-6 leading-5">
          Sizes and areas are quoted from the sanctioned plot schedule (application{' '}
          {layout.approvalNo || '—'}). Facing and corner status are read from the plan and are not
          part of the approval.
        </Text>

        <View className="mt-5 mb-2">
          {plot.status === 'available' ? (
            <Button title="Book now" onPress={() => setConfirming(true)} />
          ) : (
            <Button title={STATUS_LABEL[plot.status]} onPress={() => {}} disabled />
          )}
        </View>
      </ScrollView>
    </Sheet>

      {/* ── reserve confirmation ─────────────────────────────────────────── */}
      <Sheet visible={confirming} onClose={() => setConfirming(false)} title="Reserve this plot?">
        <Text variant="label">
          Plot {plot.number} · Block {plot.block}
        </Text>
        <View className="mt-3 flex-row items-baseline justify-between rounded-2xl border border-line bg-paper p-4">
          <Text variant="label">Booking amount</Text>
          <Text variant="h2">{plot.bookingAmount ? formatINR(plot.bookingAmount) : 'As advised'}</Text>
        </View>

        <Section title="Payment method" />
        {METHODS.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => setMethod(m.key)}
            className="mb-2 flex-row items-center gap-3 rounded-2xl border p-3"
            style={{ borderColor: method === m.key ? color.red : color.line }}>
            <Ionicons
              name={method === m.key ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={method === m.key ? color.red : color.muted}
            />
            <View className="flex-1">
              <Text className="text-[14px] font-semibold text-ink">{m.label}</Text>
              <Text variant="caption">{m.hint}</Text>
            </View>
          </Pressable>
        ))}

        <Text variant="caption" className="mt-2 leading-5">
          Jamin does not take card or gateway payments. Reserving holds the plot for{' '}
          {Math.round((layout.holdMinutes ?? 2880) / 60)} hours; you then transfer the booking amount
          and upload the receipt, and our team confirms it.
        </Text>

        <View className="mt-4">
          <Button title="Reserve plot" onPress={doReserve} loading={reserve.isPending} disabled={reserve.isPending} />
        </View>
      </Sheet>
    </>
  );
}

function LinkChip({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2">
      <Ionicons name={icon} size={14} color={color.ink} />
      <Text className="text-[13px] text-ink">{label}</Text>
    </Pressable>
  );
}
