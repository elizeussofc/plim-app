import Abas from '@/components/Abas';
import { CampoTexto, CampoValor, Folha, Opcoes, TrancaPro } from '@/components/financas/pecas';
import Icone, { type NomeIcone } from '@/components/Icone';
import { Barra, Botao, Cabecalho, Peca, Secao, Selo, Tela, Vazio } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import {
  COMODOS_PRONTOS, DIAS_DA_SEMANA, GRATIS_CASA, PRATOS, REFEICOES, TEMPOS_DE_FAXINA, casaEmDia, chaveDoCardapio, diaDeHoje, estadoDaTarefa,
  faxinaRelampago, frequenciaTexto, ingredientesDoCardapio, listaPorSecao, refeicoesPlanejadas, segundaDaSemana, sugerirSemana, urgencia,
  xpDaTarefa, type Comodo, type RefeicaoId, type TarefaCasa,
} from '@/lib/casa';
import { hojeLocal } from '@/lib/dia';
import { brl, lerValor } from '@/lib/financas';
import { somCompra, somFaxina, somItem, somLimpo, somPagina, somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { useCasaStore } from '@/stores/casaStore';
import { dizer } from '@/stores/falaStore';
import { useFinancasStore } from '@/stores/financasStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

type Aba = 'limpeza' | 'cardapio' | 'mercado';
const ABAS: { id: Aba; nome: string }[] = [{ id: 'limpeza', nome: 'Limpeza' }, { id: 'cardapio', nome: 'Cardápio' }, { id: 'mercado', nome: 'Mercado' }];
const FREQUENCIAS = [1, 2, 3, 7, 14, 30];
const DURACOES = [2, 5, 10, 15, 20, 30];
/** Tarefas que já renderam XP hoje: marcar, desmarcar e marcar de novo não rende outra vez. */
const premiadas = new Set<string>();

/** Casa: a limpeza em pedaços pequenos, o cardápio da semana e a lista de mercado. */
export default function CasaScreen() {
  const carregado = useCasaStore((s) => s.carregado);
  const temDados = useCasaStore((s) => s.comodos.length + s.lista.length + Object.keys(s.cardapio).length > 0);
  const virarSemana = useCasaStore((s) => s.virarSemana);
  const apagarTudo = useCasaStore((s) => s.apagarTudo);
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const [aba, setAba] = useState<Aba>('limpeza');

  useEffect(() => { if (carregado) virarSemana(segundaDaSemana(hojeLocal())); }, [carregado, virarSemana]);

  if (!carregado) return <Tela><View /></Tela>;

  return (
    <Tela espacoFinal={48}>
      <Cabecalho titulo="Casa" icone="casa-vassoura" sub="Um pedaço de cada vez" />
      <Abas abas={ABAS} atual={aba} aoTrocar={setAba} />
      {aba === 'limpeza' && <Limpeza ehPro={ehPro} aoPedirPro={abrirPaywall} />}
      {aba === 'cardapio' && <CardapioDaSemana ehPro={ehPro} aoPedirPro={abrirPaywall} irParaMercado={() => setAba('mercado')} />}
      {aba === 'mercado' && <Mercado ehPro={ehPro} aoPedirPro={abrirPaywall} />}

      <View style={{ marginTop: 26, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 }}>🔒 Tudo da sua casa fica guardado só neste aparelho.</Text>
        {temDados && (
          <Pressable onPress={() => confirmar('Apagar a Casa', 'Cômodos, tarefas, cardápio e lista de mercado são apagados deste aparelho de vez.', 'Apagar tudo', apagarTudo)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, color: C.textSub, textDecorationLine: 'underline' }}>Apagar tudo da Casa</Text>
          </Pressable>
        )}
      </View>
    </Tela>
  );
}

interface PropsAba { ehPro: boolean; aoPedirPro: (motivo: string) => void }

function Caixinha({ marcada }: { marcada: boolean }) {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: marcada ? C.success : C.borderBright, backgroundColor: marcada ? C.success : C.surface, alignItems: 'center', justifyContent: 'center' }}>
      {marcada && <Text style={{ fontFamily: F.displayX, fontSize: 15, color: C.onPrimary }}>✓</Text>}
    </View>
  );
}

// ───────────────────────── Limpeza ─────────────────────────

function Limpeza({ ehPro, aoPedirPro }: PropsAba) {
  const { comodos, tarefas, adicionarComodo, apagarComodo, salvarTarefa, apagarTarefa, fazerTarefa } = useCasaStore();
  const addXp = useUserStore((s) => s.addXp);
  const hoje = hojeLocal();
  const [tempo, setTempo] = useState(20);
  const [faxina, setFaxina] = useState<string[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [folha, setFolha] = useState<'comodo' | 'tarefa' | null>(null);
  const [nomeComodo, setNomeComodo] = useState('');
  const [tarefa, setTarefa] = useState<TarefaCasa | { comodoId: string } | null>(null);
  const [nome, setNome] = useState('');
  const [cada, setCada] = useState(7);
  const [minutos, setMinutos] = useState(10);

  const emDia = casaEmDia(tarefas, hoje);
  const pendentes = tarefas.filter((t) => estadoDaTarefa(t, hoje).estado !== 'em-dia').length;
  const daFaxina = useMemo(() => (faxina ? faxina.map((id) => tarefas.find((t) => t.id === id)).filter((t): t is TarefaCasa => !!t) : []), [faxina, tarefas]);
  const cheio = !ehPro && comodos.length >= GRATIS_CASA.comodos;
  const disponiveis = COMODOS_PRONTOS.filter((m) => !comodos.some((c) => c.nome === m.nome));

  function fazer(t: TarefaCasa) {
    const feita = fazerTarefa(t.id, hoje);
    if (!feita) { somToque(); return; }
    const chave = `${t.id}-${hoje}`;
    if (!premiadas.has(chave)) { premiadas.add(chave); addXp(xpDaTarefa(t.minutos)); }
    const ultimaDaFaxina = !!faxina?.includes(t.id) && daFaxina.every((x) => x.id === t.id || x.ultima === hoje);
    if (ultimaDaFaxina) { somFaxina(); dizer('casa_faxina'); } else { somLimpo(); dizer('casa_tarefa'); }
  }

  function montar() {
    const escolhidas = faxinaRelampago(tarefas, hoje, tempo);
    setFaxina(escolhidas.map((t) => t.id));
    somToque();
  }

  function novoComodo(c: { pronto: string } | { nome: string }) {
    if (cheio) { setFolha(null); aoPedirPro('Cômodos sem limite'); return; }
    const id = adicionarComodo(c);
    setFolha(null);
    setNomeComodo('');
    if (id) setAberto(id);
    somToque();
  }

  function abrirTarefa(t: TarefaCasa | { comodoId: string }) {
    setTarefa(t);
    setNome('id' in t ? t.nome : '');
    setCada('id' in t ? t.cadaDias : 7);
    setMinutos('id' in t ? t.minutos : 10);
    setFolha('tarefa');
  }

  function salvarATarefa() {
    if (!tarefa || !nome.trim()) return;
    salvarTarefa({ comodoId: tarefa.comodoId, nome, cadaDias: cada, minutos }, 'id' in tarefa ? tarefa.id : undefined);
    setFolha(null);
    somToque();
  }

  const linha = (t: TarefaCasa, mostrarComodo: boolean) => {
    const feitaHoje = t.ultima === hoje;
    const e = estadoDaTarefa(t, hoje);
    const quando = feitaHoje ? 'feita hoje' : e.estado === 'em-dia' ? `volta em ${e.dias} ${e.dias === 1 ? 'dia' : 'dias'}` : e.estado === 'hoje' ? 'para hoje' : `esperando há ${-e.dias} ${e.dias === -1 ? 'dia' : 'dias'}`;
    const comodo = comodos.find((c) => c.id === t.comodoId);
    return (
      <Pressable key={t.id} onPress={() => fazer(t)} onLongPress={() => abrirTarefa(t)} accessibilityRole="checkbox" accessibilityState={{ checked: feitaHoje }} accessibilityLabel={`${t.nome}, ${t.minutos} minutos, ${quando}. Segure para mudar.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: feitaHoje ? C.successSoft : C.surface, borderRadius: R.md, borderWidth: 2, borderBottomWidth: 4, borderColor: feitaHoje ? '#A9E3CB' : C.border, padding: 12, minHeight: 58 }}>
        <Caixinha marcada={feitaHoje} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text, textDecorationLine: feitaHoje ? 'line-through' : 'none' }}>{t.nome}</Text>
          <Text style={{ fontSize: 13, color: e.estado === 'passou' && !feitaHoje ? C.accentDim : C.textSub }}>{mostrarComodo && comodo ? `${comodo.nome} · ` : ''}{t.minutos} min · {quando}</Text>
        </View>
      </Pressable>
    );
  };

  if (comodos.length === 0) {
    return (
      <>
        <Vazio titulo="Quais cômodos a sua casa tem?" texto="Toque em um para começar. Cada cômodo já vem com as tarefas mais comuns e de quanto em quanto tempo fazer; depois você ajusta." />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          {COMODOS_PRONTOS.map((m) => (
            <Pressable key={m.id} onPress={() => novoComodo({ pronto: m.id })} accessibilityRole="button" accessibilityLabel={`Adicionar ${m.nome}`} style={({ pressed }) => ({ flexBasis: '30%', flexGrow: 1, alignItems: 'center', backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 2, borderBottomWidth: pressed ? 2 : 5, marginTop: pressed ? 3 : 0, borderColor: C.border, padding: 12 })}>
              <Icone nome={m.icone as NomeIcone} tamanho={52} />
              <Text style={{ fontFamily: F.display, fontSize: 14, color: C.text, textAlign: 'center', marginTop: 4 }}>{m.nome}</Text>
            </Pressable>
          ))}
        </View>
        {!ehPro && <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginTop: 12 }}>No grátis você cuida de {GRATIS_CASA.comodos} cômodos. O Pro libera a casa inteira.</Text>}
      </>
    );
  }

  return (
    <>
      <Peca tinta="verde" estilo={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icone nome="casa-vassoura" tamanho={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.displayX, fontSize: 26, color: C.text }}>{Math.round(emDia * 100)}% em dia</Text>
            <Text style={{ fontSize: 14, color: C.textSub }}>{pendentes === 0 ? 'Nada pedindo atenção agora.' : `${pendentes} ${pendentes === 1 ? 'tarefa pedindo' : 'tarefas pedindo'} atenção.`}</Text>
          </View>
        </View>
        <View style={{ marginTop: 10 }}><Barra valor={emDia} cor={C.success} /></View>
      </Peca>

      <Peca estilo={{ marginBottom: 20 }}>
        <Text style={{ fontFamily: F.display, fontSize: 18, color: C.text }}>Faxina relâmpago</Text>
        <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20, marginBottom: 10 }}>Diga quanto tempo você tem. O Plim escolhe o que mais precisa e cabe nele.</Text>
        {faxina === null ? (
          <>
            <Opcoes valor={tempo} opcoes={TEMPOS_DE_FAXINA.map((t) => ({ id: t, nome: `${t} min` }))} aoEscolher={setTempo} />
            <Botao rotulo="Montar a faxina" icone="cronometro" disabled={pendentes === 0} onPress={montar} />
            {pendentes === 0 && <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginTop: 8 }}>A casa está em dia. Pode descansar.</Text>}
          </>
        ) : (
          <>
            <View style={{ gap: 8, marginBottom: 12 }}>{daFaxina.map((t) => linha(t, true))}</View>
            <Text style={{ fontSize: 13, color: C.textSub, marginBottom: 10 }}>{daFaxina.filter((t) => t.ultima === hoje).length} de {daFaxina.length} feitas · cerca de {daFaxina.reduce((s, t) => s + t.minutos, 0)} min no total</Text>
            <Botao rotulo={daFaxina.every((t) => t.ultima === hoje) ? 'Fechar a faxina' : 'Parar por aqui'} cor="claro" pequeno onPress={() => setFaxina(null)} />
          </>
        )}
      </Peca>

      <Secao titulo="Cômodos" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{ehPro ? comodos.length : `${comodos.length} de ${GRATIS_CASA.comodos}`}</Text>} />
      <View style={{ gap: 12, marginBottom: 14 }}>
        {comodos.map((c: Comodo) => {
          const minhas = tarefas.filter((t) => t.comodoId === c.id).sort((a, b) => urgencia(b, hoje) - urgencia(a, hoje));
          const pedindo = minhas.filter((t) => estadoDaTarefa(t, hoje).estado !== 'em-dia').length;
          const estaAberto = aberto === c.id;
          return (
            <Peca key={c.id} padding={12}>
              <Pressable onPress={() => setAberto(estaAberto ? null : c.id)} accessibilityRole="button" accessibilityState={{ expanded: estaAberto }} accessibilityLabel={`${c.nome}: ${pedindo} tarefas pedindo atenção`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
                <Icone nome={c.icone as NomeIcone} tamanho={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 18, color: C.text }}>{c.nome}</Text>
                  <Text style={{ fontSize: 13, color: C.textSub }}>{minhas.length === 0 ? 'Sem tarefas ainda' : pedindo === 0 ? 'Em dia' : `${pedindo} para fazer`}</Text>
                </View>
                {pedindo > 0 && <Selo texto={String(pedindo)} tinta="laranja" />}
                <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textMuted }}>{estaAberto ? '⌄' : '›'}</Text>
              </Pressable>
              {estaAberto && (
                <View style={{ marginTop: 10 }}>
                  <View style={{ gap: 8 }}>{minhas.map((t) => linha(t, false))}</View>
                  {minhas.length > 0 && <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Toque para marcar. Segure para mudar ou apagar.</Text>}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Botao rotulo="Nova tarefa" pequeno cor="suave" onPress={() => abrirTarefa({ comodoId: c.id })} />
                    <Botao rotulo="Tirar cômodo" pequeno cor="claro" onPress={() => confirmar('Tirar o cômodo', `${c.nome} e as tarefas dele saem da sua casa.`, 'Tirar', () => apagarComodo(c.id))} />
                  </View>
                </View>
              )}
            </Peca>
          );
        })}
      </View>
      <Botao rotulo="Adicionar cômodo" icone="casa-sala" cor="suave" onPress={() => (cheio ? aoPedirPro('Cômodos sem limite') : setFolha('comodo'))} />
      {!ehPro && <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginTop: 10 }}>No grátis: {GRATIS_CASA.comodos} cômodos. O Pro libera a casa inteira.</Text>}

      <Folha titulo="Adicionar cômodo" visivel={folha === 'comodo'} aoFechar={() => setFolha(null)}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {disponiveis.map((m) => (
            <Pressable key={m.id} onPress={() => novoComodo({ pronto: m.id })} accessibilityRole="button" accessibilityLabel={`Adicionar ${m.nome}`} style={{ flexBasis: '30%', flexGrow: 1, alignItems: 'center', backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 2, borderBottomWidth: 5, borderColor: C.border, padding: 10 }}>
              <Icone nome={m.icone as NomeIcone} tamanho={44} />
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.text, textAlign: 'center', marginTop: 4 }}>{m.nome}</Text>
            </Pressable>
          ))}
        </View>
        <CampoTexto rotulo="Ou crie um com outro nome" valor={nomeComodo} aoMudar={setNomeComodo} exemplo="Escritório" max={24} />
        <Botao rotulo="Criar cômodo" disabled={!nomeComodo.trim()} onPress={() => novoComodo({ nome: nomeComodo })} />
      </Folha>

      <Folha titulo={tarefa && 'id' in tarefa ? 'Mudar a tarefa' : 'Nova tarefa'} visivel={folha === 'tarefa'} aoFechar={() => setFolha(null)}>
        <CampoTexto rotulo="O que é para fazer" valor={nome} aoMudar={setNome} exemplo="Limpar o fogão" max={50} />
        <Opcoes rotulo="De quanto em quanto tempo" valor={cada} opcoes={FREQUENCIAS.map((f) => ({ id: f, nome: frequenciaTexto(f) }))} aoEscolher={setCada} />
        <Opcoes rotulo="Quanto tempo leva" valor={minutos} opcoes={DURACOES.map((d) => ({ id: d, nome: `${d} min` }))} aoEscolher={setMinutos} />
        <Botao rotulo="Guardar tarefa" disabled={!nome.trim()} onPress={salvarATarefa} />
        {tarefa && 'id' in tarefa && <Botao rotulo="Apagar tarefa" cor="claro" estilo={{ marginTop: 10 }} onPress={() => { apagarTarefa(tarefa.id); setFolha(null); }} />}
      </Folha>
    </>
  );
}

// ───────────────────────── Cardápio ─────────────────────────

function CardapioDaSemana({ ehPro, aoPedirPro, irParaMercado }: PropsAba & { irParaMercado: () => void }) {
  const { cardapio, sorteio, definirPrato, definirCardapio, puxar } = useCasaStore();
  const hoje = diaDeHoje(hojeLocal());
  const [celula, setCelula] = useState<{ chave: string; titulo: string; refeicao: RefeicaoId } | null>(null);
  const [texto, setTexto] = useState('');
  const planejadas = refeicoesPlanejadas(cardapio);
  const total = DIAS_DA_SEMANA.length * REFEICOES.length;
  const sugestoes = useMemo(() => {
    if (!celula) return [];
    const usados = new Set(Object.values(cardapio).map((v) => v.toLowerCase()));
    const busca = texto.trim().toLowerCase();
    return PRATOS.filter((p) => !usados.has(p.nome.toLowerCase()) && (busca ? p.nome.toLowerCase().includes(busca) : !!p.leve === (celula.refeicao === 'jantar'))).slice(0, 8);
  }, [celula, cardapio, texto]);

  function guardar(nome: string) {
    if (!celula) return;
    const antes = refeicoesPlanejadas(cardapio);
    const tinha = !!cardapio[celula.chave]?.trim();
    definirPrato(celula.chave, nome);
    setCelula(null);
    if (nome.trim()) {
      somPagina();
      if (!tinha && antes + 1 === total) dizer('casa_cardapio');
    } else somToque();
  }

  function sugerir() {
    if (!ehPro) { aoPedirPro('Cardápio sugerido pelo Plim'); return; }
    definirCardapio(sugerirSemana(cardapio, sorteio * 7919));
    somPagina();
    dizer('casa_cardapio');
  }

  function paraALista() {
    if (!ehPro) { aoPedirPro('Lista de mercado feita do cardápio'); return; }
    puxar(ingredientesDoCardapio(cardapio));
    somItem();
    irParaMercado();
  }

  return (
    <>
      <Peca tinta="laranja" estilo={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icone nome="casa-cardapio" tamanho={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.displayX, fontSize: 24, color: C.text }}>{planejadas} de {total} refeições</Text>
            <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>Decidir antes tira o peso de pensar com fome.</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Botao rotulo={planejadas ? 'Completar a semana' : 'Sugerir a semana'} icone={ehPro ? 'estrela' : 'coroa'} cor="laranja" pequeno disabled={planejadas === total} onPress={sugerir} />
          <Botao rotulo="Fazer a lista" icone={ehPro ? 'casa-cesta' : 'coroa'} cor="claro" pequeno disabled={planejadas === 0} onPress={paraALista} />
        </View>
      </Peca>

      <View style={{ gap: 10 }}>
        {DIAS_DA_SEMANA.map((d) => (
          <Peca key={d.id} tinta={d.id === hoje ? 'roxo' : undefined} padding={12}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{d.nome}</Text>
              {d.id === hoje && <Selo texto="hoje" />}
            </View>
            <View style={{ gap: 6 }}>
              {REFEICOES.map((r) => {
                const chave = chaveDoCardapio(d.id, r.id);
                const prato = cardapio[chave];
                return (
                  <Pressable key={r.id} onPress={() => { setCelula({ chave, titulo: `${r.nome} de ${d.nome.toLowerCase()}`, refeicao: r.id }); setTexto(prato ?? ''); }} accessibilityRole="button" accessibilityLabel={`${r.nome} de ${d.nome}: ${prato || 'escolher'}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 2, borderColor: C.border, paddingHorizontal: 12, minHeight: 46 }}>
                    <Text style={{ width: 58, fontFamily: F.bold, fontSize: 13, color: C.textSub }}>{r.nome}</Text>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, color: prato ? C.text : C.textMuted }}>{prato || 'Escolher'}</Text>
                    <Text style={{ fontFamily: F.displayX, fontSize: 18, color: C.textMuted }}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          </Peca>
        ))}
      </View>
      {planejadas > 0 && (
        <Botao rotulo="Limpar a semana" cor="claro" pequeno estilo={{ marginTop: 14, alignSelf: 'center' }} onPress={() => confirmar('Limpar o cardápio', 'Todas as refeições desta semana ficam em branco.', 'Limpar', () => definirCardapio({}))} />
      )}
      {!ehPro && <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginTop: 12, lineHeight: 19 }}>No grátis você monta a semana prato a prato. No Pro o Plim sugere a semana inteira e faz a lista de mercado.</Text>}

      <Folha titulo={celula?.titulo ?? ''} visivel={celula !== null} aoFechar={() => setCelula(null)}>
        <CampoTexto rotulo="O que vai ser" valor={texto} aoMudar={setTexto} exemplo="Escreva ou escolha abaixo" max={50} />
        <Botao rotulo="Guardar" disabled={!texto.trim()} onPress={() => guardar(texto)} />
        {sugestoes.length > 0 && <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginTop: 16, marginBottom: 6 }}>Ideias</Text>}
        <View style={{ gap: 6 }}>
          {sugestoes.map((p) => (
            <Pressable key={p.nome} onPress={() => guardar(p.nome)} accessibilityRole="button" accessibilityLabel={`Escolher ${p.nome}`} style={{ backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 2, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, minHeight: 46, justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{p.nome}</Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: C.textSub }}>{p.ingredientes.join(', ')}</Text>
            </Pressable>
          ))}
        </View>
        {celula && cardapio[celula.chave] && <Botao rotulo="Deixar em branco" cor="claro" estilo={{ marginTop: 12 }} onPress={() => guardar('')} />}
      </Folha>
    </>
  );
}

// ───────────────────────── Mercado ─────────────────────────

function Mercado({ ehPro, aoPedirPro }: PropsAba) {
  const { lista, cardapio, adicionarItem, alternarItem, apagarItem, puxar, limparMarcados } = useCasaStore();
  const anotar = useFinancasStore((s) => s.anotar);
  const [novo, setNovo] = useState('');
  const [fechando, setFechando] = useState(false);
  const [valor, setValor] = useState('');
  const grupos = useMemo(() => listaPorSecao(lista), [lista]);
  const marcados = lista.filter((i) => i.marcado).length;
  const temCardapio = refeicoesPlanejadas(cardapio) > 0;

  function adicionar() {
    if (!novo.trim()) return;
    adicionarItem(novo);
    setNovo('');
    somToque();
  }

  function fechar() {
    const centavos = lerValor(valor);
    if (centavos > 0) anotar({ tipo: 'gasto', valor: centavos, categoria: 'mercado', descricao: 'Compra do mercado', data: hojeLocal() });
    limparMarcados();
    setFechando(false);
    setValor('');
    somCompra();
    dizer('casa_compra');
  }

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <TextInput value={novo} onChangeText={(v) => setNovo(v.slice(0, 40))} onSubmitEditing={adicionar} placeholder="O que falta em casa?" placeholderTextColor={C.textMuted} accessibilityLabel="Novo item da lista" returnKeyType="done" style={{ flex: 1, minWidth: 0, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 16, fontFamily: F.regular }} />
        <Botao rotulo="Pôr na lista" pequeno disabled={!novo.trim()} onPress={adicionar} />
      </View>

      {ehPro
        ? temCardapio && <Botao rotulo="Puxar do cardápio" icone="casa-cardapio" cor="suave" pequeno estilo={{ marginBottom: 14 }} onPress={() => { puxar(ingredientesDoCardapio(cardapio)); somItem(); }} />
        : <TrancaPro titulo="Lista feita do cardápio" texto="O Plim junta os ingredientes da semana e, na saída do mercado, anota a compra nas Finanças." aoTocar={() => aoPedirPro('Lista de mercado ligada ao cardápio e às Finanças')} />}

      {lista.length === 0 ? (
        <Vazio titulo="Lista vazia" texto="Escreva o que falta assim que perceber. Na hora do mercado, a lista vem separada por corredor." />
      ) : (
        <>
          <Secao titulo="Sua lista" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{marcados} de {lista.length} no carrinho</Text>} />
          <View style={{ marginBottom: 12 }}><Barra valor={marcados / lista.length} cor={C.success} /></View>
          {grupos.map((g) => (
            <View key={g.secao} style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>{g.secao}</Text>
              <View style={{ gap: 6 }}>
                {g.itens.map((i) => (
                  <Pressable key={i.id} onPress={() => { alternarItem(i.id); somItem(); }} onLongPress={() => apagarItem(i.id)} accessibilityRole="checkbox" accessibilityState={{ checked: i.marcado }} accessibilityLabel={`${i.nome}. Segure para tirar da lista.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: i.marcado ? C.successSoft : C.surface, borderRadius: R.md, borderWidth: 2, borderColor: i.marcado ? '#A9E3CB' : C.border, paddingHorizontal: 12, minHeight: 50 }}>
                    <Caixinha marcada={i.marcado} />
                    <Text style={{ flex: 1, fontSize: 16, color: i.marcado ? C.textSub : C.text, textDecorationLine: i.marcado ? 'line-through' : 'none' }}>{i.nome}</Text>
                    {i.doCardapio && <Text style={{ fontSize: 12, color: C.textMuted }}>cardápio</Text>}
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Toque para marcar. Segure para tirar da lista.</Text>
          {marcados > 0 && (ehPro
            ? <Botao rotulo="Fechei a compra" icone="fin-mercado" cor="verde" onPress={() => setFechando(true)} />
            : <Botao rotulo="Tirar os marcados" cor="claro" onPress={() => { limparMarcados(); somToque(); }} />)}
        </>
      )}

      <Folha titulo="Fechei a compra" visivel={fechando} aoFechar={() => setFechando(false)}>
        <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20, marginBottom: 12 }}>Os {marcados} itens marcados saem da lista. Se quiser, diga quanto deu: o valor entra nas Finanças como gasto de mercado.</Text>
        <CampoValor rotulo="Quanto deu a compra" valor={valor} aoMudar={setValor} grande dica="pode deixar em branco" />
        <Botao rotulo={lerValor(valor) > 0 ? `Anotar ${brl(lerValor(valor))} e fechar` : 'Fechar sem anotar valor'} cor="verde" onPress={fechar} />
      </Folha>
    </>
  );
}
