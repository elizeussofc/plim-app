import { Card, Text } from '@/components/ui';
import { useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useState } from 'react';
import {
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
  pendente: { cor: 'border-slate-300', bg: '', icone: '' },
  feita: { cor: 'border-violet-500 bg-violet-500', bg: 'opacity-100', icone: '✓' },
  pulada: { cor: 'border-slate-200 bg-slate-100', bg: 'opacity-40', icone: '–' },
};

export default function RotinaScreen() {
  const { tarefas, alternarStatus, adicionarTarefa, removerTarefa } = useRotinaStore();
  const { addXp, addMoedas, unlockConquista } = useUserStore();

  const [modalAberto, setModalAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [emojiSelecionado, setEmojiSelecionado] = useState('✅');

  const feitas = tarefas.filter((t) => t.status === 'feita').length;
  const progresso = tarefas.length > 0 ? feitas / tarefas.length : 0;

  function tocarTarefa(id: string, statusAtual: string) {
    const vaiFicarFeita = statusAtual === 'pendente';
    alternarStatus(id);
    if (vaiFicarFeita) {
      addXp(10);
      addMoedas(5);
      if (feitas === 0) unlockConquista('primeiro_passo');
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
            return (
              <Pressable
                key={tarefa.id}
                onPress={() => tocarTarefa(tarefa.id, tarefa.status)}
                onLongPress={() => removerTarefa(tarefa.id)}
                className={`active:opacity-70 ${tarefa.status === 'pulada' ? 'opacity-50' : ''}`}
              >
                <Card variant="default" padding="md">
                  <View className="flex-row items-center gap-4">
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
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {tarefas.length === 0 && (
          <Card variant="flat" padding="md" className="mt-5 items-center">
            <Text className="text-3xl mb-2">✨</Text>
            <Text color="secondary" className="text-center text-sm">
              Sua rotina está vazia.{'\n'}Adicione sua primeira tarefa!
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
          <Pressable
            className="flex-1 bg-black/30"
            onPress={() => setModalAberto(false)}
          />
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
