import { supabase } from '@/lib/supabase';

/**
 * Email OTP flow (SuperPrompt §4, D2: email OTP mandatory).
 * Requires the Supabase "Magic Link"/"OTP" email template to include the
 * {{ .Token }} variable so users receive a 6-digit code. shouldCreateUser
 * makes first-time sign-in == sign-up (frictionless onboarding).
 */
export async function sendEmailOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  return data;
}

/**
 * Upsert the caller's profile + bind referral. The DB does the heavy lifting:
 * referral binding, hierarchy_path placement and referral_code generation all
 * happen in a SECURITY DEFINER RPC so RLS can stay strict (§4, §13).
 */
export async function completeProfile(input: {
  fullName: string;
  phone: string;
  referralCode?: string;
}) {
  const { error } = await supabase.rpc('complete_onboarding', {
    p_full_name: input.fullName.trim(),
    p_phone: input.phone.trim(),
    p_referral_code: input.referralCode?.trim() || undefined,
  });
  if (error) throw error;
}
