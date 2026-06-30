import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '@/components/ui/Text';
import { Sheet } from './EnquirySheet';
import { SITE_URL } from '@/lib/site';
import { color } from '@/theme/tokens';

/** Scannable QR for a listing's public web page — for print flyers / site boards. */
export function ListingQrSheet({
  visible,
  onClose,
  propertyId,
  propertyLabel,
}: {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyLabel: string;
}) {
  const url = `${SITE_URL}/p/${propertyId}`;
  return (
    <Sheet visible={visible} onClose={onClose} title="Listing QR code">
      <Text variant="caption" className="mb-4">
        {propertyLabel}
      </Text>
      <View className="items-center gap-3 py-2">
        <View className="rounded-2xl bg-white p-4">
          <QRCode value={url} size={200} color={color.charcoal} backgroundColor="#FFFFFF" />
        </View>
        <Text variant="caption" className="text-center">
          Scan to open this property. Share on flyers, hoardings or your business card.
        </Text>
        <Text className="font-mono text-[11px] text-muted">{url}</Text>
      </View>
    </Sheet>
  );
}
