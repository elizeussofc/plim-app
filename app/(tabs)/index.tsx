import AvatarPersonagem from '@/components/AvatarPersonagem';
import { Balao, useFalaVisivel } from '@/components/Balao';
import Icone, { type NomeIcone } from '@/components/Icone';
import { Almofada, Barra, Botao, Numero, Peca, PecaBotao, Secao, Selo, Tela } from '@/components/plim';
import TermometroRotina, { calcularScoreRotina, expressaoDoScore } from '@/components/TermometroRotina';
import { Text } from '@/components/Texto';
import { concluirTarefa } from '@/lib/cicloDiario';
import { diasDesdeUltimoAtivo } from '@/lib/dia';
import { situacaoAoAbrir } from '@/lib/falas';
import { FERRAMENTAS, useAbrirFerramenta, type Ferramenta } from '@/lib/ferramentas';
import { getMensagemDoDia } from '@/lib/mensagensDoDia';
import { C, F } from '@/lib/theme';
import { AREAS, missoesDoNivel } from '@/lib/trilhas';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { dizer } from '@/stores/falaStore';
import { loadOnboardingProfile, type Chronotype, type PlimUserProfile } from '@/stores/onboardingStore';
import { useRotinaStore, type Tarefa } from '@/stores/rotinaStore';
import { useTrilhaStore } from '@/stores/trilhaStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

/** O avatar cumprimenta uma vez por abertura do app, não a cada volta ao Início. */
let falouAoAbrir = false;

const ATALHOS: Ferramenta[] = [FERRAMENTAS.despejo, FERRAMENTAS.foco, FERRAMENTAS.calma, FERRAMENTAS.ia];

const SUGESTAO_FOCO: Record<Chronotype, { texto: string; horario: string }> = {
  morning:   { texto: 'Seu pico de foco é de manhã',  horario: '8h'  },
  afternoon: { texto: 'Seu pico de foco é à tarde',   horario: '14h' },
  night:     { texto: 'Seu pico de foco é à noite',   horario: '20h' },
  dawn:      { texto: 'Você rende de madrugada',      horario: '1h'  },
};

/** A próxima tarefa pendente, na ordem do horário (as sem horário ficam por último). */
function proximaTarefa(tarefas: Tarefa[]): Tarefa | null {
  const pendentes = tarefas.filter((t) => t.status === 'pendente');
  if (pendentes.length === 0) return null;
  const hora = (t: Tarefa) => (/^\d{1,2}:\d{2}$/.test(t.horario) ? t.horario.padStart(5, '0') : '99:99');
  return [...pendentes].sort((a, b) => hora(a).localeCompare(hora(b)))[0];
}

/** Um passo só, bem grande: é o que a pessoa precisa ver ao abrir o app. */
function ProximoPasso() {
  const router = useRouter();
  const tarefas = useRotinaStore((s) => s.tarefas);
  const proxima = proximaTarefa(tarefas);
  const feitas = tarefas.filter((t) => t.status === 'feita').length;

  if (tarefas.length === 0) {
    return (
      <Peca tinta="roxo" estilo={{ marginBottom: 16 }}>
        <Text style={{ fontFamily: F.display, fontSize: 20, color: C.text }}>Monte sua rotina</Text>
        <Text style={{ fontSize: 14, color: C.textSub, marginTop: 4, marginBottom: 14, lineHeight: 20 }}>Comece com uma tarefa só. Pode ser beber água.</Text>
        <Botao rotulo="Criar primeira tarefa" icone="rotina" onPress={() => router.push('/(tabs)/rotina')} />
      </Peca>
    );
  }

  if (!proxima) {
    return (
      <Peca tinta="verde" padding={0} estilo={{ marginBottom: 16, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, padding: 18, paddingRight: 0 }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 22, color: C.text, lineHeight: 26 }}>
              {feitas === tarefas.length ? 'Rotina de hoje completa!' : 'Nada pendente por hoje'}
            </Text>
            <Text style={{ fontSize: 14, color: C.textSub, marginTop: 6, lineHeight: 20 }}>
              {feitas === tarefas.length ? 'Você fez tudo o que planejou. Descanse sem culpa.' : 'O que ficou para trás não some: amanhã é outro dia.'}
            </Text>
          </View>
          <Image source={require('../../assets/cenas/vitoria.webp')} style={{ width: 118, height: 136, marginRight: 8, marginVertical: 8 }} resizeMode="contain" accessible={false} />
        </View>
      </Peca>
    );
  }

  return (
    <Peca tinta="roxo" estilo={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.primaryLight }}>Seu próximo passo</Text>
        <Selo texto={`${feitas} de ${tarefas.length} feitas`} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <View style={{ width: 66, height: 66, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 34 }}>{proxima.icone}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 23, color: C.text, lineHeight: 27 }} numberOfLines={2}>{proxima.titulo}</Text>
          <Text style={{ fontSize: 14, color: C.textSub, marginTop: 2 }}>
            {proxima.categoria}{/^\d{1,2}:\d{2}$/.test(proxima.horario) ? ` · ${proxima.horario}` : ''}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Botao rotulo="Feito!" cor="verde" icone="check" onPress={() => concluirTarefa(proxima.id)} estilo={{ flex: 2 }} accessibilityLabel={`Marcar ${proxima.titulo} como feita`} />
        <Botao rotulo="Rotina" cor="claro" onPress={() => router.push("/(tabs)/rotina")} estilo={{ flex: 1 }} accessibilityLabel="Ver a rotina inteira" />
      </View>
    </Peca>
  );
}

/** Atalho para as trilhas: a missão em andamento, a próxima sugerida ou o convite para montar a primeira. */
function CartaoTrilhas() {
  const router = useRouter();
  const trilhas = useTrilhaStore((s) => s.trilhas);
  const ativa = useTrilhaStore((s) => s.ativa);
  const primeira = trilhas[0];
  const area = primeira ? AREAS.find((a) => a.id === primeira.area) : null;
  const proxima = primeira ? missoesDoNivel(primeira.area, primeira.nivel, primeira.proprias)[0] : null;

  const icone: NomeIcone = ativa ? 'cronometro' : area ? (area.icone as NomeIcone) : 'placa';
  const sobre = ativa ? 'Missão em andamento' : area ? `Trilha ${area.nome} · nível ${primeira.nivel}` : 'Novo: Trilhas';
  const titulo = ativa ? ativa.titulo : proxima ? proxima.titulo : 'Missões com relógio para estudo, casa, filhos, pet e mais';
  return (
    <PecaBotao
      tinta="laranja"
      padding={14}
      estilo={{ marginBottom: 16 }}
      onPress={() => router.push((ativa ? '/missao' : '/trilhas') as never)}
      accessibilityLabel={`${sobre}. ${titulo}. Abrir.`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icone nome={icone} tamanho={46} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.accentDim }}>{sobre}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text, lineHeight: 21 }} numberOfLines={2}>{titulo}</Text>
        </View>
        <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textMuted }}>›</Text>
      </View>
    </PecaBotao>
  );
}

export default function InicioScreen() {
  const router   = useRouter();
  const abrir    = useAbrirFerramenta();
  const profile  = useUserStore((s) => s.profile);
  const tarefas  = useRotinaStore((s) => s.tarefas);
  const desafios = useDesafiosStore((s) => s.desafios);

  const [plimProfile, setPlimProfile] = useState<PlimUserProfile | null>(null);
  useEffect(() => { loadOnboardingProfile().then(setPlimProfile); }, []);

  const apelido  = profile?.apelido ?? profile?.nome ?? plimProfile?.profileType.name ?? 'Viajante';
  const hora     = new Date().getHours();
  const saudacao = hora < 5 ? 'Boa madrugada' : hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const mensagemDoDia = getMensagemDoDia(plimProfile?.profileType.id ?? 'explorador');
  const cronotipo    = plimProfile?.answers.chronotype ?? null;
  const sugestaoFoco = cronotipo ? SUGESTAO_FOCO[cronotipo] : null;
  const ehPro = profile.plano === 'pro';

  const xpProxNivel = profile.nivel * 100;
  const xpPct       = Math.min(profile.xp_total / xpProxNivel, 1);

  const desafiosAtivos    = desafios.filter((d) => !d.completo);
  const desafiosCompletos = desafios.length - desafiosAtivos.length;

  const expressao = expressaoDoScore(calcularScoreRotina(tarefas, profile.streak, profile.xp_total));
  const fala = useFalaVisivel();

  // Ao abrir o app, o avatar comenta como está o dia (depois de ler o que estava salvo).
  useEffect(() => {
    if (falouAoAbrir) return;
    const t = setTimeout(() => {
      if (falouAoAbrir) return;
      falouAoAbrir = true;
      const rotina = useRotinaStore.getState();
      dizer(situacaoAoAbrir({
        hora: new Date().getHours(),
        feitas: rotina.tarefas.filter((x) => x.status === 'feita').length,
        puladas: rotina.tarefas.filter((x) => x.status === 'pulada').length,
        total: rotina.tarefas.length,
        sequencia: useUserStore.getState().profile.streak,
        diasParado: diasDesdeUltimoAtivo(rotina.historicoDias),
      }));
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <Tela espacoFinal={130}>
      {/* Saudação */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, color: C.textSub }}>{saudacao},</Text>
          <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: apelido.length > 12 ? 23 : 30, color: C.text, lineHeight: apelido.length > 12 ? 27 : 34 }} numberOfLines={2}>
            {apelido}!
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/perfil')} accessibilityLabel="Abrir meu perfil" accessibilityRole="button" hitSlop={8}>
          <View style={{ borderRadius: 36, borderWidth: 3, borderColor: C.primary, borderBottomWidth: 6 }}>
            <AvatarPersonagem config={profile.avatar_config} expressao={fala?.humor ?? expressao} size={62} />
          </View>
        </Pressable>
      </View>

      {/* O avatar fala: comenta o que a pessoa fez (ou não fez) */}
      {fala && <Balao fala={fala} ponta="cima-direita" estilo={{ marginTop: -8, marginBottom: 16, marginLeft: 36 }} />}

      <ProximoPasso />
      <CartaoTrilhas />

      {/* Números */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <Numero valor={profile.streak} legenda={profile.streak === 1 ? 'dia seguido' : 'dias seguidos'} icone="chama" tinta="laranja" />
        <Numero valor={profile.xp_total} legenda="XP" icone="estrela" tinta="roxo" />
        <Numero valor={profile.moedas} legenda="moedas" icone="moeda" tinta="ouro" />
      </View>
      <Peca padding={14} estilo={{ marginBottom: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icone nome="escudo" tamanho={32} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.text }}>Nível {profile.nivel}</Text>
              <Text style={{ fontSize: 13, color: C.textSub }}>{profile.xp_total}/{xpProxNivel} XP</Text>
            </View>
            <Barra valor={xpPct} altura={10} />
          </View>
        </View>
      </Peca>

      {/* Rotina de hoje */}
      <View style={{ marginBottom: 22 }}>
        <TermometroRotina />
      </View>

      {/* Atalhos */}
      <Secao titulo="Precisa de ajuda agora?" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        {ATALHOS.map((f) => (
          <PecaBotao
            key={f.rota}
            onPress={() => abrir(f)}
            accessibilityLabel={`${f.titulo}. ${f.desc}${f.pro && !ehPro ? ' Faz parte do Plim Pro.' : ''}`}
            estilo={{ flexBasis: '47%', flexGrow: 1 }}
            padding={14}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Almofada icone={f.icone} tinta={f.tinta} tamanho={52} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, lineHeight: 19 }}>{f.titulo}</Text>
                {f.pro && !ehPro && <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.gold }}>Pro</Text>}
              </View>
            </View>
          </PecaBotao>
        ))}
      </View>

      {/* Sugestão pelo cronotipo */}
      {sugestaoFoco && (
        <Peca tinta="laranja" padding={14} estilo={{ marginBottom: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icone nome="lampada" tamanho={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{sugestaoFoco.texto}</Text>
              <Text style={{ fontSize: 14, color: C.textSub, marginTop: 1 }}>Que tal uma sessão de foco às {sugestaoFoco.horario}?</Text>
            </View>
            <Botao rotulo="Focar" cor="laranja" pequeno onPress={() => router.push('/sessao-foco')} accessibilityLabel="Iniciar sessão de foco" />
          </View>
        </Peca>
      )}

      {/* Mensagem do dia */}
      <Peca padding={16} estilo={{ marginBottom: 22 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Icone nome="conversa" tamanho={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.primaryLight, marginBottom: 3 }}>Mensagem do dia</Text>
            <Text style={{ fontSize: 16, color: C.text, lineHeight: 24 }}>{mensagemDoDia}</Text>
          </View>
        </View>
      </Peca>

      {/* Desafios da semana */}
      <Secao titulo="Desafios da semana" direita={<Selo texto={`${desafiosCompletos} de ${desafios.length}`} tinta={desafiosAtivos.length === 0 ? 'verde' : 'roxo'} />} />
      <View style={{ gap: 10 }}>
        {desafiosAtivos.slice(0, 2).map((d) => (
          <Peca key={d.id} padding={14}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 28 }}>{d.icone}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text, flex: 1 }} numberOfLines={1}>{d.titulo}</Text>
                  <Text style={{ fontSize: 13, color: C.textSub }}>{d.progresso}/{d.meta}</Text>
                </View>
                <Barra valor={d.progresso / d.meta} altura={9} />
              </View>
              <Selo texto={`+${d.xp} XP`} />
            </View>
          </Peca>
        ))}
        {desafiosAtivos.length === 0 && (
          <Peca tinta="ouro" estilo={{ alignItems: 'center' }}>
            <Icone nome="trofeu" tamanho={54} />
            <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text, marginTop: 6 }}>Todos os desafios da semana feitos!</Text>
          </Peca>
        )}
      </View>
    </Tela>
  );
}
