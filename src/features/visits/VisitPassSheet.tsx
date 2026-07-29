import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import { type SiteVisit } from '@/features/visits/api';
import { color } from '@/theme/tokens';

/** QR payload prefix — the agent scanner (visits/scan) parses this. */
export const VISIT_QR_PREFIX = 'jamin-visit:';

/**
 * Digital site-visit pass — a branded gate pass with a QR the agent scans on
 * site to check the buyer in (geofenced via the existing checkin RPC). The QR
 * simply carries the visit id (an unguessable uuid); authorization stays on
 * the server, so the pass leaks nothing.
 */
export function VisitPassSheet({
  visit,
  visible,
  onClose,
}: {
  visit: SiteVisit | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!visit) return null;
  const when = new Date(visit.scheduled_at);
  const label = visit.property
    ? `${visit.property.project?.name ?? ''} · ${visit.property.plot_code}`
    : 'Property';

  return (
    <Sheet visible={visible} onClose={onClose} title="Site-visit pass">
      <View className="items-center gap-3 pb-4">
        <View className="w-full items-center gap-1 rounded-2xl bg-charcoal p-5">
          <Text className="font-bold text-[11px] uppercase tracking-[2px] text-gold">
            Jamin Bazaar
          </Text>
          <Text variant="title" className="text-center text-white">
            {label}
          </Text>
          <Text variant="caption" className="text-white/75">
            {when.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {visit.buyer?.full_name ? (
            <Text variant="caption" className="text-white/75">
              Visitor: {visit.buyer.full_name}
            </Text>
          ) : null}
          {visit.agent?.full_name ? (
            <Text variant="caption" className="text-white/75">
              Jamin Bazaar agent: {visit.agent.full_name}
            </Text>
          ) : null}
          <View className="mt-3 rounded-2xl bg-white p-3">
            <QRCode
              value={`${VISIT_QR_PREFIX}${visit.id}`}
              size={168}
              color={color.charcoal}
              backgroundColor="#FFFFFF"
            />
          </View>
          <Text className="mt-2 text-center text-[11px] text-white/60">
            Show this pass on site — your Jamin Bazaar agent scans it to check you in.
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="shield-checkmark" size={13} color={color.success} />
          <Text variant="caption" className="text-muted">
            Free site visit · No obligation · Arranged safely through Jamin Bazaar
          </Text>
        </View>
      </View>
    </Sheet>
  );
}
