import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { type ShortlistItem } from '@/features/shortlists/api';
import { useShortlist, useShortlistItems, useShortlistMutations } from '@/features/shortlists/hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

export default function ShortlistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: shortlist } = useShortlist(id);
  const { data: items = [], isLoading } = useShortlistItems(id);
  const { remove, vote, comment } = useShortlistMutations(id);

  function share() {
    if (!shortlist) return;
    Share.share({
      message: `Join my JAMIN shortlist "${shortlist.name}" — open the app → Shared shortlists → Join with code:\n${shortlist.share_token}`,
    }).catch(() => {});
  }

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader
        title={shortlist?.name ?? 'Shortlist'}
        right={
          <Pressable onPress={share} hitSlop={10}>
            <Ionicons name="share-social-outline" size={20} color={color.ink} />
          </Pressable>
        }
      />
      {shortlist ? (
        <Card className="flex-row items-center gap-2">
          <Ionicons name="key-outline" size={16} color={color.muted} />
          <Text variant="caption" className="flex-1">Share code</Text>
          <Text className="font-mono text-[13px] text-ink">{shortlist.share_token}</Text>
        </Card>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={color.red} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="add-circle"
          title="No properties yet"
          body="Open any property and tap “Add to shortlist” to gather options here."
        />
      ) : (
        items.map((it) => (
          <ItemCard
            key={it.id}
            item={it}
            onOpen={() => router.push(`/property/${it.property_id}`)}
            onRemove={() =>
              Alert.alert('Remove', 'Remove this property from the shortlist?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(it.id) },
              ])
            }
            onVote={(v) => vote.mutate({ itemId: it.id, value: v })}
            onComment={(body) =>
              comment.mutateAsync({ itemId: it.id, body }).catch((e) => Alert.alert('Could not post', errMessage(e)))
            }
            commenting={comment.isPending}
          />
        ))
      )}
    </Screen>
  );
}

function ItemCard({
  item,
  onOpen,
  onRemove,
  onVote,
  onComment,
  commenting,
}: {
  item: ShortlistItem;
  onOpen: () => void;
  onRemove: () => void;
  onVote: (v: -1 | 1) => void;
  onComment: (body: string) => void;
  commenting: boolean;
}) {
  const [show, setShow] = useState(false);
  const [text, setText] = useState('');
  const label = item.property ? `${item.property.project?.name ?? ''} · ${item.property.plot_code}` : 'Property';

  return (
    <Card className="gap-2">
      <View className="flex-row items-center gap-2">
        <Pressable className="flex-1" onPress={onOpen}>
          <Text variant="title" className="text-[14px]" numberOfLines={1}>{label}</Text>
          {item.property ? <MoneyText value={item.property.price} className="text-[14px]" /> : null}
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="trash-outline" size={17} color={color.muted} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-4">
        <Pressable onPress={() => onVote(1)} className="flex-row items-center gap-1" hitSlop={6}>
          <Ionicons name={item.myVote === 1 ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={item.myVote === 1 ? color.success : color.muted} />
          <Text variant="caption">{item.up}</Text>
        </Pressable>
        <Pressable onPress={() => onVote(-1)} className="flex-row items-center gap-1" hitSlop={6}>
          <Ionicons name={item.myVote === -1 ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={item.myVote === -1 ? color.red : color.muted} />
          <Text variant="caption">{item.down}</Text>
        </Pressable>
        <Pressable onPress={() => setShow((s) => !s)} className="flex-row items-center gap-1" hitSlop={6}>
          <Ionicons name="chatbubble-outline" size={17} color={color.muted} />
          <Text variant="caption">{item.comments.length}</Text>
        </Pressable>
      </View>

      {show ? (
        <View className="gap-2 border-t border-line pt-2">
          {item.comments.map((c) => (
            <View key={c.id}>
              <Text variant="caption" className="text-ink">
                <Text className="font-semibold">{c.user?.full_name ?? 'Member'}: </Text>
                {c.body}
              </Text>
            </View>
          ))}
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Input placeholder="Add a comment" value={text} onChangeText={setText} />
            </View>
            <Pressable
              onPress={() => {
                if (!text.trim()) return;
                onComment(text.trim());
                setText('');
              }}
              disabled={commenting}
              hitSlop={6}>
              <Ionicons name="send" size={20} color={color.red} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  );
}
