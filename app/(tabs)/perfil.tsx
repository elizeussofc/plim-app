import AvatarPersonagem from '@/components/AvatarPersonagem';
import { calcularScoreRotina, expressaoDoScore } from '@/components/TermometroRotina';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { StatusDia, useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { loadOnboardingProfile, type PlimUserProfile } from '@/stores/onboardingStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';

const CONQUISTA_HINTS: Record<string, string> = {
  primeiro_passo:  'Complete 1 tarefa na sua Rotina.',
  despejou:        'Use o Despejo Mental pelo menos uma vez.',
  foco_total:      'Complete uma Sessão de Foco (Pomodoro).',
  tres_dias:       'Mantenha um streak de 3 dias seguidos.',
  comunidade:      'Compartilhe algo na Comunidade.',
  semana_perfeita: 'Mantenha um streak de 7 dias.',
};

const corDia: Record<StatusDia, string> = {
  vazia:    C.surfaceHigh,
  parcial:  C.primary + '55',
  completa: C.primaryLight,
};

function gerarUltimos35Dias(): string[] {
  const dias: string[] = [];
  const hoje = new Date();
  for (let i = 34; i >= 0; i--) { const d = new Date(hoje); d.setDate(hoje.getDate() - i); dias.push(d.toISOString().slice(0, 10)); }
  return dias;
}

const SKIN_COLORS = [{ hex: 'ffd3b5', label: 'Rosa claro' },{ hex: 'f5c5a3', label: 'Claro' },{ hex: 'e8a87c', label: 'Médio' },{ hex: 'd4956a', label: 'Moreno' },{ hex: 'c68642', label: 'Canela' },{ hex: '8d5524', label: 'Escuro' }];
const HAIR_COLORS = [{ hex: '1a1a2e', label: 'Preto' },{ hex: '4a2c0f', label: 'Castanho' },{ hex: 'cc4125', label: 'Ruivo' },{ hex: 'f4c430', label: 'Loiro' },{ hex: 'f5f5f5', label: 'Branco' },{ hex: '7c3aed', label: 'Roxo' },{ hex: '1d4ed8', label: 'Azul' },{ hex: '10b981', label: 'Verde' }];
const HAIR_MASCULINO = [{ id: 'short01', label: 'Liso' },{ id: 'short02', label: 'Ondulado' },{ id: 'short03', label: 'Desalinch.' },{ id: 'short04', label: 'Pompadour' },{ id: 'short05', label: 'Clássico' },{ id: 'short06', label: 'Vintage' },{ id: 'short07', label: 'Rapado' },{ id: 'short08', label: 'Moderno' },{ id: 'short09', label: 'Crespo' },{ id: 'short10', label: 'Cacheado' },{ id: 'short11', label: 'Lateral' },{ id: 'short12', label: 'Rebelde' }];
const HAIR_FEMININO = [{ id: 'long01', label: 'Liso' },{ id: 'long02', label: 'Ondas' },{ id: 'long03', label: 'Cacheado' },{ id: 'long04', label: 'Trança' },{ id: 'long05', label: 'Clássico' },{ id: 'long06', label: 'Coque' },{ id: 'long07', label: 'Franja' },{ id: 'long08', label: 'Rabo' },{ id: 'long09', label: 'Curto' },{ id: 'long10', label: 'Pixie' },{ id: 'long11', label: 'Bob' },{ id: 'long12', label: 'Volume' }];
const EYEBROW_OPCOES = [{ id: 'variant01', label: 'Natural' },{ id: 'variant03', label: 'Arqueada' },{ id: 'variant06', label: 'Fina' },{ id: 'variant10', label: 'Grossa' }];
const GLASSES_OPCOES = [{ id: '', label: 'Nenhum' },{ id: 'variant01', label: 'Round' },{ id: 'variant02', label: 'Retro' },{ id: 'variant03', label: 'Cat eye' },{ id: 'variant04', label: 'Aviador' },{ id: 'variant05', label: 'Sport' }];
const BG_COLORS = [{ hex: 'ede9fe', label: 'Lavanda' },{ hex: 'dbeafe', label: 'Azul' },{ hex: 'd1fae5', label: 'Verde' },{ hex: 'fef3c7', label: 'Amarelo' },{ hex: 'fce7f3', label: 'Rosa' },{ hex: '0B0B18', label: 'Dark' }];

function SecaoLabel({ titulo }: { titulo: string }) {
  return <Text style={{ fontSize: 12, fontWeight: '700', color: C.textMuted, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{titulo}</Text>;
}

function ChipSelect({ ativo, onPress, label }: { ativo: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: ativo ? C.primary : C.surfaceHigh, borderWidth: 1, borderColor: ativo ? C.primaryLight + '55' : C.border }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: ativo ? '#fff' : C.textSub }}>{label}</Text>
    </Pressable>
  );
}

export default function PerfilScreen() {
  const session = useAuthStore((s) => s.session);
  const router  = useRouter();
  const { profile, updateProfile, updateAvatarConfig } = useUserStore();
  const historicoDias = useRotinaStore((s) => s.historicoDias);
  const tarefas       = useRotinaStore((s) => s.tarefas);
  const desafios      = useDesafiosStore((s) => s.desafios);

  const dias35  = gerarUltimos35Dias();
  const semanas = Array.from({ length: 5 }, (_, i) => dias35.slice(i * 7, i * 7 + 7));

  const isPro = profile.plano === 'pro';
  const abrirPaywall = usePaywallStore((s) => s.abrir);

  const [plimProfile, setPlimProfile] = useState<PlimUserProfile | null>(null);
  const [modalAvatar, setModalAvatar] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [hintAberto,  setHintAberto]  = useState<string | null>(null);

  useEffect(() => { loadOnboardingProfile().then(setPlimProfile); }, []);

  const [editNome,      setEditNome]      = useState(profile.nome      ?? '');
  const [editApelido,   setEditApelido]   = useState(profile.apelido   ?? '');
  const [editBio,       setEditBio]       = useState(profile.bio       ?? '');
  const [editInstagram, setEditInstagram] = useState(profile.instagram ?? '');

  const nivel       = profile.nivel;
  const xp          = profile.xp_total;
  const xpProxNivel = nivel * 100;
  const xpPct       = Math.min(xp / xpProxNivel, 1);

  const score     = calcularScoreRotina(tarefas, profile.streak, xp);
  const expressao = expressaoDoScore(score);
  const nomeExibido = profile.apelido ?? profile.nome ?? plimProfile?.profileType.name ?? 'Explorador';
  const hairOptions = profile.avatar_config.genero === 'feminino' ? HAIR_FEMININO : HAIR_MASCULINO;

  const xpBarW = useSharedValue(0);
  useEffect(() => { xpBarW.value = withTiming(xpPct * 100, { duration: 1000 }); }, [xpPct]);
  const xpBarStyle = useAnimatedStyle(() => ({ width: `${xpBarW.value}%` as any }));

  function toggleFeature(f: string) {
    const cur = profile.avatar_config.features ?? [];
    updateAvatarConfig({ features: cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f] });
  }
  function setGenero(genero: 'masculino' | 'feminino') {
    const mIds = HAIR_MASCULINO.map((h) => h.id); const fIds = HAIR_FEMININO.map((h) => h.id);
    let hairStyle = profile.avatar_config.hairStyle;
    if (genero === 'masculino' && !mIds.includes(hairStyle)) hairStyle = 'short05';
    if (genero === 'feminino'  && !fIds.includes(hairStyle)) hairStyle = 'long05';
    updateAvatarConfig({ genero, hairStyle });
  }
  function salvarPerfil() {
    updateProfile({ nome: editNome.trim() || null, apelido: editApelido.trim() || null, bio: editBio.trim() || null, instagram: editInstagram.trim().replace('@', '') || null });
    setModalPerfil(false);
  }
  async function sair() { await supabase.auth.signOut(); }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <Animated.View entering={FadeInUp.delay(0).springify()} style={{ alignItems: 'center', marginBottom: 28 }}>
          <Pressable onPress={() => setModalAvatar(true)} style={{ marginBottom: 12 }}>
            <View style={{ width: 130, height: 130, borderRadius: 65, overflow: 'hidden', borderWidth: 3, borderColor: C.primaryLight + '55', shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 }}>
              <AvatarPersonagem config={profile.avatar_config} expressao={expressao} size={130} />
            </View>
            <View style={{ backgroundColor: C.primary + '22', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, alignSelf: 'center', marginTop: 10, borderWidth: 1, borderColor: C.primaryLight + '33' }}>
              <Text style={{ fontSize: 12, color: C.primaryLight, fontWeight: '700' }}>✏️ personalizar</Text>
            </View>
          </Pressable>

          <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>{nomeExibido}</Text>
          {plimProfile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary + '22', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 6, borderWidth: 1, borderColor: C.primaryLight + '33' }}>
              <Text style={{ fontSize: 14 }}>{plimProfile.profileType.emoji} </Text>
              <Text style={{ fontSize: 12, color: C.primaryLight, fontWeight: '700' }}>{plimProfile.profileType.name}</Text>
            </View>
          )}
          {profile.bio && <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>{profile.bio}</Text>}
          {profile.instagram && <Text style={{ fontSize: 12, color: C.primaryLight, marginTop: 4 }}>@{profile.instagram}</Text>}

          <View style={{ backgroundColor: C.primary + '22', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 10, borderWidth: 1, borderColor: C.primaryLight + '33' }}>
            <Text style={{ fontSize: 12, color: C.primaryLight, fontWeight: '700' }}>nível {nivel}</Text>
          </View>

          <Pressable onPress={() => { setEditNome(profile.nome ?? ''); setEditApelido(profile.apelido ?? ''); setEditBio(profile.bio ?? ''); setEditInstagram(profile.instagram ?? ''); setModalPerfil(true); }} style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: C.textSub, textDecorationLine: 'underline' }}>editar perfil</Text>
          </Pressable>
        </Animated.View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          {[
            { val: xp,             label: 'XP total',    color: C.primaryLight },
            { val: `🪙 ${profile.moedas}`, label: 'moedas', color: C.gold },
            { val: `${profile.streak} 🔥`, label: 'streak', color: C.accent },
          ].map((s, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(80 + i * 40).springify()} style={{ flex: 1 }}>
              <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: s.color }}>{s.val}</Text>
                <Text style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{s.label}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* XP Bar */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: C.textSub }}>próximo nível ({nivel + 1})</Text>
            <Text style={{ fontSize: 12, color: C.primaryLight, fontWeight: '700' }}>{xp}/{xpProxNivel} XP</Text>
          </View>
          <View style={{ backgroundColor: C.border, borderRadius: 6, height: 6, overflow: 'hidden' }}>
            <Animated.View style={[{ height: 6, borderRadius: 6, backgroundColor: C.primaryLight }, xpBarStyle]} />
          </View>
        </Animated.View>

        {/* Heatmap */}
        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <Pressable onPress={() => router.push('/historico')} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>📊 histórico</Text>
              <Text style={{ fontSize: 12, color: C.primaryLight }}>ver tudo →</Text>
            </View>
            {semanas.map((semana, si) => (
              <View key={si} style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                {semana.map((dia) => {
                  const status: StatusDia = historicoDias[dia] ?? 'vazia';
                  const ehHoje = dia === new Date().toISOString().slice(0, 10);
                  return <View key={dia} style={{ flex: 1, aspectRatio: 1, borderRadius: 4, backgroundColor: corDia[status], borderWidth: ehHoje ? 2 : 0, borderColor: C.primaryLight }} />;
                })}
              </View>
            ))}
          </Pressable>
        </Animated.View>

        {/* Desafios */}
        <Animated.View entering={FadeInDown.delay(280).springify()}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>desafios da semana</Text>
          <View style={{ gap: 8, marginBottom: 20 }}>
            {desafios.map((d, i) => (
              <Animated.View key={d.id} entering={FadeInDown.delay(300 + i * 40).springify()} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 20 }}>{d.icone}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 6 }}>{d.titulo}</Text>
                  <View style={{ backgroundColor: C.border, borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <View style={{ height: 4, borderRadius: 4, backgroundColor: d.completo ? C.success : C.primaryLight, width: `${Math.round((d.progresso / d.meta) * 100)}%` as any }} />
                  </View>
                </View>
                {d.completo
                  ? <Text style={{ color: C.success, fontWeight: '800', fontSize: 16 }}>✓</Text>
                  : <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryLight }}>+{d.xp}XP</Text>
                }
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Conquistas */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>conquistas</Text>
          <View style={{ gap: 10, marginBottom: 20 }}>
            {profile.conquistas.map((c, i) => {
              const pStreak = c.id === 'tres_dias' ? Math.min(profile.streak / 3, 1) : c.id === 'semana_perfeita' ? Math.min(profile.streak / 7, 1) : 0;
              const temBarra = !c.desbloqueada && pStreak > 0;
              const hintVis  = hintAberto === c.id;
              return (
                <Animated.View key={c.id} entering={FadeInDown.delay(420 + i * 30).springify()}>
                  <Pressable onPress={() => !c.desbloqueada && setHintAberto(hintVis ? null : c.id)} disabled={c.desbloqueada}
                    style={{ backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: c.desbloqueada ? C.primaryLight + '33' : C.border, opacity: c.desbloqueada ? 1 : 0.6, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: c.desbloqueada ? C.primary + '22' : C.surfaceHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.desbloqueada ? C.primaryLight + '44' : C.border }}>
                      <Text style={{ fontSize: 22 }}>{c.desbloqueada ? c.icone : '🔒'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{c.nome}</Text>
                      <Text style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{c.desc}</Text>
                      {temBarra && (
                        <View style={{ marginTop: 8 }}>
                          <View style={{ backgroundColor: C.border, borderRadius: 4, height: 4, overflow: 'hidden' }}>
                            <View style={{ height: 4, borderRadius: 4, backgroundColor: C.primaryLight, width: `${Math.round(pStreak * 100)}%` as any }} />
                          </View>
                          <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{c.id === 'tres_dias' ? `${profile.streak}/3 dias` : `${profile.streak}/7 dias`}</Text>
                        </View>
                      )}
                      {hintVis && (
                        <View style={{ marginTop: 8, backgroundColor: C.primary + '22', borderRadius: 10, padding: 8 }}>
                          <Text style={{ fontSize: 11, color: C.primaryLight }}>💡 {CONQUISTA_HINTS[c.id] ?? 'Continue usando o app.'}</Text>
                        </View>
                      )}
                    </View>
                    {c.desbloqueada && <Text style={{ color: C.success, fontWeight: '800' }}>✓</Text>}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* Atalhos */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[{ r: '/medicacao', i: '💊', l: 'Medicação' }, { r: '/parceiro', i: '👫', l: 'Parceiro' }, { r: '/ranking', i: '🏆', l: 'Ranking' }].map((a) => (
            <Pressable key={a.r} onPress={() => router.push(a.r as any)} style={{ flex: 1 }}>
              <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 24, marginBottom: 4 }}>{a.i}</Text>
                <Text style={{ fontSize: 11, color: C.textSub }}>{a.l}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Pro card */}
        {isPro ? (
          <View style={{ backgroundColor: C.primary, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: C.primaryLight + '44' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 4 }}>👑 Plim Pro ativo</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Você tem acesso a todas as features premium. Obrigado!</Text>
          </View>
        ) : (
          <Pressable onPress={() => abrirPaywall('Plim Pro')} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1.5, borderColor: C.primaryLight + '44' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 22 }}>👑</Text>
              <Text style={{ color: C.primaryLight, fontWeight: '800', fontSize: 17 }}>Plim Pro</Text>
            </View>
            <Text style={{ color: C.textSub, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>IA Coach · Foco ilimitado · Avatar premium · Backup na nuvem e muito mais.</Text>
            <View style={{ backgroundColor: C.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center', shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>🚀 Ver planos Pro</Text>
            </View>
          </Pressable>
        )}

        {!session ? (
          <Pressable onPress={() => router.push('/(auth)/login')} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 4 }}>Crie sua conta grátis ✨</Text>
            <Text style={{ color: C.textSub, fontSize: 13, marginBottom: 14 }}>Salve seu progresso na nuvem</Text>
            <View style={{ backgroundColor: C.primaryLight, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Criar conta / Entrar</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable onPress={sair} style={{ borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 10 }}>
            <Text style={{ color: C.danger, fontWeight: '600', fontSize: 14 }}>Sair da conta</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Modal Avatar */}
      <Modal visible={modalAvatar} animationType="slide" transparent onRequestClose={() => setModalAvatar(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} onPress={() => setModalAvatar(false)} />
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', borderTopWidth: 1, borderColor: C.border }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 14, marginBottom: 20 }} />

            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 16 }}>personalizar personagem</Text>
              <View style={{ width: 120, height: 120, borderRadius: 60, overflow: 'hidden', borderWidth: 2, borderColor: C.primaryLight + '55' }}>
                <AvatarPersonagem config={profile.avatar_config} expressao={expressao} size={120} />
              </View>
            </View>

            <SecaoLabel titulo="Gênero" />
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {(['masculino', 'feminino'] as const).map((g) => (
                <Pressable key={g} onPress={() => setGenero(g)} style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: profile.avatar_config.genero === g ? C.primary : C.surfaceHigh, borderWidth: 1.5, borderColor: profile.avatar_config.genero === g ? C.primaryLight + '55' : C.border }}>
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>{g === 'masculino' ? '👦' : '👧'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: profile.avatar_config.genero === g ? '#fff' : C.textSub }}>{g === 'masculino' ? 'Masculino' : 'Feminino'}</Text>
                </Pressable>
              ))}
            </View>

            <SecaoLabel titulo="Tom de pele" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {SKIN_COLORS.map((op) => {
                const ativo = profile.avatar_config.skinColor === op.hex;
                return <Pressable key={op.hex} onPress={() => updateAvatarConfig({ skinColor: op.hex })} style={{ flex: 1, aspectRatio: 1, borderRadius: 12, backgroundColor: `#${op.hex}`, borderWidth: ativo ? 3 : 1.5, borderColor: ativo ? C.primaryLight : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{ativo && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}</Pressable>;
              })}
            </View>

            <SecaoLabel titulo={`Cabelo ${profile.avatar_config.genero === 'feminino' ? '(feminino)' : '(masculino)'}`} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {hairOptions.map((op) => {
                const ativo = profile.avatar_config.hairStyle === op.id;
                return <Pressable key={op.id} onPress={() => updateAvatarConfig({ hairStyle: op.id })} style={{ width: '30%', paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: ativo ? C.primary + '22' : C.surfaceHigh, borderWidth: 1.5, borderColor: ativo ? C.primaryLight + '55' : C.border }}><Text style={{ fontSize: 11, color: ativo ? C.primaryLight : C.textSub, fontWeight: ativo ? '700' : '400' }}>{op.label}</Text></Pressable>;
              })}
            </View>

            <SecaoLabel titulo="Cor do cabelo" />
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
              {HAIR_COLORS.map((op) => {
                const ativo = profile.avatar_config.hairColor === op.hex;
                return <Pressable key={op.hex} onPress={() => updateAvatarConfig({ hairColor: op.hex })} style={{ flex: 1, height: 32, borderRadius: 8, backgroundColor: `#${op.hex}`, borderWidth: ativo ? 3 : 1, borderColor: ativo ? C.primaryLight : 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>{ativo && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}</Pressable>;
              })}
            </View>

            <SecaoLabel titulo="Sobrancelhas" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {EYEBROW_OPCOES.map((op) => <ChipSelect key={op.id} ativo={profile.avatar_config.eyebrowsStyle === op.id} onPress={() => updateAvatarConfig({ eyebrowsStyle: op.id })} label={op.label} />)}
            </View>

            <SecaoLabel titulo="Características" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {[{ id: 'freckles', label: 'Sardas' }, { id: 'blush', label: 'Blush' }, { id: 'birthmark', label: 'Sinal' }, ...(profile.avatar_config.genero === 'masculino' ? [{ id: 'mustache', label: 'Bigode' }] : [])].map((f) => (
                <ChipSelect key={f.id} ativo={(profile.avatar_config.features ?? []).includes(f.id)} onPress={() => toggleFeature(f.id)} label={f.label} />
              ))}
              {profile.avatar_config.genero === 'feminino' && <ChipSelect ativo={!!profile.avatar_config.earrings} onPress={() => updateAvatarConfig({ earrings: !profile.avatar_config.earrings })} label="Brincos" />}
            </View>

            <SecaoLabel titulo="Óculos" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {GLASSES_OPCOES.map((op) => <ChipSelect key={op.id} ativo={profile.avatar_config.glassesStyle === op.id} onPress={() => updateAvatarConfig({ glassesStyle: op.id })} label={op.label} />)}
            </View>

            <SecaoLabel titulo="Cor de fundo" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              {BG_COLORS.map((op) => {
                const ativo = profile.avatar_config.backgroundColor === op.hex;
                return <Pressable key={op.hex} onPress={() => updateAvatarConfig({ backgroundColor: op.hex })} style={{ flex: 1, aspectRatio: 1, borderRadius: 10, backgroundColor: `#${op.hex}`, borderWidth: ativo ? 3 : 1, borderColor: ativo ? C.primaryLight : C.border, alignItems: 'center', justifyContent: 'center' }}>{ativo && <Text style={{ color: C.primaryLight, fontSize: 12, fontWeight: '800' }}>✓</Text>}</Pressable>;
              })}
            </View>

            <Pressable onPress={() => setModalAvatar(false)} style={{ backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6, marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Salvar personagem</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Editar Perfil */}
      <Modal visible={modalPerfil} animationType="slide" transparent onRequestClose={() => setModalPerfil(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setModalPerfil(false)} />
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: C.border }}>
          <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20 }}>editar perfil</Text>
          {[
            { label: 'Nome', val: editNome, set: setEditNome, ph: 'Seu nome completo' },
            { label: 'Apelido', val: editApelido, set: setEditApelido, ph: 'Como quer ser chamado?' },
            { label: 'Bio', val: editBio, set: setEditBio, ph: 'Uma frase sobre você 🌟' },
            { label: 'Instagram', val: editInstagram, set: setEditInstagram, ph: '@seu_instagram' },
          ].map((f) => (
            <View key={f.label} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, color: C.textSub, fontWeight: '700', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>{f.label}</Text>
              <TextInput placeholder={f.ph} placeholderTextColor={C.textMuted} value={f.val} onChangeText={f.set}
                style={{ backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 14 }} />
            </View>
          ))}
          <Pressable onPress={salvarPerfil} style={{ backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 6, shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Salvar</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
