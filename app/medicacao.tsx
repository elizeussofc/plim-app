import { Card, Text } from '@/components/ui';
import { agendarLembreteDiario, cancelarLembrete } from '@/lib/notifications';
import { COR_OPCOES, useMedicacaoStore } from '@/stores/medicacaoStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MedicacaoScreen() {
  const router = useRouter();
  const { medicacoes, adicionarMedicacao, removerMedicacao, marcarTomada, desmarcarTomada, foiTomada } = useMedicacaoStore();

  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [dose, setDose] = useState('');
  const [horario, setHorario] = useState('');
  const [corSelecionada, setCorSelecionada] = useState(COR_OPCOES[0]);

  const dataHoje = hoje();
  const tomadasHoje = medicacoes.filter((m) => foiTomada(m.id, dataHoje)).length;

  async function salvar() {
    if (!nome.trim()) return;
    adicionarMedicacao({ nome: nome.trim(), dose: dose.trim(), horario: horario.trim() || '--:--', cor: corSelecionada });

    if (Platform.OS !== 'web' && horario.trim().includes(':')) {
      const idTemp = Date.now().toString();
      await agendarLembreteDiario(idTemp, `Tomar ${nome.trim()} ${dose.trim()}`, horario.trim());
    }

    setNome(''); setDose(''); setHorario(''); setCorSelecionada(COR_OPCOES[0]);
    setModalAberto(false);
  }

  function confirmarRemover(id: string, nomeM: string) {
    Alert.alert('Remover medicação', `Remover "${nomeM}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          await cancelarLembrete(id);
          removerMedicacao(id);
        },
      },
    ]);
  }

  function toggleTomada(id: string) {
    if (foiTomada(id, dataHoje)) {
      desmarcarTomada(id, dataHoje);
    } else {
      marcarTomada(id, dataHoje);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <View className="flex-row items-center px-5 pt-4 pb-3 bg-white border-b border-violet-100">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <Text className="text-violet-600 font-semibold">← Voltar</Text>
        </Pressable>
        <Text variant="h3" className="flex-1 text-center text-violet-800">💊 Medicação</Text>
        <Pressable onPress={() => setModalAberto(true)} className="bg-violet-600 px-3 py-1.5 rounded-full">
          <Text className="text-white text-sm font-semibold">+ Nova</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Resumo do dia */}
        <Card variant="primary" padding="md" className="mb-5">
          <Text color="inverse" className="opacity-80 text-sm mb-1">Hoje, {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text color="inverse" className="text-2xl font-bold">{tomadasHoje}/{medicacoes.length} tomadas</Text>
          {tomadasHoje === medicacoes.length && medicacoes.length > 0 && (
            <Text color="inverse" className="opacity-80 text-sm mt-1">✅ Todas tomadas hoje!</Text>
          )}
        </Card>

        {medicacoes.length === 0 ? (
          <Card variant="flat" padding="lg" className="items-center mt-4">
            <Text className="text-4xl mb-3">💊</Text>
            <Text className="font-bold text-slate-700 mb-1">Nenhuma medicação cadastrada</Text>
            <Text variant="small" color="secondary" className="text-center">
              Adicione seus remédios para receber lembretes diários.
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {medicacoes.map((m) => {
              const tomada = foiTomada(m.id, dataHoje);
              return (
                <Card key={m.id} variant="default" padding="md">
                  <View className="flex-row items-center gap-3">
                    {/* Indicador de cor */}
                    <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: m.cor + '22' }}>
                      <View className="w-5 h-5 rounded-full" style={{ backgroundColor: m.cor }} />
                    </View>

                    <View className="flex-1">
                      <Text className="font-semibold text-slate-800">{m.nome}</Text>
                      <Text variant="small" color="secondary">{m.dose}{m.horario !== '--:--' ? ` · ${m.horario}` : ''}</Text>
                    </View>

                    {/* Botão marcar tomada */}
                    <Pressable
                      onPress={() => toggleTomada(m.id)}
                      className={`px-3 py-1.5 rounded-full active:opacity-70 ${tomada ? 'bg-emerald-500' : 'border border-slate-300'}`}
                    >
                      <Text className={`text-sm font-semibold ${tomada ? 'text-white' : 'text-slate-500'}`}>
                        {tomada ? '✓ Tomei' : 'Tomar'}
                      </Text>
                    </Pressable>

                    <Pressable onPress={() => confirmarRemover(m.id, m.nome)} className="p-2 -mr-1">
                      <Text className="text-slate-300 text-lg">✕</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <Text variant="caption" color="muted" className="text-center mt-5">
          Sempre siga as orientações do seu médico ou psiquiatra.
        </Text>
      </ScrollView>

      {/* Modal nova medicação */}
      <Modal visible={modalAberto} animationType="slide" transparent onRequestClose={() => setModalAberto(false)}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable className="flex-1 bg-black/30" onPress={() => setModalAberto(false)} />
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />
            <Text variant="h3" className="text-violet-800 mb-5">Nova Medicação</Text>

            <Text variant="small" color="secondary" className="mb-1 font-semibold">Nome do remédio *</Text>
            <TextInput
              placeholder="Ex: Ritalina, Venvanse..."
              placeholderTextColor="#94A3B8"
              value={nome} onChangeText={setNome}
              className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-3"
              autoFocus
            />

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text variant="small" color="secondary" className="mb-1 font-semibold">Dose</Text>
                <TextInput
                  placeholder="Ex: 10mg"
                  placeholderTextColor="#94A3B8"
                  value={dose} onChangeText={setDose}
                  className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800"
                />
              </View>
              <View className="flex-1">
                <Text variant="small" color="secondary" className="mb-1 font-semibold">Horário</Text>
                <TextInput
                  placeholder="08:00"
                  placeholderTextColor="#94A3B8"
                  value={horario} onChangeText={setHorario}
                  className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <Text variant="small" color="secondary" className="mb-2 font-semibold">Cor</Text>
            <View className="flex-row gap-3 mb-5">
              {COR_OPCOES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCorSelecionada(c)}
                  className={`w-10 h-10 rounded-full items-center justify-center ${corSelecionada === c ? 'border-4 border-slate-300' : ''}`}
                  style={{ backgroundColor: c }}
                >
                  {corSelecionada === c && <Text className="text-white font-bold">✓</Text>}
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={salvar}
              className={`rounded-2xl py-4 items-center ${nome.trim() ? 'bg-violet-600' : 'bg-violet-200'}`}
            >
              <Text className="text-white font-bold">Adicionar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
