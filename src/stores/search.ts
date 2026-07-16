import { create } from 'zustand';

/**
 * Tiny hand-off store: "Apply" on a saved search parks its filters here,
 * the Properties tab consumes them on focus. Zustand = local/UI state only
 * (SuperPrompt §2) — nothing here touches the server.
 */
export type PendingFilters = Record<string, unknown>;

interface SearchState {
  pendingFilters: PendingFilters | null;
  setPendingFilters: (f: PendingFilters | null) => void;
  /** Returns the parked filters (or null) and clears them — one-shot. */
  consumePendingFilters: () => PendingFilters | null;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  pendingFilters: null,
  setPendingFilters: (f) => set({ pendingFilters: f }),
  consumePendingFilters: () => {
    const f = get().pendingFilters;
    if (f) set({ pendingFilters: null });
    return f;
  },
}));
