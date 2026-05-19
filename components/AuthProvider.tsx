import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const { session, loading } = useAuthStore.getState();
    if (loading) return;

    const inAuth = segments[0] === '(auth)';

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/(tabs)');
    }
  }, [useAuthStore((s) => s.session), useAuthStore((s) => s.loading)]);

  return <>{children}</>;
}
