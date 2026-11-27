import GymImagem from '@/components/GymImagem';
import Icone from '@/components/Icone';
import { Barra, Botao, Peca, Selo } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar, confirmar } from '@/lib/avisar';
import { hojeLocal } from '@/lib/dia';
import { montarPlano, proximoPasso, semanaDoPrograma, type Conselho, type DiaTreino, type SerieFeita } from '@/lib/gym';
import { EXERCICIO_POR_ID } from '@/lib/gymExercicios';
import { metasNutri } from '@/lib/gymNutri';
import { somAviso, somCarga, somDescanso, somInicio, somSerie, somTreino } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { dizer } from '@/stores/falaStore';
import { useGymStore } from '@/stores/gymStore';
import { useUserStore } from '@/stores/userStore';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const LADO = 220;
const TRACO = 16;
const RAIO = (LADO - TRACO) / 2;
const VOLTA = 2 * Math.PI * RAIO;

const num = (t: string) => Number(t.replace(',', '.')) || 0;
const fmt = (n: number) => String(n).replace('.', ',');
/** No resumo o conselho vale para o treino que vem, não para hoje. */
const paraDepois = (t: string) => t.replace(/Hoje /g, 'No próximo treino, ').replace(' hoje ', ' no próximo treino ').replace(/^Primeira vez: /, '');
const relogio = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

type Fase = 'aquecimento' | 'exercicio' | 'descanso' | 'fim';

interface Sessao {
  dia: DiaTreino;
  totalDias: number;
  semanaLeve: boolean;
  /** Histórico de antes do treino: o conselho de hoje sai dele, não do que a pessoa acabou de fazer. */
  conselhos: Record<string, Conselho>;
  comecouEm: number;
}

/** Contador com − e +, para mexer sem abrir o teclado. */
function Contador({ rotulo, valor, aoMudar, passo = 1 }: { rotulo: string; valor: string; aoMudar: (v: string) => void; passo?: number }) {
  const mexer = (d: number) => aoMudar(fmt(Math.max(0, Math.round((num(valor) + d) * 10) / 10)));
  const tecla = { width: 48, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceHigh, borderRadius: 14 } as const;
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6, textAlign: 'center' }}>{rotulo}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable onPress={() => mexer(-passo)} accessibilityRole="button" accessibilityLabel={`Diminuir ${rotulo}`} style={tecla}>
          <Text style={{ fontFamily: F.displayX, fontSize: 24, color: C.text }}>−</Text>
        </Pressable>
        <TextInput
          value={valor}
          onChangeText={(t) => aoMudar(t.replace(/[^0-9.,]/g, '').slice(0, 5))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          accessibilityLabel={rotulo}
          selectTextOnFocus
          style={{ flex: 1, minWidth: 0, height: 52, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: 14, color: C.text, fontSize: 22, fontFamily: F.displayX, textAlign: 'center' }}
        />
        <Pressable onPress={() => mexer(passo)} accessibilityRole="button" accessibilityLabel={`Aumentar ${rotulo}`} style={tecla}>
          <Text style={{ fontFamily: F.displayX, fontSize: 24, color: C.text }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** O treino guiado: aquecimento, série a série com imagem e carga, descanso cronometrado e resumo. */
export default function GymTreinoScreen() {
  const router = useRouter();
  const { carregado, perfil, inicio, proximo, historico, treinos, registrarTreino, pedirAba } = useGymStore();
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);

  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [fase, setFase] = useState<Fase>('aquecimento');
  const [idx, setIdx] = useState(0);
  const [feito, setFeito] = useState<Record<string, SerieFeita[]>>({});
  const [carga, setCarga] = useState('');
  const [reps, setReps] = useState('');
  const [verComo, setVerComo] = useState(true);
  const [descansoAte, setDescansoAte] = useState(0);
  const [descansoTotal, setDescansoTotal] = useState(60);
  const [cronoDesde, setCronoDesde] = useState(0);
  const [agora, setAgora] = useState(Date.now());
  const [premio, setPremio] = useState({ xp: 0, moedas: 0, completo: false });
  const bloqueado = useRef<boolean | null>(null);
  const avisouAlvo = useRef(false);
  const avisouCarga = useRef<Record<string, boolean>>({});
  const rolagem = useRef<ScrollView>(null);

  // Tira a foto do treino de hoje uma vez só: o plano não pode mudar no meio da sessão.
  useEffect(() => {
    if (!carregado || sessao || !perfil) return;
    if (bloqueado.current === null) bloqueado.current = !ehPro && treinos.length >= 1;
    if (bloqueado.current) return;
    const semana = inicio ? semanaDoPrograma(inicio, hojeLocal()) : 1;
    const plano = montarPlano(perfil, semana);
    const dia = plano.dias[proximo % plano.dias.length];
    const conselhos: Record<string, Conselho> = {};
    for (const i of dia.itens) {
      const e = EXERCICIO_POR_ID[i.exercicioId];
      conselhos[i.exercicioId] = proximoPasso(historico[i.exercicioId] ?? [], i, !!e.semCarga, i.porTempo);
    }
    setSessao({ dia, totalDias: plano.dias.length, semanaLeve: plano.semanaLeve, conselhos, comecouEm: Date.now() });
  }, [carregado, sessao, perfil, inicio, proximo, historico, treinos.length, ehPro]);

  const precisaRelogio = fase === 'descanso' || cronoDesde > 0;
  useEffect(() => {
    if (!precisaRelogio) return;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [precisaRelogio]);

  const item = sessao?.dia.itens[idx];
  const exercicio = item ? EXERCICIO_POR_ID[item.exercicioId] : undefined;

  // Ao chegar num exercício: carga sugerida, repetições da base da faixa e o aviso de subir carga.
  useEffect(() => {
    if (!sessao || !item || !exercicio) return;
    const conselho = sessao.conselhos[item.exercicioId];
    const ultima = (historico[item.exercicioId] ?? []).at(-1)?.series.at(-1);
    setCarga(exercicio.semCarga ? '' : conselho.carga ? fmt(conselho.carga) : ultima?.carga ? fmt(ultima.carga) : '');
    setReps(String(conselho.tipo === 'manter' && ultima ? Math.min(item.max, ultima.reps + 1) : item.min));
    setVerComo(conselho.tipo === 'primeira');
    setCronoDesde(0);
    avisouAlvo.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao, idx]);

  useEffect(() => {
    if (fase !== 'exercicio' || !sessao || !item) return;
    if (sessao.conselhos[item.exercicioId].tipo === 'subir' && !avisouCarga.current[item.exercicioId]) {
      avisouCarga.current[item.exercicioId] = true;
      somCarga();
      dizer('gym_carga');
    }
  }, [fase, sessao, item]);

  const faltaDescanso = Math.max(0, Math.ceil((descansoAte - agora) / 1000));
  useEffect(() => {
    if (fase === 'descanso' && descansoAte > 0 && faltaDescanso === 0) {
      somDescanso();
      setFase('exercicio');
      rolagem.current?.scrollTo({ y: 0, animated: false });
    }
  }, [fase, descansoAte, faltaDescanso]);

  const segurando = cronoDesde > 0 ? Math.floor((agora - cronoDesde) / 1000) : 0;
  useEffect(() => {
    if (cronoDesde > 0 && item && segurando >= item.max && !avisouAlvo.current) { avisouAlvo.current = true; somAviso(); }
  }, [cronoDesde, segurando, item]);

  if (!carregado) return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!perfil || bloqueado.current) return <Redirect href={'/gym' as never} />;
  if (!sessao) return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} />;

  const { dia } = sessao;
  const totalSeries = dia.itens.reduce((s, i) => s + i.series, 0);
  const seriesFeitas = Object.values(feito).reduce((s, l) => s + l.length, 0);

  function descansar(segundos: number) {
    setDescansoTotal(segundos);
    setDescansoAte(Date.now() + segundos * 1000);
    setAgora(Date.now());
    setFase('descanso');
    rolagem.current?.scrollTo({ y: 0, animated: false });
  }

  function finalizar(registro: Record<string, SerieFeita[]>, completo: boolean) {
    const jaTreinouHoje = treinos.some((t) => t.data === hojeLocal());
    const series = Object.values(registro).reduce((s, l) => s + l.length, 0);
    registrarTreino(dia.id, dia.nome, sessao!.totalDias, Object.fromEntries(dia.itens.map((i) => [i.exercicioId, { series: registro[i.exercicioId] ?? [], min: i.min, max: i.max }])));
    // XP só no primeiro treino do dia, para não virar fábrica de pontos.
    const xp = jaTreinouHoje ? 0 : Math.min(60, 10 + series * 3);
    const moedas = !jaTreinouHoje && completo ? 5 : 0;
    if (xp) addXp(xp);
    if (moedas) addMoedas(moedas);
    setPremio({ xp, moedas, completo });
    setFase('fim');
    if (completo) { somTreino(); dizer('gym_fim'); } else { somSerie(); dizer('gym_parou'); }
    rolagem.current?.scrollTo({ y: 0, animated: false });
  }

  function avancar(registro: Record<string, SerieFeita[]>, descanso: number) {
    if (idx >= dia.itens.length - 1) { finalizar(registro, true); return; }
    setIdx(idx + 1);
    descansar(descanso);
  }

  function serieFeita() {
    if (!item || !exercicio) return;
    const r = Math.round(cronoDesde > 0 ? segurando : num(reps));
    if (!(r > 0)) { avisar('Faltou um número', item.porTempo ? 'Diga quantos segundos você segurou.' : 'Diga quantas repetições você fez.'); return; }
    setCronoDesde(0);
    avisouAlvo.current = false;
    const serie: SerieFeita = { carga: exercicio.semCarga ? 0 : num(carga), reps: r };
    const registro = { ...feito, [item.exercicioId]: [...(feito[item.exercicioId] ?? []), serie] };
    setFeito(registro);
    somSerie();
    if (registro[item.exercicioId].length >= item.series) avancar(registro, item.descanso);
    else descansar(item.descanso);
  }

  /** O Gym costuma estar logo atrás desta tela; se a pessoa chegou direto pelo endereço, abre ele. */
  function voltarAoGym() {
    if (router.canGoBack()) router.back();
    else router.replace('/gym' as never);
  }

  function pedirSaida() {
    if (seriesFeitas === 0) { router.back(); return; }
    confirmar(
      'Encerrar o treino',
      ehPro ? 'O que você já fez fica guardado e conta para a sua evolução.' : 'O que você já fez fica guardado. Este era o seu treino de degustação: os próximos fazem parte do Pro.',
      'Encerrar',
      () => finalizar(feito, false),
    );
  }

  // ───────────────────────── resumo ─────────────────────────
  if (fase === 'fim') {
    const metas = metasNutri(perfil.peso, perfil.minutos);
    const volume = Object.values(feito).reduce((s, l) => s + l.reduce((a, x) => a + x.carga * x.reps, 0), 0);
    const minutos = Math.max(1, Math.round((Date.now() - sessao.comecouEm) / 60000));
    const novoHistorico = useGymStore.getState().historico;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: premio.completo ? C.successSoft : C.bg }}>
        <ScrollView ref={rolagem} style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 22, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Image source={require('../assets/cenas/vitoria.webp')} style={{ width: 170, height: 195 }} resizeMode="contain" accessible={false} />
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 30, color: C.text, marginTop: 8, textAlign: 'center' }}>
              {premio.completo ? 'Treino feito!' : 'Treino guardado'}
            </Text>
            <Text style={{ fontSize: 16, color: C.textSub, textAlign: 'center', marginTop: 4 }}>{dia.nome}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <Selo texto={`${seriesFeitas} de ${totalSeries} séries`} icone="forca" tinta="verde" />
              <Selo texto={`${minutos} min`} icone="cronometro" tinta="azul" />
              {volume > 0 && <Selo texto={`${fmt(Math.round(volume))} kg movidos`} icone="trofeu" tinta="ouro" />}
              {premio.xp > 0 && <Selo texto={`+${premio.xp} XP`} icone="estrela" />}
              {premio.moedas > 0 && <Selo texto={`+${premio.moedas} moedas`} icone="moeda" tinta="ouro" />}
            </View>
          </View>

          <Peca tinta="laranja" estilo={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>Agora, o que faz o treino valer</Text>
            <Text style={{ fontSize: 15, color: C.text, marginTop: 6, lineHeight: 22 }}>
              · Na próxima refeição, de {metas.refeicaoMin} a {metas.refeicaoMax} g de proteína.{'\n'}
              · Beba uns {metas.aguaTreino} ml de água nas próximas horas.{'\n'}
              · Durma bem: é dormindo que o músculo se recupera.
            </Text>
            <Botao rotulo="Ver ideias de pós-treino" cor="laranja" pequeno onPress={() => { pedirAba('comida'); voltarAoGym(); }} estilo={{ marginTop: 12 }} />
          </Peca>

          <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text, marginBottom: 8 }}>Para o próximo treino</Text>
          <View style={{ gap: 8, marginBottom: 18 }}>
            {dia.itens.filter((i) => (feito[i.exercicioId] ?? []).length > 0).map((i) => {
              const e = EXERCICIO_POR_ID[i.exercicioId];
              const c = proximoPasso(novoHistorico[i.exercicioId] ?? [], i, !!e.semCarga, i.porTempo);
              return (
                <Peca key={i.exercicioId} padding={12} tinta={c.tipo === 'subir' ? 'verde' : c.tipo === 'baixar' ? 'ouro' : undefined}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {c.tipo === 'subir' && <Icone nome="subiu" tamanho={26} />}
                    <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 15, color: C.text }}>{e.nome}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>
                    Hoje: {(feito[i.exercicioId] ?? []).map((s) => (s.carga > 0 ? `${fmt(s.carga)} kg × ${s.reps}` : `${s.reps}${i.porTempo ? ' s' : ''}`)).join(' · ')}
                  </Text>
                  <Text style={{ fontSize: 14, color: C.text, marginTop: 6, lineHeight: 20 }}>{paraDepois(c.texto)}</Text>
                </Peca>
              );
            })}
          </View>

          <Botao rotulo="Voltar ao Gym" onPress={voltarAoGym} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const topo = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <Pressable onPress={pedirSaida} accessibilityRole="button" accessibilityLabel="Encerrar o treino" style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: C.surface, borderWidth: 2, borderBottomWidth: 4, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.displayX, fontSize: 20, color: C.textSub }}>✕</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 5 }}>
          {fase === 'aquecimento' ? dia.nome : `Exercício ${idx + 1} de ${dia.itens.length} · ${seriesFeitas} de ${totalSeries} séries`}
        </Text>
        <Barra valor={seriesFeitas / totalSeries} cor={C.success} />
      </View>
    </View>
  );

  // ───────────────────────── aquecimento ─────────────────────────
  if (fase === 'aquecimento') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView ref={rolagem} style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {topo}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Icone nome="chama" tamanho={84} />
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 28, color: C.text, marginTop: 6 }}>Aquecimento</Text>
          </View>
          <Peca tinta="laranja" estilo={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 17, color: C.text, lineHeight: 25 }}>{dia.aquecimento}</Text>
          </Peca>
          <Peca padding={14} estilo={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>
              Antes do primeiro exercício com peso, faça uma série bem leve dele, só para o corpo lembrar o movimento. Essa não conta.
            </Text>
          </Peca>
          {sessao.semanaLeve && (
            <Peca tinta="roxo" padding={14} estilo={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>Semana leve: uma série a menos em tudo. Mantenha as cargas de sempre e saia inteiro.</Text>
            </Peca>
          )}
          <Text style={{ fontSize: 14, color: C.textSub, marginBottom: 14, lineHeight: 20 }}>
            Hoje: {dia.itens.map((i) => EXERCICIO_POR_ID[i.exercicioId].nome).join(' · ')}
          </Text>
          <Botao rotulo="Aqueci, vamos!" cor="verde" icone="forca" onPress={() => { setFase('exercicio'); somInicio(); dizer(sessao.semanaLeve ? 'gym_leve' : 'gym_inicio'); }} />
          <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 14, lineHeight: 19 }}>
            Dor aguda, tontura ou falta de ar fora do normal: pare na hora.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!item || !exercicio) return null;
  const series = feito[item.exercicioId] ?? [];
  const conselho = sessao.conselhos[item.exercicioId];
  const unidade = item.porTempo ? 'segundos' : 'repetições';

  // ───────────────────────── descanso ─────────────────────────
  if (fase === 'descanso') {
    const mudou = series.length === 0;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView ref={rolagem} style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {topo}
          <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 26, color: C.text, textAlign: 'center' }}>Descanse</Text>
          <Text style={{ fontSize: 15, color: C.textSub, textAlign: 'center', marginBottom: 14 }}>Respire fundo. Eu aviso quando for a hora.</Text>

          <View style={{ alignSelf: 'center', width: LADO, height: LADO, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }} accessibilityRole="timer" accessibilityLabel={`Faltam ${faltaDescanso} segundos de descanso`}>
            <Svg width={LADO} height={LADO} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={LADO / 2} cy={LADO / 2} r={RAIO} stroke={C.surfaceHigh} strokeWidth={TRACO} fill="none" />
              <Circle cx={LADO / 2} cy={LADO / 2} r={RAIO} stroke={C.primary} strokeWidth={TRACO} fill="none" strokeLinecap="round" strokeDasharray={VOLTA} strokeDashoffset={VOLTA * (1 - Math.min(1, faltaDescanso / descansoTotal))} />
            </Svg>
            <Text style={{ fontFamily: F.displayX, fontSize: 54, color: C.text }}>{relogio(faltaDescanso)}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <Botao rotulo="+30 s" cor="claro" onPress={() => { setDescansoAte((t) => t + 30000); setDescansoTotal((t) => t + 30); }} estilo={{ flex: 1 }} />
            <Botao rotulo="Pular descanso" cor="suave" onPress={() => { setDescansoAte(0); setFase('exercicio'); }} estilo={{ flex: 1.4 }} />
          </View>

          <Peca padding={14}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>{mudou ? 'Próximo exercício' : 'Em seguida'}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 18, color: C.text, marginTop: 2 }}>{exercicio.nome}</Text>
            <Text style={{ fontSize: 14, color: C.textSub, marginBottom: mudou ? 10 : 0 }}>
              Série {series.length + 1} de {item.series} · {item.min} a {item.max} {unidade}
            </Text>
            {mudou && <GymImagem id={exercicio.id} nome={exercicio.nome} altura={140} />}
          </Peca>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ───────────────────────── exercício ─────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView ref={rolagem} style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {topo}
        <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 23, color: C.text, lineHeight: 28 }}>{exercicio.nome}</Text>
        <Text style={{ fontSize: 14, color: C.textSub, marginTop: 2, marginBottom: 12 }}>{exercicio.musculos}</Text>
        <GymImagem id={exercicio.id} nome={exercicio.nome} altura={180} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 }}>
          <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.text }}>Série {series.length + 1} de {item.series}</Text>
          <Selo texto={`${item.min} a ${item.max} ${item.porTempo ? 's' : 'reps'}`} icone="alvo" tinta="azul" />
        </View>

        <Peca padding={12} tinta={conselho.tipo === 'subir' ? 'verde' : conselho.tipo === 'baixar' ? 'ouro' : 'roxo'} estilo={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>{conselho.texto}</Text>
        </Peca>

        {item.porTempo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Text style={{ fontFamily: F.displayX, fontSize: 34, color: cronoDesde > 0 && segurando >= item.max ? C.success : C.text, minWidth: 84 }} accessibilityRole="timer">{relogio(segurando)}</Text>
            {cronoDesde > 0
              ? <Botao rotulo="Parar e anotar" cor="laranja" onPress={serieFeita} estilo={{ flex: 1 }} />
              : <Botao rotulo="Cronometrar" cor="suave" icone="cronometro" onPress={() => { setAgora(Date.now()); setCronoDesde(Date.now()); somInicio(); }} estilo={{ flex: 1 }} />}
          </View>
        )}

        {cronoDesde === 0 && (
          <>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              {!exercicio.semCarga && <Contador rotulo="Carga (kg)" valor={carga} aoMudar={setCarga} />}
              <Contador rotulo={item.porTempo ? 'Segundos' : 'Repetições'} valor={reps} aoMudar={setReps} passo={item.porTempo ? 5 : 1} />
            </View>
            <Botao rotulo="Série feita" cor="verde" icone="forca" onPress={serieFeita} />
          </>
        )}

        {series.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {series.map((s, i) => (
              <View key={i} style={{ backgroundColor: C.successSoft, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.successDim }}>{i + 1}ª · {s.carga > 0 ? `${fmt(s.carga)} kg × ${s.reps}` : `${s.reps}${item.porTempo ? ' s' : ' reps'}`}</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable onPress={() => setVerComo((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: verComo }} style={{ marginTop: 20, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.display, fontSize: 17, color: C.primaryLight }}>Como fazer {verComo ? '▴' : '▾'}</Text>
        </Pressable>
        {verComo && (
          <Peca padding={14}>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.textSub, marginBottom: 4 }}>Preparo</Text>
            {exercicio.preparo.map((t, i) => <Text key={i} style={{ fontSize: 15, color: C.text, lineHeight: 23, marginBottom: 3 }}>· {t}</Text>)}
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.textSub, marginTop: 10, marginBottom: 4 }}>Movimento</Text>
            {exercicio.execucao.map((t, i) => <Text key={i} style={{ fontSize: 15, color: C.text, lineHeight: 23, marginBottom: 3 }}>{i + 1}. {t}</Text>)}
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.textSub, marginTop: 10, marginBottom: 4 }}>Respiração</Text>
            <Text style={{ fontSize: 15, color: C.text, lineHeight: 23 }}>{exercicio.respiracao}</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.textSub, marginTop: 10, marginBottom: 4 }}>Cuidado com</Text>
            {exercicio.erros.map((t, i) => <Text key={i} style={{ fontSize: 15, color: C.text, lineHeight: 23, marginBottom: 3 }}>· {t}</Text>)}
            <View style={{ backgroundColor: C.goldSoft, borderRadius: 14, padding: 12, marginTop: 10 }}>
              <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>💡 {exercicio.dica}</Text>
            </View>
          </Peca>
        )}

        <Pressable
          onPress={() => confirmar('Pular este exercício', series.length ? 'As séries que você já fez ficam guardadas.' : 'Ele fica sem registro hoje e volta no próximo treino.', 'Pular', () => avancar(feito, 30))}
          accessibilityRole="button"
          style={{ marginTop: 16, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 15, color: C.textSub, textDecorationLine: 'underline' }}>Pular este exercício</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
