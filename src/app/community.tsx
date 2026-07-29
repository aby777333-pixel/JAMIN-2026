import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SARVAM_LANGUAGES, translateText } from '@/features/sarvam/api';
import { errMessage } from '@/lib/errors';
import { liveChannel, supabase } from '@/lib/supabase';
import { uploadFileToBucket } from '@/lib/upload';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';
import { type Json } from '@/types/database';

interface PostMedia {
  type: 'image' | 'video';
  url: string;
}

interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  body: string | null;
  lang: string;
  media: PostMedia[];
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface CommunityComment {
  id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  is_ai?: boolean;
  created_at: string;
}

/** Compose languages — a tidy subset; posts in ANY language work (translate is auto-detect). */
const POST_LANGS = SARVAM_LANGUAGES.filter((l) =>
  ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'ur-IN'].includes(l.code),
);

/**
 * Contact stays Jamin Bazaar-mediated everywhere: phone numbers and emails typed into
 * community posts are masked for readers (admins see originals in the portal).
 */
function maskContacts(text: string): string {
  return text
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '🔒 via Jamin Bazaar')
    .replace(/\S+@\S+\.\S+/g, '🔒 via Jamin Bazaar');
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

/**
 * Community — an open forum for everyone (buyers, sellers, partners): short posts,
 * images & videos, in any Indian language with one-tap translation. Joining (posting)
 * requires a name + phone number; reading is open to all signed-in users. Every post,
 * comment and moderation action is recorded in the admin audit log (DB triggers).
 */
export default function Community() {
  const { t, i18n } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Join gate (name + phone required to post)
  const joined = !!profile?.full_name?.trim() && !!profile?.phone?.trim();
  const [joinName, setJoinName] = useState(profile?.full_name ?? '');
  const [joinPhone, setJoinPhone] = useState(profile?.phone ?? '');
  const [joining, setJoining] = useState(false);

  // Composer
  const [body, setBody] = useState('');
  const [lang, setLang] = useState<string>((i18n.language || 'en').slice(0, 2));
  const [attachments, setAttachments] = useState<{ uri: string; name?: string | null; mimeType?: string | null; type: 'image' | 'video' }[]>([]);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const res = await supabase
      .from('community_posts')
      .select('id,author_id,author_name,body,lang,media,like_count,comment_count,created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!res.error) {
      const rows = (res.data ?? []) as unknown as CommunityPost[];
      setPosts(rows);
      if (profile?.id && rows.length) {
        const likes = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', profile.id)
          .in('post_id', rows.map((p) => p.id));
        if (!likes.error) setMyLikes(new Set((likes.data ?? []).map((l) => l.post_id as string)));
      }
    }
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Live feed: new posts appear the moment anyone publishes (tables are in the
  // realtime publication; RLS still filters what each user may receive).
  useEffect(() => {
    const ch = supabase
      .channel(liveChannel('community-feed'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  async function join() {
    if (joinName.trim().length < 2 || joinPhone.trim().length < 7) {
      Alert.alert(t('community.joinTitle'), t('community.joinNeed'));
      return;
    }
    setJoining(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: joinName.trim(), phone: joinPhone.trim() })
        .eq('id', profile!.id);
      if (error) throw error;
      await refreshProfile();
    } catch (e) {
      Alert.alert(t('community.joinTitle'), errMessage(e));
    } finally {
      setJoining(false);
    }
  }

  async function attach() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (attachments.length >= 4) {
      Alert.alert(t('community.title'), t('community.maxMedia'));
      return;
    }
    setAttachments((prev) => [
      ...prev,
      { uri: a.uri, name: a.fileName, mimeType: a.mimeType, type: a.type === 'video' ? 'video' : 'image' },
    ]);
  }

  async function post() {
    if (!profile) return;
    if (!body.trim() && attachments.length === 0) {
      Alert.alert(t('community.title'), t('community.emptyPost'));
      return;
    }
    setPosting(true);
    try {
      const media: PostMedia[] = [];
      for (const a of attachments) {
        const up = await uploadFileToBucket(
          'user-media',
          `${profile.id}/community`,
          { uri: a.uri, name: a.name, mimeType: a.mimeType },
          a.type === 'video' ? 'video.mp4' : 'image.jpg',
          a.type === 'video' ? 'video/mp4' : 'image/jpeg',
        );
        media.push({ type: a.type, url: up.url });
      }
      const { error } = await supabase.from('community_posts').insert({
        author_id: profile.id,
        author_name: profile.full_name ?? '',
        author_phone: profile.phone ?? '',
        body: body.trim() || null,
        lang,
        media: media as unknown as Json,
      });
      if (error) throw error;
      setBody('');
      setAttachments([]);
      await load();
    } catch (e) {
      Alert.alert(t('community.postFailed'), errMessage(e));
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(p: CommunityPost) {
    if (!profile) return;
    const liked = myLikes.has(p.id);
    // optimistic
    setMyLikes((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
    setPosts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, like_count: Math.max(0, x.like_count + (liked ? -1 : 1)) } : x)),
    );
    const res = liked
      ? await supabase.from('community_likes').delete().eq('post_id', p.id).eq('user_id', profile.id)
      : await supabase.from('community_likes').insert({ post_id: p.id, user_id: profile.id });
    if (res.error) load(); // roll back to server truth
  }

  async function removeOwn(p: CommunityPost) {
    Alert.alert(t('community.deleteTitle'), t('community.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('community.deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          const res = await supabase.from('community_posts').update({ status: 'removed' }).eq('id', p.id);
          if (res.error) Alert.alert(t('community.title'), errMessage(res.error));
          else setPosts((prev) => prev.filter((x) => x.id !== p.id));
        },
      },
    ]);
  }

  return (
    <Screen contentClassName="pb-10 gap-4" keyboardAvoiding>
      <BackHeader title={t('community.title')} />

      {/* Jamin Bazaar-mediated contact policy — always visible; tap ↻ to refresh the feed */}
      <View className="flex-row items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-3 py-2.5">
        <Ionicons name="shield-checkmark" size={16} color={color.gold} />
        <Text variant="caption" className="flex-1 text-ink">
          {t('community.policy')}
        </Text>
        <Pressable onPress={load} hitSlop={8}>
          <Ionicons name="refresh" size={16} color={color.goldDeep} />
        </Pressable>
      </View>

      {!joined ? (
        <Card className="gap-3 border-red/30 bg-red/5">
          <Text variant="title">{t('community.joinTitle')}</Text>
          <Text variant="caption">{t('community.joinBody')}</Text>
          <Input label={t('community.joinName')} value={joinName} onChangeText={setJoinName} autoCapitalize="words" />
          <Input label={t('community.joinPhone')} value={joinPhone} onChangeText={setJoinPhone} keyboardType="phone-pad" />
          <Button title={t('community.joinCta')} loading={joining} onPress={join} />
        </Card>
      ) : (
        <Card className="gap-3">
          <Input
            label={t('community.composerLabel')}
            value={body}
            onChangeText={setBody}
            multiline
            className="min-h-[88px] py-3"
            placeholder={t('community.composerPh')}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {POST_LANGS.map((l) => {
              const short = l.code.replace('-IN', '');
              return <Chip key={l.code} label={l.label} active={lang === short} onPress={() => setLang(short)} />;
            })}
          </ScrollView>
          {attachments.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {attachments.map((a, i) => (
                <Pressable
                  key={`${a.uri}-${i}`}
                  onPress={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="relative">
                  {a.type === 'image' ? (
                    <Image source={{ uri: a.uri }} className="h-16 w-16 rounded-xl" />
                  ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-xl bg-charcoal">
                      <Ionicons name="play" size={22} color="#fff" />
                    </View>
                  )}
                  <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-red">
                    <Ionicons name="close" size={12} color="#fff" />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View className="flex-row items-center gap-2">
            <Button
              title={t('community.addMedia')}
              variant="outline"
              left={<Ionicons name="images" size={16} color={color.ink} />}
              onPress={attach}
            />
            <View className="flex-1">
              <Button title={t('community.postCta')} loading={posting} onPress={post} />
            </View>
          </View>
        </Card>
      )}

      {loading ? (
        <ActivityIndicator color={color.red} className="py-8" />
      ) : posts.length === 0 ? (
        <EmptyState icon="people" title={t('community.emptyTitle')} body={t('community.emptyBody')} />
      ) : (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            mine={p.author_id === profile?.id}
            liked={myLikes.has(p.id)}
            canInteract={joined}
            onLike={() => toggleLike(p)}
            onDelete={() => removeOwn(p)}
          />
        ))
      )}
    </Screen>
  );
}

function PostCard({
  post,
  mine,
  liked,
  canInteract,
  onLike,
  onDelete,
}: {
  post: CommunityPost;
  mine: boolean;
  liked: boolean;
  canInteract: boolean;
  onLike: () => void;
  onDelete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);

  const initial = (post.author_name || '?').trim().charAt(0).toUpperCase();
  const langLabel = SARVAM_LANGUAGES.find((l) => l.code === `${post.lang}-IN`)?.label ?? post.lang;

  async function translate() {
    if (!post.body) return;
    if (translated) {
      setTranslated(null);
      return;
    }
    setTranslating(true);
    try {
      const target = `${(i18n.language || 'en').slice(0, 2)}-IN`;
      const res = await translateText(post.body, target);
      if (res.text) setTranslated(res.text);
      else Alert.alert(t('community.title'), res.message ?? t('community.translateFailed'));
    } catch (e) {
      Alert.alert(t('community.title'), errMessage(e));
    } finally {
      setTranslating(false);
    }
  }

  async function loadComments() {
    setCommentsLoading(true);
    const res = await supabase
      .from('community_comments')
      .select('id,author_id,author_name,body,is_ai,created_at')
      .eq('post_id', post.id)
      .eq('status', 'published')
      .order('created_at')
      .limit(100);
    if (!res.error) setComments((res.data ?? []) as CommunityComment[]);
    setCommentsLoading(false);
  }

  function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next) loadComments();
  }

  async function sendComment() {
    if (!profile || !commentText.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('community_comments').insert({
        post_id: post.id,
        author_id: profile.id,
        author_name: profile.full_name ?? '',
        body: commentText.trim(),
        lang: (i18n.language || 'en').slice(0, 2),
      });
      if (error) throw error;
      setCommentText('');
      setCommentCount((c) => c + 1);
      await loadComments();
    } catch (e) {
      Alert.alert(t('community.title'), errMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-red/15">
          <Text className="font-bold text-red">{initial}</Text>
        </View>
        <View className="flex-1">
          <Text variant="label">{post.author_name}</Text>
          <Text variant="caption" className="text-muted">
            {timeAgo(post.created_at)} · {langLabel}
          </Text>
        </View>
        {mine ? (
          <Pressable onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={17} color={color.muted} />
          </Pressable>
        ) : null}
      </View>

      {post.body ? <Text variant="body">{maskContacts(post.body)}</Text> : null}
      {translated ? (
        <View className="rounded-xl border border-gold/40 bg-gold/10 p-3">
          <Text variant="caption" className="mb-1 text-muted">
            {t('community.translatedLabel')}
          </Text>
          <Text variant="body">{maskContacts(translated)}</Text>
        </View>
      ) : null}

      {post.media?.map((m, i) =>
        m.type === 'image' ? (
          <Image key={`${m.url}-${i}`} source={{ uri: m.url }} className="h-56 w-full rounded-2xl" resizeMode="cover" />
        ) : (
          <PostVideo key={`${m.url}-${i}`} url={m.url} />
        ),
      )}

      <View className="flex-row items-center gap-5">
        <Pressable onPress={canInteract ? onLike : undefined} className="flex-row items-center gap-1.5" hitSlop={6}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? color.red : color.muted} />
          <Text variant="caption" className="text-muted">
            {post.like_count}
          </Text>
        </Pressable>
        <Pressable onPress={toggleComments} className="flex-row items-center gap-1.5" hitSlop={6}>
          <Ionicons name="chatbubble-outline" size={17} color={color.muted} />
          <Text variant="caption" className="text-muted">
            {commentCount}
          </Text>
        </Pressable>
        {post.body ? (
          <Pressable onPress={translate} className="flex-row items-center gap-1.5" hitSlop={6}>
            {translating ? (
              <ActivityIndicator size="small" color={color.muted} />
            ) : (
              <Ionicons name="language" size={17} color={translated ? color.gold : color.muted} />
            )}
            <Text variant="caption" className="text-muted">
              {translated ? t('community.original') : t('community.translate')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {showComments ? (
        <View className="gap-2 border-t border-line pt-3">
          {commentsLoading ? (
            <ActivityIndicator size="small" color={color.muted} />
          ) : comments.length === 0 ? (
            <Text variant="caption" className="text-muted">
              {t('community.noComments')}
            </Text>
          ) : (
            comments.map((c) => (
              <View
                key={c.id}
                className={`rounded-xl p-2.5 ${c.is_ai ? 'border border-gold/40 bg-gold/10' : 'bg-ink/5'}`}>
                <Text variant="caption" className="font-semibold text-ink">
                  {c.is_ai ? '🤖 ' : ''}
                  {c.author_name} · {timeAgo(c.created_at)}
                </Text>
                <Text variant="body" className="text-[14px]">
                  {maskContacts(c.body)}
                </Text>
              </View>
            ))
          )}
          {canInteract ? (
            <View className="flex-row items-end gap-2">
              <View className="flex-1">
                <Input value={commentText} onChangeText={setCommentText} placeholder={t('community.commentPh')} />
              </View>
              <Button title={t('community.commentCta')} loading={sending} onPress={sendComment} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function PostVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={{ width: '100%', height: 220, borderRadius: 16 }} contentFit="cover" nativeControls />;
}
