import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { isVisibleRole } from '@/lib/access';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

interface Role {
  id: string;
  slug: string;
  name: string;
  level: number | null;
}

/**
 * What each role actually sees — shown on the cards AND the honest answer to
 * "why does a preview look similar": the 4-tab shell is identical for every
 * role by design; the differences live INSIDE the screens listed here.
 */
const ROLE_NOTES: Record<string, string> = {
  super_admin:
    'Everything: Admin portal on Account, all approvals, users & roles, analytics — plus every partner tool.',
  state_head:
    'Partner suite + state-wide team analytics: leads, recruit, team, wallet, targets, marketing tools.',
  regional_manager:
    'Partner suite + regional team analytics: leads, recruit, team rollups, wallet, marketing tools.',
  promoter:
    'Properties quick actions become Leads/Recruit/Dashboard · Investments = commission wallet · Activity = agent digest · Account gains partner tools (clients, team, brochures, referrals, academy).',
  sub_promoter:
    'Same partner experience as Promoter, scoped to their own team subtree.',
  agent:
    'Leads CRM, recruit, wallet + statements, marketing library, visits scanner, property share tools; property pages show "Share with client" instead of buyer CTAs.',
  broker:
    'Same as Agent, plus co-broking; joins via broker application.',
  seller:
    'Properties quick actions become List property/My listings/Documents · property pages of their own plots show Manage · listing lifecycle (edit, hide, sold/rented, archive, renew).',
  builder: 'Seller experience for builders — list projects/builds, documents, lifecycle.',
  developer: 'Seller experience for developers — list projects, documents, lifecycle.',
  surveyor: 'Service-role account: browse + profile + support; no sales tools.',
  legal_consultant: 'Service-role account: browse + profile + support; no sales tools.',
  buyer:
    'Quick actions Saved/Compare/Alerts · property pages show Enquire/Book visit/Offer/Reserve + contact routing · Investments = bookings · buyer dashboard, preferences, saved searches, notes.',
};

/** Super-admin only: preview the app as any role (UI-only, never changes your real role). */
export default function RolePreview() {
  const isRealAdmin = useAuth((s) => s.isRealAdmin);
  const current = useAuth((s) => s.profile?.role_slug);
  const preview = useAuth((s) => s.previewRole);
  const setPreviewRole = useAuth((s) => s.setPreviewRole);
  const qc = useQueryClient();
  // The tidy list shows the public user types; the toggle reveals EVERY role
  // in the system (state head, regional manager, builder, surveyor, …) so the
  // Super Admin can preview absolutely any experience.
  const [showAll, setShowAll] = useState(false);

  const { data: allRoles = [], isLoading } = useQuery({
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

  function pick(slug: string) {
    // Land on Home FIRST, then flip the role once navigation has settled.
    // Flipping while this pushed screen is focused changes the tab set
    // (Network/Wallet hide for buyers) underneath the navigator mid-transition,
    // which closed release builds outright.
    router.replace('/(tabs)');
    setTimeout(() => {
      void setPreviewRole(slug).then(() => {
        // Role-gated screens cache their queries — refetch everything so the
        // preview shows that role's content immediately, not stale admin data.
        void qc.invalidateQueries();
      });
    }, 400);
  }

  const roles = showAll ? allRoles : allRoles.filter((r) => isVisibleRole(r.slug));
  // Agent + Broker share one card (both level 6, same app experience) —
  // each stays individually previewable via the chips inside it.
  const agent = roles.find((r) => r.slug === 'agent');
  const broker = roles.find((r) => r.slug === 'broker');
  const combineAgentBroker = !!agent && !!broker;
  const listed = combineAgentBroker ? roles.filter((r) => r.slug !== 'agent' && r.slug !== 'broker') : roles;
  const agentBrokerActive =
    (preview ? preview === 'agent' || preview === 'broker' : current === 'agent' || current === 'broker');

  function roleCard(r: Role) {
    const active = preview ? preview === r.slug : current === r.slug;
    return (
      <Pressable key={r.id} onPress={() => pick(r.slug)}>
        <Card className={`gap-1.5 ${active ? 'border-red bg-red/5' : ''}`}>
          <View className="flex-row items-center gap-3">
            <View className="min-w-0 flex-1">
              <Text variant="title">{r.name}</Text>
              <Text variant="caption" className="capitalize">{r.slug.replace(/_/g, ' ')}{r.level != null ? ` · level ${r.level}` : ''}</Text>
            </View>
            {active ? (
              <Text className="text-[12px] font-bold text-red">{preview ? 'PREVIEWING' : 'CURRENT'}</Text>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            )}
          </View>
          {ROLE_NOTES[r.slug] ? (
            <Text variant="caption" className="text-ink">{ROLE_NOTES[r.slug]}</Text>
          ) : null}
        </Card>
      </Pressable>
    );
  }

  function agentBrokerCard() {
    if (!agent || !broker) return null;
    return (
      <Card key="agent-broker" className={agentBrokerActive ? 'gap-2.5 border-red bg-red/5' : 'gap-2.5'}>
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text variant="title">Agent / Broker</Text>
            <Text variant="caption">Agent · Broker · level 6 — same experience, pick either</Text>
          </View>
          {agentBrokerActive ? (
            <Text className="text-[12px] font-bold text-red">{preview ? 'PREVIEWING' : 'CURRENT'}</Text>
          ) : null}
        </View>
        <View className="flex-row gap-2">
          {[agent, broker].map((x) => {
            const active = preview ? preview === x.slug : current === x.slug;
            return (
              <Pressable
                key={x.slug}
                onPress={() => pick(x.slug)}
                className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${active ? 'border-red bg-red' : 'border-line bg-surface'}`}>
                <Ionicons name="eye-outline" size={14} color={active ? '#FFFFFF' : color.ink} />
                <Text className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-ink'}`}>{x.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" className="text-ink">{ROLE_NOTES.agent}</Text>
      </Card>
    );
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
        <>
          {listed.map((r) => {
            // Slot the combined Agent/Broker card in level order (before the
            // first role above level 6 — i.e. before Buyer).
            if (combineAgentBroker && (r.level ?? 0) > 6 && !listed.slice(0, listed.indexOf(r)).some((x) => (x.level ?? 0) > 6)) {
              return (
                <View key={`ab-${r.id}`} className="gap-3">
                  {agentBrokerCard()}
                  {roleCard(r)}
                </View>
              );
            }
            return roleCard(r);
          })}
          {/* If no role sits above level 6 in this list, append the combined card. */}
          {combineAgentBroker && !listed.some((x) => (x.level ?? 0) > 6) ? agentBrokerCard() : null}
          <Pressable onPress={() => setShowAll((s) => !s)} className="items-center pt-1">
            <Text className="text-[13px] font-semibold text-muted">
              {showAll ? 'Show public roles only' : 'Show ALL roles (incl. internal ranks)'}
            </Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}
