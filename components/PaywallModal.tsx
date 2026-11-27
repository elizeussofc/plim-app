import Icone, { type NomeIcone } from '@/components/Icone';
import { Botao } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar } from '@/lib/avisar';
import { iniciarAssinatura, restaurarCompra, type PlanoId } from '@/lib/payments';
import { C, F, R } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

/** Só o que o Pro realmente libera hoje. O que ainda não existe fica em "em breve". */
const BENEFICIOS: { icone: NomeIcone; titulo: string; desc: string }[] = [
  { icone: 'robo', titulo: 'Plim IA', desc: 'Um assistente que entende TDAH para destravar, organizar a cabeça ou só conversar.' },
  { icone: 'parceria', titulo: 'Modo Parceiro', desc: 'Convide alguém de confiança para acompanhar sua rotina de perto.' },
];

const EM_BREVE = 'Em breve no Pro: roupas e acessórios para o avatar e resumo semanal da sua rotina.';

const PLANOS: { id: PlanoId; label: string; preco: string; sub: string; selo?: string }[] = [
  { id: 'anual', label: 'Anual', preco: 'R$ 149', sub: 'por ano · sai a R$ 12,40 por mês', selo: 'economize 38%' },
  { id: 'mensal', label: 'Mensal', preco: 'R$ 19,90', sub: 'por mês' },
];

export default function PaywallModal() {
  const { visivel, origem, fechar } = usePaywallStore();
  const { session } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plano, setPlano] = useState<PlanoId>('anual');

  async function assinar() {
    if (!session?.user?.id) {
      fechar();
      avisar('Entre na sua conta primeiro', 'A assinatura fica ligada à sua conta do Plim.');
      router.push('/(auth)/login');
      return;
    }
    setLoading(true);
    const sucesso = await iniciarAssinatura(plano, session.user.id);
    setLoading(false);
    if (sucesso) {
      fechar();
      // Na web o pagamento continua na página do Stripe; o Pro só vale depois de confirmado.
      if (Platform.OS !== 'web') avisar('👑 Bem-vindo ao Plim Pro!', 'Tudo liberado. Obrigado por apoiar o Plim.');
    } else {
      avisar('Não deu para concluir', 'Nada foi cobrado. Tente de novo em instantes.');
    }
  }

  async function restaurar() {
    setLoading(true);
    const sucesso = await restaurarCompra();
    setLoading(false);
    if (sucesso) {
      fechar();
      avisar('✅ Compra restaurada', 'Seu plano Pro foi reativado.');
    } else {
      avisar('Nenhuma compra encontrada', 'Não achamos assinatura ativa nesta conta.');
    }
  }

  if (!visivel) return null;

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={fechar} accessibilityLabel="Fechar" />
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '92%', overflow: 'hidden' }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          {/* Topo */}
          <View style={{ backgroundColor: C.glass, alignItems: 'center', paddingTop: 18, paddingHorizontal: 20, borderBottomWidth: 2, borderColor: C.borderPrimary }}>
            <Pressable
              onPress={fechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={8}
              style={{ position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 16, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
            >
              <Text style={{ fontFamily: F.displayX, fontSize: 16, color: C.textSub }}>✕</Text>
            </Pressable>
            <Image source={require('../assets/cenas/vitoria.webp')} style={{ width: 190, height: 218 }} resizeMode="contain" accessible={false} />
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icone nome="coroa" tamanho={34} />
              <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 26, color: C.text }}>Plim Pro</Text>
            </View>
            <Text style={{ fontSize: 15, color: C.textSub, marginTop: 4, lineHeight: 22 }}>
              {origem && origem !== 'Plim Pro' ? `${origem} faz parte do Pro.` : 'O Plim continua grátis. O Pro libera o que vai além.'}
            </Text>

            {/* O que libera */}
            <View style={{ gap: 12, marginTop: 18 }}>
              {BENEFICIOS.map((b) => (
                <View key={b.titulo} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, borderBottomWidth: 4, borderColor: C.border, padding: 12 }}>
                  <Icone nome={b.icone} tamanho={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{b.titulo}</Text>
                    <Text style={{ fontSize: 14, color: C.textSub, marginTop: 2, lineHeight: 20 }}>{b.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 10, lineHeight: 19 }}>{EM_BREVE}</Text>

            {/* Planos */}
            <View style={{ gap: 10, marginTop: 20 }} accessibilityRole="radiogroup">
              {PLANOS.map((p) => {
                const ativo = plano === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPlano(p.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={`Plano ${p.label}, ${p.preco} ${p.sub}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ativo ? C.glass : C.surface, borderRadius: R.md, borderWidth: ativo ? 3 : 2, borderBottomWidth: 5, borderColor: ativo ? C.primary : C.border, padding: 14 }}
                  >
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: ativo ? C.primary : C.borderBright, alignItems: 'center', justifyContent: 'center' }}>
                      {ativo && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{p.label}</Text>
                      <Text style={{ fontSize: 13, color: C.textSub }}>{p.sub}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontFamily: F.displayX, fontSize: 20, color: ativo ? C.primaryLight : C.text }}>{p.preco}</Text>
                      {p.selo && <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.accent }}>{p.selo}</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: 18 }}>
              {loading
                ? <View style={{ minHeight: 54, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.primary} /></View>
                : <Botao rotulo={plano === 'anual' ? 'Assinar o plano anual' : 'Assinar o plano mensal'} icone="foguete" onPress={assinar} />}
              <Text style={{ textAlign: 'center', fontSize: 13, color: C.textMuted, marginTop: 8 }}>Cancele quando quiser.</Text>
            </View>

            {Platform.OS !== 'web' && (
              <Pressable onPress={restaurar} disabled={loading} accessibilityRole="button" hitSlop={10} style={{ paddingTop: 14, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, color: C.textSub, textDecorationLine: 'underline' }}>Já assino. Restaurar compra</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
