import AvatarPalco from '@/components/AvatarPalco';
import AvatarPersonagem from '@/components/AvatarPersonagem';
import GrupoNoPerfil from '@/components/grupo/GrupoNoPerfil';
import { Balao, useFalaVisivel } from '@/components/Balao';
import Icone from '@/components/Icone';
import { Almofada, Barra, Botao, Numero, Peca, PecaBotao, Secao, Selo, Tela } from '@/components/plim';
import { calcularScoreRotina, expressaoDoScore } from '@/components/TermometroRotina';
import { Text } from '@/components/Texto';
import {
  chaveAvatar, normalizarAvatar, OPCOES_CABELO, OPCOES_CALCA, OPCOES_COR_CABELO, OPCOES_FUNDO, OPCOES_MOLETOM, OPCOES_PELE,
} from '@/lib/avatar';
import { avisar } from '@/lib/avisar';
import { dataLocal, hojeLocal } from '@/lib/dia';
import { limparInstagram } from '@/lib/grupo';
import { somToque } from '@/lib/sons';
import { supabase } from '@/lib/supabase';
import { C, F, R } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { dizer } from '@/stores/falaStore';
import { useGrupoStore } from '@/stores/grupoStore';
import { loadOnboardingProfile, type PlimUserProfile } from '@/stores/onboardingStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { StatusDia, useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';

const CONQUISTA_HINTS: Record<string, string> = {
  primeiro_passo: 'Complete 1 tarefa na sua Rotina.',
  despejou: 'Use o Despejo Mental pelo menos uma vez.',
  foco_total: 'Complete uma Sessão de Foco.',
  tres_dias: 'Mantenha uma sequência de 3 dias.',
  comunidade: 'Compartilhe algo no Grupo.',
  semana_perfeita: 'Mantenha uma sequência de 7 dias.',
};

const corDia: Record<StatusDia, string> = {
  vazia: C.track,
  parcial: C.borderPrimary,
  completa: C.primary,
};

function gerarUltimos35Dias(): string[] {
  const dias: string[] = [];
  const hoje = new Date();
  for (let i = 34; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    dias.push(dataLocal(d));
  }
  return dias;
}

/** Fileira de cores para escolher (pele, cabelo, roupa, fundo). */
function Cores({ titulo, opcoes, atual, aoEscolher }: { titulo: string; opcoes: string[]; atual: string; aoEscolher: (hex: string) => void }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, marginBottom: 8 }}>{titulo}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {opcoes.map((hex) => {
          const ativo = atual.toUpperCase() === hex.toUpperCase();
          return (
            <Pressable
              key={hex}
              onPress={() => aoEscolher(hex)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`${titulo}: cor ${hex}`}
              hitSlop={4}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `#${hex}`, borderWidth: ativo ? 4 : 2, borderColor: ativo ? C.primary : C.border, alignItems: 'center', justifyContent: 'center' }}
            >
              {ativo && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.surface, borderWidth: 2, borderColor: C.primary }} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Opcao({ ativo, rotulo, aoTocar }: { ativo: boolean; rotulo: string; aoTocar: () => void }) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: R.md,
        backgroundColor: ativo ? C.primary : C.surface,
        borderWidth: 2,
        borderBottomWidth: pressed ? 2 : 5,
        marginTop: pressed ? 3 : 0,
        borderColor: ativo ? C.primaryDim : C.border,
      })}
    >
      <Text style={{ fontFamily: F.display, fontSize: 15, color: ativo ? C.onPrimary : C.textSub }}>{rotulo}</Text>
    </Pressable>
  );
}

export default function PerfilScreen() {
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const { profile, updateProfile, updateAvatarConfig } = useUserStore();
  const historicoDias = useRotinaStore((s) => s.historicoDias);
  const tarefas = useRotinaStore((s) => s.tarefas);
  const desafios = useDesafiosStore((s) => s.desafios);
  const dias35 = gerarUltimos35Dias();
  const semanas = Array.from({ length: 5 }, (_, i) => dias35.slice(i * 7, i * 7 + 7));
  const isPro = profile.plano === 'pro';
  const abrirPaywall = usePaywallStore((s) => s.abrir);

  const [plimProfile, setPlimProfile] = useState<PlimUserProfile | null>(null);
  const [modalAvatar, setModalAvatar] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [hintAberto, setHintAberto] = useState<string | null>(null);
  useEffect(() => { loadOnboardingProfile().then(setPlimProfile); }, []);

  const [editNome, setEditNome] = useState(profile.nome ?? '');
  const [editApelido, setEditApelido] = useState(profile.apelido ?? '');
  const [editBio, setEditBio] = useState(profile.bio ?? '');
  const [editInstagram, setEditInstagram] = useState(profile.instagram ?? '');

  const nivel = profile.nivel;
  const xp = profile.xp_total;
  const xpProxNivel = nivel * 100;
  const xpPct = Math.min(xp / xpProxNivel, 1);
  const score = calcularScoreRotina(tarefas, profile.streak, xp);
  const expressao = expressaoDoScore(score);
  const nomeExibido = profile.apelido ?? profile.nome ?? plimProfile?.profileType.name ?? 'Explorador';
  const avatar = normalizarAvatar(profile.avatar_config);
  const parado = profile.preferencias?.reduzir_animacoes === true;
  const hoje = hojeLocal();
  const fala = useFalaVisivel();
  const toques = useRef(0);
  const visualAoAbrir = useRef('');
  const prefs = profile.preferencias ?? {};

  function tocouNoAvatar() {
    toques.current += 1;
    dizer(toques.current % 5 === 0 ? 'toque_demais' : 'toque');
  }

  function abrirVisual() {
    visualAoAbrir.current = chaveAvatar(avatar, 'feliz') + avatar.fundo;
    setModalAvatar(true);
  }

  function fecharVisual() {
    setModalAvatar(false);
    if (visualAoAbrir.current !== chaveAvatar(avatar, 'feliz') + avatar.fundo) dizer('visual');
  }

  function preferir(parcial: Partial<typeof profile.preferencias>) {
    updateProfile({ preferencias: { ...profile.preferencias, ...parcial } });
    if (parcial.sons === true) somToque(); // confirma no ouvido que o som voltou
  }

  function salvarPerfil() {
    const instagram = limparInstagram(editInstagram);
    if (editInstagram.trim() && !instagram) {
      avisar('Confira o Instagram', 'Escreva só o seu usuário, como @seu.nome. Vale letra, número, ponto e sublinhado.');
      return;
    }
    updateProfile({
      nome: editNome.trim() || null,
      apelido: editApelido.trim().slice(0, 30) || null,
      bio: editBio.trim().slice(0, 160) || null,
      instagram,
    });
    setModalPerfil(false);
    // Quem está no Grupo tem o cartão público atualizado na hora.
    void useGrupoStore.getState().sincronizarCartao();
  }

  function abrirEdicao() {
    setEditNome(profile.nome ?? '');
    setEditApelido(profile.apelido ?? '');
    setEditBio(profile.bio ?? '');
    setEditInstagram(profile.instagram ?? '');
    setModalPerfil(true);
  }

  async function sair() { await supabase.auth.signOut(); }

  return (
    <>
      <Tela>
        {/* Avatar 3D */}
        <Peca tinta="roxo" padding={0} estilo={{ marginBottom: 16, overflow: 'hidden' }}>
          {modalAvatar
            ? <View style={{ height: 270 }} />
            : <AvatarPalco config={avatar} expressao={fala?.humor ?? expressao} altura={270} parado={parado} aoTocar={tocouNoAvatar} />}
          {fala && !modalAvatar && (
            <View pointerEvents="box-none" style={{ position: 'absolute', top: 12, left: 14, right: 14, zIndex: 5 }}>
              <Balao fala={fala} ponta="baixo-centro" />
            </View>
          )}
          <View style={{ backgroundColor: C.surface, borderTopWidth: 2, borderColor: C.borderPrimary, padding: 16, alignItems: 'center' }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 24, color: C.text }} numberOfLines={1}>{nomeExibido}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Selo texto={`nível ${nivel}`} icone="escudo" />
              {plimProfile && <Selo texto={`${plimProfile.profileType.emoji} ${plimProfile.profileType.name}`} tinta="laranja" />}
              {isPro && <Selo texto="Pro" icone="coroa" tinta="ouro" />}
            </View>
            {!!profile.bio && <Text style={{ fontSize: 14, color: C.textSub, textAlign: 'center', marginTop: 10, lineHeight: 21 }}>{profile.bio}</Text>}
            {!!profile.instagram && <Text style={{ fontSize: 13, color: C.primaryLight, marginTop: 4 }}>@{profile.instagram}</Text>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignSelf: 'stretch' }}>
              <Botao rotulo="Mudar visual" icone="paleta" cor="roxo" pequeno onPress={abrirVisual} estilo={{ flex: 1 }} />
              <Botao rotulo="Editar perfil" icone="lapis" cor="claro" pequeno onPress={abrirEdicao} estilo={{ flex: 1 }} />
            </View>
          </View>
        </Peca>

        {/* Números */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <Numero valor={xp} legenda="XP" icone="estrela" tinta="roxo" />
          <Numero valor={profile.streak} legenda={profile.streak === 1 ? 'dia seguido' : 'dias seguidos'} icone="chama" tinta="laranja" />
          <Numero valor={profile.moedas} legenda="moedas" icone="moeda" tinta="ouro" />
        </View>

        <Peca estilo={{ marginBottom: 22 }} padding={16}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: C.textSub }}>Rumo ao nível {nivel + 1}</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.primaryLight }}>{xp}/{xpProxNivel} XP</Text>
          </View>
          <Barra valor={xpPct} />
        </Peca>

        {/* Grupo: stories, visitas e privacidade */}
        <GrupoNoPerfil />

        {/* Histórico */}
        <Secao titulo="Seus últimos 35 dias" />
        <PecaBotao onPress={() => router.push('/historico')} accessibilityLabel="Abrir histórico completo" estilo={{ marginBottom: 22 }}>
          {semanas.map((semana, si) => (
            <View key={si} style={{ flexDirection: 'row', gap: 5, marginBottom: 5 }}>
              {semana.map((dia) => {
                const status: StatusDia = historicoDias[dia] ?? 'vazia';
                return <View key={dia} style={{ flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: corDia[status], borderWidth: dia === hoje ? 3 : 0, borderColor: C.accent }} />;
              })}
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {([['vazia', 'nada'], ['parcial', 'um pouco'], ['completa', 'tudo']] as const).map(([k, l]) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: corDia[k] }} />
                  <Text style={{ fontSize: 12, color: C.textSub }}>{l}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.primaryLight }}>ver tudo ›</Text>
          </View>
        </PecaBotao>

        {/* Desafios */}
        <Secao titulo="Desafios da semana" />
        <View style={{ gap: 10, marginBottom: 22 }}>
          {desafios.map((d) => (
            <Peca key={d.id} padding={14} tinta={d.completo ? 'verde' : undefined}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 26 }}>{d.icone}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text, marginBottom: 7 }}>{d.titulo}</Text>
                  <Barra valor={d.progresso / d.meta} cor={d.completo ? C.success : C.primary} altura={9} />
                </View>
                {d.completo
                  ? <Icone nome="check" tamanho={30} decorativo={false} rotulo="Completo" />
                  : <Selo texto={`+${d.xp} XP`} />}
              </View>
            </Peca>
          ))}
        </View>

        {/* Conquistas */}
        <Secao
          titulo="Conquistas"
          direita={<Text style={{ fontSize: 13, color: C.textSub }}>{profile.conquistas.filter((c) => c.desbloqueada).length} de {profile.conquistas.length}</Text>}
        />
        <View style={{ gap: 10, marginBottom: 22 }}>
          {profile.conquistas.map((c) => {
            const pStreak = c.id === 'tres_dias' ? Math.min(profile.streak / 3, 1) : c.id === 'semana_perfeita' ? Math.min(profile.streak / 7, 1) : 0;
            const temBarra = !c.desbloqueada && pStreak > 0;
            const hintVis = hintAberto === c.id;
            return (
              <PecaBotao
                key={c.id}
                onPress={() => !c.desbloqueada && setHintAberto(hintVis ? null : c.id)}
                disabled={c.desbloqueada}
                tinta={c.desbloqueada ? 'ouro' : undefined}
                padding={14}
                accessibilityLabel={`${c.nome}. ${c.desbloqueada ? 'Conquistada' : 'Ainda não. Toque para ver como conseguir'}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: c.desbloqueada ? C.surface : C.surfaceHigh, alignItems: 'center', justifyContent: 'center', opacity: c.desbloqueada ? 1 : 0.75 }}>
                    <Text style={{ fontSize: 28 }}>{c.desbloqueada ? c.icone : '🔒'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{c.nome}</Text>
                    <Text style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>{c.desc}</Text>
                    {temBarra && (
                      <View style={{ marginTop: 8 }}>
                        <Barra valor={pStreak} altura={8} />
                        <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{c.id === 'tres_dias' ? `${profile.streak}/3 dias` : `${profile.streak}/7 dias`}</Text>
                      </View>
                    )}
                    {hintVis && (
                      <View style={{ marginTop: 8, backgroundColor: C.glass, borderRadius: 12, padding: 10 }}>
                        <Text style={{ fontSize: 13, color: C.primaryLight }}>💡 {CONQUISTA_HINTS[c.id] ?? 'Continue usando o app.'}</Text>
                      </View>
                    )}
                  </View>
                  {c.desbloqueada && <Icone nome="check" tamanho={26} />}
                </View>
              </PecaBotao>
            );
          })}
        </View>

        {/* Atalhos */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
          {([['/medicacao', 'pilula', 'Medicação', 'rosa'], ['/parceiro', 'parceria', 'Parceiro', 'azul'], ['/ranking', 'trofeu', 'Ranking', 'ouro']] as const).map(([rota, icone, rotulo, tinta]) => (
            <PecaBotao key={rota} onPress={() => router.push(rota as any)} accessibilityLabel={rotulo} estilo={{ flex: 1, alignItems: 'center' }} padding={12}>
              <Almofada icone={icone} tinta={tinta} tamanho={50} />
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.text, marginTop: 6 }}>{rotulo}</Text>
            </PecaBotao>
          ))}
        </View>

        {/* Preferências */}
        <Secao titulo="Do seu jeito" />
        <Peca padding={6} estilo={{ marginBottom: 22 }}>
          {([
            ['sons', 'Sons', 'Plim ao concluir, fanfarra ao subir de nível', prefs.sons !== false, (v: boolean) => preferir({ sons: v })],
            ['falas', 'Falas do avatar', 'Balões com comentários sobre o seu dia', prefs.falas !== false, (v: boolean) => preferir({ falas: v })],
            ['movimento', 'Menos movimento', 'O avatar fica parado, sem balançar', prefs.reduzir_animacoes === true, (v: boolean) => preferir({ reduzir_animacoes: v })],
          ] as const).map(([chave, titulo, desc, valor, mudar], i) => (
            <View key={chave} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 2, borderColor: C.surfaceHigh }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{titulo}</Text>
                <Text style={{ fontSize: 13, color: C.textSub, marginTop: 1 }}>{desc}</Text>
              </View>
              <Switch
                value={valor}
                onValueChange={mudar}
                accessibilityLabel={titulo}
                trackColor={{ false: C.borderBright, true: C.primary }}
                thumbColor={C.surface}
                {...({ activeThumbColor: C.surface } as object)}
              />
            </View>
          ))}
        </Peca>

        {/* Plim Pro */}
        {isPro ? (
          <Peca tinta="ouro" estilo={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icone nome="coroa" tamanho={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 18, color: C.text }}>Plim Pro ativo</Text>
                <Text style={{ fontSize: 14, color: C.textSub, marginTop: 2 }}>Você tem tudo liberado. Obrigado por apoiar o Plim!</Text>
              </View>
            </View>
          </Peca>
        ) : (
          <Peca tinta="roxo" estilo={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Icone nome="coroa" tamanho={46} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>Plim Pro</Text>
                <Text style={{ fontSize: 14, color: C.textSub, marginTop: 2, lineHeight: 20 }}>Plim IA, modo parceiro e seu progresso salvo na nuvem.</Text>
              </View>
            </View>
            <Botao rotulo="Ver planos" icone="foguete" onPress={() => abrirPaywall('Plim Pro')} />
          </Peca>
        )}

        {!session ? (
          <Peca estilo={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: F.display, fontSize: 18, color: C.text }}>Guarde seu progresso</Text>
            <Text style={{ fontSize: 14, color: C.textSub, marginTop: 4, marginBottom: 14, lineHeight: 20 }}>Hoje ele fica só neste aparelho. Com uma conta grátis, ele vai com você.</Text>
            <Botao rotulo="Criar conta ou entrar" cor="suave" onPress={() => router.push('/(auth)/login')} />
          </Peca>
        ) : (
          <Botao rotulo="Sair da conta" cor="claro" onPress={sair} estilo={{ marginBottom: 10 }} />
        )}
      </Tela>

      {/* Mudar visual do avatar */}
      <Modal visible={modalAvatar} animationType="slide" transparent onRequestClose={fecharVisual}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={fecharVisual} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '94%', width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <View style={{ width: 44, height: 5, backgroundColor: C.borderBright, borderRadius: 3, alignSelf: 'center', marginTop: 10 }} />
          {modalAvatar && <AvatarPalco config={avatar} expressao="feliz" altura={230} parado={parado} />}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginBottom: 16 }}>Arraste o boneco para girar. Toque nele e ele acena.</Text>

            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, marginBottom: 8 }}>Cabelo</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              {OPCOES_CABELO.map((op) => (
                <Opcao key={op.id} ativo={avatar.cabelo === op.id} rotulo={op.label} aoTocar={() => updateAvatarConfig({ ...avatar, cabelo: op.id })} />
              ))}
            </View>

            <Cores titulo="Cor do cabelo" opcoes={OPCOES_COR_CABELO} atual={avatar.corCabelo} aoEscolher={(h) => updateAvatarConfig({ ...avatar, corCabelo: h })} />
            <Cores titulo="Tom de pele" opcoes={OPCOES_PELE} atual={avatar.pele} aoEscolher={(h) => updateAvatarConfig({ ...avatar, pele: h })} />
            <Cores titulo="Moletom" opcoes={OPCOES_MOLETOM} atual={avatar.corMoletom} aoEscolher={(h) => updateAvatarConfig({ ...avatar, corMoletom: h })} />
            <Cores titulo="Calça" opcoes={OPCOES_CALCA} atual={avatar.corCalca} aoEscolher={(h) => updateAvatarConfig({ ...avatar, corCalca: h })} />

            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, marginBottom: 8 }}>Acessórios</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <Opcao ativo={avatar.oculos} rotulo="Óculos" aoTocar={() => updateAvatarConfig({ ...avatar, oculos: !avatar.oculos })} />
              <Opcao ativo={avatar.fone} rotulo="Fone" aoTocar={() => updateAvatarConfig({ ...avatar, fone: !avatar.fone })} />
            </View>

            <Cores titulo="Fundo do retrato" opcoes={OPCOES_FUNDO} atual={avatar.fundo} aoEscolher={(h) => updateAvatarConfig({ ...avatar, fundo: h })} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <AvatarPersonagem config={avatar} size={56} />
              <Text style={{ flex: 1, fontSize: 13, color: C.textSub, lineHeight: 19 }}>É assim que seu retrato aparece no início e na barra de baixo.</Text>
            </View>

            <Botao rotulo="Pronto" onPress={fecharVisual} />
          </ScrollView>
        </View>
      </Modal>

      {/* Editar perfil */}
      <Modal visible={modalPerfil} animationType="slide" transparent onRequestClose={() => setModalPerfil(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={() => setModalPerfil(false)} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <View style={{ width: 44, height: 5, backgroundColor: C.borderBright, borderRadius: 3, alignSelf: 'center', marginBottom: 16 }} />
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 22, color: C.text, marginBottom: 16 }}>Editar perfil</Text>
          {[
            { label: 'Nome', val: editNome, set: setEditNome, ph: 'Seu nome' },
            { label: 'Apelido', val: editApelido, set: setEditApelido, ph: 'Como quer ser chamado?' },
            { label: 'Bio', val: editBio, set: setEditBio, ph: 'Uma frase sobre você' },
            { label: 'Instagram', val: editInstagram, set: setEditInstagram, ph: '@seu_instagram' },
          ].map((campo) => (
            <View key={campo.label} style={{ marginBottom: 12 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>{campo.label}</Text>
              <TextInput
                placeholder={campo.ph}
                placeholderTextColor={C.textMuted}
                value={campo.val}
                onChangeText={campo.set}
                accessibilityLabel={campo.label}
                style={{ backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 16, fontFamily: F.regular }}
              />
            </View>
          ))}
          <Botao rotulo="Salvar" onPress={salvarPerfil} estilo={{ marginTop: 6 }} />
        </View>
      </Modal>
    </>
  );
}
