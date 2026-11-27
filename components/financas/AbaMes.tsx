import { CampoTexto, CampoValor, EscolherCategoria, Folha, Linha, Opcoes, TrancaPro } from '@/components/financas/pecas';
import Icone, { type NomeIcone } from '@/components/Icone';
import { Barra, Botao, Peca, Secao, Vazio } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { diasAntes, hojeLocal } from '@/lib/dia';
import { CATEGORIA_POR_ID, GRATIS, brl, contasDoMes, dicasDoMes, lerValor, maioresGastos, mesDe, mesVizinho, nomeDoMes, resumoDoMes, situacaoDoTeto, type Dica, type Tipo } from '@/lib/financas';
import { somEstourou, somGasto, somMoeda } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { dizer } from '@/stores/falaStore';
import { useFinancasStore } from '@/stores/financasStore';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

const COR_DICA: Record<Dica['tom'], 'verde' | 'ouro' | 'roxo'> = { bom: 'verde', atencao: 'ouro', ideia: 'roxo' };

/** Aba Mês: quanto entrou, quanto saiu, para onde foi, e o botão de anotar. */
export default function AbaMes({ ehPro, aoPedirPro }: { ehPro: boolean; aoPedirPro: (motivo: string) => void }) {
  const { lancamentos, contas, metas, dividas, tetos, anotar, apagarLancamento } = useFinancasStore();
  const hoje = hojeLocal();
  const mesAtual = mesDe(hoje);
  const [mes, setMes] = useState(mesAtual);
  const [form, setForm] = useState<Tipo | null>(null);
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('mercado');
  const [descricao, setDescricao] = useState('');
  const [quando, setQuando] = useState(0);
  const [verTodas, setVerTodas] = useState(false);

  const resumo = useMemo(() => resumoDoMes(lancamentos, mes), [lancamentos, mes]);
  const doMes = useMemo(() => lancamentos.filter((l) => mesDe(l.data) === mes).sort((a, b) => b.data.localeCompare(a.data)), [lancamentos, mes]);
  const dicas = useMemo(() => dicasDoMes({ resumo, tetos: ehPro ? tetos : {}, contas: contasDoMes(contas, mes, hoje), metas, dividas: ehPro ? dividas : [] }), [resumo, tetos, contas, metas, dividas, mes, hoje, ehPro]);
  const maiores = maioresGastos(resumo, 5);
  const centavos = lerValor(valor);

  function abrir(tipo: Tipo) {
    setForm(tipo);
    setValor('');
    setDescricao('');
    setQuando(0);
    setCategoria(tipo === 'gasto' ? 'mercado' : 'salario');
  }

  function mudarMes(passo: number) {
    const novo = mesVizinho(mes, passo);
    if (novo > mesAtual) return;
    if (!ehPro && novo < mesAtual) { aoPedirPro('Ver os meses anteriores'); return; }
    setMes(novo);
  }

  function salvar() {
    if (!form || centavos <= 0) return;
    const antes = resumo.porCategoria[categoria] ?? 0;
    anotar({ tipo: form, valor: centavos, categoria, descricao, data: diasAntes(hoje, quando) });
    setForm(null);
    if (form === 'ganho') { somMoeda(); dizer('fin_ganho'); return; }
    const teto = ehPro ? tetos[categoria] ?? 0 : 0;
    const estourouAgora = teto > 0 && situacaoDoTeto(antes, teto) !== 'estourou' && situacaoDoTeto(antes + centavos, teto) === 'estourou';
    if (estourouAgora) { somEstourou(); dizer('fin_estourou'); } else { somGasto(); dizer('fin_gasto'); }
  }

  const mostradas = verTodas && ehPro ? dicas : dicas.slice(0, GRATIS.dicas);

  return (
    <>
      {/* Troca de mês */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable onPress={() => mudarMes(-1)} accessibilityRole="button" accessibilityLabel={`Mês anterior${ehPro ? '' : '. Faz parte do Plim Pro.'}`} style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: C.surface, borderWidth: 2, borderBottomWidth: 4, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textSub }}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 18, color: C.text }}>{nomeDoMes(mes)}</Text>
        <Pressable onPress={() => mudarMes(1)} disabled={mes >= mesAtual} accessibilityRole="button" accessibilityLabel="Próximo mês" style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: C.surface, borderWidth: 2, borderBottomWidth: 4, borderColor: C.border, alignItems: 'center', justifyContent: 'center', opacity: mes >= mesAtual ? 0.35 : 1 }}>
          <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textSub }}>›</Text>
        </Pressable>
      </View>

      {/* Saldo */}
      <Peca tinta={resumo.saldo < 0 ? 'ouro' : 'verde'} estilo={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>{resumo.saldo < 0 ? 'Saiu mais do que entrou' : 'Sobrou neste mês'}</Text>
        <Text style={{ fontFamily: F.displayX, fontSize: 34, color: C.text }}>{brl(resumo.saldo)}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 10 }}>
            <Text style={{ fontSize: 13, color: C.textSub }}>Entrou</Text>
            <Text style={{ fontFamily: F.display, fontSize: 17, color: C.successDim }}>{brl(resumo.ganhos)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 10 }}>
            <Text style={{ fontSize: 13, color: C.textSub }}>Saiu</Text>
            <Text style={{ fontFamily: F.display, fontSize: 17, color: C.accentDim }}>{brl(resumo.gastos)}</Text>
          </View>
        </View>
      </Peca>

      {mes === mesAtual && (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          <Botao rotulo="Anotar gasto" cor="laranja" onPress={() => abrir('gasto')} estilo={{ flex: 1 }} />
          <Botao rotulo="Anotar ganho" cor="verde" onPress={() => abrir('ganho')} estilo={{ flex: 1 }} />
        </View>
      )}

      {/* Dicas */}
      {dicas.length > 0 && (
        <>
          <Secao titulo={dicas.length > 1 && ehPro ? 'Dicas para este mês' : 'Dica do mês'} direita={dicas.length > GRATIS.dicas && ehPro ? (
            <Pressable onPress={() => setVerTodas((v) => !v)} accessibilityRole="button" hitSlop={8}><Text style={{ fontFamily: F.bold, fontSize: 13, color: C.primaryLight }}>{verTodas ? 'ver menos' : `ver as ${dicas.length}`}</Text></Pressable>
          ) : undefined} />
          {mostradas.map((d) => (
            <Peca key={d.id} tinta={COR_DICA[d.tom]} padding={14} estilo={{ marginBottom: 10 }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{d.titulo}</Text>
              <Text style={{ fontSize: 15, color: C.text, marginTop: 4, lineHeight: 22 }}>{d.texto}</Text>
            </Peca>
          ))}
          {!ehPro && dicas.length > GRATIS.dicas && (
            <TrancaPro titulo={`Mais ${dicas.length - GRATIS.dicas} ${dicas.length - GRATIS.dicas === 1 ? 'dica' : 'dicas'} para você`} texto="No Pro o Plim lê seus números e mostra todas, da mais urgente à menos." aoTocar={() => aoPedirPro('Todas as dicas do mês')} />
          )}
          <View style={{ height: 8 }} />
        </>
      )}

      {/* Para onde foi */}
      {maiores.length > 0 && (
        <>
          <Secao titulo="Para onde foi o dinheiro" />
          <Peca padding={14} estilo={{ marginBottom: 18 }}>
            {maiores.map((m, i) => {
              const c = CATEGORIA_POR_ID[m.categoria];
              return (
                <View key={m.categoria} style={{ marginTop: i ? 12 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Icone nome={(c?.icone ?? 'fin-carteira') as NomeIcone} tamanho={30} />
                    <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 15, color: C.text }}>{c?.nome ?? m.categoria}</Text>
                    <Text style={{ fontSize: 13, color: C.textSub }}>{Math.round(m.parte * 100)}%</Text>
                    <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text }}>{brl(m.valor, true)}</Text>
                  </View>
                  <Barra valor={m.parte} cor={i === 0 ? C.accent : C.primary} altura={8} />
                </View>
              );
            })}
          </Peca>
        </>
      )}

      {/* Lançamentos */}
      <Secao titulo="O que você anotou" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{doMes.length}</Text>} />
      {doMes.length === 0 ? (
        <Vazio titulo="Nada anotado neste mês" texto={mes === mesAtual ? 'Comece pelo gasto de hoje. Leva dez segundos.' : undefined} />
      ) : (
        <View style={{ gap: 8 }}>
          {doMes.map((l) => {
            const c = CATEGORIA_POR_ID[l.categoria];
            const [, m, d] = l.data.split('-');
            return (
              <Pressable
                key={l.id}
                onLongPress={() => confirmar('Apagar esta anotação', `${l.descricao || c?.nome || 'Lançamento'}: ${brl(l.valor)}`, 'Apagar', () => apagarLancamento(l.id))}
                onPress={() => confirmar('Apagar esta anotação', `${l.descricao || c?.nome || 'Lançamento'}: ${brl(l.valor)}`, 'Apagar', () => apagarLancamento(l.id))}
                accessibilityRole="button"
                accessibilityLabel={`${l.tipo === 'gasto' ? 'Gasto' : 'Ganho'} de ${brl(l.valor)}, ${l.descricao || c?.nome}, dia ${d}. Toque para apagar.`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, borderColor: C.border, padding: 10 }}
              >
                <Icone nome={(c?.icone ?? 'fin-carteira') as NomeIcone} tamanho={34} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{l.descricao || c?.nome || 'Lançamento'}</Text>
                  <Text style={{ fontSize: 13, color: C.textSub }}>{d}/{m}{l.descricao ? ` · ${c?.nome ?? ''}` : ''}</Text>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 16, color: l.tipo === 'ganho' ? C.successDim : C.text }}>{l.tipo === 'ganho' ? '+' : '−'} {brl(l.valor).replace('R$ ', '')}</Text>
              </Pressable>
            );
          })}
          <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 4 }}>Toque numa anotação para apagar.</Text>
        </View>
      )}

      <Folha titulo={form === 'ganho' ? 'Anotar ganho' : 'Anotar gasto'} visivel={!!form} aoFechar={() => setForm(null)}>
        <CampoValor rotulo="Valor" valor={valor} aoMudar={setValor} grande />
        {form && <EscolherCategoria tipo={form} valor={categoria} aoEscolher={setCategoria} />}
        <CampoTexto rotulo="O que foi? (opcional)" valor={descricao} aoMudar={setDescricao} exemplo={form === 'ganho' ? 'Ex.: freela do site' : 'Ex.: feira de sábado'} max={60} />
        <Opcoes rotulo="Quando" valor={quando} aoEscolher={setQuando} opcoes={[{ id: 0, nome: 'Hoje' }, { id: 1, nome: 'Ontem' }, { id: 2, nome: 'Anteontem' }]} />
        {quando > 0 && mesDe(diasAntes(hoje, quando)) !== mesAtual && <Linha rotulo="Este lançamento entra no mês passado." valor="" />}
        <Botao rotulo="Guardar" cor={form === 'ganho' ? 'verde' : 'laranja'} onPress={salvar} disabled={centavos <= 0} />
      </Folha>
    </>
  );
}
