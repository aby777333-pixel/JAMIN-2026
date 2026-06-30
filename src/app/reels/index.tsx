import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { type Reel } from '@/features/reels/api';
import { useAddReel, useReels } from '@/features/reels/hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** Property reels — vertical short-video discovery feed. */
export default function Reels() {
  const insets = useSafeAreaInsets();
  const { height } = Dimensions.get('window');
  const { data: reels = [], isLoading } = useReels();
  const add = useAddReel();
  const [busy, setBusy] = useState(false);

  async function upload() {
    setBusy(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.9, videoMaxDuration: 60 });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      let posterUri: string | undefined;
      try {
        posterUri = (await VideoThumbnails.getThumbnailAsync(a.uri, { time: 1000 })).uri;
      } catch {
        posterUri = undefined;
      }
      await add.mutateAsync({ videoUri: a.uri, videoMime: a.mimeType, posterUri, caption: '' });
      Alert.alert('Posted', 'Your reel is live.');
    } catch (e) {
      Alert.alert('Could not post', errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-charcoal">
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={color.gold} />
        </View>
      ) : reels.length === 0 ? (
        <View className="flex-1 bg-paper">
          <View style={{ paddingTop: insets.top + 8 }} className="px-5">
            <EmptyState icon="play-circle" title="No reels yet" body="Be the first — tap the camera to post a property reel." />
          </View>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(r) => r.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          renderItem={({ item }) => <ReelItem reel={item} height={height} />}
        />
      )}

      {/* Header controls */}
      <View style={{ top: insets.top + 6 }} className="absolute left-0 right-0 flex-row items-center justify-between px-4">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-black/40">
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text className="font-bold text-[15px] text-white">Reels</Text>
        <Pressable onPress={upload} disabled={busy} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-black/40">
          <Ionicons name={busy ? 'hourglass' : 'videocam'} size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function ReelItem({ reel, height }: { reel: Reel; height: number }) {
  const player = useVideoPlayer(reel.video_url, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });
  const label = reel.property ? `${reel.property.project?.name ?? ''} · ${reel.property.plot_code}` : null;

  return (
    <View style={{ height }} className="w-full bg-black">
      <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />
      <View className="absolute bottom-0 left-0 right-0 gap-1 bg-black/40 p-4 pb-10">
        {reel.user?.full_name ? <Text className="font-semibold text-[14px] text-white">{reel.user.full_name}</Text> : null}
        {reel.caption ? <Text className="text-[13px] text-white/90">{reel.caption}</Text> : null}
        {label ? (
          <Pressable onPress={() => reel.property_id && router.push(`/property/${reel.property_id}`)} className="mt-1 flex-row items-center gap-1.5 self-start rounded-full bg-white/20 px-3 py-1.5">
            <Ionicons name="home" size={13} color="#fff" />
            <Text className="text-[12px] font-semibold text-white">{label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
