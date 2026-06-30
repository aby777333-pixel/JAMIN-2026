import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Text } from '@/components/ui/Text';
import { signUpWithPassword } from '@/features/auth/api';
import { useSelectableRoles } from '@/features/roles/hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_HINT: Record<string, string> = {
  buyer: 'Browse & buy properties',
  agent: 'Sales partner — earn commissions',
  seller: 'List & sell your own plots',
  builder: 'List your builds',
  developer: 'List your projects',
  surveyor: 'Offer survey services',
  legal_consultant: 'Offer legal services',
  broker: 'Broker listings & deals',
};

export default function Register() {
  const { data: roles = [] } = useSelectableRoles();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>('buyer');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleOptions: SelectOption[] = roles.map((r) => ({ value: r.slug, label: r.name, hint: ROLE_HINT[r.slug] }));

  async function onRegister() {
    if (fullName.trim().length < 2) return Alert.alert('Name needed', 'Enter your full name.');
    if (!EMAIL_RE.test(email.trim())) return Alert.alert('Email needed', 'Enter a valid email address.');
    if (!/^[+\d][\d\s-]{7,}$/.test(phone.trim())) return Alert.alert('Phone needed', 'Enter a valid phone number.');
    if (password.length < 6) return Alert.alert('Password too short', 'Use at least 6 characters.');

    setLoading(true);
    try {
      const data = await signUpWithPassword({ email, password, fullName, phone, role });
      if (data.session) {
        // Confirmation disabled → straight into the app (profile already populated).
        router.replace('/');
      } else {
        Alert.alert(
          'Account created',
          'Please check your email to confirm your account, then sign in with your password.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
        );
      }
    } catch (e) {
      const msg = errMessage(e);
      Alert.alert('Could not register', /already registered|exists/i.test(msg) ? 'This email is already registered — sign in instead.' : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll keyboardAvoiding contentClassName="pb-12 gap-4">
      <BackHeader title="Create your account" />
      <Text variant="caption">Join JAMIN Properties. Pick the role that fits you — you can switch anytime.</Text>

      <View className="gap-4">
        <Input label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Your name" />
        <Input
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          placeholder="you@example.com"
        />
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" inputMode="tel" placeholder="+91 …" />

        <View className="gap-1">
          <Select label="I'm registering as" value={role} options={roleOptions} onChange={setRole} placeholder="Choose your role" />
          <Text variant="caption">Senior management roles are assigned by an admin.</Text>
        </View>

        <View className="gap-1.5">
          <Text variant="label">Password</Text>
          <View>
            <TextInput
              className="h-13 min-h-[52px] rounded-2xl border border-line bg-surface px-4 pr-12 text-[16px] text-ink font-sans"
              placeholder="Create a password"
              placeholderTextColor={color.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoComplete="password-new"
            />
            <Pressable
              onPress={() => setShowPw((v) => !v)}
              hitSlop={8}
              style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={color.muted} />
            </Pressable>
          </View>
        </View>

        <Button title="Create account" loading={loading} onPress={onRegister} />

        <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8} className="self-center pt-1">
          <Text className="font-semibold text-[13px] text-red">Already have an account? Sign in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
