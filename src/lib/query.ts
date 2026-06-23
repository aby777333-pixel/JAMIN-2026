import { QueryClient } from '@tanstack/react-query';

/** Shared server-state cache. Local/UI state lives in Zustand stores. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
