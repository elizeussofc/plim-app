import Icone, { type NomeIcone } from '@/components/Icone';
import { Almofada, Botao, Cabecalho, Peca, PecaBotao, Secao, Selo } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar, confirmar } from '@/lib/avisar';
import { somInicio, somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import {
  AREAS, fatorDeTempo, missoesDoNivel, NIVEL_MAX, NIVEL_MAX_GRATIS, opcoesDeTempo, RITMOS, sugerirAreas, TRILHAS_GRATIS,
  type Area, type AreaId, type Missao,
} from '@/lib/trilhas';
import { dizer } from '@/stores/falaStore';
import { loadOnboardingProfile, type PlimUserProfile } from '@/stores/onboardingStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useTrilhaStore, type TrilhaAtiva } from '@/stores/trilhaStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const area = (id: AreaId): Area => AREAS.find((a) => a.id === id)!;

/** Os dez degraus da trilha: feitos, o atual e os que ainda vêm (do 6 em diante, só no Pro). */
function Degraus({ nivel, ehPro }: { nivel: number; ehPro: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: NIVEL_MAX, now: nivel }}>
      {Array.from({ length: NIVEL_MAX }, (_, i) => i + 1).map((n) => {
        const trancado = !ehPro && n > NIVEL_MAX_GRATIS;
        const atual = n === nivel;
        return (
          <View
            key={n}
            style={{
              flex: 1, height: atual ? 16 : 10, borderRadius: 8,
              backgroundColor: n < nivel ? C.primary : atual ? C.accent : trancado ? C.goldSoft : C.track,
              borderWidth: trancado && n >= nivel ? 1 : 0, borderColor: '#F0D58A',
            }}
          />
        );
      })}
    </View>
  );
}

export default function TrilhasScreen() {
  const router = useRouter();
  const { trilhas, ativa, adicionarTrilha, removerTrilha, criarMissao, removerMissao, iniciar } = useTrilhaStore();
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);

  const [perfil, setPerfil] = useState<PlimUserProfile | null>(null);
  useEffect(() => { loadOnboardingProfile().then(setPerfil); }, []);
  const desafios = perfil?.answers.challenges ?? [];
  const sugeridas = sugerirAreas({ desafios, objetivo: perfil?.answers.goal });
  const fator = fatorDeTempo(desafios);

  const [aberta, setAberta] = useState<AreaId | null>(trilhas[0]?.area ?? null);
  const [novaArea, setNovaArea] = useState<Area | null>(null);
  const [escolhida, setEscolhida] = useState<Missao | null>(null);
  const [minutos, setMinutos] = useState(10);
  const [criandoEm, setCriandoEm] = useState<AreaId | null>(null);
  const [tituloProprio, setTituloProprio] = useState('');
  const [minutosProprio, setMinutosProprio] = useState('10');

  const disponiveis = AREAS.filter((a) => !trilhas.some((t) => t.area === a.id));

  function pedirTrilha(a: Area) {
    if (!ehPro && trilhas.length >= TRILHAS_GRATIS) { abrirPaywall('Mais de duas trilhas'); return; }
    setNovaArea(a);
  }

  function criarTrilha(nivel: number) {
    if (!novaArea) return;
    adicionarTrilha(novaArea.id, nivel);
    setAberta(novaArea.id);
    setNovaArea(null);
    somToque();
    dizer('trilha_nova');
  }

  function escolher(m: Missao) {
    if (ativa) { avisar('Já tem uma missão rodando', 'Termine a missão atual antes de começar outra.'); return; }
    setEscolhida(m);
    setMinutos(m.minutos);
  }

  function comecar() {
    if (!escolhida) return;
    iniciar(escolhida, minutos);
    setEscolhida(null);
    somInicio();
    dizer('missao_inicio');
    router.push('/missao' as never);
  }

  function pedirMissaoPropria(id: AreaId) {
    if (!ehPro) { abrirPaywall('Missões próprias'); return; }
    setTituloProprio('');
    setMinutosProprio('10');
    setCriandoEm(id);
  }

  function salvarMissaoPropria() {
    const min = parseInt(minutosProprio, 10);
    if (!criandoEm || !tituloProprio.trim() || !(min >= 1 && min <= 180)) return;
    criarMissao(criandoEm, tituloProprio, min);
    setCriandoEm(null);
    somToque();
  }

  function cartaoTrilha(t: TrilhaAtiva) {
    const a = area(t.area);
    const estaAberta = aberta === t.area;
    const noTeto = !ehPro && t.nivel >= NIVEL_MAX_GRATIS;
    const missoes = missoesDoNivel(t.area, t.nivel, t.proprias, fator);
    return (
      <Peca key={t.area} padding={0} estilo={{ overflow: 'hidden' }}>
        <Pressable
          onPress={() => setAberta(estaAberta ? null : t.area)}
          accessibilityRole="button"
          accessibilityState={{ expanded: estaAberta }}
          accessibilityLabel={`Trilha ${a.nome}, nível ${t.nivel} de ${NIVEL_MAX}. ${estaAberta ? 'Recolher' : 'Ver missões'}.`}
          style={{ padding: 14 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Almofada icone={a.icone as NomeIcone} tinta={a.tinta} tamanho={58} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>{a.nome}</Text>
              <Text style={{ fontSize: 13, color: C.textSub }}>{t.sucessos} {t.sucessos === 1 ? 'missão cumprida' : 'missões cumpridas'}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.displayX, fontSize: 26, color: C.accent, lineHeight: 28 }}>{t.nivel}</Text>
              <Text style={{ fontSize: 12, color: C.textSub }}>nível</Text>
            </View>
          </View>
          <Degraus nivel={t.nivel} ehPro={ehPro} />
        </Pressable>

        {estaAberta && (
          <View style={{ borderTopWidth: 2, borderColor: C.surfaceHigh, padding: 14, gap: 10 }}>
            {noTeto && (
              <PecaBotao tinta="ouro" padding={12} onPress={() => abrirPaywall('Níveis 6 a 10 das trilhas')} accessibilityLabel="Você chegou ao topo do plano grátis nesta trilha. Ver o Plim Pro.">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icone nome="coroa" tamanho={34} />
                  <Text style={{ flex: 1, fontSize: 14, color: C.text, lineHeight: 20 }}>Você chegou ao nível 5, o topo do grátis. As missões continuam valendo XP; do nível 6 ao 10 é no Pro.</Text>
                </View>
              </PecaBotao>
            )}
            {missoes.map((m) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceHigh, borderRadius: R.md, padding: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text, lineHeight: 21 }}>{m.titulo}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Icone nome="cronometro" tamanho={16} />
                    <Text style={{ fontSize: 13, color: C.textSub }}>cerca de {m.minutos} min{m.propria ? ' · sua' : ''}</Text>
                    {m.propria && (
                      <Pressable onPress={() => removerMissao(t.area, m.id)} accessibilityRole="button" accessibilityLabel={`Apagar a missão ${m.titulo}`} hitSlop={10}>
                        <Text style={{ fontSize: 13, color: C.textMuted, textDecorationLine: 'underline' }}>apagar</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
                <Botao rotulo="Começar" cor="laranja" pequeno onPress={() => escolher(m)} accessibilityLabel={`Começar: ${m.titulo}`} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Botao rotulo={ehPro ? '+ Missão minha' : '+ Missão minha (Pro)'} cor="suave" pequeno onPress={() => pedirMissaoPropria(t.area)} estilo={{ flex: 1 }} />
              <Botao
                rotulo="Sair da trilha"
                cor="claro"
                pequeno
                onPress={() => confirmar('Sair da trilha', `Sair da trilha ${a.nome}? O nível dela é apagado.`, 'Sair', () => removerTrilha(t.area))}
              />
            </View>
          </View>
        )}
      </Peca>
    );
  }

  const campo = { backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 16, fontFamily: F.regular } as const;
  const tempos = escolhida ? opcoesDeTempo(escolhida.minutos) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Cabecalho titulo="Trilhas" icone="placa" sub="Missões com relógio, do seu tamanho" />

        {ativa && (
          <PecaBotao tinta="laranja" onPress={() => router.push('/missao' as never)} estilo={{ marginBottom: 16 }} accessibilityLabel={`Missão em andamento: ${ativa.titulo}. Voltar para ela.`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icone nome="cronometro" tamanho={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.accentDim }}>Missão em andamento</Text>
                <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }} numberOfLines={2}>{ativa.titulo}</Text>
              </View>
              <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textMuted }}>›</Text>
            </View>
          </PecaBotao>
        )}

        {trilhas.length === 0 && (
          <Peca tinta="roxo" padding={0} estilo={{ marginBottom: 20, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <View style={{ flex: 1, padding: 18, paddingRight: 0 }}>
                <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 23, color: C.text, lineHeight: 27 }}>Escolha o que faz parte da sua vida</Text>
                <Text style={{ fontSize: 14, color: C.textSub, marginTop: 6, lineHeight: 20 }}>Cada trilha traz missões curtas com relógio. Cumpriu no tempo, sobe de nível. Não deu, desce um, e a próxima vem menor.</Text>
              </View>
              <Image source={require('../assets/cenas/ler.webp')} style={{ width: 124, height: 140, marginRight: 4 }} resizeMode="contain" accessible={false} />
            </View>
          </Peca>
        )}

        {trilhas.length > 0 && (
          <View style={{ gap: 12, marginBottom: 24 }}>
            {trilhas.map((t) => cartaoTrilha(t))}
          </View>
        )}

        {disponiveis.length > 0 && (
          <>
            <Secao
              titulo={trilhas.length === 0 ? 'Comece por uma' : 'Adicionar trilha'}
              direita={!ehPro ? <Selo texto={`${Math.min(trilhas.length, TRILHAS_GRATIS)} de ${TRILHAS_GRATIS} no grátis`} tinta="ouro" /> : undefined}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {disponiveis.map((a) => (
                <PecaBotao key={a.id} onPress={() => pedirTrilha(a)} estilo={{ flexBasis: '47%', flexGrow: 1 }} padding={12} accessibilityLabel={`Adicionar a trilha ${a.nome}. ${a.desc}.`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Almofada icone={a.icone as NomeIcone} tinta={a.tinta} tamanho={48} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{a.nome}</Text>
                      <Text style={{ fontSize: 12, color: sugeridas.includes(a.id) && trilhas.length === 0 ? C.accentDim : C.textSub, lineHeight: 16 }}>
                        {sugeridas.includes(a.id) && trilhas.length === 0 ? 'sugerida para você' : a.desc}
                      </Text>
                    </View>
                  </View>
                </PecaBotao>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Nova trilha: por onde começar */}
      <Modal visible={!!novaArea} animationType="slide" transparent onRequestClose={() => setNovaArea(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={() => setNovaArea(null)} accessibilityLabel="Fechar" />
        {novaArea && (
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <Almofada icone={novaArea.icone as NomeIcone} tinta={novaArea.tinta} tamanho={56} />
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>Trilha {novaArea.nome}</Text>
                <Text style={{ fontSize: 14, color: C.textSub }}>Como isso está na sua vida hoje?</Text>
              </View>
            </View>
            <View style={{ gap: 10, marginTop: 12 }}>
              {RITMOS.map((r) => (
                <PecaBotao key={r.id} onPress={() => criarTrilha(r.nivel)} padding={14} accessibilityLabel={`${r.rotulo}. ${r.desc}. Começa no nível ${r.nivel}.`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>{r.rotulo}</Text>
                      <Text style={{ fontSize: 13, color: C.textSub }}>{r.desc}</Text>
                    </View>
                    <Selo texto={`nível ${r.nivel}`} tinta="laranja" />
                  </View>
                </PecaBotao>
              ))}
            </View>
          </View>
        )}
      </Modal>

      {/* Antes de começar: em quanto tempo? */}
      <Modal visible={!!escolhida} animationType="slide" transparent onRequestClose={() => setEscolhida(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={() => setEscolhida(null)} accessibilityLabel="Fechar" />
        {escolhida && (
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.accentDim }}>Sua missão</Text>
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 23, color: C.text, lineHeight: 28, marginBottom: 14 }}>{escolhida.titulo}</Text>

            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text, marginBottom: 8 }}>Em quanto tempo você faz?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }} accessibilityRole="radiogroup">
              {tempos.map((t) => {
                const ativo = minutos === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setMinutos(t)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={`${t} minutos`}
                    style={{ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: ativo ? C.accentSoft : C.surface, borderWidth: ativo ? 3 : 2, borderBottomWidth: 5, borderColor: ativo ? C.accent : C.border }}
                  >
                    <Text style={{ fontFamily: F.display, fontSize: 17, color: ativo ? C.accentDim : C.textSub }}>{t} min</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
              <Botao rotulo="−" cor="claro" pequeno onPress={() => setMinutos((m) => Math.max(1, m - 1))} accessibilityLabel="Um minuto a menos" />
              <Text style={{ fontFamily: F.displayX, fontSize: 30, color: C.text, minWidth: 110, textAlign: 'center' }} accessibilityLiveRegion="polite">{minutos} min</Text>
              <Botao rotulo="+" cor="claro" pequeno onPress={() => setMinutos((m) => Math.min(180, m + 1))} accessibilityLabel="Um minuto a mais" />
            </View>
            <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginBottom: 14, lineHeight: 19 }}>
              Terminou antes do relógio zerar: a trilha sobe um nível. Não deu: desce um, e a próxima vem menor.
            </Text>
            <Botao rotulo="Valendo!" cor="laranja" icone="cronometro" onPress={comecar} />
          </View>
        )}
      </Modal>

      {/* Missão própria (Pro) */}
      <Modal visible={!!criandoEm} animationType="slide" transparent onRequestClose={() => setCriandoEm(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={() => setCriandoEm(null)} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 22, color: C.text, marginBottom: 14 }}>Missão do seu jeito</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>O que é?</Text>
          <TextInput value={tituloProprio} onChangeText={setTituloProprio} placeholder="Ex.: estudar para a prova de sexta" placeholderTextColor={C.textMuted} maxLength={70} autoFocus accessibilityLabel="Título da missão" style={[campo, { marginBottom: 14 }]} />
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>Tempo sugerido (minutos)</Text>
          <TextInput value={minutosProprio} onChangeText={(v) => setMinutosProprio(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" inputMode="numeric" accessibilityLabel="Tempo sugerido em minutos" style={[campo, { marginBottom: 18 }]} />
          <Botao rotulo="Guardar missão" onPress={salvarMissaoPropria} disabled={!tituloProprio.trim() || !(parseInt(minutosProprio, 10) >= 1 && parseInt(minutosProprio, 10) <= 180)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
