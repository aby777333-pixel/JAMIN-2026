import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How do I buy or enquire about a plot?',
    a: 'Open any property and tap “Enquire now”, “Book a site visit”, or “Make an offer”. Our team and the seller respond inside the app — your contact details stay private.',
  },
  {
    q: 'Why can’t I see the seller’s phone number?',
    a: 'For your safety, all communication happens through JAMIN — in-app chat and calls. This protects both buyers and sellers from spam and fraud.',
  },
  {
    q: 'How does Property Radar work?',
    a: 'Save what you’re looking for under Profile → Property requirements. We’ll notify you the moment a new matching listing is approved.',
  },
  {
    q: 'How do I list my own property?',
    a: 'Switch your role to Seller (Profile → Switch role), then open My listings → “List a new property”. An admin verifies it before it goes live.',
  },
  {
    q: 'What do the verification badges mean?',
    a: 'Verified Seller, Verified Documents and Verified Location are checks completed by our team. Premium marks featured listings.',
  },
  {
    q: 'How do offers work?',
    a: 'Tap “Make an offer” on a plot. The seller can accept, decline, or counter — you’ll get a notification and can track everything under My offers.',
  },
  {
    q: 'How do I become a partner and earn?',
    a: 'Tap “Become a partner” on the home screen. Agents earn commissions on sales and can build a team.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes — your contact details are never shared publicly, and all activity is logged and moderated.',
  },
];

export default function Help() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Help & FAQ" />
      <Text variant="caption">Quick answers to common questions. Still stuck? Contact our team.</Text>
      {FAQ.map((f, i) => (
        <Pressable key={f.q} onPress={() => setOpen(open === i ? null : i)}>
          <Card className="gap-2">
            <View className="flex-row items-center gap-2">
              <Text variant="title" className="flex-1 text-[15px]">{f.q}</Text>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={color.muted} />
            </View>
            {open === i ? <Text variant="body" className="text-muted">{f.a}</Text> : null}
          </Card>
        </Pressable>
      ))}
      <Button title="Contact support" variant="outline" onPress={() => router.push('/support')} className="mt-2" />
    </Screen>
  );
}
