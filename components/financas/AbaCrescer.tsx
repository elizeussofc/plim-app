import { CampoTexto, CampoValor, Folha, Linha, Opcoes, TrancaPro } from '@/components/financas/pecas';
import Icone, { type NomeIcone } from '@/components/Icone';
import { Botao, Peca, PecaBotao, Secao, Selo } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { brl, lerValor, ordemDeQuitacao, patrimonioLiquido, projetar, simularQuitacao, type Bem, type Divida, type Metodo } from '@/lib/financas';
import { AVISO_FINANCAS, PASSOS, TAXAS_DE_EXEMPLO } from '@/lib/financasGuia';
import { somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { useFinancasStore } from '@/stores/financasStore';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

const emTexto = (centavos: number) => (centavos ? String(centavos / 100).replace('.', ',') : '');
const tempo = (meses: number) => {
  if (!Number.isFinite(meses)) return 'nunca, nesse ritmo';
  if (meses < 12) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}${resto ? ` e ${resto} ${resto === 1 ? 'mês' : 'meses'}` : ''}`;
};

/** Aba Crescer: o caminho para o dinheiro render, patrimônio, saída das dívidas e simulador. */
export default function AbaCrescer({ ehPro, aoPedirPro }: { ehPro: boolean; aoPedirPro: (motivo: string) => void }) {
  const { metas, dividas, bens, salvarDivida, apagarDivida, salvarBem, apagarBem } = useFinancasStore();
  const [aberto, setAberto] = useState<number | null>(0);

  // Dívidas
  const [formDivida, setFormDivida] = useState<Divida | 'nova' | null>(null);
  const [dNome, setDNome] = useState('');
  const [dSaldo, setDSaldo] = useState('');
  const [dJuros, setDJuros] = useState('');
  const [dMinimo, setDMinimo] = useState('');
  const [metodo, setMetodo] = useState<Metodo>('avalanche');
  const [extra, setExtra] = useState('');

  // Bens
  const [formBem, setFormBem] = useState<Bem | 'novo' | null>(null);
  const [bNome, setBNome] = useState('');
  const [bValor, setBValor] = useState('');

  // Simulador
  const [aporte, setAporte] = useState('200');
  const [anos, setAnos] = useState(5);
  const [taxa, setTaxa] = useState(10);

  const guardadoEmMetas = metas.reduce((s, m) => s + m.guardado, 0);
  const pat = patrimonioLiquido(bens, dividas, guardadoEmMetas);
  const ordem = useMemo(() => ordemDeQuitacao(dividas, metodo), [dividas, metodo]);
  const sim = useMemo(() => simularQuitacao(dividas, lerValor(extra), metodo), [dividas, extra, metodo]);
  const outra = useMemo(() => simularQuitacao(dividas, lerValor(extra), metodo === 'avalanche' ? 'bola-de-neve' : 'avalanche'), [dividas, extra, metodo]);
  const semExtra = useMemo(() => simularQuitacao(dividas, 0, metodo), [dividas, metodo]);
  const proj = projetar(0, lerValor(aporte), taxa, anos * 12);
  const jurosNumero = Number(dJuros.replace(',', '.'));
  const podeDivida = dNome.trim().length > 0 && lerValor(dSaldo) > 0 && Number.isFinite(jurosNumero) && jurosNumero >= 0;

  function novaDivida() { setFormDivida('nova'); setDNome(''); setDSaldo(''); setDJuros(''); setDMinimo(''); }
  function editarDivida(d: Divida) { setFormDivida(d); setDNome(d.nome); setDSaldo(emTexto(d.saldo)); setDJuros(String(d.jurosMes).replace('.', ',')); setDMinimo(emTexto(d.minimo)); }
  function gravarDivida() {
    if (!formDivida || !podeDivida) return;
    salvarDivida({ nome: dNome, saldo: lerValor(dSaldo), jurosMes: jurosNumero, minimo: lerValor(dMinimo) }, formDivida === 'nova' ? undefined : formDivida.id);
    setFormDivida(null); somToque();
  }

  function novoBem() { setFormBem('novo'); setBNome(''); setBValor(''); }
  function editarBem(b: Bem) { setFormBem(b); setBNome(b.nome); setBValor(emTexto(b.valor)); }
  function gravarBem() {
    if (!formBem || !bNome.trim() || lerValor(bValor) <= 0) return;
    salvarBem({ nome: bNome, valor: lerValor(bValor) }, formBem === 'novo' ? undefined : formBem.id);
    setFormBem(null); somToque();
  }

  return (
    <>
      {/* Guia: aberto para todo mundo */}
      <Secao titulo="A ordem que protege o seu dinheiro" />
      <View style={{ gap: 8, marginBottom: 20 }}>
        {PASSOS.map((p, i) => {
          const ativo = aberto === i;
          return (
            <PecaBotao key={p.titulo} padding={12} tinta={ativo ? 'roxo' : undefined} onPress={() => setAberto(ativo ? null : i)} accessibilityState={{ expanded: ativo }} accessibilityLabel={`${p.titulo}. ${p.resumo}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icone nome={p.icone as NomeIcone} tamanho={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{p.titulo}</Text>
                  <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>{p.resumo}</Text>
                </View>
                <Text style={{ fontFamily: F.displayX, fontSize: 16, color: C.textMuted }}>{ativo ? '▴' : '▾'}</Text>
              </View>
              {ativo && p.pontos.map((t, k) => <Text key={k} style={{ fontSize: 15, color: C.text, lineHeight: 22, marginTop: 10 }}>· {t}</Text>)}
            </PecaBotao>
          );
        })}
      </View>

      {/* Patrimônio */}
      <Secao titulo="Seu patrimônio" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />
      {ehPro ? (
        <Peca tinta={pat.liquido < 0 ? 'ouro' : 'verde'} estilo={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>O que você tem menos o que você deve</Text>
          <Text style={{ fontFamily: F.displayX, fontSize: 32, color: C.text }}>{brl(pat.liquido, true)}</Text>
          <View style={{ marginTop: 8 }}>
            <Linha rotulo="Guardado nas metas" valor={brl(guardadoEmMetas, true)} />
            {bens.map((b) => (
              <Pressable key={b.id} onPress={() => editarBem(b)} accessibilityRole="button" accessibilityLabel={`${b.nome}: ${brl(b.valor, true)}. Toque para editar.`}>
                <Linha rotulo={b.nome} valor={brl(b.valor, true)} />
              </Pressable>
            ))}
            {pat.deve > 0 && <Linha rotulo="Dívidas" valor={`− ${brl(pat.deve, true).replace('R$ ', 'R$ ')}`} cor={C.accentDim} />}
          </View>
          <Botao rotulo="Somar algo que você tem" cor="claro" pequeno onPress={novoBem} estilo={{ marginTop: 10 }} />
          <Text style={{ fontSize: 13, color: C.textSub, marginTop: 8, lineHeight: 19 }}>Conta, investimentos, carro, casa. Atualize de vez em quando e veja o número subir.</Text>
        </Peca>
      ) : (
        <TrancaPro titulo="Quanto você tem de verdade" texto="Some o que é seu, desconte o que deve e acompanhe o patrimônio crescer." aoTocar={() => aoPedirPro('Acompanhar o patrimônio')} />
      )}

      {/* Dívidas */}
      <Secao titulo="Plano para sair das dívidas" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />
      {ehPro ? (
        <View style={{ marginBottom: 20 }}>
          {dividas.length === 0 ? (
            <Peca padding={14} estilo={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>Cadastre cada dívida com o saldo, os juros ao mês e a parcela mínima. O Plim mostra em que ordem pagar e quando você fica livre.</Text>
            </Peca>
          ) : (
            <>
              <Opcoes rotulo="Estratégia" valor={metodo} aoEscolher={setMetodo} opcoes={[{ id: 'avalanche', nome: 'Juro mais alto primeiro' }, { id: 'bola-de-neve', nome: 'Menor dívida primeiro' }]} />
              <Text style={{ fontSize: 13, color: C.textSub, marginTop: -6, marginBottom: 12, lineHeight: 19 }}>
                {metodo === 'avalanche' ? 'Paga menos juros no total. É a conta mais barata.' : 'Quita uma dívida logo e dá ânimo para seguir. Pode custar um pouco mais.'}
              </Text>
              <View style={{ gap: 8, marginBottom: 12 }}>
                {ordem.map((d, i) => (
                  <Pressable key={d.id} onPress={() => editarDivida(d)} accessibilityRole="button" accessibilityLabel={`${i + 1}ª a atacar: ${d.nome}, ${brl(d.saldo, true)}, ${String(d.jurosMes).replace('.', ',')}% ao mês. Toque para editar.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: i === 0 ? C.accentSoft : C.surface, borderRadius: R.md, borderWidth: 2, borderColor: i === 0 ? '#FBC9A0' : C.border, padding: 12 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: i === 0 ? C.accent : C.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.displayX, fontSize: 16, color: i === 0 ? C.onPrimary : C.textSub }}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{d.nome}</Text>
                      <Text style={{ fontSize: 13, color: C.textSub }}>{String(d.jurosMes).replace('.', ',')}% ao mês · mínimo {brl(d.minimo, true)}{Number.isFinite(sim.meses) && sim.fim[d.id] ? ` · acaba em ${tempo(sim.fim[d.id])}` : ''}</Text>
                    </View>
                    <Text style={{ fontFamily: F.displayX, fontSize: 16, color: C.text }}>{brl(d.saldo, true)}</Text>
                  </Pressable>
                ))}
              </View>
              <CampoValor rotulo="Quanto a mais você consegue pagar por mês?" valor={extra} aoMudar={setExtra} dica="Além das parcelas mínimas." />
              <Peca tinta={Number.isFinite(sim.meses) ? 'verde' : 'ouro'} padding={14} estilo={{ marginBottom: 10 }}>
                {Number.isFinite(sim.meses) ? (
                  <>
                    <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>Você fica livre em</Text>
                    <Text style={{ fontFamily: F.displayX, fontSize: 26, color: C.text }}>{tempo(sim.meses)}</Text>
                    <Linha rotulo="Juros até lá" valor={brl(sim.juros, true)} />
                    {lerValor(extra) > 0 && Number.isFinite(semExtra.meses) && semExtra.meses > sim.meses && (
                      <Text style={{ fontSize: 14, color: C.text, marginTop: 6, lineHeight: 20 }}>O valor a mais adianta {tempo(semExtra.meses - sim.meses)} e poupa {brl(semExtra.juros - sim.juros, true)} de juros.</Text>
                    )}
                    {lerValor(extra) > 0 && !Number.isFinite(semExtra.meses) && <Text style={{ fontSize: 14, color: C.text, marginTop: 6, lineHeight: 20 }}>Só com o mínimo essa dívida não acabaria. É o valor a mais que faz ela diminuir.</Text>}
                    {Number.isFinite(outra.meses) && outra.juros !== sim.juros && (
                      <Text style={{ fontSize: 13, color: C.textSub, marginTop: 6, lineHeight: 19 }}>
                        Na outra estratégia: {tempo(outra.meses)}, com {brl(Math.abs(outra.juros - sim.juros), true)} {outra.juros > sim.juros ? 'a mais' : 'a menos'} de juros.
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>Nesse ritmo, a dívida não diminui</Text>
                    <Text style={{ fontSize: 15, color: C.text, marginTop: 4, lineHeight: 22 }}>Os juros do mês são maiores do que o pagamento. Vale negociar com o banco, pedir a portabilidade para um juro menor ou aumentar o valor mensal.</Text>
                  </>
                )}
              </Peca>
            </>
          )}
          <Botao rotulo="Cadastrar dívida" cor="suave" onPress={novaDivida} />
        </View>
      ) : (
        <TrancaPro titulo="Quando você fica livre das dívidas" texto="A ordem certa para pagar, a data em que tudo acaba e quanto de juros um valor a mais por mês economiza." aoTocar={() => aoPedirPro('Plano para sair das dívidas')} />
      )}

      {/* Simulador */}
      <Secao titulo="Quanto vira guardar todo mês" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />
      {ehPro ? (
        <Peca padding={14} estilo={{ marginBottom: 20 }}>
          <CampoValor rotulo="Guardando por mês" valor={aporte} aoMudar={setAporte} />
          <Opcoes rotulo="Durante" valor={anos} aoEscolher={setAnos} opcoes={[1, 3, 5, 10, 20].map((a) => ({ id: a, nome: `${a} ${a === 1 ? 'ano' : 'anos'}` }))} />
          <Opcoes rotulo="Rendendo ao ano (exemplo)" valor={taxa} aoEscolher={setTaxa} opcoes={TAXAS_DE_EXEMPLO.map((t) => ({ id: t, nome: t === 0 ? 'parado' : `${t}%` }))} />
          <View style={{ backgroundColor: C.successSoft, borderRadius: 16, padding: 14 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>Você teria</Text>
            <Text style={{ fontFamily: F.displayX, fontSize: 28, color: C.text }}>{brl(proj.total, true)}</Text>
            <Linha rotulo="Saiu do seu bolso" valor={brl(proj.guardado, true)} />
            <Linha rotulo="Veio de rendimento" valor={brl(proj.rendimento, true)} cor={C.successDim} />
          </View>
          <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 10, lineHeight: 19 }}>
            Conta de exemplo, sem imposto, sem inflação e com a taxa parada o tempo todo. Serve para comparar cenários, não para prever o futuro.
          </Text>
        </Peca>
      ) : (
        <TrancaPro titulo="Simule o seu futuro" texto="Veja quanto um valor guardado todo mês vira em 1, 5 ou 20 anos, e quanto disso é rendimento." aoTocar={() => aoPedirPro('Simulador de quanto vira guardar')} />
      )}

      <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 19 }}>{AVISO_FINANCAS}</Text>

      <Folha titulo={formDivida === 'nova' ? 'Cadastrar dívida' : 'Editar dívida'} visivel={!!formDivida} aoFechar={() => setFormDivida(null)}>
        <CampoTexto rotulo="Qual dívida?" valor={dNome} aoMudar={setDNome} exemplo="Ex.: Cartão do banco" />
        <CampoValor rotulo="Quanto você deve hoje" valor={dSaldo} aoMudar={setDSaldo} />
        <CampoTexto rotulo="Juros ao mês (%)" valor={dJuros} aoMudar={setDJuros} exemplo="Ex.: 8,5" numero max={5} />
        <Text style={{ fontSize: 13, color: C.textSub, marginTop: -8, marginBottom: 14, lineHeight: 19 }}>Está no contrato, na fatura ou no aplicativo do banco, como "taxa de juros" ou "CET". Se só achar a taxa ao ano, divida por 12 para ter uma ideia.</Text>
        <CampoValor rotulo="Parcela mínima do mês" valor={dMinimo} aoMudar={setDMinimo} />
        <Botao rotulo="Guardar" onPress={gravarDivida} disabled={!podeDivida} />
        {formDivida && formDivida !== 'nova' && (
          <Botao rotulo="Apagar esta dívida" cor="claro" pequeno estilo={{ marginTop: 10 }} onPress={() => { const d = formDivida; confirmar('Apagar a dívida', `${d.nome} sai do plano.`, 'Apagar', () => { apagarDivida(d.id); setFormDivida(null); }); }} />
        )}
      </Folha>

      <Folha titulo={formBem === 'novo' ? 'Algo que você tem' : 'Editar'} visivel={!!formBem} aoFechar={() => setFormBem(null)}>
        <CampoTexto rotulo="O quê?" valor={bNome} aoMudar={setBNome} exemplo="Ex.: Conta no banco, carro" />
        <CampoValor rotulo="Quanto vale hoje" valor={bValor} aoMudar={setBValor} />
        <Botao rotulo="Guardar" onPress={gravarBem} disabled={!bNome.trim() || lerValor(bValor) <= 0} />
        {formBem && formBem !== 'novo' && (
          <Botao rotulo="Apagar" cor="claro" pequeno estilo={{ marginTop: 10 }} onPress={() => { const b = formBem; confirmar('Apagar', `${b.nome} sai do seu patrimônio.`, 'Apagar', () => { apagarBem(b.id); setFormBem(null); }); }} />
        )}
      </Folha>
    </>
  );
}
