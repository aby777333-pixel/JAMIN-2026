import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { FieldsBackdrop } from '@/components/brand/FieldsBackdrop';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { sendEmailOtp, signInWithPassword } from '@/features/auth/api';
import { color } from '@/theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSend() {
    if (!EMAIL_RE.test(email.trim())) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await sendEmailOtp(email);
      router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
    } catch (e) {
      Alert.alert(t('auth.checkEmail'), e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onPasswordSignIn() {
    if (!EMAIL_RE.test(email.trim())) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (password.length < 6) {
      setError('Enter your password (at least 6 characters).');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      // Mirror the OTP path — the index gate routes onward once the session is set.
      router.replace('/');
    } catch (e) {
      Alert.alert('Sign-in failed', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      scroll
      keyboardAvoiding
      backdrop={<FieldsBackdrop />}
      contentClassName="grow justify-center gap-8 py-8">
      <View className="items-center gap-3">
        <Logo width={260} showTagline />
      </View>

      <View className="gap-2">
        <Text variant="h1" className="text-center">
          {t('auth.welcome')}
        </Text>
        <Text variant="body" className="text-center text-muted">
          {t('auth.subtitle')}
        </Text>
      </View>

      <View className="gap-4">
        <Input
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          returnKeyType={usePassword ? 'next' : 'go'}
          onSubmitEditing={usePassword ? undefined : onSend}
          error={usePassword ? undefined : error}
        />

        {usePassword ? (
          <View className="gap-1.5">
            <Text variant="label">Password</Text>
            <View>
              <TextInput
                className="h-13 min-h-[52px] rounded-2xl border border-line bg-surface px-4 pr-12 text-[16px] text-ink font-sans"
                placeholder="Your password"
                placeholderTextColor={color.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={onPasswordSignIn}
              />
              <Pressable
                onPress={() => setShowPw((v) => !v)}
                hitSlop={8}
                style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={color.muted} />
              </Pressable>
            </View>
            {error ? (
              <Text variant="caption" className="text-danger">
                {error}
              </Text>
            ) : null}
          </View>
        ) : null}

        {usePassword ? (
          <Button title="Sign in" loading={loading} onPress={onPasswordSignIn} />
        ) : (
          <Button title={t('auth.sendCode')} loading={loading} onPress={onSend} />
        )}

        <Pressable
          onPress={() => {
            setError(undefined);
            setUsePassword((v) => !v);
          }}
          hitSlop={8}
          className="self-center">
          <Text className="font-semibold text-[13px] text-red">
            {usePassword ? 'Use email code instead' : 'Sign in with password'}
          </Text>
        </Pressable>
      </View>

      <Text variant="caption" className="text-center text-muted">
        {t('brand.tagline')}
      </Text>
    </Screen>
  );
}
