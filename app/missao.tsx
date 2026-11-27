import Icone, { type NomeIcone } from '@/components/Icone';
import { Botao, Cabecalho, Peca, Selo } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { somAviso, somDesceu, somSubiu } from '@/lib/sons';
import { C, F } from '@/lib/theme';
import { AREAS, NIVEL_MAX, NIVEL_MAX_GRATIS, type AreaId } from '@/lib/trilhas';
import { dizer } from '@/stores/falaStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useTrilhaStore } from '@/stores/trilhaStore';
import { useUserStore } from '@/stores/userStore';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const CENAS: Partial<Record<AreaId, number>> = {
  estudo: require('../assets/cenas/ler.webp'),
  casa: require('../assets/cenas/limpar.webp'),
  filhos: require('../assets/cenas/filhos.webp'),
  pet: require('../assets/cenas/pet.webp'),
  trabalho: require('../assets/cenas/foco.webp'),
  mente: require('../assets/cenas/calma.webp'),
};

const LADO = 236;
const TRACO = 18;
const RAIO = (LADO - TRACO) / 2;
const VOLTA = 2 * Math.PI * RAIO;

function relogio(segundos: number) {
  const m = Math.floor(segundos / 60);
  return `${String(m).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
}

/** Missão cronometrada de uma trilha: relógio, "Terminei!" e o resultado (sobe ou desce de nível). */
export default function MissaoScreen() {
  const router = useRouter();
  const { ativa, ultimo, encerrar, limparResultado } = useTrilhaStore();
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const [agora, setAgora] = useState(Date.now());
  const avisos = useRef({ minuto: false, dez: false });

  const falta = ativa ? Math.max(0, Math.ceil((ativa.fimEm - agora) / 1000)) : 0;
  const acabou = !!ativa && falta === 0;

  useEffect(() => {
    if (!ativa) return;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [ativa]);

  // Avisos de tempo: um quando falta 1 minuto (em missões de 3 min ou mais) e um nos 10 segundos finais.
  useEffect(() => {
    if (!ativa || acabou) return;
    if (ativa.minutos >= 3 && falta <= 60 && falta > 55 && !avisos.current.minuto) { avisos.current.minuto = true; somAviso(); }
    if (falta <= 10 && falta > 0 && !avisos.current.dez) { avisos.current.dez = true; somAviso(); }
  }, [falta, ativa, acabou]);

  function fechar(sucesso: boolean) {
    const r = encerrar(sucesso, ehPro ? NIVEL_MAX : NIVEL_MAX_GRATIS);
    if (!r) return;
    addXp(r.xp);
    if (r.moedas) addMoedas(r.moedas);
    if (sucesso) {
      somSubiu();
      dizer(r.bateuNoTeto ? 'missao_teto' : 'missao_ok');
    } else {
      somDesceu();
      dizer('missao_falhou');
    }
  }

  function sair(para: '/trilhas' | '/(tabs)') {
    limparResultado();
    router.replace(para as never);
  }

  // ── resultado ──
  if (!ativa && ultimo) {
    const a = AREAS.find((x) => x.id === ultimo.area)!;
    const subiu = ultimo.nivelDepois > ultimo.nivelAntes;
    const desceu = ultimo.nivelDepois < ultimo.nivelAntes;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: ultimo.sucesso ? C.successSoft : C.bg }}>
        <View style={{ flex: 1, maxWidth: 480, width: '100%', alignSelf: 'center', padding: 22, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            {ultimo.sucesso
              ? <Image source={require('../assets/cenas/vitoria.webp')} style={{ width: 190, height: 218 }} resizeMode="contain" accessible={false} />
              : <Icone nome="desceu" tamanho={110} />}
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 30, color: C.text, marginTop: 10, textAlign: 'center' }}>
              {ultimo.sucesso ? 'Missão cumprida!' : 'O relógio ganhou essa'}
            </Text>
            <Text style={{ fontSize: 16, color: C.textSub, textAlign: 'center', marginTop: 6, lineHeight: 23 }}>{ultimo.titulo}</Text>
          </View>

          <Peca estilo={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icone nome={a.icone as NomeIcone} tamanho={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: C.textSub }}>Trilha {a.nome}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>
                  {subiu ? `Nível ${ultimo.nivelAntes} → ${ultimo.nivelDepois}` : desceu ? `Nível ${ultimo.nivelAntes} → ${ultimo.nivelDepois}` : `Continua no nível ${ultimo.nivelDepois}`}
                </Text>
              </View>
              {subiu && <Icone nome="subiu" tamanho={42} decorativo={false} rotulo="Subiu de nível" />}
              {desceu && <Icone nome="desceu" tamanho={42} decorativo={false} rotulo="Desceu de nível" />}
            </View>
            <Text style={{ fontSize: 14, color: C.textSub, marginTop: 10, lineHeight: 20 }}>
              {ultimo.sucesso
                ? (subiu ? 'A próxima missão vem um pouco maior.' : ultimo.bateuNoTeto ? 'Você está no topo do plano grátis nesta trilha.' : 'Você está no último nível. É o topo da trilha.')
                : (desceu ? 'Descer um nível não é castigo: a próxima missão vem menor, do seu tamanho.' : 'Você já está no primeiro nível. A missão continua pequena: tente de novo quando quiser.')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Selo texto={`+${ultimo.xp} XP`} icone="estrela" />
              {ultimo.moedas > 0 && <Selo texto={`+${ultimo.moedas} moedas`} icone="moeda" tinta="ouro" />}
            </View>
          </Peca>

          {ultimo.bateuNoTeto && (
            <Peca tinta="ouro" estilo={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Icone nome="coroa" tamanho={42} />
                <Text style={{ flex: 1, fontSize: 15, color: C.text, lineHeight: 21 }}>Você fechou o nível 5, o topo do grátis. Do 6 ao 10 as missões crescem, e isso faz parte do Pro.</Text>
              </View>
              <Botao rotulo="Ver o Plim Pro" cor="suave" pequeno onPress={() => abrirPaywall('Níveis 6 a 10 das trilhas')} />
            </Peca>
          )}

          <Botao rotulo="Escolher a próxima missão" cor={ultimo.sucesso ? 'verde' : 'roxo'} onPress={() => sair('/trilhas')} />
          <Botao rotulo="Voltar ao início" cor="claro" onPress={() => sair('/(tabs)')} estilo={{ marginTop: 10 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!ativa) return <Redirect href={'/trilhas' as never} />;

  // ── relógio ──
  const total = ativa.minutos * 60;
  const gasto = Math.min(1, (total - falta) / total);
  const cena = CENAS[ativa.area];
  const a = AREAS.find((x) => x.id === ativa.area)!;
  const noFinal = falta <= 10 && !acabou;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, maxWidth: 480, width: '100%', alignSelf: 'center', padding: 20 }}>
        <Cabecalho titulo={`Trilha ${a.nome}`} icone={a.icone as NomeIcone} sub={`Nível ${ativa.nivel}`} aoVoltar={() => router.replace('/trilhas' as never)} />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: LADO, height: LADO, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="timer" accessibilityLabel={acabou ? 'O tempo acabou' : `Faltam ${Math.ceil(falta / 60)} minutos`}>
            <Svg width={LADO} height={LADO} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={LADO / 2} cy={LADO / 2} r={RAIO} stroke={C.track} strokeWidth={TRACO} fill={C.surface} />
              <Circle cx={LADO / 2} cy={LADO / 2} r={RAIO} stroke={noFinal || acabou ? C.pink : C.accent} strokeWidth={TRACO} strokeLinecap="round" fill="none" strokeDasharray={`${VOLTA} ${VOLTA}`} strokeDashoffset={VOLTA * gasto} />
            </Svg>
            {cena && !acabou
              ? <Image source={cena} style={{ width: 118, height: 128, marginBottom: -6 }} resizeMode="contain" accessible={false} />
              : <Icone nome={acabou ? 'ampulheta' : 'cronometro'} tamanho={74} />}
            <Text style={{ fontFamily: F.displayX, fontSize: 38, color: C.text, lineHeight: 42 }}>{relogio(falta)}</Text>
          </View>

          <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 23, color: C.text, textAlign: 'center', marginTop: 22, lineHeight: 28 }}>{ativa.titulo}</Text>
          <Text style={{ fontSize: 15, color: C.textSub, textAlign: 'center', marginTop: 6, lineHeight: 22 }}>
            {acabou ? 'O tempo acabou. Deu para terminar?' : `Você se deu ${ativa.minutos} minutos. Pode deixar o app aberto ou sair: o relógio continua.`}
          </Text>
        </View>

        {acabou ? (
          <View style={{ gap: 10 }}>
            <Botao rotulo="Sim, terminei" cor="verde" icone="check" onPress={() => fechar(true)} />
            <Botao rotulo="Não deu" cor="claro" onPress={() => fechar(false)} />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Botao rotulo="Terminei!" cor="verde" icone="chegada" onPress={() => fechar(true)} />
            <Botao
              rotulo="Não vou conseguir agora"
              cor="claro"
              onPress={() => confirmar('Parar a missão', 'A trilha desce um nível e a próxima missão vem menor. Parar agora?', 'Parar', () => fechar(false))}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
