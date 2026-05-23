import { Card, Text } from '@/components/ui';
import { adicionarAoCalendario } from '@/lib/calendar';
import { agendarLembreteDiario, cancelarLembrete } from '@/lib/notifications';
import { sincronizarPontuacao } from '@/lib/ranking';
import { useAuthStore } from '@/stores/authStore';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const emojis = ['💧', '🥗', '🏃', '😴', '📚', '🎯', '💊', '🧘', '🚿', '☀️', '🌙', '✅'];

const statusConfig = {
  pendente: { cor: 'border-slate-300', icone: '' },
  feita:    { cor: 'border-violet-500 bg-violet-500', icone: '✓' },
  pulada:   { cor: 'border-slate-200 bg-slate-100', icone: '–' },
};

export default function RotinaScreen() {
  const { tarefas, alternarStatus, adicionarTarefa, removerTarefa, marcarLembrete, marcarCalendario } = useRotinaStore();
  const { addXp, addMoedas, unlockConquista, profile } = useUserStore();
  const registrarEvento = useDesafiosStore((s) => s.registrarEvento);
  const session = useAuthStore((s) => s.session);

  const [modalAberto, setModalAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [emojiSelecionado, setEmojiSelecionado] = useState('✅');
  const [carregando, setCarregando] = useState<Record<string, string | null>>({});

  const feitas = tarefas.filter((t) => t.status === 'feita').length;
  const puladas = tarefas.filter((t) => t.status === 'pulada').length;
  const rotinacompleta = tarefas.length > 0 && feitas === tarefas.length;
  const progresso = tarefas.length > 0 ? feitas / tarefas.length : 0;

  // Sincroniza pontuação no Supabase sempre que as tarefas mudam (só se logado)
  useEffect(() => {
    if (!session?.user?.id) return;
    const pontos = Math.max(0, feitas * 10 - puladas * 5 + (rotinacompleta ? 30 : 0) + profile.streak * 5);
    sincronizarPontuacao({
      userId: session.user.id,
      nomeExibido: profile.apelido ?? profile.nome ?? 'Guerreiro',
      avatarEmoji: profile.avatar_emoji,
      pontos,
      nivel: profile.nivel,
      streak: profile.streak,
      tarefasFeitas: feitas,
      tarefasPuladas: puladas,
    });
  }, [tarefas, session?.user?.id]);

  function tocarTarefa(id: string, statusAtual: string) {
    if (statusAtual === 'pendente') {
      addXp(10);
      addMoedas(5);
      if (feitas === 0) unlockConquista('primeiro_passo');
      const novasFeitas = feitas + 1;
      registrarEvento('tarefas_dia', 1)(addXp, addMoedas);
      if (novasFeitas >= 3) registrarEvento('streak_3')(addXp, addMoedas);
    }
    alternarStatus(id);
  }

  async function toggleLembrete(id: string, titulo: string, horario: string, jaAgendado: boolean) {
    if (Platform.OS === 'web') {
      Alert.alert('Não disponível na web', 'Os lembretes funcionam apenas no app mobile (Android/iOS).');
      return;
    }
    if (horario === '--:--' || !horario.includes(':')) {
      Alert.alert('Horário inválido', 'Defina um horário para a tarefa antes de agendar o lembrete.');
      return;
    }

    setCarregando((s) => ({ ...s, [id]: 'lembrete' }));
    try {
      if (jaAgendado) {
        await cancelarLembrete(id);
        marcarLembrete(id, false);
        Alert.alert('Lembrete removido', `O alarme de "${titulo}" foi cancelado.`);
      } else {
        const resultado = await agendarLembreteDiario(id, titulo, horario);
        if (resultado) {
          marcarLembrete(id, true);
          Alert.alert('🔔 Lembrete agendado!', `Você será lembrado de "${titulo}" todos os dias às ${horario}.`);
        } else {
          Alert.alert('Permissão negada', 'Precisamos de permissão para enviar notificações.');
        }
      }
    } finally {
      setCarregando((s) => ({ ...s, [id]: null }));
    }
  }

  async function toggleCalendario(id: string, titulo: string, categoria: string, horario: string, jaAdicionado: boolean) {
    if (jaAdicionado) {
      Alert.alert('Já adicionado', 'Esta tarefa já foi adicionada ao seu calendário.');
      return;
    }
    if (horario === '--:--' || !horario.includes(':')) {
      Alert.alert('Horário inválido', 'Defina um horário para a tarefa antes de adicionar ao calendário.');
      return;
    }

    setCarregando((s) => ({ ...s, [id]: 'calendario' }));
    try {
      const ok = await adicionarAoCalendario(titulo, categoria, horario);
      if (ok) {
        marcarCalendario(id, true);
        Alert.alert('📅 Adicionado!', `"${titulo}" foi criado no seu calendário com lembrete 10 min antes.`);
      }
    } finally {
      setCarregando((s) => ({ ...s, [id]: null }));
    }
  }

  function salvarNovaTarefa() {
    if (!novoTitulo.trim()) return;
    adicionarTarefa({
      icone: emojiSelecionado,
      titulo: novoTitulo.trim(),
      categoria: novaCategoria.trim() || 'Geral',
      horario: novoHorario.trim() || '--:--',
    });
    setModalAberto(false);
    setNovoTitulo('');
    setNovaCategoria('');
    setNovoHorario('');
    setEmojiSelecionado('✅');
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-6">
          <Text variant="h2" className="text-violet-800">Minha Rotina</Text>
          <Pressable
            onPress={() => setModalAberto(true)}
            className="bg-violet-600 px-4 py-2 rounded-full active:opacity-70"
          >
            <Text className="text-white font-semibold text-sm">+ Nova tarefa</Text>
          </Pressable>
        </View>

        {/* Barra de progresso */}
        <Card variant="flat" padding="md" className="mb-5">
          <View className="flex-row justify-between mb-2">
            <Text variant="small" color="secondary">Progresso de hoje</Text>
            <Text variant="small" className="text-violet-700 font-bold">{feitas}/{tarefas.length}</Text>
          </View>
          <View className="bg-slate-200 rounded-full h-3">
            <View
              className="bg-violet-500 h-3 rounded-full"
              style={{ width: `${Math.round(progresso * 100)}%` as any }}
            />
          </View>
          {feitas === tarefas.length && tarefas.length > 0 && (
            <Text variant="small" className="text-violet-600 font-semibold mt-2 text-center">
              🎉 Rotina completa! Incrível!
            </Text>
          )}
        </Card>

        <Text variant="h3" className="mb-3">Tarefas de hoje</Text>

        <View className="gap-3">
          {tarefas.map((tarefa) => {
            const cfg = statusConfig[tarefa.status];
            const loadingThis = carregando[tarefa.id];
            return (
              <Card key={tarefa.id} variant="default" padding="md"
                className={tarefa.status === 'pulada' ? 'opacity-50' : ''}
              >
                {/* Linha principal — toque para marcar */}
                <Pressable
                  onPress={() => tocarTarefa(tarefa.id, tarefa.status)}
                  onLongPress={() => {
                    Alert.alert(
                      'Remover tarefa',
                      `Remover "${tarefa.titulo}" da rotina?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Remover', style: 'destructive', onPress: () => removerTarefa(tarefa.id) },
                      ]
                    );
                  }}
                  className="flex-row items-center gap-4 active:opacity-70"
                >
                  <View className="w-12 h-12 bg-violet-100 rounded-2xl items-center justify-center">
                    <Text className="text-2xl">{tarefa.icone}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${tarefa.status === 'feita' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {tarefa.titulo}
                    </Text>
                    <Text variant="small" color="secondary">{tarefa.categoria} · {tarefa.horario}</Text>
                  </View>
                  <View className={`w-7 h-7 rounded-full border-2 items-center justify-center ${cfg.cor}`}>
                    {tarefa.status !== 'pendente' && (
                      <Text className="text-white text-xs font-bold">{cfg.icone}</Text>
                    )}
                  </View>
                </Pressable>

                {/* Botões de lembrete e calendário */}
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-slate-100">
                  <Pressable
                    onPress={() => toggleLembrete(tarefa.id, tarefa.titulo, tarefa.horario, tarefa.lembreteAgendado)}
                    disabled={loadingThis === 'lembrete'}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl active:opacity-70
                      ${tarefa.lembreteAgendado ? 'bg-violet-100' : 'bg-slate-50 border border-slate-200'}`}
                  >
                    <Text className="text-sm">{tarefa.lembreteAgendado ? '🔔' : '🔕'}</Text>
                    <Text variant="caption" className={tarefa.lembreteAgendado ? 'text-violet-700 font-semibold' : 'text-slate-500'}>
                      {loadingThis === 'lembrete' ? 'Aguarde...' : tarefa.lembreteAgendado ? 'Lembrete ativo' : 'Lembrar'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => toggleCalendario(tarefa.id, tarefa.titulo, tarefa.categoria, tarefa.horario, tarefa.calendarioAdicionado)}
                    disabled={loadingThis === 'calendario'}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl active:opacity-70
                      ${tarefa.calendarioAdicionado ? 'bg-emerald-100' : 'bg-slate-50 border border-slate-200'}`}
                  >
                    <Text className="text-sm">📅</Text>
                    <Text variant="caption" className={tarefa.calendarioAdicionado ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                      {loadingThis === 'calendario' ? 'Aguarde...' : tarefa.calendarioAdicionado ? 'No calendário' : 'Agendar'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>

        {tarefas.length === 0 && (
          <Card variant="flat" padding="md" className="mt-5 items-center">
            <Text className="text-3xl mb-2">🚀</Text>
            <Text className="text-center font-semibold text-violet-700 mb-1">
              Vamos começar?
            </Text>
            <Text color="secondary" className="text-center text-sm">
              Adicione sua primeira tarefa abaixo!
            </Text>
          </Card>
        )}

        <Text variant="caption" color="muted" className="text-center mt-4">
          Toque para marcar · Segure para remover
        </Text>
      </ScrollView>

      {/* Modal Nova Tarefa */}
      <Modal
        visible={modalAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalAberto(false)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable className="flex-1 bg-black/30" onPress={() => setModalAberto(false)} />
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />
            <Text variant="h3" className="text-violet-800 mb-5">Nova Tarefa</Text>

            {/* Emoji seletor */}
            <Text variant="small" color="secondary" className="mb-2 font-semibold">Ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2 pb-1">
                {emojis.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setEmojiSelecionado(e)}
                    className={`w-11 h-11 rounded-2xl items-center justify-center ${emojiSelecionado === e ? 'bg-violet-600' : 'bg-slate-100'}`}
                  >
                    <Text className="text-xl">{e}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Título */}
            <Text variant="small" color="secondary" className="mb-1 font-semibold">Título *</Text>
            <TextInput
              placeholder="Ex: Beber 2 litros de água"
              placeholderTextColor="#94A3B8"
              value={novoTitulo}
              onChangeText={setNovoTitulo}
              className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-3"
              autoFocus
            />

            {/* Categoria + Horário */}
            <View className="flex-row gap-3 mb-5">
              <View className="flex-1">
                <Text variant="small" color="secondary" className="mb-1 font-semibold">Categoria</Text>
                <TextInput
                  placeholder="Ex: Saúde"
                  placeholderTextColor="#94A3B8"
                  value={novaCategoria}
                  onChangeText={setNovaCategoria}
                  className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800"
                />
              </View>
              <View className="flex-1">
                <Text variant="small" color="secondary" className="mb-1 font-semibold">Horário</Text>
                <TextInput
                  placeholder="08:00"
                  placeholderTextColor="#94A3B8"
                  value={novoHorario}
                  onChangeText={setNovoHorario}
                  keyboardType="numbers-and-punctuation"
                  className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800"
                />
              </View>
            </View>

            <Pressable
              onPress={salvarNovaTarefa}
              className={`rounded-2xl py-4 items-center ${novoTitulo.trim() ? 'bg-violet-600' : 'bg-violet-200'}`}
            >
              <Text className="text-white font-bold">Adicionar tarefa</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
