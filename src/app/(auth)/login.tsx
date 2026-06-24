import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { FieldsBackdrop } from '@/components/brand/FieldsBackdrop';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { sendEmailOtp } from '@/features/auth/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
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

  return (
    <Screen scroll={false} contentClassName="justify-between py-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-between">
        <FieldsBackdrop />
        <View className="flex-1 justify-center gap-8">
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
              returnKeyType="go"
              onSubmitEditing={onSend}
              error={error}
            />
            <Button title={t('auth.sendCode')} loading={loading} onPress={onSend} />
          </View>
        </View>

        <Text variant="caption" className="text-center text-muted">
          {t('brand.tagline')}
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}
