import { Alert, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Crash guard: in a release build ANY uncaught JS error closes the app with no
 * trace. This module (a) reports every fatal error to public.client_errors so
 * it is diagnosable from the admin, and (b) keeps the app alive with an alert
 * instead of a silent exit. Render errors are additionally caught by the root
 * ErrorBoundary in app/_layout.tsx.
 */

/** Best-effort reporter — must never throw or block. */
export function reportClientError(err: unknown, context: string, fatal: boolean): void {
  void (async () => {
    try {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error && err.stack ? String(err.stack).slice(0, 4000) : null;
      const { data } = await supabase.auth.getSession();
      await supabase.from('client_errors').insert({
        user_id: data.session?.user?.id ?? null,
        message: message.slice(0, 1000) || 'Unknown error',
        stack,
        context: context.slice(0, 200),
        fatal,
        platform: Platform.OS,
      });
    } catch {
      /* the reporter itself must never break anything */
    }
  })();
}

interface RNErrorUtils {
  getGlobalHandler(): ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}

let installed = false;

/** Install once at app start (module scope of the root layout). */
export function installCrashGuard(): void {
  if (installed) return;
  installed = true;
  const utils = (globalThis as { ErrorUtils?: RNErrorUtils }).ErrorUtils;
  if (!utils?.setGlobalHandler) return;
  const previous = utils.getGlobalHandler?.();
  utils.setGlobalHandler((error, isFatal) => {
    reportClientError(error, 'global', !!isFatal);
    if (__DEV__) {
      previous?.(error, isFatal);
      return;
    }
    if (isFatal) {
      // Swallow the fatal: an alert beats the app vanishing mid-task.
      const msg = error instanceof Error ? error.message : String(error);
      try {
        Alert.alert('Something went wrong', `${msg}\n\nThe error was reported to Jamin Bazaar — you can keep using the app.`);
      } catch {
        /* ignore */
      }
      return;
    }
    previous?.(error, isFatal);
  });
}
