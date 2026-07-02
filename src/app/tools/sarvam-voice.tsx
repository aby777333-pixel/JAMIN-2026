import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import {
  chatWithSarvam,
  speechToText,
  textToSpeech,
  type SarvamChatMessage,
} from '@/features/sarvam/api';
import { cn } from '@/lib/cn';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** Languages Sarvam's bulbul:v2 voice supports (subset of the full translate list). */
const VOICE_LANGS = [
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'en-IN', label: 'English' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'മലയാളം' },
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'bn-IN', label: 'বাংলা' },
  { code: 'gu-IN', label: 'ગુજરાતી' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
  { code: 'od-IN', label: 'ଓଡ଼ିଆ' },
] as const;

type CallState = 'setup' | 'ready' | 'listening' | 'thinking' | 'speaking';

/**
 * AI Voice Call — talk to the JAMIN assistant in your own Indian language,
 * powered by Sarvam (STT saarika → chat sarvam-30b → TTS bulbul). Turn-based:
 * tap the mic, speak (up to ~30s), and the assistant replies out loud.
 * Inert with a friendly note until the Sarvam key is configured server-side.
 */
export default function SarvamVoiceCall() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playerRef = useRef<AudioPlayer | null>(null);

  const [lang, setLang] = useState<(typeof VOICE_LANGS)[number]>(VOICE_LANGS[0]);
  const [state, setState] = useState<CallState>('setup');
  const [messages, setMessages] = useState<SarvamChatMessage[]>([]);
  const [note, setNote] = useState<string | null>(null);

  // Release any playing audio when leaving the screen.
  useEffect(() => {
    return () => {
      try {
        playerRef.current?.remove();
      } catch {
        /* already released */
      }
    };
  }, []);

  function stopPlayback() {
    try {
      playerRef.current?.remove();
    } catch {
      /* already released */
    }
    playerRef.current = null;
  }

  async function startCall() {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('tools.voice.micNeeded'), t('tools.voice.micNeededBody'));
      return;
    }
    setNote(null);
    setMessages([]);
    setState('ready');
  }

  function endCall() {
    stopPlayback();
    if (state === 'listening') {
      recorder.stop().catch(() => {});
    }
    setState('setup');
  }

  async function startListening() {
    try {
      stopPlayback();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('listening');
    } catch (e) {
      setNote(errMessage(e));
      setState('ready');
    }
  }

  async function stopAndProcess() {
    setState('thinking');
    setNote(null);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error(t('tools.voice.noAudio'));

      // 1) Speech → text
      // expo-audio records AAC in an MP4 container; Sarvam accepts 'audio/mp4'
      // (it rejects the 'audio/m4a' label — the edge fn also normalizes it).
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const stt = await speechToText(b64, 'audio/mp4');
      if (stt.configured === false) {
        setNote(stt.message ?? t('tools.voice.notEnabled'));
        setState('ready');
        return;
      }
      const heard = (stt.text ?? '').trim();
      if (!heard) {
        setNote(t('tools.voice.didntCatch'));
        setState('ready');
        return;
      }
      const shown: SarvamChatMessage[] = [...messages, { role: 'user', content: heard }];
      setMessages(shown);

      // 2) Chat — ask for a short, speakable reply (instruction only in the payload).
      const payload: SarvamChatMessage[] = [
        ...shown.slice(0, -1),
        { role: 'user', content: `${heard}\n(Reply briefly, in 1-3 short spoken sentences for a voice call.)` },
      ];
      const chat = await chatWithSarvam(payload, lang.label);
      const reply = (chat.text ?? '').trim();
      if (!reply) {
        setNote(chat.message ?? t('tools.voice.unavailable'));
        setState('ready');
        return;
      }
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);

      // 3) Text → speech, then play
      const tts = await textToSpeech(reply, lang.code);
      if (!tts.audio_base64) {
        setNote(tts.message ?? t('tools.voice.noVoice'));
        setState('ready');
        return;
      }
      const dest = `${FileSystem.cacheDirectory}jamin_voice_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(dest, tts.audio_base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const player = createAudioPlayer({ uri: dest });
      playerRef.current = player;
      setState('speaking');
      player.addListener('playbackStatusUpdate', (st) => {
        if (st.didJustFinish) {
          stopPlayback();
          setState('ready');
        }
      });
      player.play();
    } catch (e) {
      setNote(errMessage(e));
      setState('ready');
    } finally {
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    }
  }

  const inCall = state !== 'setup';
  const statusKey =
    state === 'listening'
      ? 'tools.voice.listening'
      : state === 'thinking'
        ? 'tools.voice.thinking'
        : state === 'speaking'
          ? 'tools.voice.speaking'
          : 'tools.voice.tapToTalk';

  // ── Setup step ─────────────────────────────────────────────────────────────
  if (!inCall) {
    return (
      <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
        <ScrollView
          contentContainerClassName="px-5 gap-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
          showsVerticalScrollIndicator={false}>
          <BackHeader title={t('tools.voice.title')} />
          <Text variant="caption">{t('tools.voice.intro')}</Text>

          <Card className="items-center gap-3 py-8">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-gold/20">
              <Ionicons name="call" size={34} color={color.goldDeep} />
            </View>
            <Text variant="title" className="text-[15px]">{t('tools.voice.chooseLang')}</Text>
            <View className="flex-row flex-wrap justify-center gap-2 px-2">
              {VOICE_LANGS.map((l) => (
                <Chip key={l.code} label={l.label} active={lang.code === l.code} onPress={() => setLang(l)} />
              ))}
            </View>
          </Card>

          <Button
            title={t('tools.voice.start')}
            left={<Ionicons name="call" size={18} color="#FFFFFF" />}
            onPress={startCall}
          />
          {note ? (
            <Card className="border-gold/40 bg-gold/5">
              <Text variant="caption">{note}</Text>
            </Card>
          ) : null}
          <Text variant="caption" className="text-center text-muted">
            {t('tools.voice.powered')}
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ── In-call step ───────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <View className="px-5">
        <BackHeader title={t('tools.voice.title')} />
      </View>

      {/* Status banner */}
      <View className="mx-5 flex-row items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5">
        <View
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            state === 'listening' ? 'bg-red' : state === 'speaking' ? 'bg-success' : 'bg-gold',
          )}
        />
        <Text variant="label" className="text-ink">{t(statusKey)}</Text>
        <Text variant="caption" className="ml-auto">{lang.label}</Text>
      </View>

      {/* Transcript */}
      <ScrollView
        ref={scroller}
        className="flex-1"
        contentContainerClassName="px-5 py-3 gap-3"
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
        {messages.length === 0 ? (
          <View className="items-center gap-2 py-10">
            <Ionicons name="mic-outline" size={30} color={color.muted} />
            <Text variant="caption" className="text-center px-8">{t('tools.voice.hint')}</Text>
          </View>
        ) : null}
        {messages.map((m, i) => (
          <View
            key={i}
            className={cn(
              'max-w-[85%] rounded-2xl px-4 py-3',
              m.role === 'user' ? 'self-end bg-red' : 'self-start border border-line bg-surface',
            )}>
            <Text variant="body" className={m.role === 'user' ? 'text-white' : 'text-ink'} selectable>
              {m.content}
            </Text>
          </View>
        ))}
        {state === 'thinking' ? (
          <View className="self-start rounded-2xl border border-line bg-surface px-4 py-3">
            <ActivityIndicator color={color.red} />
          </View>
        ) : null}
        {note ? (
          <Card className="border-gold/40 bg-gold/5">
            <Text variant="caption">{note}</Text>
          </Card>
        ) : null}
      </ScrollView>

      {/* Call controls */}
      <View
        className="flex-row items-center justify-center gap-8 border-t border-line bg-surface pt-4"
        style={{ paddingBottom: insets.bottom + 14 }}>
        <Pressable
          onPress={endCall}
          className="h-14 w-14 items-center justify-center rounded-full bg-charcoal"
          accessibilityLabel={t('tools.voice.end')}>
          <Ionicons name="call" size={22} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>

        <Pressable
          onPress={state === 'listening' ? stopAndProcess : startListening}
          disabled={state === 'thinking'}
          className={cn(
            'h-20 w-20 items-center justify-center rounded-full',
            state === 'listening' ? 'bg-red' : state === 'thinking' ? 'bg-line' : 'bg-success',
          )}
          accessibilityLabel={t(statusKey)}>
          {state === 'thinking' ? (
            <ActivityIndicator color={color.ink} />
          ) : (
            <Ionicons name={state === 'listening' ? 'stop' : 'mic'} size={30} color="#FFFFFF" />
          )}
        </Pressable>

        {/* Spacer to keep the mic centred */}
        <View className="h-14 w-14" />
      </View>
    </View>
  );
}
