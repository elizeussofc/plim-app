import { Badge, Button, Card, Text } from '@/components/ui';
import AvatarPersonagem, {
  type Acessorio,
  type CorCabelo,
  type EstiloCabelo,
  type Roupa,
  type SkinTom,
} from '@/components/AvatarPersonagem';
import { calcularScoreRotina, expressaoDoScore } from '@/components/TermometroRotina';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { StatusDia, useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

// ── opções de customização ──────────────────────────────────────────────────

const SKIN_OPCOES: { id: SkinTom; cor: string; label: string }[] = [
  { id: 'claro',   cor: '#FDDBB4', label: 'Claro'    },
  { id: 'medio',   cor: '#E8A87C', label: 'Médio'    },
  { id: 'canela',  cor: '#C68642', label: 'Canela'   },
  { id: 'escuro',  cor: '#8D5524', label: 'Escuro'   },
];

const CABELO_OPCOES: { id: EstiloCabelo; emoji: string; label: string }[] = [
  { id: 'curto',    emoji: '💇', label: 'Curto'    },
  { id: 'longo',    emoji: '👱', label: 'Longo'    },
  { id: 'cacheado', emoji: '🌀', label: 'Cacheado' },
  { id: 'careca',   emoji: '🧑‍🦲', label: 'Careca'  },
];

const COR_CABELO_OPCOES: { id: CorCabelo; cor: string; label: string }[] = [
  { id: 'preto',    cor: '#1A1A2E', label: 'Preto'    },
  { id: 'castanho', cor: '#7B3F00', label: 'Castanho' },
  { id: 'loiro',    cor: '#F4C430', label: 'Loiro'    },
  { id: 'ruivo',    cor: '#CC4125', label: 'Ruivo'    },
  { id: 'roxo',     cor: '#7C3AED', label: 'Roxo'     },
];

const ROUPA_OPCOES: { id: Roupa; emoji: string; label: string; cor: string }[] = [
  { id: 'padrao', emoji: '👕', label: 'Padrão',    cor: '#7C3AED' },
  { id: 'sport',  emoji: '🏃', label: 'Sport',     cor: '#10B981' },
  { id: 'casual', emoji: '🧢', label: 'Casual',    cor: '#F97316' },
  { id: 'pro',    emoji: '💼', label: 'Profissional', cor: '#1E293B' },
];

const ACESSORIO_OPCOES: { id: Acessorio; emoji: string; label: string; conquista?: string }[] = [
  { id: 'nenhum',  emoji: '—',  label: 'Nenhum'   },
  { id: 'oculos',  emoji: '👓', label: 'Óculos'   },
  { id: 'chapeu',  emoji: '🎩', label: 'Chapéu',  conquista: 'tres_dias' },
  { id: 'medalha', emoji: '🥇', label: 'Medalha', conquista: 'semana_perfeita' },
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

  const [modalAvatar, setModalAvatar] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [hintAberto,  setHintAberto]  = useState<string | null>(null);

  const [editNome,      setEditNome]      = useState(profile.nome      ?? '');
  const [editApelido,   setEditApelido]   = useState(profile.apelido   ?? '');
  const [editBio,       setEditBio]       = useState(profile.bio       ?? '');
  const [editInstagram, setEditInstagram] = useState(profile.instagram ?? '');

  const nivel       = profile.nivel;
  const xp          = profile.xp_total;
  const xpProxNivel = nivel * 100;
  const xpProgresso = Math.min(xp / xpProxNivel, 1);

  const score    = calcularScoreRotina(tarefas, profile.streak, xp);
  const expressao = expressaoDoScore(score);

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

  function conquistaDesbloqueada(id: string) {
    return profile.conquistas.find((c) => c.id === id)?.desbloqueada ?? false;
  }

  const nomeExibido = profile.apelido ?? profile.nome ?? 'Explorador';

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + nome ── */}
        <View className="items-center mb-6">
          <Pressable onPress={() => setModalAvatar(true)} className="active:opacity-70">
            <View
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: '#EDE9FE',
                overflow: 'hidden',
                alignItems: 'center',
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <View style={{ marginTop: -8 }}>
                <AvatarPersonagem
                  config={profile.avatar_config}
                  expressao={expressao}
                  size={160}
                />
              </View>
            </View>
            <View className="bg-violet-100 px-3 py-1 rounded-full self-center mt-2">
              <Text variant="caption" className="text-violet-600 font-semibold">✏️ Personalizar</Text>
            </View>
          </Pressable>

          <Text variant="h2" className="text-violet-800 mt-3">{nomeExibido}</Text>
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
          <View className="bg-slate-100 rounded-full h-3">
            <View
              className="bg-violet-500 h-3 rounded-full"
              style={{ width: `${Math.round(xpProgresso * 100)}%` as any }
              }
            />
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

        {/* Auth */}
        {!session ? (
          <Card variant="primary" padding="lg" className="mb-4">
            <Text color="inverse" className="font-bold text-lg mb-1">Crie sua conta grátis ✨</Text>
            <Text color="inverse" className="opacity-80 text-sm mb-4">Salve seu progresso e desbloqueie o Plim Pro</Text>
            <Button label="Criar conta / Entrar" variant="secondary" size="md" className="bg-white" onPress={() => router.push('/(auth)/login')} />
          </Card>
        ) : (
          <>
            <Card variant="primary" padding="lg" className="mb-4">
              <Text color="inverse" className="font-bold text-lg mb-1">Plano Grátis</Text>
              <Text color="inverse" className="opacity-80 text-sm mb-4">Desbloqueie tudo com o Plim Pro ✨</Text>
              <Button label="Ver planos Pro" variant="secondary" size="md" className="bg-white" />
            </Card>
            <Button label="Sair da conta" variant="ghost" onPress={sair} size="md" />
          </>
        )}
      </ScrollView>

      {/* ── Modal: Personalizar Avatar ── */}
      <Modal visible={modalAvatar} animationType="slide" transparent onRequestClose={() => setModalAvatar(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setModalAvatar(false)} />
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />

            {/* Preview ao vivo */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text variant="h3" className="text-violet-800 mb-3">Personalizar personagem</Text>
              <View style={{ width: 130, height: 130, borderRadius: 65, backgroundColor: '#EDE9FE', overflow: 'hidden', alignItems: 'center' }}>
                <View style={{ marginTop: -8 }}>
                  <AvatarPersonagem config={profile.avatar_config} expressao={expressao} size={150} />
                </View>
              </View>
            </View>

            {/* Tom de pele */}
            <SecaoLabel titulo="Tom de pele" />
            <View className="flex-row gap-3 mb-5">
              {SKIN_OPCOES.map((op) => (
                <Pressable
                  key={op.id}
                  onPress={() => updateAvatarConfig({ skinTom: op.id })}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: 12,
                    backgroundColor: op.cor,
                    borderWidth: profile.avatar_config.skinTom === op.id ? 3 : 1.5,
                    borderColor: profile.avatar_config.skinTom === op.id ? '#7C3AED' : 'transparent',
                  }}
                />
              ))}
            </View>

            {/* Cabelo */}
            <SecaoLabel titulo="Estilo de cabelo" />
            <View className="flex-row gap-2 mb-5">
              {CABELO_OPCOES.map((op) => (
                <Pressable
                  key={op.id}
                  onPress={() => updateAvatarConfig({ cabelo: op.id })}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: profile.avatar_config.cabelo === op.id ? '#EDE9FE' : '#F8FAFC',
                    borderWidth: 1.5,
                    borderColor: profile.avatar_config.cabelo === op.id ? '#7C3AED' : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{op.emoji}</Text>
                  <Text style={{ fontSize: 9, color: '#64748B', marginTop: 3 }}>{op.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Cor do cabelo */}
            <SecaoLabel titulo="Cor do cabelo" />
            <View className="flex-row gap-2 mb-5">
              {COR_CABELO_OPCOES.map((op) => (
                <Pressable
                  key={op.id}
                  onPress={() => updateAvatarConfig({ corCabelo: op.id })}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: op.cor,
                    borderWidth: profile.avatar_config.corCabelo === op.id ? 3 : 1.5,
                    borderColor: profile.avatar_config.corCabelo === op.id ? '#7C3AED' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {profile.avatar_config.corCabelo === op.id && (
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '800' }}>✓</Text>
                  )}
                </Pressable>
              ))}
            </View>

            {/* Roupa */}
            <SecaoLabel titulo="Roupa" />
            <View className="flex-row gap-2 mb-5">
              {ROUPA_OPCOES.map((op) => (
                <Pressable
                  key={op.id}
                  onPress={() => updateAvatarConfig({ roupa: op.id })}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: profile.avatar_config.roupa === op.id ? '#EDE9FE' : '#F8FAFC',
                    borderWidth: 1.5,
                    borderColor: profile.avatar_config.roupa === op.id ? '#7C3AED' : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{op.emoji}</Text>
                  <Text style={{ fontSize: 9, color: '#64748B', marginTop: 3 }}>{op.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Acessórios */}
            <SecaoLabel titulo="Acessório" />
            <View className="flex-row gap-2 mb-2">
              {ACESSORIO_OPCOES.map((op) => {
                const bloqueado = !!op.conquista && !conquistaDesbloqueada(op.conquista);
                return (
                  <Pressable
                    key={op.id}
                    onPress={() => { if (!bloqueado) updateAvatarConfig({ acessorio: op.id }); }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      opacity: bloqueado ? 0.45 : 1,
                      backgroundColor: profile.avatar_config.acessorio === op.id ? '#EDE9FE' : '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: profile.avatar_config.acessorio === op.id ? '#7C3AED' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{bloqueado ? '🔒' : op.emoji}</Text>
                    <Text style={{ fontSize: 9, color: '#64748B', marginTop: 3 }}>{op.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 20 }}>
              🔒 Chapéu: streak de 3 dias · Medalha: semana perfeita
            </Text>

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
