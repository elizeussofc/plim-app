import Icone from '@/components/Icone';
import { dizer } from '@/stores/falaStore';
import { somFoco } from '@/lib/sons';
import { Botao, Cabecalho } from '@/components/plim';
import { Text } from '@/components/Texto';
import { C, F, R } from '@/lib/theme';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const DURACOES = [5, 15, 25, 45];
const LADO = 252;
const TRACO = 18;
const RAIO = (LADO - TRACO) / 2;
const VOLTA = 2 * Math.PI * RAIO;

function formatarTempo(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SessaoFocoScreen() {
  const router = useRouter();
  const [duracaoMin, setDuracaoMin] = useState(25);
  const [restante, setRestante] = useState(25 * 60);
  const [rodando, setRodando] = useState(false);
  const [completo, setCompleto] = useState(false);
  /** Momento em que a sessão termina. O relógio conta por ele, então não atrasa com a aba em segundo plano. */
  const fimEm = useRef(0);

  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);
  const unlockConquista = useUserStore((s) => s.unlockConquista);
  const registrarEvento = useDesafiosStore((s) => s.registrarEvento);

  const total = duracaoMin * 60;

  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => {
      const falta = Math.max(0, Math.ceil((fimEm.current - Date.now()) / 1000));
      setRestante(falta);
      if (falta === 0) {
        clearInterval(id);
        setRodando(false);
        setCompleto(true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [rodando]);

  // Prêmio da sessão inteira: uma vez só, quando termina.
  useEffect(() => {
    if (!completo) return;
    somFoco();
    dizer('foco_completo');
    addXp(30);
    addMoedas(15);
    unlockConquista('foco_total');
    if (duracaoMin >= 20) registrarEvento('foco_20min')(addXp, addMoedas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completo]);

  function selecionarDuracao(min: number) {
    if (rodando) return;
    setDuracaoMin(min);
    setRestante(min * 60);
    setCompleto(false);
  }

  function iniciarPausar() {
    if (completo) return;
    if (!rodando) fimEm.current = Date.now() + restante * 1000;
    setRodando((v) => !v);
  }

  function encerrar() {
    // Parou antes do fim: os minutos feitos contam mesmo assim.
    if (!completo) {
      const minutosFeitos = Math.floor((total - restante) / 60);
      if (minutosFeitos >= 1) {
        addXp(minutosFeitos * 2);
        addMoedas(minutosFeitos);
        dizer('foco_parou');
      }
    }
    setRodando(false);
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)');
  }

  function recomecar() {
    setCompleto(false);
    setRestante(total);
  }

  const feito = completo ? 1 : (total - restante) / total;
  const cor = completo ? C.success : C.accent;
  const comecou = restante < total;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, maxWidth: 480, width: '100%', alignSelf: 'center', padding: 20 }}>
        <Cabecalho titulo="Sessão de Foco" icone="alvo" aoVoltar={encerrar} />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* Relógio */}
          <View
            style={{ width: LADO, height: LADO, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="timer"
            accessibilityLabel={completo ? 'Sessão completa' : `${Math.ceil(restante / 60)} minutos restantes`}
          >
            <Svg width={LADO} height={LADO} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={LADO / 2} cy={LADO / 2} r={RAIO} stroke={C.track} strokeWidth={TRACO} fill={C.surface} />
              <Circle
                cx={LADO / 2}
                cy={LADO / 2}
                r={RAIO}
                stroke={cor}
                strokeWidth={TRACO}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${VOLTA} ${VOLTA}`}
                strokeDashoffset={VOLTA * (1 - feito)}
              />
            </Svg>
            {completo ? (
              <View style={{ alignItems: 'center' }}>
                <Icone nome="festa" tamanho={70} />
                <Text style={{ fontFamily: F.displayX, fontSize: 24, color: C.text, marginTop: 4 }}>Completa!</Text>
                <Text style={{ fontSize: 15, color: C.textSub }}>+30 XP · +15 moedas</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: F.displayX, fontSize: 56, color: C.text, lineHeight: 62 }}>{formatarTempo(restante)}</Text>
                <Text style={{ fontSize: 15, color: C.textSub, marginTop: 2 }}>{rodando ? 'focando' : comecou ? 'em pausa' : 'pronto quando você estiver'}</Text>
              </View>
            )}
          </View>

          <Text style={{ fontSize: 15, color: C.textSub, textAlign: 'center', marginTop: 20, lineHeight: 22 }}>
            {completo ? 'Você ficou até o fim. Isso é grande.' : 'Parou no meio? Tudo bem: cada minuto conta.'}
          </Text>
        </View>

        {/* Duração */}
        {!rodando && !completo && !comecou && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }} accessibilityRole="radiogroup">
            {DURACOES.map((min) => {
              const ativo = duracaoMin === min;
              return (
                <Pressable
                  key={min}
                  onPress={() => selecionarDuracao(min)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={`${min} minutos`}
                  style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: ativo ? C.accentSoft : C.surface, borderWidth: ativo ? 3 : 2, borderBottomWidth: 5, borderColor: ativo ? C.accent : C.border }}
                >
                  <Text style={{ fontFamily: F.display, fontSize: 16, color: ativo ? C.accentDim : C.textSub }}>{min} min</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {completo ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Botao rotulo="Mais uma" cor="claro" onPress={recomecar} estilo={{ flex: 1 }} />
            <Botao rotulo="Concluir" cor="verde" onPress={encerrar} estilo={{ flex: 1 }} />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Botao rotulo={rodando ? 'Pausar' : comecou ? 'Continuar' : 'Começar agora'} cor={rodando ? 'claro' : 'laranja'} onPress={iniciarPausar} />
            {comecou && !rodando && <Botao rotulo="Encerrar e guardar os minutos" cor="claro" onPress={encerrar} />}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
