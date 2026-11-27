import AbaContas from '@/components/financas/AbaContas';
import AbaCrescer from '@/components/financas/AbaCrescer';
import AbaMes from '@/components/financas/AbaMes';
import AbaPlanos from '@/components/financas/AbaPlanos';
import { Cabecalho, Selo } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { useFinancasStore } from '@/stores/financasStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Aba = 'mes' | 'contas' | 'planos' | 'crescer';
const ABAS: { id: Aba; nome: string }[] = [{ id: 'mes', nome: 'Mês' }, { id: 'contas', nome: 'Contas' }, { id: 'planos', nome: 'Planos' }, { id: 'crescer', nome: 'Crescer' }];

/** Finanças do Plim: anotar o mês, lembrar das contas, planejar e fazer o dinheiro crescer. */
export default function FinancasScreen() {
  const carregado = useFinancasStore((s) => s.carregado);
  const temDados = useFinancasStore((s) => s.lancamentos.length + s.contas.length + s.metas.length + s.dividas.length + s.bens.length > 0);
  const apagarTudo = useFinancasStore((s) => s.apagarTudo);
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const [aba, setAba] = useState<Aba>('mes');

  if (!carregado) return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Cabecalho titulo="Finanças" icone="fin-cofre" sub="Seu dinheiro, sem susto" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 18 }} accessibilityRole="tablist">
          {ABAS.map((a) => {
            const ativo = aba === a.id;
            return (
              <Pressable key={a.id} onPress={() => { setAba(a.id); somToque(); }} accessibilityRole="tab" accessibilityState={{ selected: ativo }} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: ativo ? C.primary : C.surface, borderWidth: 2, borderBottomWidth: 5, borderColor: ativo ? C.primaryDim : C.border }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: ativo ? C.onPrimary : C.textSub }}>{a.nome}</Text>
              </Pressable>
            );
          })}
        </View>

        {aba === 'mes' && <AbaMes ehPro={ehPro} aoPedirPro={abrirPaywall} />}
        {aba === 'contas' && <AbaContas ehPro={ehPro} aoPedirPro={abrirPaywall} />}
        {aba === 'planos' && <AbaPlanos ehPro={ehPro} aoPedirPro={abrirPaywall} />}
        {aba === 'crescer' && <AbaCrescer ehPro={ehPro} aoPedirPro={abrirPaywall} />}

        <View style={{ marginTop: 26, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 }}>
            🔒 Seus números ficam guardados só neste aparelho. O Plim não acessa seu banco e não envia esses dados para lugar nenhum.
          </Text>
          {temDados && (
            <Pressable onPress={() => confirmar('Apagar as Finanças', 'Lançamentos, contas, metas, dívidas e patrimônio são apagados deste aparelho de vez.', 'Apagar tudo', apagarTudo)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, color: C.textSub, textDecorationLine: 'underline' }}>Apagar todos os meus números</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
