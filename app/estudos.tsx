import Abas from '@/components/Abas';
import { CampoTexto, Folha, Linha, Opcoes, TrancaPro } from '@/components/financas/pecas';
import Icone from '@/components/Icone';
import { Barra, Botao, Cabecalho, Numero, Peca, Secao, Selo, Tela, Vazio } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { hojeLocal } from '@/lib/dia';
import {
  COMO_ESTUDAR, GRATIS_ESTUDOS, TEMPOS_DE_ESTUDO, TINTAS_MATERIA, dataBr, diasEntre, fases, firme, lerData, minutosDaSemana, minutosPorMateria,
  paraHoje, planoDaProva, previsao, proximosDias, sequenciaDeEstudo, xpDaSessao, type Materia, type Resposta, type TintaMateria, type Topico,
} from '@/lib/estudos';
import { somEstudoFim, somInicio, somLembrei, somPagina, somToque } from '@/lib/sons';
import { C, F, R, TINTA } from '@/lib/theme';
import { useEstudosStore } from '@/stores/estudosStore';
import { dizer } from '@/stores/falaStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

type Aba = 'hoje' | 'materias' | 'evolucao';
const ABAS: { id: Aba; nome: string }[] = [{ id: 'hoje', nome: 'Hoje' }, { id: 'materias', nome: 'Matérias' }, { id: 'evolucao', nome: 'Evolução' }];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const diaDaSemana = (data: string) => { const [a, m, d] = data.split('-').map(Number); return DIAS_CURTOS[new Date(a, m - 1, d).getDay()]; };
const emDias = (n: number) => (n <= 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`);
const relogio = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const tempoTexto = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min} min`);

/** Estudos: o que revisar hoje, o cronômetro por matéria e quanto a pessoa já estudou. */
export default function EstudosScreen() {
  const carregado = useEstudosStore((s) => s.carregado);
  const temDados = useEstudosStore((s) => s.materias.length + s.sessoes.length > 0);
  const apagarTudo = useEstudosStore((s) => s.apagarTudo);
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const [aba, setAba] = useState<Aba>('hoje');

  if (!carregado) return <Tela><View /></Tela>;

  return (
    <Tela espacoFinal={48}>
      <Cabecalho titulo="Estudos" icone="estudo-caderno" sub="Estudar menos vezes, lembrar mais" />
      <Abas abas={ABAS} atual={aba} aoTrocar={setAba} />
      {aba === 'hoje' && <Hoje irParaMaterias={() => setAba('materias')} />}
      {aba === 'materias' && <Materias ehPro={ehPro} aoPedirPro={abrirPaywall} />}
      {aba === 'evolucao' && <Evolucao ehPro={ehPro} aoPedirPro={abrirPaywall} />}

      <View style={{ marginTop: 26, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 }}>🔒 Suas matérias e revisões ficam só neste aparelho.</Text>
        {temDados && (
          <Pressable onPress={() => confirmar('Apagar os Estudos', 'Matérias, tópicos e o tempo estudado são apagados deste aparelho de vez.', 'Apagar tudo', apagarTudo)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, color: C.textSub, textDecorationLine: 'underline' }}>Apagar tudo dos Estudos</Text>
          </Pressable>
        )}
      </View>
    </Tela>
  );
}

interface PropsAba { ehPro: boolean; aoPedirPro: (motivo: string) => void }

function SeloMateria({ materia }: { materia?: Materia | null }) {
  return <Selo texto={materia?.nome ?? 'Sem matéria'} tinta={materia?.tinta ?? 'azul'} />;
}

// ───────────────────────── Hoje ─────────────────────────

function Hoje({ irParaMaterias }: { irParaMaterias: () => void }) {
  const { materias, topicos, ativo, premiado, iniciar, encerrar, responder, marcarPremiado, criarTopico } = useEstudosStore();
  const addXp = useUserStore((s) => s.addXp);
  const hoje = hojeLocal();
  const [materiaId, setMateriaId] = useState<string | null>(materias[0]?.id ?? null);
  const [minutos, setMinutos] = useState(25);
  const [resta, setResta] = useState(() => (ativo ? ativo.fimEm - Date.now() : 0));
  const [fim, setFim] = useState<{ minutos: number; materiaId: string | null; completo: boolean } | null>(null);
  const [oQueEstudou, setOQueEstudou] = useState('');
  const fechando = useRef(false);

  const devidos = useMemo(() => paraHoje(topicos, hoje), [topicos, hoje]);
  const proximos = useMemo(() => proximosDias(topicos, hoje), [topicos, hoje]);
  const materiaDe = (id: string | null) => materias.find((m) => m.id === id) ?? null;

  function fechar(completo: boolean) {
    if (fechando.current || !ativo) return;
    fechando.current = true;
    const dono = ativo.materiaId;
    const feitos = encerrar(hoje);
    if (feitos > 0) addXp(xpDaSessao(feitos));
    if (completo) { somEstudoFim(); dizer('estudo_fim'); } else { somToque(); dizer('estudo_parou'); }
    setFim({ minutos: feitos, materiaId: dono, completo });
    setOQueEstudou('');
    fechando.current = false;
  }

  useEffect(() => {
    if (!ativo) return;
    const tic = () => {
      const r = ativo.fimEm - Date.now();
      setResta(r);
      if (r <= 0) fechar(true);
    };
    tic();
    const t = setInterval(tic, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo?.fimEm]);

  function comecar() {
    setFim(null);
    iniciar(materiaId && materiaDe(materiaId) ? materiaId : null, minutos);
    somInicio();
    dizer('estudo_inicio');
  }

  function responda(t: Topico, r: Resposta) {
    const eraOUltimo = devidos.length === 1;
    responder(t.id, r, hoje);
    addXp(3);
    if (r === 'lembrei') somLembrei(); else somPagina();
    if (eraOUltimo) {
      dizer('estudo_em_dia');
      if (premiado !== hoje) { marcarPremiado(hoje); addXp(10); }
    } else if (r === 'lembrei') dizer('estudo_lembrei');
    else if (r === 'esqueci') dizer('estudo_esqueci');
  }

  function guardarTopico() {
    if (!fim?.materiaId || !oQueEstudou.trim()) return;
    criarTopico(oQueEstudou, fim.materiaId, hoje);
    somPagina();
    dizer('estudo_topico');
    setFim(null);
  }

  return (
    <>
      {ativo ? (
        <Peca tinta="roxo" estilo={{ alignItems: 'center', marginBottom: 20 }}>
          <SeloMateria materia={materiaDe(ativo.materiaId)} />
          <Text accessibilityLabel={`Faltam ${relogio(resta)}`} style={{ fontFamily: F.displayX, fontSize: 62, color: C.text, marginVertical: 4 }}>{relogio(resta)}</Text>
          <View style={{ alignSelf: 'stretch', marginBottom: 14 }}><Barra valor={1 - resta / (ativo.minutos * 60_000)} /></View>
          <Text style={{ fontSize: 14, color: C.textSub, textAlign: 'center', marginBottom: 14 }}>Uma coisa só até o relógio zerar. O celular pode ficar virado para baixo.</Text>
          <Botao rotulo="Terminar agora" cor="claro" pequeno onPress={() => fechar(false)} />
        </Peca>
      ) : fim ? (
        <Peca tinta="verde" estilo={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Icone nome="festa" tamanho={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.text }}>{fim.minutos > 0 ? `${tempoTexto(fim.minutos)} de estudo` : 'Sessão encerrada'}</Text>
              <Text style={{ fontSize: 14, color: C.textSub }}>{fim.minutos > 0 ? `+${xpDaSessao(fim.minutos)} XP${fim.completo ? ' · tempo cumprido' : ''}` : 'Menos de um minuto não entra na conta.'}</Text>
            </View>
          </View>
          {fim.materiaId && fim.minutos > 0 && (
            <>
              <CampoTexto rotulo="O que você estudou? Vira uma pergunta para revisar amanhã." valor={oQueEstudou} aoMudar={setOQueEstudou} exemplo="O que é mitose?" max={80} />
              <Botao rotulo="Guardar para revisar" icone="estudo-cartao" disabled={!oQueEstudou.trim()} onPress={guardarTopico} />
            </>
          )}
          <Botao rotulo="Fechar" cor="claro" pequeno estilo={{ marginTop: 10 }} onPress={() => setFim(null)} />
        </Peca>
      ) : (
        <Peca estilo={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: C.text, marginBottom: 10 }}>Estudar agora</Text>
          {materias.length > 0 && (
            <Opcoes rotulo="Matéria" valor={materiaId ?? ''} opcoes={[...materias.map((m) => ({ id: m.id, nome: m.nome })), { id: '', nome: 'Sem matéria' }]} aoEscolher={(v) => setMateriaId(v || null)} />
          )}
          <Opcoes rotulo="Por quanto tempo" valor={minutos} opcoes={TEMPOS_DE_ESTUDO.map((t) => ({ id: t, nome: `${t} min` }))} aoEscolher={setMinutos} />
          <Botao rotulo="Começar" icone="cronometro" onPress={comecar} />
        </Peca>
      )}

      <Secao titulo="Para revisar hoje" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{devidos.length}</Text>} />
      {topicos.length === 0 ? (
        <Vazio titulo="Nada para revisar ainda" texto="Cadastre uma matéria e os tópicos que você está estudando. O Plim traz cada um de volta no dia certo.">
          <Botao rotulo="Cadastrar matéria" icone="estudo-caderno" onPress={irParaMaterias} />
        </Vazio>
      ) : devidos.length === 0 ? (
        <Peca tinta="verde" padding={14} estilo={{ marginBottom: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>Revisões em dia</Text>
          <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>Nada vence hoje. Volte amanhã ou cadastre o que você estudou agora.</Text>
        </Peca>
      ) : (
        <View style={{ gap: 12 }}>
          {devidos.slice(0, 5).map((t) => {
            const materia = materiaDe(t.materiaId);
            const p = previsao(t, hoje, materia?.prova);
            const atraso = diasEntre(t.proxima, hoje);
            return (
              <Peca key={t.id} padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <SeloMateria materia={materia} />
                  {atraso > 0 && <Text style={{ fontSize: 12, color: C.textMuted }}>esperando há {atraso} {atraso === 1 ? 'dia' : 'dias'}</Text>}
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text, lineHeight: 25 }}>{t.nome}</Text>
                <Text style={{ fontSize: 14, color: C.textSub, marginTop: 2, marginBottom: 12 }}>Tente lembrar sem olhar. Depois responda com sinceridade.</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([['esqueci', 'Esqueci', C.surface, C.border, C.textSub], ['quase', 'Quase', C.accentSoft, '#F5C9A6', C.accentDim], ['lembrei', 'Lembrei', C.successSoft, '#A9E3CB', C.successDim]] as const).map(([id, nome, fundo, borda, cor]) => (
                    <Pressable key={id} onPress={() => responda(t, id)} accessibilityRole="button" accessibilityLabel={`${nome}. Volta ${emDias(p[id])}.`} style={({ pressed }) => ({ flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: fundo, borderWidth: 2, borderBottomWidth: pressed ? 2 : 5, marginTop: pressed ? 3 : 0, borderColor: borda })}>
                      <Text style={{ fontFamily: F.display, fontSize: 15, color: cor }}>{nome}</Text>
                      <Text style={{ fontSize: 12, color: C.textSub }}>{emDias(p[id])}</Text>
                    </Pressable>
                  ))}
                </View>
              </Peca>
            );
          })}
          {devidos.length > 5 && <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center' }}>Mais {devidos.length - 5} depois destas. Cinco de cada vez.</Text>}
        </View>
      )}

      {topicos.length > 0 && (
        <>
          <View style={{ height: 22 }} />
          <Secao titulo="Próximos dias" />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {proximos.map((d) => (
              <View key={d.data} accessible accessibilityLabel={`${diaDaSemana(d.data)}: ${d.quantos} revisões`} style={{ flex: 1, alignItems: 'center', backgroundColor: d.quantos ? C.glass : C.surface, borderRadius: R.sm, borderWidth: 2, borderColor: d.quantos ? C.borderPrimary : C.border, paddingVertical: 8 }}>
                <Text style={{ fontFamily: F.displayX, fontSize: 17, color: d.quantos ? C.primaryLight : C.textMuted }}>{d.quantos}</Text>
                <Text style={{ fontSize: 12, color: C.textSub }}>{diaDaSemana(d.data)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </>
  );
}

// ───────────────────────── Matérias ─────────────────────────

function Materias({ ehPro, aoPedirPro }: PropsAba) {
  const { materias, topicos, salvarMateria, apagarMateria, criarTopico, apagarTopico } = useEstudosStore();
  const hoje = hojeLocal();
  const [form, setForm] = useState<Materia | 'nova' | null>(null);
  const [nome, setNome] = useState('');
  const [tinta, setTinta] = useState<TintaMateria>('roxo');
  const [prova, setProva] = useState('');
  const [aberta, setAberta] = useState<string | null>(materias[0]?.id ?? null);
  const [novoTopico, setNovoTopico] = useState('');

  const provaLida = prova.trim() ? lerData(prova, hoje) : null;
  const provaInvalida = prova.trim() !== '' && !provaLida;
  const topicosCheios = !ehPro && topicos.length >= GRATIS_ESTUDOS.topicos;

  function nova() {
    if (!ehPro && materias.length >= GRATIS_ESTUDOS.materias) { aoPedirPro('Matérias sem limite'); return; }
    setForm('nova'); setNome(''); setProva(''); setTinta(TINTAS_MATERIA[materias.length % TINTAS_MATERIA.length]);
  }

  function editar(m: Materia) {
    setForm(m); setNome(m.nome); setTinta(m.tinta); setProva(m.prova ? dataBr(m.prova) : '');
  }

  function salvar() {
    if (!form || !nome.trim() || provaInvalida) return;
    const id = salvarMateria({ nome, tinta, prova: ehPro ? provaLida ?? undefined : form !== 'nova' ? form.prova : undefined }, form === 'nova' ? undefined : form.id);
    setForm(null);
    setAberta(id);
    somToque();
  }

  function adicionarTopico(materiaId: string) {
    if (!novoTopico.trim()) return;
    if (topicosCheios) { aoPedirPro('Tópicos sem limite'); return; }
    criarTopico(novoTopico, materiaId, hoje);
    setNovoTopico('');
    somPagina();
    dizer('estudo_topico');
  }

  return (
    <>
      <Secao titulo="Suas matérias" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{ehPro ? materias.length : `${materias.length} de ${GRATIS_ESTUDOS.materias}`}</Text>} />
      {materias.length === 0 && <Vazio titulo="Comece por uma matéria" texto="Pode ser da escola, da faculdade, de concurso, um idioma ou um curso que você está fazendo." />}

      <View style={{ gap: 12, marginBottom: 14 }}>
        {materias.map((m) => {
          const meus = topicos.filter((t) => t.materiaId === m.id);
          const plano = planoDaProva(m, topicos, hoje);
          const estaAberta = aberta === m.id;
          return (
            <Peca key={m.id} tinta={m.tinta} padding={14}>
              <Pressable onPress={() => { setAberta(estaAberta ? null : m.id); setNovoTopico(''); }} accessibilityRole="button" accessibilityState={{ expanded: estaAberta }} accessibilityLabel={`${m.nome}, ${meus.length} tópicos`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>{m.nome}</Text>
                  <Text style={{ fontSize: 13, color: C.textSub }}>{meus.length} {meus.length === 1 ? 'tópico' : 'tópicos'}{m.prova ? ` · prova em ${dataBr(m.prova)}` : ''}</Text>
                </View>
                <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textMuted }}>{estaAberta ? '⌄' : '›'}</Text>
              </Pressable>

              {estaAberta && (
                <View style={{ marginTop: 10 }}>
                  {plano && ehPro && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: R.md, padding: 12, marginBottom: 10 }}>
                      <Icone nome="estudo-prova" tamanho={40} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.text }}>Plano até a prova</Text>
                        <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>{plano.texto}</Text>
                      </View>
                    </View>
                  )}
                  <View style={{ gap: 6, marginBottom: 10 }}>
                    {meus.map((t) => (
                      <Pressable key={t.id} onLongPress={() => confirmar('Apagar este tópico', `"${t.nome}" sai das revisões.`, 'Apagar', () => apagarTopico(t.id))} accessibilityLabel={`${t.nome}. ${firme(t) ? 'Firme' : `Revisão ${emDias(diasEntre(hoje, t.proxima))}`}. Segure para apagar.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <Text style={{ flex: 1, fontSize: 15, color: C.text }}>{t.nome}</Text>
                        <Text style={{ fontSize: 12, color: firme(t) ? C.successDim : C.textSub, fontFamily: F.bold }}>{firme(t) ? 'firme' : emDias(diasEntre(hoje, t.proxima))}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput value={novoTopico} onChangeText={(v) => setNovoTopico(v.slice(0, 80))} onSubmitEditing={() => adicionarTopico(m.id)} placeholder="Novo tópico, em forma de pergunta" placeholderTextColor={C.textMuted} accessibilityLabel={`Novo tópico de ${m.nome}`} returnKeyType="done" style={{ flex: 1, minWidth: 0, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 11, color: C.text, fontSize: 15, fontFamily: F.regular }} />
                    <Botao rotulo="Guardar" pequeno disabled={!novoTopico.trim()} onPress={() => adicionarTopico(m.id)} />
                  </View>
                  {meus.length > 0 && <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Segure um tópico para apagar.</Text>}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Botao rotulo="Mudar matéria" cor="claro" pequeno onPress={() => editar(m)} />
                    <Botao rotulo="Apagar" cor="claro" pequeno onPress={() => confirmar('Apagar a matéria', `${m.nome} e os ${meus.length} tópicos dela são apagados. O tempo estudado continua na conta.`, 'Apagar', () => apagarMateria(m.id))} />
                  </View>
                </View>
              )}
            </Peca>
          );
        })}
      </View>

      <Botao rotulo="Nova matéria" icone="estudo-caderno" onPress={nova} />
      {!ehPro && (
        <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginTop: 10, lineHeight: 19 }}>No grátis: {GRATIS_ESTUDOS.materias} matérias e {GRATIS_ESTUDOS.topicos} tópicos ({topicos.length} em uso). O Pro tira o limite e monta o plano até a prova.</Text>
      )}

      <Folha titulo={form === 'nova' ? 'Nova matéria' : 'Mudar matéria'} visivel={form !== null} aoFechar={() => setForm(null)}>
        <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} exemplo="Matemática" max={30} />
        <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>Cor</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }} accessibilityRole="radiogroup">
          {TINTAS_MATERIA.map((t) => (
            <Pressable key={t} onPress={() => setTinta(t)} accessibilityRole="radio" accessibilityState={{ selected: tinta === t }} accessibilityLabel={`Cor ${t}`} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TINTA[t][1], borderWidth: tinta === t ? 4 : 0, borderColor: C.text }} />
          ))}
        </View>
        {ehPro ? (
          <>
            <CampoTexto rotulo="Dia da prova (se tiver)" valor={prova} aoMudar={setProva} exemplo="25/12/2026" max={10} />
            {provaInvalida && <Text style={{ fontSize: 13, color: C.accentDim, marginTop: -8, marginBottom: 12 }}>Digite a data assim: 25/12 ou 25/12/2026.</Text>}
          </>
        ) : (
          <TrancaPro titulo="Plano até a prova" texto="Marque o dia da prova e o Plim encaixa as revisões antes dela." aoTocar={() => { setForm(null); aoPedirPro('Plano de estudo até a prova'); }} />
        )}
        <Botao rotulo="Guardar matéria" disabled={!nome.trim() || provaInvalida} onPress={salvar} />
      </Folha>
    </>
  );
}

// ───────────────────────── Evolução ─────────────────────────

function Evolucao({ ehPro, aoPedirPro }: PropsAba) {
  const { materias, topicos, sessoes } = useEstudosStore();
  const hoje = hojeLocal();
  const semana = useMemo(() => minutosDaSemana(sessoes, hoje), [sessoes, hoje]);
  const porMateria = useMemo(() => minutosPorMateria(sessoes, materias, hoje), [sessoes, materias, hoje]);
  const total = semana.reduce((s, d) => s + d.minutos, 0);
  const maior = Math.max(30, ...semana.map((d) => d.minutos));
  const f = fases(topicos);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Numero valor={tempoTexto(total)} legenda="nesta semana" icone="cronometro" tinta="roxo" />
        <Numero valor={sequenciaDeEstudo(sessoes, hoje)} legenda="dias seguidos" icone="chama" tinta="laranja" />
        <Numero valor={topicos.length} legenda="tópicos" icone="estudo-cartao" tinta="azul" />
      </View>

      <Peca estilo={{ marginBottom: 20 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>Minutos por dia</Text>
        <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 }}>
          {semana.map((d) => (
            <View key={d.data} style={{ flex: 1, alignItems: 'center' }} accessible accessibilityLabel={`${diaDaSemana(d.data)}: ${d.minutos} minutos`}>
              <Text style={{ fontSize: 11, color: C.textSub, height: 15 }}>{d.minutos || ''}</Text>
              <View style={{ width: '100%', height: d.minutos ? Math.max(8, (d.minutos / maior) * 80) : 6, borderRadius: 8, backgroundColor: d.minutos ? C.primary : C.track }} />
              <Text style={{ fontSize: 12, color: d.data === hoje ? C.text : C.textSub, fontFamily: d.data === hoje ? F.bold : F.regular, marginTop: 4 }}>{diaDaSemana(d.data)}</Text>
            </View>
          ))}
        </View>
      </Peca>

      <Secao titulo="Onde foi o seu tempo" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />
      {ehPro ? (
        <Peca estilo={{ marginBottom: 20 }}>
          {porMateria.length === 0 && <Text style={{ fontSize: 14, color: C.textSub }}>Nenhum estudo com cronômetro nesta semana.</Text>}
          {porMateria.map((p) => (
            <View key={p.materia?.id ?? 'sem'} style={{ marginBottom: 10 }}>
              <Linha rotulo={p.materia?.nome ?? 'Sem matéria'} valor={tempoTexto(p.minutos)} />
              <Barra valor={total ? p.minutos / total : 0} cor={TINTA[p.materia?.tinta ?? 'azul'][1]} altura={10} />
            </View>
          ))}
          <View style={{ borderTopWidth: 2, borderColor: C.border, marginTop: 4, paddingTop: 8 }}>
            <Linha rotulo="Tópicos novos" valor={String(f.novos)} />
            <Linha rotulo="Firmando" valor={String(f.firmando)} />
            <Linha rotulo="Firmes na memória" valor={String(f.firmes)} cor={C.successDim} />
          </View>
        </Peca>
      ) : (
        <TrancaPro titulo="Tempo por matéria e memória" texto="Veja em que matéria o tempo foi e quantos tópicos já estão firmes." aoTocar={() => aoPedirPro('Evolução dos estudos')} />
      )}

      <Secao titulo="Como estudar melhor" />
      <View style={{ gap: 10 }}>
        {COMO_ESTUDAR.map((d) => (
          <Peca key={d.titulo} padding={14}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{d.titulo}</Text>
            <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>{d.texto}</Text>
          </Peca>
        ))}
      </View>
    </>
  );
}
