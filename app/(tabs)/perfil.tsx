import { Badge, Button, Card, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { StatusDia, useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const avatarEmojis = ['⚡', '🧠', '🎯', '🦋', '🌟', '🔥', '🦊', '🐉', '🚀', '🌈', '💎', '🎸', '🏄', '🌿', '🦁', '🐺', '🎭', '🎨'];

export default function PerfilScreen() {
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const { profile, updateProfile } = useUserStore();
  const historicoDias = useRotinaStore((s) => s.historicoDias);
  const desafios = useDesafiosStore((s) => s.desafios);
  const dias35 = gerarUltimos35Dias();
  const semanas = Array.from({ length: 5 }, (_, i) => dias35.slice(i * 7, i * 7 + 7));

  const [modalAvatar, setModalAvatar] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);

  const [editNome, setEditNome] = useState(profile.nome ?? '');
  const [editApelido, setEditApelido] = useState(profile.apelido ?? '');
  const [editBio, setEditBio] = useState(profile.bio ?? '');
  const [editInstagram, setEditInstagram] = useState(profile.instagram ?? '');

  const nivel = profile.nivel;
  const xp = profile.xp_total;
  const xpProxNivel = nivel * 100;
  const xpProgresso = Math.min(xp / xpProxNivel, 1);

  function salvarPerfil() {
    updateProfile({
      nome: editNome.trim() || null,
      apelido: editApelido.trim() || null,
      bio: editBio.trim() || null,
      instagram: editInstagram.trim().replace('@', '') || null,
    });
    setModalPerfil(false);
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  const nomeExibido = profile.apelido ?? profile.nome ?? 'Explorador';

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View className="items-center mb-6">
          <Pressable
            onPress={() => setModalAvatar(true)}
            className="active:opacity-70"
          >
            <View
              className="w-24 h-24 rounded-full bg-violet-600 items-center justify-center mb-2 shadow-lg"
              style={{ shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
            >
              <Text className="text-5xl">{profile.avatar_emoji}</Text>
            </View>
            <View className="bg-violet-100 px-3 py-1 rounded-full self-center">
              <Text variant="caption" className="text-violet-600 font-semibold">✏️ Trocar avatar</Text>
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
              style={{ width: `${Math.round(xpProgresso * 100)}%` as any }}
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
                      className={`flex-1 h-5 rounded-sm ${ehHoje ? 'border border-violet-500' : ''}`}
                      style={{ backgroundColor: corDia[status] }}
                    />
                  );
                })}
              </View>
            ))}
            <View className="flex-row gap-3 mt-2 justify-end">
              {(['vazia', 'parcial', 'completa'] as StatusDia[]).map((s) => (
                <View key={s} className="flex-row items-center gap-1">
                  <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: corDia[s] }} />
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                    {s === 'vazia' ? 'Nenhuma' : s === 'parcial' ? 'Parcial' : 'Completa'}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </Pressable>

        {/* Desafios semanais */}
        <View className="flex-row items-center justify-between mb-3">
          <Text variant="h3">Desafios da semana</Text>
          <Text variant="caption" className="text-violet-600">
            {desafios.filter((d) => d.completo).length}/5 completos
          </Text>
        </View>
        <View className="gap-2 mb-5">
          {desafios.map((d) => (
            <Card key={d.id} variant="flat" padding="md" className={d.completo ? 'opacity-60' : ''}>
              <View className="flex-row items-center gap-3">
                <Text className="text-xl">{d.icone}</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800 text-sm">{d.titulo}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <View
                        className={`h-1.5 rounded-full ${d.completo ? 'bg-emerald-500' : 'bg-violet-500'}`}
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
          {profile.conquistas.map((c) => (
            <Card key={c.id} variant="default" padding="md" className={c.desbloqueada ? '' : 'opacity-40'}>
              <View className="flex-row items-center gap-4">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center ${c.desbloqueada ? 'bg-violet-100' : 'bg-slate-100'}`}>
                  <Text className="text-2xl">{c.desbloqueada ? c.icone : '🔒'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800">{c.nome}</Text>
                  <Text variant="small" color="secondary">{c.desc}</Text>
                </View>
                {c.desbloqueada && (
                  <View className="bg-violet-100 px-2 py-1 rounded-full">
                    <Text variant="caption" className="text-violet-600 font-semibold">✅</Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>

        {/* Atalhos de ferramentas */}
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

        {/* Plano / Auth */}
        {!session ? (
          <Card variant="primary" padding="lg" className="mb-4">
            <Text color="inverse" className="font-bold text-lg mb-1">Crie sua conta grátis ✨</Text>
            <Text color="inverse" className="opacity-80 text-sm mb-4">
              Salve seu progresso e desbloqueie o Plim Pro
            </Text>
            <Button
              label="Criar conta / Entrar"
              variant="secondary"
              size="md"
              className="bg-white"
              onPress={() => router.push('/(auth)/login')}
            />
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

      {/* Modal Avatar */}
      <Modal
        visible={modalAvatar}
        animationType="slide"
        transparent
        onRequestClose={() => setModalAvatar(false)}
      >
        <Pressable className="flex-1 bg-black/30" onPress={() => setModalAvatar(false)} />
        <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
          <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />
          <Text variant="h3" className="text-violet-800 mb-5">Escolha seu avatar</Text>
          <View className="flex-row flex-wrap gap-3 justify-center">
            {avatarEmojis.map((e) => (
              <Pressable
                key={e}
                onPress={() => {
                  updateProfile({ avatar_emoji: e });
                  setModalAvatar(false);
                }}
                className={`w-14 h-14 rounded-2xl items-center justify-center active:opacity-70 ${profile.avatar_emoji === e ? 'bg-violet-600' : 'bg-slate-100'}`}
              >
                <Text className="text-3xl">{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal Editar Perfil */}
      <Modal
        visible={modalPerfil}
        animationType="slide"
        transparent
        onRequestClose={() => setModalPerfil(false)}
      >
        <Pressable className="flex-1 bg-black/30" onPress={() => setModalPerfil(false)} />
        <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
          <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />
          <Text variant="h3" className="text-violet-800 mb-5">Editar Perfil</Text>

          <Text variant="small" color="secondary" className="mb-1 font-semibold">Nome</Text>
          <TextInput
            placeholder="Seu nome completo"
            placeholderTextColor="#94A3B8"
            value={editNome}
            onChangeText={setEditNome}
            className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-3"
          />

          <Text variant="small" color="secondary" className="mb-1 font-semibold">Apelido</Text>
          <TextInput
            placeholder="Como quer ser chamado?"
            placeholderTextColor="#94A3B8"
            value={editApelido}
            onChangeText={setEditApelido}
            className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-3"
          />

          <Text variant="small" color="secondary" className="mb-1 font-semibold">Bio</Text>
          <TextInput
            placeholder="Uma frase sobre você 🌟"
            placeholderTextColor="#94A3B8"
            value={editBio}
            onChangeText={setEditBio}
            className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-3"
            multiline
          />

          <Text variant="small" color="secondary" className="mb-1 font-semibold">Instagram</Text>
          <TextInput
            placeholder="@seu_instagram"
            placeholderTextColor="#94A3B8"
            value={editInstagram}
            onChangeText={setEditInstagram}
            className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-5"
            autoCapitalize="none"
          />

          <Pressable
            onPress={salvarPerfil}
            className="bg-violet-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-bold">Salvar</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
