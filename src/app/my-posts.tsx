import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Pressable, Share, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { AD_SITE } from '@/features/marketing/ad';
import { errMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

interface SharedAd {
  id: string;
  slug: string;
  image_url: string;
  video_url: string | null;
  place: string | null;
  created_at: string;
}

/**
 * "My posts & videos" — every ad the user published from the Create-ad tool
 * (photo & video posts), so they can view, re-open and re-share them. Sits next
 * to "Create ad" in Account → Tools (app report, 2026-07-14).
 */
export default function MyPosts() {
  const profile = useAuth((s) => s.profile);
  const qc = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['my-shared-ads', profile?.id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<SharedAd[]> => {
      const { data, error } = await supabase
        .from('shared_ads')
        .select('id, slug, image_url, video_url, place, created_at')
        .eq('owner_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as SharedAd[];
    },
  });

  function open(ad: SharedAd) {
    Linking.openURL(`${AD_SITE}/ad/${ad.slug}`).catch(() =>
      Alert.alert('Could not open', 'No app available to open this link.'),
    );
  }

  async function share(ad: SharedAd) {
    const url = `${AD_SITE}/ad/${ad.slug}`;
    const caption =
      `🏡 Real property — captured live${ad.place ? ` · ${ad.place}` : ''}\n` +
      'Jamin Bazaar · Signature for Fortune\n' +
      'View photo, location & contact 👇\n' +
      url;
    try {
      await Share.share({ message: caption, url });
    } catch {
      /* user dismissed the share sheet */
    }
  }

  function remove(ad: SharedAd) {
    Alert.alert('Delete this post?', 'The shared link will stop working for anyone who has it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('shared_ads').delete().eq('id', ad.id);
          if (error) Alert.alert('Could not delete', errMessage(error));
          else qc.invalidateQueries({ queryKey: ['my-shared-ads'] });
        },
      },
    ]);
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="My posts & videos" />

      <Text variant="caption">
        Every ad you published from Create ad — photos and videos. Tap one to view its live page,
        or share it again.
      </Text>

      <ListRow
        icon="images"
        label="My Images"
        sub="Your personal photo library — reuse in ads and chats"
        onPress={() => router.push('/media')}
      />

      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : posts.length === 0 ? (
        <Card>
          <Text variant="body" className="text-muted">
            No posts yet. Create your first ad from Account → Create ad (photo & video).
          </Text>
        </Card>
      ) : (
        posts.map((ad) => (
          <Card key={ad.id} className="gap-3 !p-3">
            <Pressable onPress={() => open(ad)} className="flex-row items-center gap-3">
              <View>
                <Image
                  source={{ uri: ad.image_url }}
                  style={{ width: 72, height: 72, borderRadius: 12 }}
                  contentFit="cover"
                />
                {ad.video_url ? (
                  <View className="absolute bottom-1 right-1 rounded-md bg-black/60 p-0.5">
                    <Ionicons name="videocam" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
              <View className="min-w-0 flex-1">
                <Text variant="title" className="text-[15px]" numberOfLines={1}>
                  {ad.video_url ? 'Video post' : 'Photo post'}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {[ad.place, new Date(ad.created_at).toLocaleDateString('en-IN')]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text variant="caption" className="text-red" numberOfLines={1}>
                  View live page ↗
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Pressable onPress={() => share(ad)} hitSlop={8} className="p-2">
                  <Ionicons name="share-social-outline" size={20} color={color.ink} />
                </Pressable>
                <Pressable onPress={() => remove(ad)} hitSlop={8} className="p-2">
                  <Ionicons name="trash-outline" size={20} color={color.red} />
                </Pressable>
              </View>
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}
