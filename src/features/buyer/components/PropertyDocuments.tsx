import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { logBrochureOpen } from '@/features/buyer/contact';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

interface PropertyDoc {
  id: string;
  title: string;
  kind: string;
  doc_url: string;
  created_at: string;
}

async function listPropertyDocuments(propertyId: string): Promise<PropertyDoc[]> {
  const { data, error } = await supabase
    .from('deal_documents')
    .select('id, title, kind, doc_url, created_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PropertyDoc[];
}

/**
 * Documents attached to a listing (patta / EC / title deed / layout approval /
 * brochures — uploaded at listing time or by the admin). RLS only returns rows
 * for APPROVED listings, so buyers see exactly what was published. Every open
 * is captured in brochure_downloads for the admin engagement view.
 */
export function PropertyDocuments({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation();
  const { data: docs = [] } = useQuery({
    queryKey: ['property_documents', propertyId],
    queryFn: () => listPropertyDocuments(propertyId),
    staleTime: 60_000,
  });

  if (!docs.length) return null;

  function onOpen(doc: PropertyDoc) {
    logBrochureOpen({ title: doc.title, url: doc.doc_url, propertyId, docId: doc.id });
    Linking.openURL(doc.doc_url).catch(() =>
      Alert.alert(
        t('contact.couldNotOpen', { defaultValue: 'Could not open' }),
        t('contact.noApp', { defaultValue: 'No app available to open this link.' }),
      ),
    );
  }

  return (
    <View className="gap-2">
      <Text variant="label">{t('property.documents', { defaultValue: 'Property documents' })}</Text>
      {docs.map((d) => (
        <Pressable key={d.id} onPress={() => onOpen(d)}>
          <Card className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
              <Ionicons name="document-text" size={18} color={color.red} />
            </View>
            <View className="min-w-0 flex-1">
              <Text variant="title" className="text-[14px]" numberOfLines={1}>
                {d.title}
              </Text>
              <Text variant="caption">
                {new Date(d.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={color.muted} />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
