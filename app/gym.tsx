import GymImagem from '@/components/GymImagem';
import Icone from '@/components/Icone';
import { Barra, Botao, Cabecalho, Peca, PecaBotao, Secao, Selo } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { hojeLocal } from '@/lib/dia';
import { montarPlano, semanaDoPrograma, sugerirNivel, validarPerfil, type Experiencia, type Objetivo, type PerfilGym } from '@/lib/gym';
import { EXERCICIO_POR_ID, EXERCICIOS, NOME_GRUPO, type Cuidado, type Exercicio, type Grupo, type Local } from '@/lib/gymExercicios';
import { ALIMENTOS, AVISO_NUTRI, REGRA_DE_OURO, avaliarPrato, metasNutri, posTreino, preTreino, proteinaDoPrato } from '@/lib/gymNutri';
import { somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { dizer } from '@/stores/falaStore';
import { useGymStore } from '@/stores/gymStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TRIAGEM = [
  'Algum médico já disse que você tem um problema de coração e só deve fazer atividade física com acompanhamento?',
  'Você sente dor no peito quando faz esforço?',
  'No último mês, você sentiu dor no peito sem estar fazendo esforço?',
  'Você perde o equilíbrio por tontura ou já desmaiou?',
  'Você tem algum problema nos ossos ou nas articulações que pode piorar com exercício?',
  'Você toma remédio para pressão ou para o coração?',
  'Existe algum outro motivo para você não fazer atividade física?',
];

/** Fileira de opções em que só uma fica marcada. */
function Opcoes<T extends string | number>({ valor, opcoes, aoEscolher, rotulo }: { valor: T; opcoes: { id: T; nome: string; sub?: string }[]; aoEscolher: (v: T) => void; rotulo: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, marginBottom: 8 }}>{rotulo}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
        {opcoes.map((o) => {
          const ativo = valor === o.id;
          return (
            <Pressable
              key={String(o.id)}
              onPress={() => aoEscolher(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`${rotulo}: ${o.nome}${o.sub ? `, ${o.sub}` : ''}`}
              style={{ flexGrow: 1, flexBasis: opcoes.length > 4 ? '18%' : '30%', minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: R.md, backgroundColor: ativo ? C.glass : C.surface, borderWidth: ativo ? 3 : 2, borderBottomWidth: 5, borderColor: ativo ? C.primary : C.border }}
            >
              <Text style={{ fontFamily: F.display, fontSize: 15, color: ativo ? C.primaryLight : C.textSub, textAlign: 'center' }}>{o.nome}</Text>
              {o.sub && <Text style={{ fontSize: 12, color: C.textSub, textAlign: 'center' }}>{o.sub}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Detalhe({ e, aoFechar }: { e: Exercicio; aoFechar: () => void }) {
  const bloco = (titulo: string, itens: string[], numerado = false) => (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text, marginBottom: 4 }}>{titulo}</Text>
      {itens.map((t, i) => (
        <Text key={i} style={{ fontSize: 15, color: C.text, lineHeight: 23, marginBottom: 3 }}>{numerado ? `${i + 1}. ` : '· '}{t}</Text>
      ))}
    </View>
  );
  return (
    <Modal visible animationType="slide" transparent onRequestClose={aoFechar}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={aoFechar} accessibilityLabel="Fechar" />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '92%', width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 22, color: C.text, lineHeight: 27 }}>{e.nome}</Text>
          <Text style={{ fontSize: 14, color: C.textSub, marginTop: 2, marginBottom: 12 }}>{e.musculos}</Text>
          <GymImagem id={e.id} nome={e.nome} altura={190} />
          {bloco('Como se preparar', e.preparo, true)}
          {bloco('Como fazer', e.execucao, true)}
          {bloco('Respiração', [e.respiracao])}
          {bloco('Erros comuns', e.erros)}
          <View style={{ backgroundColor: C.goldSoft, borderRadius: 14, padding: 12, marginTop: 14 }}>
            <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>💡 {e.dica}</Text>
          </View>
          <Botao rotulo="Entendi" onPress={aoFechar} estilo={{ marginTop: 18 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Questionário de saúde e dados para montar o plano. */
function Formulario({ inicial, aoSalvar, aoCancelar }: { inicial: PerfilGym | null; aoSalvar: (p: PerfilGym) => void; aoCancelar?: () => void }) {
  const [respostas, setRespostas] = useState<(boolean | null)[]>(inicial ? TRIAGEM.map(() => false) : TRIAGEM.map(() => null));
  const [liberado, setLiberado] = useState(false);
  const [peso, setPeso] = useState(inicial ? String(inicial.peso) : '');
  const [altura, setAltura] = useState(inicial ? String(inicial.altura) : '');
  const [idade, setIdade] = useState(inicial ? String(inicial.idade) : '');
  const [experiencia, setExperiencia] = useState<Experiencia>(inicial?.experiencia ?? 'iniciante');
  const [objetivo, setObjetivo] = useState<Objetivo>(inicial?.objetivo ?? 'massa');
  const [local, setLocal] = useState<Local>(inicial?.local ?? 'academia');
  const [dias, setDias] = useState(inicial?.dias ?? 3);
  const [minutos, setMinutos] = useState(inicial?.minutos ?? 45);
  const [cuidados, setCuidados] = useState<Cuidado[]>(inicial?.cuidados ?? []);

  const respondeu = respostas.every((r) => r !== null);
  const algumSim = respostas.some((r) => r === true);
  const num = (t: string) => Number(t.replace(',', '.'));
  const perfil: PerfilGym = { peso: num(peso), altura: num(altura), idade: num(idade), experiencia, objetivo, local, dias, minutos, cuidados };
  const erros = validarPerfil(perfil);
  const pode = respondeu && (!algumSim || liberado) && erros.length === 0;
  const campo = { backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 17, fontFamily: F.regular, textAlign: 'center' } as const;

  return (
    <>
      <Peca tinta="roxo" estilo={{ marginBottom: 18 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 22, color: C.text }}>Primeiro, sua saúde</Text>
        <Text style={{ fontSize: 14, color: C.textSub, marginTop: 4, lineHeight: 20 }}>Sete perguntas rápidas, usadas em academias do mundo todo antes de começar a treinar.</Text>
      </Peca>

      {TRIAGEM.map((pergunta, i) => (
        <Peca key={i} padding={14} estilo={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 15, color: C.text, lineHeight: 22, marginBottom: 10 }}>{i + 1}. {pergunta}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            {([['Não', false], ['Sim', true]] as const).map(([rot, v]) => {
              const ativo = respostas[i] === v;
              return (
                <Pressable
                  key={rot}
                  onPress={() => setRespostas((r) => r.map((x, k) => (k === i ? v : x)))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={`Pergunta ${i + 1}: ${rot}`}
                  style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: ativo ? (v ? C.goldSoft : C.successSoft) : C.surfaceHigh, borderWidth: 2, borderColor: ativo ? (v ? C.gold : C.success) : 'transparent' }}
                >
                  <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text }}>{rot}</Text>
                </Pressable>
              );
            })}
          </View>
        </Peca>
      ))}

      {respondeu && algumSim && (
        <Peca tinta="ouro" estilo={{ marginBottom: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>Converse com um médico antes de começar</Text>
          <Text style={{ fontSize: 15, color: C.text, marginTop: 4, lineHeight: 22 }}>Você respondeu "sim" a pelo menos uma pergunta. Isso não proíbe o treino, mas pede uma avaliação antes. Leve essas respostas para a consulta.</Text>
          <Pressable onPress={() => setLiberado((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: liberado }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, minHeight: 44 }}>
            <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.gold, backgroundColor: liberado ? C.gold : C.surface, alignItems: 'center', justifyContent: 'center' }}>
              {liberado && <Text style={{ color: C.onPrimary, fontFamily: F.displayX, fontSize: 15 }}>✓</Text>}
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: C.text }}>Já conversei com um médico e fui liberado(a) para treinar.</Text>
          </Pressable>
        </Peca>
      )}

      <Secao titulo="Sobre você" />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {([['Peso (kg)', peso, setPeso], ['Altura (cm)', altura, setAltura], ['Idade', idade, setIdade]] as const).map(([rot, v, set]) => (
          <View key={rot} style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>{rot}</Text>
            <TextInput value={v} onChangeText={(t) => set(t.replace(/[^0-9.,]/g, '').slice(0, 5))} keyboardType="decimal-pad" inputMode="decimal" accessibilityLabel={rot} style={campo} />
          </View>
        ))}
      </View>

      <Opcoes rotulo="Sua experiência com musculação" valor={experiencia} aoEscolher={setExperiencia} opcoes={[{ id: 'iniciante', nome: 'Iniciante', sub: 'menos de 6 meses' }, { id: 'intermediario', nome: 'Intermediário', sub: '6 meses a 2 anos' }, { id: 'avancado', nome: 'Avançado', sub: 'mais de 2 anos' }]} />
      <Opcoes rotulo="O que você busca" valor={objetivo} aoEscolher={setObjetivo} opcoes={[{ id: 'massa', nome: 'Ganhar massa' }, { id: 'forca', nome: 'Ganhar força' }, { id: 'saude', nome: 'Saúde e disposição' }]} />
      <Opcoes rotulo="Onde você treina" valor={local} aoEscolher={setLocal} opcoes={[{ id: 'academia', nome: 'Academia' }, { id: 'halteres', nome: 'Casa, com halteres' }, { id: 'corpo', nome: 'Casa, sem equipamento' }]} />
      <Opcoes rotulo="Dias por semana" valor={dias} aoEscolher={setDias} opcoes={[2, 3, 4, 5, 6].map((d) => ({ id: d, nome: String(d) }))} />
      <Opcoes rotulo="Tempo por treino" valor={minutos} aoEscolher={setMinutos} opcoes={[30, 45, 60, 75].map((m) => ({ id: m, nome: `${m} min` }))} />

      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, marginBottom: 8 }}>Algum lugar pede cuidado? (opcional)</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
        {(['joelho', 'ombro', 'coluna'] as Cuidado[]).map((c) => {
          const ativo = cuidados.includes(c);
          return (
            <Pressable key={c} onPress={() => setCuidados((l) => (ativo ? l.filter((x) => x !== c) : [...l, c]))} accessibilityRole="checkbox" accessibilityState={{ checked: ativo }} accessibilityLabel={`Cuidado com ${c}`} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: ativo ? C.goldSoft : C.surface, borderWidth: ativo ? 3 : 2, borderBottomWidth: 5, borderColor: ativo ? C.gold : C.border }}>
              <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text }}>{c[0].toUpperCase() + c.slice(1)}</Text>
            </Pressable>
          );
        })}
      </View>

      {respondeu && erros.length > 0 && (peso || altura || idade) !== '' && (
        <Text style={{ fontSize: 14, color: C.accentDim, marginBottom: 10 }}>{erros.join(' ')}</Text>
      )}
      <Botao rotulo={inicial ? 'Guardar e refazer o plano' : 'Montar meu treino'} icone="trilha-corpo" onPress={() => aoSalvar(perfil)} disabled={!pode} />
      {!respondeu && <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 8 }}>Responda as sete perguntas para continuar.</Text>}
      {aoCancelar && <Botao rotulo="Cancelar" cor="claro" onPress={aoCancelar} estilo={{ marginTop: 10 }} />}
      <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 16, lineHeight: 19 }}>
        O Gym Plim monta um plano geral a partir de diretrizes públicas de treino. Ele não substitui o acompanhamento de um profissional de Educação Física, de um nutricionista ou de um médico.
      </Text>
    </>
  );
}

type Aba = 'treino' | 'comida' | 'exercicios';

export default function GymScreen() {
  const router = useRouter();
  const { carregado, perfil, inicio, proximo, treinos, abaPedida, pedirAba, salvarPerfil, apagarTudo } = useGymStore();
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const [aba, setAba] = useState<Aba>('treino');
  useEffect(() => { if (abaPedida) { setAba(abaPedida); pedirAba(null); } }, [abaPedida, pedirAba]);
  const [editando, setEditando] = useState(false);
  const [detalhe, setDetalhe] = useState<Exercicio | null>(null);
  const [verNotas, setVerNotas] = useState(false);
  const [antes, setAntes] = useState(90);
  const [jejum, setJejum] = useState(2);
  const [prato, setPrato] = useState<Record<string, number>>({});

  const semana = perfil && inicio ? semanaDoPrograma(inicio, hojeLocal()) : 1;
  const plano = useMemo(() => (perfil ? montarPlano(perfil, semana) : null), [perfil, semana]);
  const metas = perfil ? metasNutri(perfil.peso, perfil.minutos) : null;
  /** Grátis: o primeiro treino inteiro. Depois disso o Gym é do Pro. */
  const degustacaoUsada = !ehPro && treinos.length >= 1;

  function salvar(p: PerfilGym) {
    salvarPerfil(p);
    setEditando(false);
    somToque();
    dizer('gym_plano');
  }

  if (!carregado) return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} />;

  if (!perfil || !plano || !metas || editando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Cabecalho titulo="Gym Plim" icone="trilha-corpo" sub="Treino guiado que evolui com você" />
          <Formulario inicial={perfil} aoSalvar={salvar} aoCancelar={perfil ? () => setEditando(false) : undefined} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const dia = plano.dias[proximo % plano.dias.length];
  const subirNivel = sugerirNivel(perfil.experiencia, semana, treinos.length);
  const estaSemana = treinos.filter((t) => semanaDoPrograma(inicio, t.data) === semana).length;
  const proteina = proteinaDoPrato(prato);
  const nota = avaliarPrato(proteina, metas);
  const sugestaoAntes = preTreino(antes);
  const sugestaoDepois = posTreino(jejum, metas);

  function comecar() {
    if (degustacaoUsada) { abrirPaywall('Gym Plim'); return; }
    router.push('/gym-treino' as never);
  }

  function abrirDetalhe(e: Exercicio) {
    const noTreinoDeHoje = dia.itens.some((i) => i.exercicioId === e.id);
    if (!ehPro && !(noTreinoDeHoje && !degustacaoUsada)) { abrirPaywall('O passo a passo de todos os exercícios'); return; }
    setDetalhe(e);
  }

  const grupos = Object.keys(NOME_GRUPO) as Grupo[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Cabecalho titulo="Gym Plim" icone="trilha-corpo" sub={`Semana ${semana} · ${plano.divisao}`} direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }} accessibilityRole="tablist">
          {([['treino', 'Treino'], ['comida', 'Comida'], ['exercicios', 'Exercícios']] as const).map(([id, nome]) => {
            const ativo = aba === id;
            return (
              <Pressable key={id} onPress={() => setAba(id)} accessibilityRole="tab" accessibilityState={{ selected: ativo }} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: ativo ? C.primary : C.surface, borderWidth: 2, borderBottomWidth: 5, borderColor: ativo ? C.primaryDim : C.border }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: ativo ? C.onPrimary : C.textSub }}>{nome}</Text>
              </Pressable>
            );
          })}
        </View>

        {aba === 'treino' && (
          <>
            {!ehPro && (
              <Peca tinta="ouro" padding={14} estilo={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>
                  {degustacaoUsada ? 'Você fez seu treino de degustação. Para continuar evoluindo treino a treino, o Gym Plim faz parte do Pro.' : 'Seu primeiro treino é por nossa conta, completo e guiado. Depois, o Gym Plim faz parte do Pro.'}
                </Text>
                {degustacaoUsada && <Botao rotulo="Ver o Plim Pro" cor="suave" pequeno onPress={() => abrirPaywall('Gym Plim')} estilo={{ marginTop: 10 }} />}
              </Peca>
            )}

            <Peca tinta="verde" estilo={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.successDim }}>Seu próximo treino</Text>
              <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 24, color: C.text }}>{dia.nome}</Text>
              <Text style={{ fontSize: 15, color: C.textSub, marginBottom: 12 }}>{dia.foco} · cerca de {dia.minutos} min · {dia.itens.length} exercícios</Text>
              <Botao rotulo="Começar treino" cor="verde" icone="cronometro" onPress={comecar} />
            </Peca>

            <Peca padding={14} estilo={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.text }}>Treinos nesta semana</Text>
                <Text style={{ fontSize: 14, color: C.textSub }}>{estaSemana} de {plano.dias.length}</Text>
              </View>
              <Barra valor={estaSemana / plano.dias.length} cor={C.success} />
            </Peca>

            {subirNivel && (
              <Peca tinta="roxo" padding={14} estilo={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>Você já treina há {semana} semanas com constância. Que tal passar para o nível {subirNivel === 'intermediario' ? 'intermediário' : 'avançado'}?</Text>
                <Botao rotulo="Subir de nível" pequeno onPress={() => salvar({ ...perfil, experiencia: subirNivel })} estilo={{ marginTop: 10 }} />
              </Peca>
            )}

            <Secao titulo="O que tem no treino" />
            <View style={{ gap: 10, marginBottom: 18 }}>
              <Peca padding={12} tinta="laranja">
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.text }}>Aquecimento</Text>
                <Text style={{ fontSize: 14, color: C.textSub, marginTop: 2 }}>{dia.aquecimento}</Text>
              </Peca>
              {dia.itens.map((item) => {
                const e = EXERCICIO_POR_ID[item.exercicioId];
                return (
                  <PecaBotao key={item.exercicioId} padding={12} onPress={() => abrirDetalhe(e)} accessibilityLabel={`${e.nome}. ${item.series} séries. Ver como fazer.`}>
                    <GymImagem id={e.id} nome={e.nome} altura={110} marcas={false} />
                    <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text, marginTop: 8 }}>{e.nome}</Text>
                    <Text style={{ fontSize: 14, color: C.textSub }}>
                      {item.series} séries de {item.min} a {item.max} {item.porTempo ? 'segundos' : 'repetições'} · descanso {item.descanso >= 120 ? `${item.descanso / 60} min` : `${item.descanso} s`}
                    </Text>
                  </PecaBotao>
                );
              })}
            </View>

            <PecaBotao padding={14} onPress={() => setVerNotas((v) => !v)} accessibilityState={{ expanded: verNotas }} estilo={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>Como este plano foi montado {verNotas ? '▴' : '▾'}</Text>
              {verNotas && plano.notas.map((n, i) => <Text key={i} style={{ fontSize: 14, color: C.textSub, marginTop: 8, lineHeight: 21 }}>· {n}</Text>)}
              {verNotas && (
                <Text style={{ fontSize: 14, color: C.textSub, marginTop: 8, lineHeight: 21 }}>
                  · Séries por semana: {grupos.filter((g) => plano.seriesPorGrupo[g]).map((g) => `${NOME_GRUPO[g]} ${plano.seriesPorGrupo[g]}`).join(', ')}.
                </Text>
              )}
            </PecaBotao>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Botao rotulo="Mudar meus dados" cor="claro" pequeno onPress={() => setEditando(true)} estilo={{ flex: 1 }} />
              <Botao rotulo="Apagar tudo" cor="claro" pequeno onPress={() => confirmar('Apagar o Gym', 'Seu plano e todo o histórico de treinos somem de vez.', 'Apagar', apagarTudo)} />
            </View>
          </>
        )}

        {aba === 'comida' && (
          <>
            <Peca tinta="laranja" estilo={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.accentDim }}>Para os seus {String(perfil.peso).replace('.', ',')} kg</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                  <Icone nome="forca" tamanho={34} />
                  <Text style={{ fontFamily: F.displayX, fontSize: 19, color: C.text }}>{metas.proteinaMin} a {metas.proteinaMax} g</Text>
                  <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center' }}>de proteína por dia</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                  <Icone nome="gota" tamanho={34} />
                  <Text style={{ fontFamily: F.displayX, fontSize: 19, color: C.text }}>{(metas.aguaMin / 1000).toFixed(1).replace('.', ',')} a {(metas.aguaMax / 1000).toFixed(1).replace('.', ',')} L</Text>
                  <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center' }}>de água por dia</Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, color: C.text, marginTop: 10, lineHeight: 21 }}>
                Divida a proteína em 3 a 5 refeições, com {metas.refeicaoMin} a {metas.refeicaoMax} g em cada. Em dia de treino, some uns {metas.aguaTreino} ml de água. Sede e urina escura são o sinal de que falta.
              </Text>
            </Peca>

            <Secao titulo="Antes do treino" />
            <Opcoes rotulo="Quanto falta para treinar?" valor={antes} aoEscolher={setAntes} opcoes={[{ id: 180, nome: '3 h ou mais' }, { id: 90, nome: '1 a 2 h' }, { id: 40, nome: 'menos de 1 h' }, { id: 5, nome: 'é agora' }]} />
            <Peca padding={14} estilo={{ marginBottom: 18 }}>
              <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>{sugestaoAntes.titulo}</Text>
              <Text style={{ fontSize: 15, color: C.textSub, marginTop: 4, lineHeight: 22 }}>{sugestaoAntes.texto}</Text>
              {sugestaoAntes.ideias.map((t) => <Text key={t} style={{ fontSize: 15, color: C.text, marginTop: 6 }}>· {t}</Text>)}
              <Text style={{ fontSize: 14, color: C.textSub, marginTop: 10 }}>Água: de {metas.aguaAntesMin} a {metas.aguaAntesMax} ml ao longo das 4 horas antes.</Text>
            </Peca>

            <Secao titulo="Depois do treino" />
            <Opcoes rotulo="Sua última refeição foi há quanto tempo?" valor={jejum} aoEscolher={setJejum} opcoes={[{ id: 2, nome: 'menos de 4 h' }, { id: 5, nome: '4 h ou mais' }]} />
            <Peca padding={14} estilo={{ marginBottom: 18 }}>
              <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>{sugestaoDepois.titulo}</Text>
              <Text style={{ fontSize: 15, color: C.textSub, marginTop: 4, lineHeight: 22 }}>{sugestaoDepois.texto}</Text>
              {sugestaoDepois.ideias.map((t) => <Text key={t} style={{ fontSize: 15, color: C.text, marginTop: 6 }}>· {t}</Text>)}
            </Peca>

            <Secao titulo="Monte seu prato" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />
            {ehPro ? (
              <>
                <Peca tinta={nota === 'bom' ? 'verde' : nota === 'pouco' ? 'ouro' : undefined} padding={14} estilo={{ marginBottom: 10 }}>
                  <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.text }}>{proteina} g de proteína</Text>
                  <Text style={{ fontSize: 15, color: C.textSub, marginTop: 2 }}>
                    {nota === 'vazio' && `Toque nos alimentos para montar. A meta por refeição é de ${metas.refeicaoMin} a ${metas.refeicaoMax} g.`}
                    {nota === 'pouco' && `Faltam ${metas.refeicaoMin - proteina} g para chegar ao mínimo desta refeição.`}
                    {nota === 'bom' && 'Na medida para uma refeição.'}
                    {nota === 'sobrou' && 'Passou bastante da faixa. Não faz mal, mas pode guardar um pouco para a próxima refeição.'}
                  </Text>
                  <Barra valor={proteina / metas.refeicaoMax} cor={nota === 'pouco' ? C.gold : C.success} />
                </Peca>
                <View style={{ gap: 8, marginBottom: 14 }}>
                  {ALIMENTOS.map((a) => {
                    const qtd = prato[a.id] ?? 0;
                    return (
                      <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: qtd ? C.glass : C.surface, borderRadius: R.md, borderWidth: 2, borderColor: qtd ? C.borderPrimary : C.border, padding: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{a.nome}</Text>
                          <Text style={{ fontSize: 13, color: C.textSub }}>{a.porcao} · {a.proteina} g</Text>
                        </View>
                        <Botao rotulo="−" cor="claro" pequeno disabled={!qtd} onPress={() => setPrato((p) => ({ ...p, [a.id]: Math.max(0, qtd - 1) }))} accessibilityLabel={`Tirar uma porção de ${a.nome}`} />
                        <Text style={{ fontFamily: F.displayX, fontSize: 18, color: C.text, minWidth: 18, textAlign: 'center' }}>{qtd}</Text>
                        <Botao rotulo="+" cor="suave" pequeno onPress={() => setPrato((p) => ({ ...p, [a.id]: qtd + 1 }))} accessibilityLabel={`Pôr uma porção de ${a.nome}`} />
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <PecaBotao tinta="ouro" onPress={() => abrirPaywall('Monte seu prato')} estilo={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>Escolha os alimentos do seu pré ou pós-treino e veja na hora se a proteína fecha. Faz parte do Pro.</Text>
              </PecaBotao>
            )}

            <Peca padding={14}>
              <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>{REGRA_DE_OURO}</Text>
              <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 10, lineHeight: 19 }}>{AVISO_NUTRI}</Text>
            </Peca>
          </>
        )}

        {aba === 'exercicios' && grupos.map((g) => {
          const lista = EXERCICIOS.filter((e) => e.grupo === g);
          if (!lista.length) return null;
          return (
            <View key={g} style={{ marginBottom: 18 }}>
              <Secao titulo={NOME_GRUPO[g]} direita={<Text style={{ fontSize: 13, color: C.textSub }}>{lista.length}</Text>} />
              <View style={{ gap: 8 }}>
                {lista.map((e) => (
                  <PecaBotao key={e.id} padding={10} onPress={() => abrirDetalhe(e)} accessibilityLabel={`${e.nome}. Ver como fazer.`}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 132 }}><GymImagem id={e.id} nome={e.nome} altura={66} marcas={false} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, lineHeight: 20 }}>{e.nome}</Text>
                        <Text style={{ fontSize: 13, color: C.textSub }}>{{ academia: 'Academia', halteres: 'Com halteres', corpo: 'Sem equipamento' }[e.local]}</Text>
                      </View>
                    </View>
                  </PecaBotao>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {detalhe && <Detalhe e={detalhe} aoFechar={() => setDetalhe(null)} />}
    </SafeAreaView>
  );
}
