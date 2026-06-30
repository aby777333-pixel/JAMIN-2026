import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

interface Role {
  id: string;
  slug: string;
  name: string;
  level: number | null;
}

/** Super-admin only: preview the app as any role (UI-only, never changes your real role). */
export default function RolePreview() {
  const isRealAdmin = useAuth((s) => s.isRealAdmin);
  const current = useAuth((s) => s.profile?.role_slug);
  const preview = useAuth((s) => s.previewRole);
  const setPreviewRole = useAuth((s) => s.setPreviewRole);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['all-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('id, slug, name, level').order('level');
      if (error) throw error;
      return (data ?? []) as Role[];
    },
  });

  if (!isRealAdmin) {
    return (
      <Screen>
        <BackHeader title="Preview as role" />
        <Text variant="body" className="mt-8 text-center text-muted">
          This tool is for Super Admins only.
        </Text>
      </Screen>
    );
  }

  async function pick(slug: string) {
    await setPreviewRole(slug);
    router.replace('/(tabs)');
  }

  return (
    <Screen contentClassName="pb-12 gap-3">
      <BackHeader title="Preview as role" />
      <Text variant="caption">
        See exactly what each role sees — navigation, tools and gating. This never changes your real role; tap
        “Exit” on the banner (or “Back to my admin” below) to return.
      </Text>

      {preview ? (
        <Pressable onPress={() => setPreviewRole(null)}>
          <Card className="flex-row items-center gap-3 border-red/40 bg-red/5">
            <Ionicons name="arrow-undo" size={18} color={color.red} />
            <View className="flex-1">
              <Text variant="title" className="text-[14px]">Back to my admin</Text>
              <Text variant="caption">Currently previewing: {preview.replace(/_/g, ' ')}</Text>
            </View>
          </Card>
        </Pressable>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-6" />
      ) : (
        roles.map((r) => {
          const active = preview ? preview === r.slug : current === r.slug;
          return (
            <Pressable key={r.id} onPress={() => pick(r.slug)}>
              <Card className={`flex-row items-center gap-3 ${active ? 'border-red bg-red/5' : ''}`}>
                <View className="flex-1">
                  <Text variant="title">{r.name}</Text>
                  <Text variant="caption" className="capitalize">{r.slug.replace(/_/g, ' ')}{r.level != null ? ` · level ${r.level}` : ''}</Text>
                </View>
                {active ? (
                  <Text className="text-[12px] font-bold text-red">{preview ? 'PREVIEWING' : 'CURRENT'}</Text>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={color.muted} />
                )}
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
