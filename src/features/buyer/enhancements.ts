import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

/**
 * Buyer enhancement layer (migration 0100): preferences, saved searches,
 * search/compare telemetry, property notes and brochure-download history.
 * All tables are RLS self-scoped, so plain selects only ever return my rows.
 */

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

/* ------------------------------------------------------------------ */
/* Buyer preferences — one jsonb document per user                     */
/* ------------------------------------------------------------------ */

export type BuyerPrefs = Record<string, unknown>;

export function useBuyerPrefs() {
  return useQuery({
    queryKey: ['buyer-prefs'],
    queryFn: async (): Promise<BuyerPrefs> => {
      const { data, error } = await supabase.from('buyer_preferences').select('prefs').maybeSingle();
      if (error) throw error;
      return ((data?.prefs as BuyerPrefs | null | undefined) ?? {}) as BuyerPrefs;
    },
  });
}

export function useSaveBuyerPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: BuyerPrefs) => {
      const user_id = await currentUserId();
      const { error } = await supabase
        .from('buyer_preferences')
        .upsert(
          { user_id, prefs: prefs as Json, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['buyer-prefs'] }),
  });
}

/* ------------------------------------------------------------------ */
/* Saved searches                                                      */
/* ------------------------------------------------------------------ */

export interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  notify: boolean;
  created_at: string;
}

export function useSavedSearches() {
  return useQuery({
    queryKey: ['saved-searches'],
    queryFn: async (): Promise<SavedSearch[]> => {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('id, name, filters, notify, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedSearch[];
    },
  });
}

export function useCreateSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; filters: Record<string, unknown>; notify?: boolean }) => {
      const user_id = await currentUserId();
      const { error } = await supabase.from('saved_searches').insert({
        user_id,
        name: input.name,
        filters: input.filters as Json,
        notify: input.notify ?? true,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_searches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
}

export function useToggleSavedSearchNotify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notify }: { id: string; notify: boolean }) => {
      const { error } = await supabase.from('saved_searches').update({ notify }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
}

/* ------------------------------------------------------------------ */
/* Brochure downloads & comparison history                             */
/* ------------------------------------------------------------------ */

export interface BrochureDownloadRow {
  id: string;
  title: string;
  url: string | null;
  property_id: string | null;
  created_at: string;
  property: { plot_code: string } | null;
}

export function useMyBrochureDownloads(limit = 10) {
  return useQuery({
    queryKey: ['my-brochure-downloads', limit],
    queryFn: async (): Promise<BrochureDownloadRow[]> => {
      const { data, error } = await supabase
        .from('brochure_downloads')
        .select('id, title, url, property_id, created_at, property:properties(plot_code)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as BrochureDownloadRow[];
    },
  });
}

export interface CompareEventRow {
  id: string;
  property_ids: string[];
  created_at: string;
}

export function useMyCompareEvents(limit = 10) {
  return useQuery({
    queryKey: ['my-compare-events', limit],
    queryFn: async (): Promise<CompareEventRow[]> => {
      const { data, error } = await supabase
        .from('compare_events')
        .select('id, property_ids, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as CompareEventRow[];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Search telemetry — fire-and-forget, throttled                       */
/* ------------------------------------------------------------------ */

let lastSearchKey: string | null = null;
let lastSearchAt = 0;

/**
 * Log a search into search_events. Never throws, never blocks the UI.
 * Skips repeats of the exact same query+filters and enforces a minimum
 * 5 s gap between inserts so fast typing doesn't spam the table.
 */
export function logSearchEvent(query: string, filters: Record<string, unknown>): void {
  try {
    const key = JSON.stringify({ query, filters });
    const now = Date.now();
    if (key === lastSearchKey || now - lastSearchAt < 5_000) return;
    lastSearchKey = key;
    lastSearchAt = now;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.from('search_events').insert({
        user_id: data.user.id,
        query,
        filters: filters as Json,
      });
    })().catch(() => {
      /* telemetry must never disrupt the screen */
    });
  } catch {
    /* never disrupt */
  }
}

/* ------------------------------------------------------------------ */
/* Property notes (private per buyer)                                  */
/* ------------------------------------------------------------------ */

export interface PropertyNote {
  id: string;
  property_id: string;
  note: string | null;
  rating: number | null;
  photos: unknown;
  voice_url: string | null;
  checklist: unknown;
  updated_at: string;
}

export function useMyNote(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['property-note', propertyId],
    queryFn: async (): Promise<PropertyNote | null> => {
      const { data, error } = await supabase
        .from('property_notes')
        .select('id, property_id, note, rating, photos, voice_url, checklist, updated_at')
        .eq('property_id', propertyId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as PropertyNote) ?? null;
    },
    enabled: !!propertyId,
  });
}

export function useUpsertNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      propertyId: string;
      note?: string | null;
      rating?: number | null;
      photos?: unknown;
      voiceUrl?: string | null;
      checklist?: unknown;
    }) => {
      const user_id = await currentUserId();
      const row: Record<string, unknown> = {
        user_id,
        property_id: input.propertyId,
        updated_at: new Date().toISOString(),
      };
      if (input.note !== undefined) row.note = input.note;
      if (input.rating !== undefined) row.rating = input.rating;
      if (input.photos !== undefined) row.photos = input.photos;
      if (input.voiceUrl !== undefined) row.voice_url = input.voiceUrl;
      if (input.checklist !== undefined) row.checklist = input.checklist;
      const { error } = await supabase
        .from('property_notes')
        .upsert(row as never, { onConflict: 'user_id,property_id' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['property-note', vars.propertyId] });
      void qc.invalidateQueries({ queryKey: ['my-notes-count'] });
    },
  });
}

export function useMyNotesCount() {
  return useQuery({
    queryKey: ['my-notes-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('property_notes')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}
