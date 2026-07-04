import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { speechToText, translateText } from '@/features/sarvam/api';
import type { PropertyFilters } from '@/features/buyer/types';
import { parseVoiceQuery, type NamedRow } from '@/features/buyer/voiceQuery';
import { errMessage } from '@/lib/errors';
import { color } from '@/theme/tokens';

/**
 * Voice property search — tap the mic and say it in ANY Indian language:
 * "கோயம்புத்தூரில் 50 லட்சத்துக்குள் வில்லா" → speech-to-text (Jamindar/Sarvam)
 * → English → parsed into the normal filter state. The transcript and what was
 * applied are shown so the user always sees what happened.
 */
export function VoiceSearch({
  types,
  projects,
  onApply,
}: {
  types: NamedRow[];
  projects: NamedRow[];
  onApply: (filters: Partial<PropertyFilters>) => void;
}) {
  const { t } = useTranslation();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [heard, setHeard] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>([]);

  async function start() {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('tools.voice.micNeeded'), t('tools.voice.micNeededBody'));
      return;
    }
    try {
      setHeard(null);
      setApplied([]);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('recording');
    } catch (e) {
      Alert.alert(t('properties.voice.title'), errMessage(e));
      setState('idle');
    }
  }

  async function stopAndSearch() {
    setState('processing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error(t('tools.voice.noAudio'));
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

      const stt = await speechToText(b64, 'audio/mp4');
      if (stt.configured === false) {
        Alert.alert(t('properties.voice.title'), stt.message ?? t('tools.voice.notEnabled'));
        setState('idle');
        return;
      }
      const transcript = (stt.text ?? '').trim();
      if (!transcript) {
        Alert.alert(t('properties.voice.title'), t('tools.voice.didntCatch'));
        setState('idle');
        return;
      }
      setHeard(transcript);

      // Parse in English: translate unless it was already spoken in English.
      let english = transcript;
      if (stt.language_code && !String(stt.language_code).startsWith('en')) {
        try {
          const tr = await translateText(transcript, 'en-IN', String(stt.language_code));
          if (tr.text) english = tr.text;
        } catch {
          /* parse the raw transcript instead */
        }
      }

      const { filters, summary } = parseVoiceQuery(english, types, projects);
      if (summary.length === 0) {
        setApplied([t('properties.voice.nothingMatched')]);
      } else {
        onApply(filters);
        setApplied(summary);
      }
    } catch (e) {
      Alert.alert(t('properties.voice.title'), errMessage(e));
    } finally {
      setState('idle');
    }
  }

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={state === 'recording' ? stopAndSearch : state === 'idle' ? start : undefined}
          className="h-[52px] w-[52px] items-center justify-center rounded-2xl border"
          style={{
            backgroundColor: state === 'recording' ? color.red : `${color.red}14`,
            borderColor: state === 'recording' ? color.red : `${color.red}40`,
          }}>
          {state === 'processing' ? (
            <ActivityIndicator color={color.red} />
          ) : (
            <Ionicons name={state === 'recording' ? 'stop' : 'mic'} size={22} color={state === 'recording' ? '#fff' : color.red} />
          )}
        </Pressable>
        <Text variant="caption" className="flex-1 text-muted">
          {state === 'recording'
            ? t('properties.voice.listening')
            : state === 'processing'
              ? t('properties.voice.working')
              : t('properties.voice.hint')}
        </Text>
      </View>
      {heard ? (
        <View className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2">
          <Text variant="caption" className="text-ink">
            🎙️ “{heard}”{applied.length ? ` → ${applied.join(' · ')}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
