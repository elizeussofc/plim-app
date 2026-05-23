import { Platform } from 'react-native';
import { useUserStore } from '@/stores/userStore';

export type PlanoId = 'mensal' | 'anual';

// IDs dos produtos — configurar no RevenueCat e Stripe
export const RC_ENTITLEMENT = 'Plim Pro';
export const RC_PACKAGE_MENSAL = 'plim_mensal';
export const RC_PACKAGE_ANUAL = 'plim_anual';

const ADMIN_URL = 'https://plim-admin.vercel.app';

// ── Web: Stripe Checkout ───────────────────────────────────────────────────
async function assinarStripe(planoId: PlanoId, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${ADMIN_URL}/api/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planoId, userId }),
    });
    if (!res.ok) throw new Error('Erro ao criar sessão');
    const { url } = await res.json();
    if (url) window.location.href = url;
    return true;
  } catch (e) {
    console.error('[Stripe] erro:', e);
    return false;
  }
}

// ── Mobile: RevenueCat ─────────────────────────────────────────────────────
async function assinarRevenueCat(planoId: PlanoId, userId: string): Promise<boolean> {
  try {
    const { default: Purchases } = await import('react-native-purchases');

    // Vincula o userId do Supabase ao RevenueCat
    await Purchases.logIn(userId);

    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    if (!offering) throw new Error('Nenhuma oferta disponível');

    const pkg = planoId === 'anual'
      ? offering.annual ?? offering.availablePackages.find((p) => p.identifier === RC_PACKAGE_ANUAL)
      : offering.monthly ?? offering.availablePackages.find((p) => p.identifier === RC_PACKAGE_MENSAL);

    if (!pkg) throw new Error(`Pacote ${planoId} não encontrado`);

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = customerInfo.entitlements.active[RC_ENTITLEMENT] !== undefined;

    if (isPro) {
      useUserStore.getState().updateProfile({ plano: 'pro' });
      return true;
    }
    return false;
  } catch (e: unknown) {
    // Usuário cancelou — não é erro
    if (typeof e === 'object' && e !== null && 'userCancelled' in e && (e as { userCancelled: boolean }).userCancelled) return false;
    console.error('[RevenueCat] erro:', e);
    return false;
  }
}

// ── Restaurar compra (mobile) ──────────────────────────────────────────────
export async function restaurarCompra(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[RC_ENTITLEMENT] !== undefined;
    if (isPro) useUserStore.getState().updateProfile({ plano: 'pro' });
    return isPro;
  } catch {
    return false;
  }
}

// ── Verificar status atual (mobile) ───────────────────────────────────────
export async function verificarStatusPro(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[RC_ENTITLEMENT] !== undefined;
  } catch {
    return false;
  }
}

// ── Ponto de entrada principal ─────────────────────────────────────────────
export async function iniciarAssinatura(planoId: PlanoId, userId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return assinarStripe(planoId, userId);
  }
  return assinarRevenueCat(planoId, userId);
}
