import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import * as api from './api';
import type { PaymentMethod, PlotPatch, PlotStatus } from './api';
import { liveChannel, supabase } from '@/lib/supabase';

const layoutKey = (slug: string) => ['layout', slug] as const;

export function useLayout(slug: string | undefined) {
  return useQuery({
    queryKey: layoutKey(slug ?? ''),
    queryFn: () => api.getLayout(slug as string),
    enabled: !!slug,
  });
}

export function useLayouts() {
  return useQuery({ queryKey: ['layouts'], queryFn: api.listLayouts });
}

/**
 * Repaint the plan the moment any plot in this layout changes hands.
 *
 * The channel name is generated per subscription — reusing a fixed name across a
 * remount can hand back the previous, already-subscribed channel and throw when
 * a listener is attached (see liveChannel in lib/supabase).
 */
export function useLayoutRealtime(slug: string | undefined, layoutId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!slug || !layoutId) return;
    const channel = supabase
      .channel(liveChannel(`layout-${layoutId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'layout_plots', filter: `layout_id=eq.${layoutId}` },
        () => void qc.invalidateQueries({ queryKey: layoutKey(slug) }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [slug, layoutId, qc]);
}

export function useReservePlot(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plotId, method, note }: { plotId: string; method: PaymentMethod; note?: string }) =>
      api.reservePlot(plotId, method, note),
    onSuccess: () => void qc.invalidateQueries({ queryKey: layoutKey(slug ?? '') }),
  });
}

export function useReleasePlot(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plotId: string) => api.releasePlot(plotId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: layoutKey(slug ?? '') }),
  });
}

export function useMyPlotBookings() {
  return useQuery({ queryKey: ['layout-bookings'], queryFn: api.listMyPlotBookings });
}

export function useSetPlotStatus(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plotId, status, note }: { plotId: string; status: PlotStatus; note?: string }) =>
      api.setPlotStatus(plotId, status, note),
    onSuccess: () => void qc.invalidateQueries({ queryKey: layoutKey(slug ?? '') }),
  });
}

export function useUpdatePlot(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plotId, patch }: { plotId: string; patch: PlotPatch }) =>
      api.updatePlot(plotId, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: layoutKey(slug ?? '') }),
  });
}
