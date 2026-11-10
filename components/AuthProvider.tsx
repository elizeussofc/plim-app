import { sincronizarPro } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useEffect } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setLoading } = useAuthStore();
  const { loadFromSupabase, resetProfile } = useUserStore();

  // Carrega o perfil do servidor e depois confere a assinatura na loja (mobile).
  async function carregarUsuario(userId: string) {
    await loadFromSupabase(userId);
    if (await sincronizarPro(userId)) {
      useUserStore.getState().updateProfile({ plano: 'pro' });
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) carregarUsuario(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        carregarUsuario(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        resetProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sem redirect — app é aberto por padrão. Login só pedido ao ativar Pro.
  return <>{children}</>;
}
