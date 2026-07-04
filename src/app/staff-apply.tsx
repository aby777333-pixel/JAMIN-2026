import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { errMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

interface RoleRow {
  slug: string;
  name: string;
  level: number;
}

interface MyApplication {
  id: string;
  requested_role_slug: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const STATUS_TINT: Record<MyApplication['status'], string> = {
  pending: '#D97706',
  approved: '#16A34A',
  rejected: '#DC2626',
};

/**
 * Apply for a JAMIN role — anyone can apply through the app for any non-admin
 * role (incl. staff ranks like State Head / Promoter that are NOT one-tap
 * self-selectable). The admin reviews applications in the Staff tab of the web
 * portal and grants the role; the applicant gets an in-app notification.
 */
export default function StaffApply() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [apps, setApps] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pending = apps.find((a) => a.status === 'pending');

  useEffect(() => {
    (async () => {
      const [r, a] = await Promise.all([
        supabase.from('roles').select('slug,name,level').eq('is_admin', false).order('level'),
        profile?.id
          ? supabase
              .from('staff_applications')
              .select('id,requested_role_slug,status,created_at')
              .eq('user_id', profile.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (!r.error) setRoles((r.data ?? []) as RoleRow[]);
      if (!a.error) setApps((a.data ?? []) as unknown as MyApplication[]);
      setLoading(false);
    })();
  }, [profile?.id]);

  async function submit() {
    if (!profile) return;
    if (!picked) {
      Alert.alert(t('staffApply.title'), t('staffApply.pickRole'));
      return;
    }
    if (name.trim().length < 2 || phone.trim().length < 7) {
      Alert.alert(t('staffApply.title'), t('staffApply.needContact'));
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('staff_applications')
        .insert({
          user_id: profile.id,
          full_name: name.trim(),
          phone: phone.trim(),
          requested_role_slug: picked,
          note: note.trim() || null,
        })
        .select('id,requested_role_slug,status,created_at')
        .single();
      if (error) throw error;
      setApps((prev) => [data as unknown as MyApplication, ...prev]);
      setPicked(null);
      setNote('');
      Alert.alert(t('staffApply.sentTitle'), t('staffApply.sentBody'));
    } catch (e) {
      Alert.alert(t('staffApply.title'), errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4" keyboardAvoiding>
      <BackHeader title={t('staffApply.title')} />

      <Card className="gap-2 bg-charcoal">
        <Text variant="title" className="text-white">
          {t('staffApply.heroTitle')}
        </Text>
        <Text variant="caption" className="text-white/75">
          {t('staffApply.heroBody')}
        </Text>
      </Card>

      {loading ? (
        <ActivityIndicator color={color.red} className="py-6" />
      ) : (
        <>
          {apps.length > 0 ? (
            <Card className="gap-2">
              <Text variant="label">{t('staffApply.myApps')}</Text>
              {apps.map((a) => {
                const role = roles.find((r) => r.slug === a.requested_role_slug);
                return (
                  <View key={a.id} className="flex-row items-center justify-between">
                    <Text variant="body">{role?.name ?? a.requested_role_slug}</Text>
                    <View
                      className="rounded-full px-2.5 py-0.5"
                      style={{ backgroundColor: `${STATUS_TINT[a.status]}22` }}>
                      <Text
                        variant="caption"
                        className="font-semibold"
                        style={{ color: STATUS_TINT[a.status] }}>
                        {t(`staffApply.status.${a.status}`)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : null}

          {pending ? (
            <Card className="gap-1 border-gold/40 bg-gold/5">
              <Text variant="label">{t('staffApply.pendingTitle')}</Text>
              <Text variant="caption">{t('staffApply.pendingBody')}</Text>
            </Card>
          ) : (
            <>
              <Card className="gap-3">
                <Text variant="label">{t('staffApply.chooseRole')}</Text>
                {roles.map((r) => (
                  <Pressable
                    key={r.slug}
                    onPress={() => setPicked(r.slug)}
                    className={`flex-row items-center gap-3 rounded-2xl border p-3 ${
                      picked === r.slug ? 'border-red bg-red/5' : 'border-line bg-surface'
                    }`}>
                    <Ionicons
                      name={picked === r.slug ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={picked === r.slug ? color.red : color.muted}
                    />
                    <View className="flex-1">
                      <Text variant="body" className="font-semibold">
                        {r.name}
                      </Text>
                      <Text variant="caption" className="text-muted">
                        {t('staffApply.levelLabel', { level: r.level })}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </Card>

              <Card className="gap-3">
                <Input label={t('staffApply.name')} value={name} onChangeText={setName} autoCapitalize="words" />
                <Input label={t('staffApply.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Input
                  label={t('staffApply.note')}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  className="min-h-[72px] py-3"
                  placeholder={t('staffApply.notePh')}
                />
                <Button title={t('staffApply.submit')} loading={busy} onPress={submit} />
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
