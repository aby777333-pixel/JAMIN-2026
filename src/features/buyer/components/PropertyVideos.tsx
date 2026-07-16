import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

const VIDEO_RE = /\.(mp4|mov|m4v|webm|3gp|mkv)(\?|#|$)/i;
const MAX_INLINE = 4;

function toUrls(media: unknown): string[] {
  if (!Array.isArray(media)) return [];
  return media
    .map((m) => (typeof m === 'string' ? m : m && typeof m === 'object' && 'url' in m ? String((m as { url: unknown }).url) : null))
    .filter((x): x is string => !!x);
}

/** One inline player per clip — same expo-video pattern as the community feed. */
function InlineVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 200, borderRadius: 16, backgroundColor: '#1A1A1A' }}
      contentFit="cover"
      nativeControls
    />
  );
}

/**
 * Property videos, first-class on the listing (Buyer module spec): every video
 * uploaded with the listing plays INLINE here (multiple supported), and any
 * admin-set tour/drone links (YouTube etc.) open in the in-app webview. The
 * gallery keeps its play tiles; this section makes videos impossible to miss.
 */
export function PropertyVideos({ media, attrs }: { media: unknown; attrs: Record<string, unknown> }) {
  const { t } = useTranslation();

  const fileVideos = toUrls(media).filter((u) => VIDEO_RE.test(u));
  // Admin-set video links on attrs (tours, drone footage, walkthroughs).
  const LINK_KEYS = ['video_tour', 'video_url', 'video', 'drone_video', 'drone', 'walkthrough_video'];
  const linkVideos = LINK_KEYS.map((k) => attrs?.[k])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .filter((u) => !VIDEO_RE.test(u) && !fileVideos.includes(u));
  const extraFileLinks = LINK_KEYS.map((k) => attrs?.[k])
    .filter((v): v is string => typeof v === 'string' && VIDEO_RE.test(v) && !fileVideos.includes(v));
  const inline = [...fileVideos, ...extraFileLinks];

  if (inline.length === 0 && linkVideos.length === 0) return null;

  return (
    <View className="gap-2">
      <Text variant="label">
        {t('property.videos', { defaultValue: 'Videos' })}
        {inline.length + linkVideos.length > 1 ? ` (${inline.length + linkVideos.length})` : ''}
      </Text>
      {inline.slice(0, MAX_INLINE).map((u) => (
        <InlineVideo key={u} uri={u} />
      ))}
      {inline.length > MAX_INLINE ? (
        <Text variant="caption">
          {t('property.moreVideos', {
            defaultValue: '+{{count}} more in the gallery above',
            count: inline.length - MAX_INLINE,
          })}
        </Text>
      ) : null}
      {linkVideos.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {linkVideos.map((u, i) => (
            <Pressable
              key={u}
              onPress={() =>
                router.push({
                  pathname: '/webview',
                  params: { url: u, title: t('property.videos', { defaultValue: 'Videos' }) },
                })
              }
              className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
              <Ionicons name="play-circle" size={16} color={color.red} />
              <Text className="text-[13px] font-semibold text-ink">
                {t('property.watchVideo', { defaultValue: 'Watch video' })}
                {linkVideos.length > 1 ? ` ${i + 1}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
