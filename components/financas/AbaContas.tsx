import { CampoTexto, CampoValor, EscolherCategoria, Folha, Linha, TrancaPro } from '@/components/financas/pecas';
import Icone, { type NomeIcone } from '@/components/Icone';
import { Barra, Botao, Peca, Secao, Selo, Vazio } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { hojeLocal } from '@/lib/dia';
import { CATEGORIA_POR_ID, GRATIS, brl, contasDoMes, lerValor, mesDe, nomeDoMes, totalDasContas, type Conta, type ContaDoMes } from '@/lib/financas';
import { somConta, somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { dizer } from '@/stores/falaStore';
import { useFinancasStore } from '@/stores/financasStore';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

const CATEGORIAS_DE_CONTA = ['moradia', 'contas', 'transporte', 'saude', 'educacao', 'assinaturas', 'compras', 'dividas', 'outros'];

function etiqueta(c: ContaDoMes): { texto: string; tinta: 'verde' | 'ouro' | 'laranja' | 'azul' | 'roxo' } {
  if (c.situacao === 'paga') return { texto: 'paga', tinta: 'verde' };
  if (c.situacao === 'atrasada') return { texto: c.dias === -1 ? 'venceu ontem' : `venceu há ${-c.dias} dias`, tinta: 'ouro' };
  if (c.situacao === 'hoje') return { texto: 'vence hoje', tinta: 'laranja' };
  if (c.situacao === 'logo') return { texto: c.dias === 1 ? 'vence amanhã' : `vence em ${c.dias} dias`, tinta: 'laranja' };
  return { texto: `dia ${c.vencimento.slice(8)}`, tinta: 'azul' };
}

/** Aba Contas: o que vence todo mês, o que já foi pago e o que falta. */
export default function AbaContas({ ehPro, aoPedirPro }: { ehPro: boolean; aoPedirPro: (motivo: string) => void }) {
  const { contas, salvarConta, apagarConta, pagarConta } = useFinancasStore();
  const hoje = hojeLocal();
  const mes = mesDe(hoje);
  const [form, setForm] = useState<Conta | 'nova' | null>(null);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [dia, setDia] = useState('');
  const [categoria, setCategoria] = useState('contas');

  const lista = useMemo(() => contasDoMes(contas, mes, hoje), [contas, mes, hoje]);
  const total = totalDasContas(lista);
  const cheio = !ehPro && contas.length >= GRATIS.contas;
  const diaNumero = Math.round(Number(dia));
  const pode = nome.trim().length > 0 && lerValor(valor) > 0 && diaNumero >= 1 && diaNumero <= 31;

  function nova() {
    if (cheio) { aoPedirPro('Contas a pagar sem limite'); return; }
    setForm('nova'); setNome(''); setValor(''); setDia(''); setCategoria('contas');
  }

  function editar(c: Conta) {
    setForm(c); setNome(c.nome); setValor(String(c.valor / 100).replace('.', ',')); setDia(String(c.dia)); setCategoria(c.categoria);
  }

  function salvar() {
    if (!pode || !form) return;
    salvarConta({ nome, valor: lerValor(valor), dia: diaNumero, categoria }, form === 'nova' ? undefined : form.id);
    setForm(null);
    somToque();
  }

  function alternar(c: ContaDoMes) {
    const vaiPagar = c.situacao !== 'paga';
    pagarConta(c.conta.id, mes, hoje, vaiPagar);
    if (vaiPagar) { somConta(); dizer('fin_conta'); } else somToque();
  }

  return (
    <>
      <Peca tinta="azul" estilo={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>Contas de {nomeDoMes(mes)}</Text>
        <Text style={{ fontFamily: F.displayX, fontSize: 30, color: C.text }}>{total.falta > 0 ? `Faltam ${brl(total.falta)}` : contas.length ? 'Tudo pago!' : brl(0)}</Text>
        {contas.length > 0 && (
          <>
            <View style={{ marginVertical: 8 }}><Barra valor={total.total > 0 ? total.pago / total.total : 0} cor={C.success} /></View>
            <Linha rotulo="Já pago" valor={brl(total.pago)} />
            <Linha rotulo="Total do mês" valor={brl(total.total)} />
          </>
        )}
      </Peca>

      <Secao titulo="Suas contas" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{ehPro ? contas.length : `${contas.length} de ${GRATIS.contas}`}</Text>} />

      {lista.length === 0 && <Vazio titulo="Nenhuma conta cadastrada" texto="Cadastre o que vence todo mês: aluguel, luz, internet, fatura. O Plim mostra o que está perto de vencer." />}

      <View style={{ gap: 10, marginBottom: 14 }}>
        {lista.map((c) => {
          const e = etiqueta(c);
          const cat = CATEGORIA_POR_ID[c.conta.categoria];
          const paga = c.situacao === 'paga';
          return (
            <View key={c.conta.id} style={{ backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 2, borderBottomWidth: 5, borderColor: c.situacao === 'atrasada' ? '#F2D98A' : C.border, padding: 12, opacity: paga ? 0.75 : 1 }}>
              <Pressable onPress={() => editar(c.conta)} accessibilityRole="button" accessibilityLabel={`${c.conta.nome}, ${brl(c.conta.valor)}, ${e.texto}. Toque para editar.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icone nome={(cat?.icone ?? 'fin-conta') as NomeIcone} tamanho={38} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 16, color: C.text, textDecorationLine: paga ? 'line-through' : 'none' }}>{c.conta.nome}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 4 }}><Selo texto={e.texto} tinta={e.tinta} /></View>
                </View>
                <Text style={{ fontFamily: F.displayX, fontSize: 17, color: C.text }}>{brl(c.conta.valor, true)}</Text>
              </Pressable>
              <Botao rotulo={paga ? 'Desfazer' : 'Paguei'} cor={paga ? 'claro' : 'verde'} pequeno onPress={() => alternar(c)} estilo={{ marginTop: 10 }} accessibilityLabel={paga ? `Desfazer o pagamento de ${c.conta.nome}` : `Marcar ${c.conta.nome} como paga`} />
            </View>
          );
        })}
      </View>

      <Botao rotulo="Nova conta" cor="suave" onPress={nova} />
      {cheio && <View style={{ marginTop: 12 }}><TrancaPro titulo="Você usou as 3 contas do grátis" texto="No Pro dá para cadastrar todas as contas da casa." aoTocar={() => aoPedirPro('Contas a pagar sem limite')} /></View>}

      <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 14, lineHeight: 19 }}>
        Marcar "Paguei" anota o gasto no mês sozinho. O Plim não paga conta nem acessa seu banco: ele só ajuda a lembrar.
      </Text>

      <Folha titulo={form === 'nova' ? 'Nova conta' : 'Editar conta'} visivel={!!form} aoFechar={() => setForm(null)}>
        <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} exemplo="Ex.: Aluguel" />
        <CampoValor rotulo="Valor de todo mês" valor={valor} aoMudar={setValor} dica="Se muda todo mês, ponha a média." />
        <CampoTexto rotulo="Dia do vencimento (1 a 31)" valor={dia} aoMudar={(t) => setDia(t.replace(/\D/g, '').slice(0, 2))} exemplo="10" numero max={2} />
        <EscolherCategoria tipo="gasto" valor={categoria} aoEscolher={setCategoria} so={CATEGORIAS_DE_CONTA} />
        <Botao rotulo="Guardar" onPress={salvar} disabled={!pode} />
        {form && form !== 'nova' && (
          <Botao rotulo="Apagar esta conta" cor="claro" pequeno estilo={{ marginTop: 10 }} onPress={() => { const c = form; confirmar('Apagar a conta', `${c.nome} sai da lista. Os gastos já anotados continuam no mês.`, 'Apagar', () => { apagarConta(c.id); setForm(null); }); }} />
        )}
      </Folha>
    </>
  );
}
