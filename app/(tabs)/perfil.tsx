import { Badge, Button, Card, Text } from '@/components/ui';
import AvatarPersonagem from '@/components/AvatarPersonagem';
import { calcularScoreRotina, expressaoDoScore } from '@/components/TermometroRotina';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { StatusDia, useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { loadOnboardingProfile, type PlimUserProfile } from '@/stores/onboardingStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CONQUISTA_HINTS: Record<string, string> = {
  primeiro_passo:  'Complete 1 tarefa na sua Rotina para desbloquear.',
  despejou:        'Use o Despejo Mental pelo menos uma vez.',
  foco_total:      'Complete uma Sessão de Foco (Pomodoro).',
  tres_dias:       'Mantenha um streak de 3 dias seguidos.',
  comunidade:      'Compartilhe algo na Comunidade do Plim.',
  semana_perfeita: 'Mantenha um streak de 7 dias consecutivos.',
};

const corDia: Record<StatusDia, string> = {
  vazia:    '#E2E8F0',
  parcial:  '#C4B5FD',
  completa: '#7C3AED',
};

function gerarUltimos35Dias(): string[] {
  const dias: string[] = [];
  const hoje = new Date();
  for (let i = 34; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

// ── Opções de customização DiceBear ────────────────────────────────────────

const SKIN_COLORS = [
  { hex: 'ffd3b5', label: 'Rosa claro' },
  { hex: 'f5c5a3', label: 'Claro' },
  { hex: 'e8a87c', label: 'Médio' },
  { hex: 'd4956a', label: 'Moreno' },
  { hex: 'c68642', label: 'Canela' },
  { hex: '8d5524', label: 'Escuro' },
];

const HAIR_COLORS = [
  { hex: '1a1a2e', label: 'Preto' },
  { hex: '4a2c0f', label: 'Castanho' },
  { hex: 'cc4125', label: 'Ruivo' },
  { hex: 'f4c430', label: 'Loiro' },
  { hex: 'f5f5f5', label: 'Branco' },
  { hex: '7c3aed', label: 'Roxo' },
  { hex: '1d4ed8', label: 'Azul' },
  { hex: '10b981', label: 'Verde' },
];

const HAIR_MASCULINO = [
  { id: 'short01', label: 'Liso' },
  { id: 'short02', label: 'Ondulado' },
  { id: 'short03', label: 'Desalinch.' },
  { id: 'short04', label: 'Pompadour' },
  { id: 'short05', label: 'Clássico' },
  { id: 'short06', label: 'Vintage' },
  { id: 'short07', label: 'Rapado' },
  { id: 'short08', label: 'Moderno' },
  { id: 'short09', label: 'Crespo' },
  { id: 'short10', label: 'Cacheado' },
  { id: 'short11', label: 'Lateral' },
  { id: 'short12', label: 'Rebelde' },
];

const HAIR_FEMININO = [
  { id: 'long01', label: 'Liso' },
  { id: 'long02', label: 'Ondas' },
  { id: 'long03', label: 'Cacheado' },
  { id: 'long04', label: 'Trança' },
  { id: 'long05', label: 'Clássico' },
  { id: 'long06', label: 'Coque' },
  { id: 'long07', label: 'Franja' },
  { id: 'long08', label: 'Rabo' },
  { id: 'long09', label: 'Curto' },
  { id: 'long10', label: 'Pixie' },
  { id: 'long11', label: 'Bob' },
  { id: 'long12', label: 'Volume' },
];

const EYEBROW_OPCOES = [
  { id: 'variant01', label: 'Natural' },
  { id: 'variant03', label: 'Arqueada' },
  { id: 'variant06', label: 'Fina' },
  { id: 'variant10', label: 'Grossa' },
];

const GLASSES_OPCOES = [
  { id: '',          label: 'Nenhum' },
  { id: 'variant01', label: 'Round' },
  { id: 'variant02', label: 'Retro' },
  { id: 'variant03', label: 'Cat eye' },
  { id: 'variant04', label: 'Aviador' },
  { id: 'variant05', label: 'Sport' },
];

const BG_COLORS = [
  { hex: 'ede9fe', label: 'Lavanda' },
  { hex: 'dbeafe', label: 'Azul' },
  { hex: 'd1fae5', label: 'Verde' },
  { hex: 'fef3c7', label: 'Amarelo' },
  { hex: 'fce7f3', label: 'Rosa' },
  { hex: 'f0fdf4', label: 'Menta' },
  { hex: '1e1b4b', label: 'Dark' },
];

// ── componente principal ───────────────────────────────────────────────────

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
  const xpProgresso = Math.min(xp / xpProxNivel, 1);

  const score     = calcularScoreRotina(tarefas, profile.streak, xp);
  const expressao = expressaoDoScore(score);

  const nomeExibido = profile.apelido ?? profile.nome ?? plimProfile?.profileType.name ?? 'Explorador';

  const hairOptions = profile.avatar_config.genero === 'feminino' ? HAIR_FEMININO : HAIR_MASCULINO;

  function toggleFeature(feature: string) {
    const current = profile.avatar_config.features ?? [];
    const updated = current.includes(feature)
      ? current.filter((f) => f !== feature)
      : [...current, feature];
    updateAvatarConfig({ features: updated });
  }

  function setGenero(genero: 'masculino' | 'feminino') {
    const currentHair = profile.avatar_config.hairStyle;
    const maleIds   = HAIR_MASCULINO.map((h) => h.id);
    const femaleIds = HAIR_FEMININO.map((h) => h.id);
    let hairStyle = currentHair;
    if (genero === 'masculino' && !maleIds.includes(currentHair))   hairStyle = 'short05';
    if (genero === 'feminino'  && !femaleIds.includes(currentHair)) hairStyle = 'long05';
    updateAvatarConfig({ genero, hairStyle });
  }

  function salvarPerfil() {
    updateProfile({
      nome:      editNome.trim()      || null,
      apelido:   editApelido.trim()   || null,
      bio:       editBio.trim()       || null,
      instagram: editInstagram.trim().replace('@', '') || null,
    });
    setModalPerfil(false);
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Avatar + nome ── */}
        <View className="items-center mb-6">
          <Pressable onPress={() => setModalAvatar(true)} className="active:opacity-70">
            <View
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                overflow: 'hidden',
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <AvatarPersonagem config={profile.avatar_config} expressao={expressao} size={140} />
            </View>
            <View className="bg-violet-100 px-3 py-1 rounded-full self-center mt-2">
              <Text variant="caption" className="text-violet-600 font-semibold">✏️ Personalizar</Text>
            </View>
          </Pressable>

          <Text variant="h2" className="text-violet-800 mt-3">{nomeExibido}</Text>
          {plimProfile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 4 }}>
              <Text style={{ fontSize: 13 }}>{plimProfile.profileType.emoji} </Text>
              <Text style={{ fontSize: 12, color: '#7C3AED', fontWeight: '600' }}>{plimProfile.profileType.name}</Text>
            </View>
          )}
          {profile.bio && (
            <Text variant="small" color="secondary" className="text-center mt-1 px-4">{profile.bio}</Text>
          )}
          {profile.instagram && (
            <Text variant="small" className="text-violet-500 mt-1">@{profile.instagram}</Text>
          )}
          <Badge label={`Nível ${nivel}`} variant="primary" />

          <Pressable
            onPress={() => {
              setEditNome(profile.nome ?? '');
              setEditApelido(profile.apelido ?? '');
              setEditBio(profile.bio ?? '');
              setEditInstagram(profile.instagram ?? '');
              setModalPerfil(true);
            }}
            className="mt-3 active:opacity-70"
          >
            <Text variant="small" className="text-violet-600 underline">Editar perfil</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-5">
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-violet-600">{xp}</Text>
            <Text variant="caption" color="secondary">XP total</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-orange-500">🪙 {profile.moedas}</Text>
            <Text variant="caption" color="secondary">Moedas</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-emerald-500">{profile.streak} 🔥</Text>
            <Text variant="caption" color="secondary">Streak</Text>
          </Card>
        </View>

        {/* Barra XP */}
        <Card variant="default" padding="md" className="mb-5">
          <View className="flex-row justify-between mb-2">
            <Text variant="small" color="secondary">Próximo nível ({nivel + 1})</Text>
            <Text variant="small" className="text-violet-600 font-semibold">{xp} / {xpProxNivel} XP</Text>
          </View>
          <View className="bg-slate-100 rounded-full h-3" style={{ overflow: 'hidden' }}>
            {xpProgresso > 0 ? (
              <View className="bg-violet-500 h-3 rounded-full" style={{ width: `${Math.round(xpProgresso * 100)}%` as any }} />
            ) : (
              <View style={{ width: '100%', height: '100%', backgroundColor: '#C4B5FD', opacity: 0.35, borderRadius: 9999 }} />
            )}
          </View>
        </Card>

        {/* Heatmap */}
        <Pressable onPress={() => router.push('/historico')} className="active:opacity-70">
          <Card variant="default" padding="md" className="mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text variant="h3" className="text-slate-800">📊 Histórico</Text>
              <Text variant="caption" className="text-violet-600">Ver tudo →</Text>
            </View>
            {semanas.map((semana, si) => (
              <View key={si} className="flex-row gap-1 mb-1">
                {semana.map((dia) => {
                  const status: StatusDia = historicoDias[dia] ?? 'vazia';
                  const ehHoje = dia === new Date().toISOString().slice(0, 10);
                  return (
                    <View
                      key={dia}
                      style={{
                        flex: 1,
                        aspectRatio: 1,
                        borderRadius: 4,
                        backgroundColor: corDia[status],
                        borderWidth: ehHoje ? 2 : 0,
                        borderColor: '#7C3AED',
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </Card>
        </Pressable>

        {/* Desafios semanais */}
        <Text variant="h3" className="mb-3">Desafios da semana</Text>
        <View className="gap-2 mb-5">
          {desafios.map((d) => (
            <Card key={d.id} variant="flat" padding="md">
              <View className="flex-row items-center gap-3">
                <Text className="text-xl">{d.icone}</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800 text-sm">{d.titulo}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <View
                        className="bg-violet-500 h-1.5 rounded-full"
                        style={{ width: `${Math.round((d.progresso / d.meta) * 100)}%` as any }}
                      />
                    </View>
                    <Text style={{ fontSize: 10, color: '#94A3B8' }}>{d.progresso}/{d.meta}</Text>
                  </View>
                </View>
                {d.completo
                  ? <Text className="text-emerald-500 font-bold">✓</Text>
                  : <Text variant="caption" className="text-violet-600 font-semibold">+{d.xp}XP</Text>
                }
              </View>
            </Card>
          ))}
        </View>

        {/* Conquistas */}
        <Text variant="h3" className="mb-3">Conquistas</Text>
        <View className="gap-3 mb-6">
          {profile.conquistas.map((c) => {
            const progressoStreak =
              c.id === 'tres_dias'       ? Math.min(profile.streak / 3, 1) :
              c.id === 'semana_perfeita' ? Math.min(profile.streak / 7, 1) : 0;
            const temBarra = !c.desbloqueada && progressoStreak > 0;
            const hintVisivel = hintAberto === c.id;

            return (
              <Pressable
                key={c.id}
                onPress={() => !c.desbloqueada && setHintAberto(hintVisivel ? null : c.id)}
                disabled={c.desbloqueada}
              >
                <Card variant="default" padding="md" className={c.desbloqueada ? '' : 'opacity-60'}>
                  <View className="flex-row items-center gap-4">
                    <View className={`w-12 h-12 rounded-2xl items-center justify-center ${c.desbloqueada ? 'bg-violet-100' : 'bg-slate-100'}`}>
                      <Text className="text-2xl">{c.desbloqueada ? c.icone : '🔒'}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-slate-800">{c.nome}</Text>
                      <Text variant="small" color="secondary">{c.desc}</Text>
                      {temBarra && (
                        <View className="mt-2">
                          <View className="bg-slate-200 rounded-full h-1.5">
                            <View
                              className="bg-violet-400 h-1.5 rounded-full"
                              style={{ width: `${Math.round(progressoStreak * 100)}%` as any }}
                            />
                          </View>
                          <Text variant="caption" color="muted" className="mt-0.5">
                            {c.id === 'tres_dias'
                              ? `${profile.streak}/3 dias`
                              : `${profile.streak}/7 dias`}
                          </Text>
                        </View>
                      )}
                      {hintVisivel && (
                        <View className="mt-2 bg-violet-50 rounded-xl px-3 py-2">
                          <Text variant="caption" className="text-violet-700">
                            💡 {CONQUISTA_HINTS[c.id] ?? 'Continue usando o app para desbloquear.'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {c.desbloqueada && (
                      <View className="bg-violet-100 px-2 py-1 rounded-full">
                        <Text variant="caption" className="text-violet-600 font-semibold">✅</Text>
                      </View>
                    )}
                    {!c.desbloqueada && (
                      <Text variant="caption" color="muted">toque</Text>
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* Atalhos */}
        <View className="flex-row gap-3 mb-5">
          <Pressable onPress={() => router.push('/medicacao')} className="flex-1 active:opacity-70">
            <Card variant="flat" padding="md" className="items-center">
              <Text className="text-2xl mb-1">💊</Text>
              <Text variant="caption" color="secondary">Medicação</Text>
            </Card>
          </Pressable>
          <Pressable onPress={() => router.push('/parceiro')} className="flex-1 active:opacity-70">
            <Card variant="flat" padding="md" className="items-center">
              <Text className="text-2xl mb-1">👫</Text>
              <Text variant="caption" color="secondary">Parceiro</Text>
            </Card>
          </Pressable>
          <Pressable onPress={() => router.push('/ranking')} className="flex-1 active:opacity-70">
            <Card variant="flat" padding="md" className="items-center">
              <Text className="text-2xl mb-1">🏆</Text>
              <Text variant="caption" color="secondary">Ranking</Text>
            </Card>
          </Pressable>
        </View>

        {/* Plim Pro / Auth */}
        {isPro ? (
          <Card variant="primary" padding="lg" className="mb-4">
            <Text color="inverse" className="font-bold text-lg mb-1">👑 Plim Pro ativo</Text>
            <Text color="inverse" className="opacity-80 text-sm">Você tem acesso a todas as features premium. Obrigado pelo apoio!</Text>
          </Card>
        ) : (
          <Card padding="lg" className="mb-4" style={{ backgroundColor: '#1E1B4B' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 22 }}>👑</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>Plim Pro</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
              IA Coach · Foco ilimitado · Avatar premium · Backup na nuvem e muito mais.
            </Text>
            <Button
              label="🚀 Ver planos Pro"
              variant="secondary"
              size="md"
              className="bg-white"
              onPress={() => abrirPaywall('Plim Pro')}
            />
          </Card>
        )}

        {!session ? (
          <Card variant="primary" padding="lg" className="mb-4">
            <Text color="inverse" className="font-bold text-lg mb-1">Crie sua conta grátis ✨</Text>
            <Text color="inverse" className="opacity-80 text-sm mb-4">Salve seu progresso na nuvem</Text>
            <Button label="Criar conta / Entrar" variant="secondary" size="md" className="bg-white" onPress={() => router.push('/(auth)/login')} />
          </Card>
        ) : (
          <Button label="Sair da conta" variant="ghost" onPress={sair} size="md" />
        )}
      </ScrollView>

      {/* ── Modal: Personalizar Avatar ── */}
      <Modal visible={modalAvatar} animationType="slide" transparent onRequestClose={() => setModalAvatar(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setModalAvatar(false)} />
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />

            {/* Preview ao vivo */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text variant="h3" className="text-violet-800 mb-3">Personalizar personagem</Text>
              <View style={{ width: 130, height: 130, borderRadius: 65, overflow: 'hidden' }}>
                <AvatarPersonagem config={profile.avatar_config} expressao={expressao} size={130} />
              </View>
            </View>

            {/* Gênero */}
            <SecaoLabel titulo="Gênero" />
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {(['masculino', 'feminino'] as const).map((g) => {
                const ativo = profile.avatar_config.genero === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setGenero(g)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                      backgroundColor: ativo ? '#7C3AED' : '#F8FAFC',
                      borderWidth: 2,
                      borderColor: ativo ? '#7C3AED' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{g === 'masculino' ? '👦' : '👧'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: ativo ? '#fff' : '#64748B' }}>
                      {g === 'masculino' ? 'Masculino' : 'Feminino'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Tom de pele */}
            <SecaoLabel titulo="Tom de pele" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {SKIN_COLORS.map((op) => {
                const ativo = profile.avatar_config.skinColor === op.hex;
                return (
                  <Pressable
                    key={op.hex}
                    onPress={() => updateAvatarConfig({ skinColor: op.hex })}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: 12,
                      backgroundColor: `#${op.hex}`,
                      borderWidth: ativo ? 3 : 1.5,
                      borderColor: ativo ? '#7C3AED' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ativo && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>

            {/* Cabelo */}
            <SecaoLabel titulo={`Cabelo ${profile.avatar_config.genero === 'feminino' ? '(feminino)' : '(masculino)'}`} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {hairOptions.map((op) => {
                const ativo = profile.avatar_config.hairStyle === op.id;
                return (
                  <Pressable
                    key={op.id}
                    onPress={() => updateAvatarConfig({ hairStyle: op.id })}
                    style={{
                      width: '30%',
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: ativo ? '#EDE9FE' : '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: ativo ? '#7C3AED' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 10, color: ativo ? '#7C3AED' : '#64748B', fontWeight: ativo ? '700' : '400' }}>
                      {op.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Cor do cabelo */}
            <SecaoLabel titulo="Cor do cabelo" />
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
              {HAIR_COLORS.map((op) => {
                const ativo = profile.avatar_config.hairColor === op.hex;
                return (
                  <Pressable
                    key={op.hex}
                    onPress={() => updateAvatarConfig({ hairColor: op.hex })}
                    style={{
                      flex: 1,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: `#${op.hex}`,
                      borderWidth: ativo ? 3 : 1.5,
                      borderColor: ativo ? '#7C3AED' : 'rgba(0,0,0,0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ativo && <Text style={{ color: '#7C3AED', fontSize: 11, fontWeight: '800', textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 3 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>

            {/* Sobrancelhas */}
            <SecaoLabel titulo="Sobrancelhas" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {EYEBROW_OPCOES.map((op) => {
                const ativo = profile.avatar_config.eyebrowsStyle === op.id;
                return (
                  <Pressable
                    key={op.id}
                    onPress={() => updateAvatarConfig({ eyebrowsStyle: op.id })}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: ativo ? '#EDE9FE' : '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: ativo ? '#7C3AED' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 10, color: ativo ? '#7C3AED' : '#64748B', fontWeight: ativo ? '700' : '400' }}>
                      {op.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Características */}
            <SecaoLabel titulo="Características" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {[
                { id: 'freckles',  label: 'Sardas' },
                { id: 'blush',     label: 'Blush' },
                { id: 'birthmark', label: 'Sinal' },
                ...(profile.avatar_config.genero === 'masculino'
                  ? [{ id: 'mustache', label: 'Bigode' }]
                  : []),
              ].map((feat) => {
                const ativo = (profile.avatar_config.features ?? []).includes(feat.id);
                return (
                  <Pressable
                    key={feat.id}
                    onPress={() => toggleFeature(feat.id)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 20,
                      backgroundColor: ativo ? '#7C3AED' : '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: ativo ? '#7C3AED' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ color: ativo ? '#fff' : '#64748B', fontSize: 13, fontWeight: ativo ? '700' : '400' }}>
                      {feat.label}
                    </Text>
                  </Pressable>
                );
              })}
              {profile.avatar_config.genero === 'feminino' && (
                <Pressable
                  onPress={() => updateAvatarConfig({ earrings: !profile.avatar_config.earrings })}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 20,
                    backgroundColor: profile.avatar_config.earrings ? '#7C3AED' : '#F8FAFC',
                    borderWidth: 1.5,
                    borderColor: profile.avatar_config.earrings ? '#7C3AED' : '#E2E8F0',
                  }}
                >
                  <Text style={{ color: profile.avatar_config.earrings ? '#fff' : '#64748B', fontSize: 13, fontWeight: profile.avatar_config.earrings ? '700' : '400' }}>
                    Brincos
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Óculos */}
            <SecaoLabel titulo="Óculos" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {GLASSES_OPCOES.map((op) => {
                const ativo = profile.avatar_config.glassesStyle === op.id;
                return (
                  <Pressable
                    key={op.id}
                    onPress={() => updateAvatarConfig({ glassesStyle: op.id })}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: ativo ? '#EDE9FE' : '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: ativo ? '#7C3AED' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: ativo ? '#7C3AED' : '#64748B', fontWeight: ativo ? '700' : '400' }}>
                      {op.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Cor de fundo */}
            <SecaoLabel titulo="Cor de fundo" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              {BG_COLORS.map((op) => {
                const ativo = profile.avatar_config.backgroundColor === op.hex;
                return (
                  <Pressable
                    key={op.hex}
                    onPress={() => updateAvatarConfig({ backgroundColor: op.hex })}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: 10,
                      backgroundColor: `#${op.hex}`,
                      borderWidth: ativo ? 3 : 1.5,
                      borderColor: ativo ? '#7C3AED' : 'rgba(0,0,0,0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ativo && <Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setModalAvatar(false)}
              style={{ backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Salvar personagem</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Modal: Editar Perfil ── */}
      <Modal visible={modalPerfil} animationType="slide" transparent onRequestClose={() => setModalPerfil(false)}>
        <Pressable className="flex-1 bg-black/30" onPress={() => setModalPerfil(false)} />
        <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
          <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />
          <Text variant="h3" className="text-violet-800 mb-5">Editar Perfil</Text>

          <Text variant="small" color="secondary" className="mb-1 font-semibold">Nome</Text>
          <TextInput placeholder="Seu nome completo" placeholderTextColor="#94A3B8" value={editNome} onChangeText={setEditNome} className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-3" />

          <Text variant="small" color="secondary" className="mb-1 font-semibold">Apelido</Text>
          <TextInput placeholder="Como quer ser chamado?" placeholderTextColor="#94A3B8" value={editApelido} onChangeText={setEditApelido} className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-3" />

          <Text variant="small" color="secondary" className="mb-1 font-semibold">Bio</Text>
          <TextInput placeholder="Uma frase sobre você 🌟" placeholderTextColor="#94A3B8" value={editBio} onChangeText={setEditBio} className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-3" multiline />

          <Text variant="small" color="secondary" className="mb-1 font-semibold">Instagram</Text>
          <TextInput placeholder="@seu_instagram" placeholderTextColor="#94A3B8" value={editInstagram} onChangeText={setEditInstagram} className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-5" autoCapitalize="none" />

          <Pressable onPress={salvarPerfil} className="bg-violet-600 rounded-2xl py-4 items-center">
            <Text className="text-white font-bold">Salvar</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SecaoLabel({ titulo }: { titulo: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 10 }}>
      {titulo}
    </Text>
  );
}
