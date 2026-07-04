import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import type { BookingWithPayments } from '@/features/payments/api';
import { useConfig } from '@/features/config/hooks';
import { errMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { uploadImageToBucket } from '@/lib/upload';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

export interface BankDetails {
  beneficiary?: string;
  account?: string;
  ifsc?: string;
  bank?: string;
  branch?: string;
  note?: string;
}

/** One copyable row of the bank details block. */
function BankRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Pressable
      onPress={async () => {
        await Clipboard.setStringAsync(value);
        Alert.alert('Copied', `${label} copied to clipboard.`);
      }}
      className="flex-row items-center justify-between gap-2 border-b border-white/10 py-1.5">
      <Text className="text-[11px] uppercase tracking-[1px] text-white/60">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        <Text className="font-mono-bold text-[13px] text-white" numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="copy-outline" size={13} color="rgba(255,255,255,0.6)" />
      </View>
    </Pressable>
  );
}

/**
 * Bank-transfer payment sheet (no online gateway for now): shows the company
 * account (admin-editable via system_config 'bank_details', tap any row to
 * copy), then collects the proof — amount, UTR/reference, date, note and a
 * screenshot/photo. The admin verifies it in the Payments tab; a verified
 * transfer with a booking marks that booking Paid through the normal payments
 * row, so nothing else changes.
 */
export function BankTransferSheet({
  visible,
  onClose,
  booking,
  onSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  /** Optional — prefills amount and links the proof to this booking. */
  booking?: BookingWithPayments | null;
  onSubmitted?: () => void;
}) {
  const profile = useAuth((s) => s.profile);
  const { data: bank } = useConfig<BankDetails>('bank_details', {});
  const [amount, setAmount] = useState(booking && Number(booking.amount) > 0 ? String(booking.amount) : '');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<{ uri: string; name?: string | null; mimeType?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickProof() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setProof({ uri: a.uri, name: a.fileName, mimeType: a.mimeType });
    }
  }

  async function submit() {
    if (!profile) return;
    const amt = Number(amount.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) {
      Alert.alert('Amount needed', 'Enter the amount you transferred (in ₹).');
      return;
    }
    if (!proof && !ref.trim()) {
      Alert.alert('Proof needed', 'Attach a screenshot of the transfer or enter the UTR / reference number (ideally both).');
      return;
    }
    setBusy(true);
    try {
      let proofUrl: string | null = null;
      let proofPath: string | null = null;
      if (proof) {
        const up = await uploadImageToBucket('user-media', `${profile.id}/payments`, proof);
        proofUrl = up.url;
        proofPath = up.path;
      }
      const { error } = await supabase.from('bank_transfers').insert({
        user_id: profile.id,
        booking_id: booking?.id ?? null,
        property_id: booking?.property?.id ?? null,
        amount: amt,
        txn_ref: ref.trim() || null,
        transfer_date: /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? date.trim() : null,
        proof_url: proofUrl,
        proof_path: proofPath,
        note: note.trim() || null,
      });
      if (error) throw error;
      onClose();
      onSubmitted?.();
      Alert.alert(
        'Proof submitted ✓',
        'Thank you! The JAMIN team verifies transfers within 24 hours — you will get a notification once done.',
      );
    } catch (e) {
      Alert.alert('Could not submit', errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Pay by bank transfer">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 pb-4">
        {booking ? (
          <Text variant="caption">
            For booking {booking.property?.plot_code ?? ''} — transfer the amount, then upload the proof.
          </Text>
        ) : null}

        <View className="rounded-2xl bg-charcoal p-4">
          <Text className="mb-1 font-bold text-[11px] uppercase tracking-[2px] text-gold">
            JAMIN bank account — tap a row to copy
          </Text>
          <BankRow label="Beneficiary" value={bank?.beneficiary} />
          <BankRow label="Account no." value={bank?.account} />
          <BankRow label="IFSC" value={bank?.ifsc} />
          <BankRow label="Bank" value={bank?.bank} />
          <BankRow label="Branch" value={bank?.branch} />
          {bank?.note ? (
            <Text className="mt-2 text-[11px] leading-4 text-white/60">{bank.note}</Text>
          ) : null}
        </View>

        <Input label="Amount transferred (₹)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <Input label="UTR / reference number" value={ref} onChangeText={setRef} autoCapitalize="characters" placeholder="e.g. CNRB12345678901" />
        <Input label="Transfer date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. booking advance for AP-0009" />

        {proof ? (
          <View className="flex-row items-center gap-3">
            <Image source={{ uri: proof.uri }} style={{ width: 72, height: 72, borderRadius: 12 }} />
            <View className="flex-1">
              <Text variant="caption" className="text-success">Proof attached ✓</Text>
              <Pressable onPress={() => setProof(null)} hitSlop={6}>
                <Text className="text-[12px] font-semibold text-red">Remove</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Button
            title="📎 Attach transfer proof (screenshot / photo)"
            variant="outline"
            left={<Ionicons name="image" size={16} color={color.ink} />}
            onPress={pickProof}
          />
        )}

        <Button title="Submit for verification" loading={busy} onPress={submit} />
        <Text variant="caption" className="text-center text-muted">
          🔒 Verified by the JAMIN team · you'll be notified in-app
        </Text>
      </ScrollView>
    </Sheet>
  );
}
