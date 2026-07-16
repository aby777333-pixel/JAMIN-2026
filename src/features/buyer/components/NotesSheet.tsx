import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { errMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { uploadFileToBucket } from '@/lib/upload';
import { color } from '@/theme/tokens';
import { Sheet } from './EnquirySheet';

type ChecklistItem = { label: string; done: boolean };

function parsePhotos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function parseChecklist(v: unknown): ChecklistItem[] {
  if (!Array.isArray(v)) return [];
  const out: ChecklistItem[] = [];
  for (const item of v) {
    if (item && typeof item === 'object' && typeof (item as { label?: unknown }).label === 'string') {
      out.push({
        label: (item as { label: string }).label,
        done: Boolean((item as { done?: unknown }).done),
      });
    }
  }
  return out;
}

/**
 * Private buyer scratchpad for one property (§ property_notes, RLS self-only):
 * free-text note, 1-5 star rating, personal checklist, photos and a voice memo.
 * One row per (user, property) — saved via upsert on that unique pair.
 */
export function NotesSheet({
  visible,
  onClose,
  propertyId,
}: {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
}) {
  const { t } = useTranslation();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);

  // Player follows voice_url; recreated by the hook whenever the source changes.
  const player = useAudioPlayer(voiceUrl ? { uri: voiceUrl } : null);

  // Load my existing note whenever the sheet opens (RLS scopes the query to me).
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoaded(false);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('property_notes')
          .select('note, rating, photos, voice_url, checklist')
          .eq('property_id', propertyId)
          .maybeSingle();
        if (error) throw error;
        if (!alive) return;
        setNote(data?.note ?? '');
        setRating(data?.rating ?? 0);
        setChecklist(parseChecklist(data?.checklist));
        setPhotos(parsePhotos(data?.photos));
        setVoiceUrl(data?.voice_url ?? null);
      } catch {
        /* first note for this property — start empty */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, propertyId]);

  // If the sheet closes mid-recording, stop the recorder quietly.
  useEffect(() => {
    if (!visible && recording) {
      setRecording(false);
      recorder.stop().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function myUserId(): Promise<string> {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error(t('notes.notSignedIn', { defaultValue: 'Not signed in' }));
    return data.user.id;
  }

  async function addPhotos() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsMultipleSelection: true,
      });
      if (res.canceled || res.assets.length === 0) return;
      setUploading(true);
      const userId = await myUserId();
      const urls: string[] = [];
      for (const a of res.assets) {
        const up = await uploadFileToBucket('user-media', `${userId}/notes`, {
          uri: a.uri,
          name: a.fileName ?? 'photo.jpg',
          mimeType: a.mimeType ?? 'image/jpeg',
        });
        urls.push(up.url);
      }
      setPhotos((cur) => [...cur, ...urls]);
    } catch (e) {
      Alert.alert(t('notes.uploadFailed', { defaultValue: 'Upload failed' }), errMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function toggleRecord() {
    if (recording) {
      // Stop → upload the memo.
      setRecording(false);
      setUploading(true);
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        const uri = recorder.uri;
        if (!uri) throw new Error(t('notes.noAudio', { defaultValue: 'No audio was captured' }));
        const userId = await myUserId();
        const up = await uploadFileToBucket('user-media', `${userId}/notes`, {
          uri,
          name: 'voice-note.m4a',
          mimeType: 'audio/m4a',
        });
        setVoiceUrl(up.url);
      } catch (e) {
        Alert.alert(t('notes.uploadFailed', { defaultValue: 'Upload failed' }), errMessage(e));
      } finally {
        setUploading(false);
      }
      return;
    }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          t('notes.micNeeded', { defaultValue: 'Microphone needed' }),
          t('notes.micNeededBody', { defaultValue: 'Allow microphone access to record a voice note.' }),
        );
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (e) {
      Alert.alert(t('notes.recordFailed', { defaultValue: 'Could not record' }), errMessage(e));
    }
  }

  function playVoice() {
    try {
      player.seekTo(0).catch(() => {});
      player.play();
    } catch {
      /* playback is best-effort */
    }
  }

  async function save() {
    setSaving(true);
    try {
      const userId = await myUserId();
      const { error } = await supabase.from('property_notes').upsert(
        {
          user_id: userId,
          property_id: propertyId,
          note: note.trim() || null,
          rating: rating > 0 ? rating : null,
          photos,
          voice_url: voiceUrl,
          checklist,
        },
        { onConflict: 'user_id,property_id' },
      );
      if (error) throw error;
      onClose();
    } catch (e) {
      Alert.alert(t('notes.saveFailed', { defaultValue: 'Could not save' }), errMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function addChecklistItem() {
    const label = newItem.trim();
    if (!label) return;
    setChecklist((cur) => [...cur, { label, done: false }]);
    setNewItem('');
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('notes.title', { defaultValue: 'My notes' })}>
      {!loaded ? (
        <ActivityIndicator color={color.red} />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 pb-4">
          <Text variant="caption">
            {t('notes.private', { defaultValue: 'Only you can see these notes.' })}
          </Text>

          <Input
            label={t('notes.noteLabel', { defaultValue: 'Note' })}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="h-24 py-3"
          />

          {/* Star rating */}
          <View className="gap-1.5">
            <Text variant="label">{t('notes.rating', { defaultValue: 'My rating' })}</Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} hitSlop={6} onPress={() => setRating(rating === n ? 0 : n)}>
                  <Ionicons
                    name={n <= rating ? 'star' : 'star-outline'}
                    size={28}
                    color={n <= rating ? color.gold : color.muted}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Personal checklist */}
          <View className="gap-1.5">
            <Text variant="label">{t('notes.checklist', { defaultValue: 'My checklist' })}</Text>
            {checklist.map((item, idx) => (
              <Pressable
                key={`${item.label}-${idx}`}
                onPress={() =>
                  setChecklist((cur) => cur.map((c, i) => (i === idx ? { ...c, done: !c.done } : c)))
                }
                onLongPress={() => setChecklist((cur) => cur.filter((_, i) => i !== idx))}
                className="flex-row items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5"
              >
                <Ionicons
                  name={item.done ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={item.done ? color.success : color.muted}
                />
                <Text
                  variant="body"
                  className={`flex-1 ${item.done ? 'text-muted line-through' : ''}`}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => setChecklist((cur) => cur.filter((_, i) => i !== idx))}
                >
                  <Ionicons name="close-circle" size={18} color={color.muted} />
                </Pressable>
              </Pressable>
            ))}
            <View className="flex-row items-end gap-2">
              <View className="flex-1">
                <Input
                  placeholder={t('notes.addItem', { defaultValue: 'Add a check…' })}
                  value={newItem}
                  onChangeText={setNewItem}
                  onSubmitEditing={addChecklistItem}
                  returnKeyType="done"
                />
              </View>
              <Button
                title={t('notes.add', { defaultValue: 'Add' })}
                variant="outline"
                className="px-4"
                onPress={addChecklistItem}
              />
            </View>
          </View>

          {/* Photos */}
          <View className="gap-1.5">
            <Text variant="label">{t('notes.photos', { defaultValue: 'My photos' })}</Text>
            {photos.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {photos.map((url) => (
                  <View key={url}>
                    <Image source={{ uri: url }} style={{ width: 64, height: 64, borderRadius: 12 }} />
                    <Pressable
                      hitSlop={8}
                      onPress={() => setPhotos((cur) => cur.filter((u) => u !== url))}
                      style={{ position: 'absolute', top: -6, right: -6 }}
                    >
                      <Ionicons name="close-circle" size={20} color={color.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <Button
              title={t('notes.addPhotos', { defaultValue: 'Add photos' })}
              variant="outline"
              loading={uploading && !recording}
              onPress={addPhotos}
              left={<Ionicons name="images-outline" size={18} color={color.ink} />}
            />
          </View>

          {/* Voice note */}
          <View className="gap-1.5">
            <Text variant="label">{t('notes.voice', { defaultValue: 'Voice note' })}</Text>
            <View className="flex-row items-center gap-2">
              <Button
                title={
                  recording
                    ? t('notes.stop', { defaultValue: 'Stop' })
                    : voiceUrl
                      ? t('notes.reRecord', { defaultValue: 'Re-record' })
                      : t('notes.record', { defaultValue: 'Record' })
                }
                variant={recording ? 'primary' : 'outline'}
                className="flex-1"
                onPress={toggleRecord}
                left={
                  <Ionicons
                    name={recording ? 'stop-circle' : 'mic'}
                    size={18}
                    color={recording ? '#FFFFFF' : color.ink}
                  />
                }
              />
              {voiceUrl && !recording ? (
                <>
                  <Pressable
                    hitSlop={6}
                    onPress={playVoice}
                    className="rounded-full border border-line bg-surface p-2"
                  >
                    <Ionicons name="play-circle" size={26} color={color.red} />
                  </Pressable>
                  <Pressable
                    hitSlop={6}
                    onPress={() => setVoiceUrl(null)}
                    className="rounded-full border border-line bg-surface p-2"
                  >
                    <Ionicons name="trash-outline" size={24} color={color.danger} />
                  </Pressable>
                </>
              ) : null}
            </View>
            {recording ? (
              <Text variant="caption" className="text-danger">
                {t('notes.recording', { defaultValue: 'Recording… tap Stop when done.' })}
              </Text>
            ) : null}
          </View>

          <Button
            title={t('notes.save', { defaultValue: 'Save notes' })}
            loading={saving}
            disabled={uploading || recording}
            onPress={save}
          />
        </ScrollView>
      )}
    </Sheet>
  );
}
