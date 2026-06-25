import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { ActivityIndicator, Alert, Image, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import type { UserMedia } from '@/features/media/api';
import { useDeleteMedia, useMyMedia, useUploadMedia } from '@/features/media/hooks';
import { color } from '@/theme/tokens';

/** "My Images" — the user's personal library: upload, download/share, delete (own-only). */
export default function MyMedia() {
  const { data: items = [], isLoading } = useMyMedia();
  const upload = useUploadMedia();
  const del = useDeleteMedia();

  async function onPick() {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
    });
    if (res.canceled) return;
    for (const a of res.assets) {
      try {
        await upload.mutateAsync({ uri: a.uri, name: a.fileName, mimeType: a.mimeType });
      } catch (e) {
        Alert.alert('Upload failed', e instanceof Error ? e.message : String(e));
      }
    }
  }

  async function onDownload(item: UserMedia) {
    try {
      const safe = (item.name ?? 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      const dl = await FileSystem.downloadAsync(item.url, FileSystem.cacheDirectory + safe);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dl.uri);
      else Alert.alert('Downloaded', 'Image saved to the app cache.');
    } catch (e) {
      Alert.alert('Could not download', e instanceof Error ? e.message : String(e));
    }
  }

  function onDelete(item: UserMedia) {
    Alert.alert('Delete image?', 'This removes it from your library.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(item) },
    ]);
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="My Images" />
      <Button
        title={upload.isPending ? 'Uploading…' : '+ Upload images'}
        loading={upload.isPending}
        onPress={onPick}
      />
      <Text variant="caption">
        Your personal library — reuse these in ads, brochures and chats. Only you can see them.
      </Text>

      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : items.length === 0 ? (
        <Text variant="body" className="text-muted">
          No images yet. Upload your first above.
        </Text>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {items.map((it) => (
            <View key={it.id} style={{ width: '31%' }} className="gap-1">
              <Image
                source={{ uri: it.url }}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 10 }}
                resizeMode="cover"
              />
              <View className="flex-row justify-between px-1">
                <Pressable onPress={() => onDownload(it)} hitSlop={8}>
                  <Ionicons name="download-outline" size={20} color={color.ink} />
                </Pressable>
                <Pressable onPress={() => onDelete(it)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={color.red} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
