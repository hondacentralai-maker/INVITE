import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { ensureUserProfile, supabase } from './supabase';
import type { Profile } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const PIN_AUTH_URL = `${supabaseUrl}/functions/v1/marasim-pin-auth`;

interface SignUpPhoneParams {
  phone: string;
  password: string;
  pin: string;
  fullName: string;
}

interface RecoverPasswordParams {
  phone: string;
  pin: string;
  newPassword: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPhone: (params: SignUpPhoneParams) => Promise<{ error: string | null }>;
  recoverPasswordWithPin: (params: RecoverPasswordParams) => Promise<{ error: string | null }>;
  updateRecoveryPin: (phone: string, pin: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function callPinAuthEndpoint(
  body: Record<string, unknown>,
  accessToken?: string,
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  try {
    const res = await fetch(PIN_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${accessToken || supabasePublishableKey}`,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return { data: null, error: String(json.error || 'Authentication failed') };
    }
    return { data: json, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }
    const preferredLang = localStorage.getItem('marasim_lang') === 'en' ? 'en' : 'ar';
    const fullName = (u.user_metadata?.full_name as string | undefined) ?? undefined;
    const p = await ensureUserProfile(u.id, u.email, fullName, preferredLang);
    setProfile(p);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      await loadProfile(data.session?.user ?? null);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const applyReturnedSession = useCallback(
    async (returnedSession: { access_token?: string; refresh_token?: string } | undefined) => {
      if (!returnedSession?.access_token || !returnedSession?.refresh_token) return;
      const { data } = await supabase.auth.setSession({
        access_token: returnedSession.access_token,
        refresh_token: returnedSession.refresh_token,
      });
      if (data.session?.user) {
        await loadProfile(data.session.user);
      }
    },
    [loadProfile],
  );

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const trimmed = identifier.trim();
      // Fast path if email address is entered directly
      if (trimmed.includes('@')) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (!error && data.user) {
          await loadProfile(data.user);
          return { error: null };
        }
        return { error: error?.message || 'بيانات الدخول غير صحيحة' };
      }

      const { data, error } = await callPinAuthEndpoint({
        action: 'signin',
        identifier: trimmed,
        password,
      });
      if (error || !data) return { error: error || 'بيانات الدخول غير صحيحة' };

      await applyReturnedSession(
        data.session as { access_token?: string; refresh_token?: string } | undefined,
      );
      return { error: null };
    },
    [applyReturnedSession, loadProfile],
  );

  const signUpWithPhone = useCallback(
    async ({ phone, password, pin, fullName }: SignUpPhoneParams) => {
      const preferredLang = localStorage.getItem('marasim_lang') === 'en' ? 'en' : 'ar';
      const { data, error } = await callPinAuthEndpoint({
        action: 'signup',
        phone,
        password,
        pin,
        fullName,
        lang: preferredLang,
      });
      if (error || !data) return { error: error || 'تعذر إنشاء الحساب' };

      await applyReturnedSession(
        data.session as { access_token?: string; refresh_token?: string } | undefined,
      );
      return { error: null };
    },
    [applyReturnedSession],
  );

  const recoverPasswordWithPin = useCallback(
    async ({ phone, pin, newPassword }: RecoverPasswordParams) => {
      const { data, error } = await callPinAuthEndpoint({
        action: 'recover',
        phone,
        pin,
        newPassword,
      });
      if (error || !data) return { error: error || 'تعذر استرجاع كلمة المرور' };

      await applyReturnedSession(
        data.session as { access_token?: string; refresh_token?: string } | undefined,
      );
      return { error: null };
    },
    [applyReturnedSession],
  );

  const updateRecoveryPin = useCallback(
    async (phone: string, pin: string) => {
      if (!session?.access_token) return { error: 'Not authenticated' };
      const { error } = await callPinAuthEndpoint(
        { action: 'set_pin', phone, pin },
        session.access_token,
      );
      if (error) return { error };
      await loadProfile(session.user);
      return { error: null };
    },
    [loadProfile, session],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadProfile(session.user);
    }
  }, [session, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin: profile?.role === 'admin' && profile.is_active,
      isStaff: (profile?.role === 'admin' || profile?.role === 'moderator') && profile.is_active,
      signIn,
      signUpWithPhone,
      recoverPasswordWithPin,
      updateRecoveryPin,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      signIn,
      signUpWithPhone,
      recoverPasswordWithPin,
      updateRecoveryPin,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
