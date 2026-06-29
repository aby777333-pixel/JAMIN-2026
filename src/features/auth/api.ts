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

/** Email + password sign-in (for staff/test/role accounts; OTP remains the default). */
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
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

/**
 * Self-service profile edit (name / phone / designation / photo). These columns are
 * NOT protected by the guard_profile_columns trigger, so a direct RLS-scoped update
 * is fine — role/hierarchy/kyc stay locked. Drives the Business Card + brochures.
 */
export async function updateMyProfile(input: {
  fullName?: string;
  phone?: string;
  designation?: string;
  photoUrl?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in');
  const patch: {
    full_name?: string | null;
    phone?: string | null;
    designation?: string | null;
    photo_url?: string | null;
  } = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName.trim() || null;
  if (input.phone !== undefined) patch.phone = input.phone.trim() || null;
  if (input.designation !== undefined) patch.designation = input.designation.trim() || null;
  if (input.photoUrl !== undefined) patch.photo_url = input.photoUrl.trim() || null;
  const { error } = await supabase.from('profiles').update(patch).eq('id', auth.user.id);
  if (error) throw error;
}
