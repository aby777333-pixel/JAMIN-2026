import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useProjectRating, useProjectReviews, useSubmitReview } from './hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

function Stars({ value, size = 14, onPress }: { value: number; size?: number; onPress?: (n: number) => void }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Ionicons
            name={n <= value ? 'star' : 'star-outline'}
            size={size}
            color={n <= value ? color.gold : color.muted}
          />
        );
        return onPress ? (
          <Pressable key={n} onPress={() => onPress(n)} hitSlop={4} className="px-0.5">
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

/** Project reviews & ratings — buyers rate a project; everyone sees the average. */
export function ReviewsPanel({ projectId }: { projectId: string }) {
  const { data: rating } = useProjectRating(projectId);
  const { data: reviews = [] } = useProjectReviews(projectId);
  const submit = useSubmitReview(projectId);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function send() {
    try {
      await submit.mutateAsync({ rating: stars, title: title.trim() || undefined, body: body.trim() || undefined });
      setOpen(false);
      setTitle('');
      setBody('');
      Alert.alert('Thanks!', 'Your review has been posted.');
    } catch (e) {
      Alert.alert('Could not post', errMessage(e));
    }
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="label">Reviews & ratings</Text>
        <Pressable onPress={() => setOpen((o) => !o)} hitSlop={8}>
          <Text variant="caption" className="text-red">{open ? 'Close' : 'Write a review'}</Text>
        </Pressable>
      </View>

      <Card className="flex-row items-center gap-3">
        <Text className="font-mono-bold text-[26px] text-ink">
          {rating && rating.review_count > 0 ? rating.avg_rating.toFixed(1) : '—'}
        </Text>
        <View>
          <Stars value={Math.round(rating?.avg_rating ?? 0)} />
          <Text variant="caption">
            {rating?.review_count ? `${rating.review_count} review${rating.review_count === 1 ? '' : 's'}` : 'No reviews yet'}
          </Text>
        </View>
      </Card>

      {open ? (
        <Card className="gap-3">
          <Stars value={stars} size={26} onPress={setStars} />
          <Input placeholder="Title (optional)" value={title} onChangeText={setTitle} />
          <Input placeholder="Share your experience (optional)" value={body} onChangeText={setBody} multiline />
          <Button title="Post review" loading={submit.isPending} onPress={send} />
        </Card>
      ) : null}

      {reviews.slice(0, 8).map((r) => (
        <Card key={r.id} className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text variant="title" className="text-[13px]">{r.user?.full_name ?? 'Buyer'}</Text>
            <Stars value={r.rating} />
          </View>
          {r.title ? <Text variant="title" className="text-[13px]">{r.title}</Text> : null}
          {r.body ? <Text variant="body" className="text-[13px]">{r.body}</Text> : null}
        </Card>
      ))}
    </View>
  );
}
