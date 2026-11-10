import { Platform } from 'react-native';
import { useUserStore } from '@/stores/userStore';

export type PlanoId = 'mensal' | 'anual';

// IDs dos produtos — configurar no RevenueCat e Stripe
export const RC_ENTITLEMENT = 'Plim Pro';
export const RC_PACKAGE_MENSAL = 'plim_mensal';
export const RC_PACKAGE_ANUAL = 'plim_anual';

const ADMIN_URL = 'https://plim-admin.vercel.app';

// Chaves públicas do SDK do RevenueCat (podem ficar no app).
// ATENÇÃO: a chave iOS abaixo é de TESTE — trocar pela chave `appl_...` antes de publicar na App Store.
const RC_KEY_IOS = process.env.EXPO_PUBLIC_RC_KEY_IOS ?? 'test_YWBUdIQtLKNfmunQBMZGDrSaRnc';
const RC_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_KEY_ANDROID ?? 'goog_EfwRlQSSEexvVTJEXMHoDWqwDQH';

// ── Configuração única do RevenueCat (mobile) ──────────────────────────────
let _rcPronto: Promise<boolean> | null = null;
export function configurarRevenueCat(): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(false);
  if (!_rcPronto) {
    _rcPronto = (async () => {
      try {
        const { default: Purchases, LOG_LEVEL } = await import('react-native-purchases');
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.WARN);
        Purchases.configure({ apiKey: Platform.OS === 'ios' ? RC_KEY_IOS : RC_KEY_ANDROID });
        return true;
      } catch {
        return false;
      }
    })();
  }
  return _rcPronto;
}

// ── Ao entrar na conta: vincula o usuário e confere a assinatura na loja ───
// A assinatura validada pelo RevenueCat é a fonte da verdade no celular.
export async function sincronizarPro(userId: string): Promise<boolean> {
  if (!(await configurarRevenueCat())) return false;
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo.entitlements.active[RC_ENTITLEMENT] !== undefined;
  } catch {
    return false;
  }
}

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
    if (!(await configurarRevenueCat())) throw new Error('RevenueCat indisponível');
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
