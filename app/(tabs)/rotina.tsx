import { Card, Text } from '@/components/ui';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const tarefasExemplo = [
  { id: '1', icone: '💧', titulo: 'Beber água', categoria: 'Hidratação', horario: '08:00', status: 'pendente' },
  { id: '2', icone: '🥗', titulo: 'Almoço saudável', categoria: 'Alimentação', horario: '12:00', status: 'pendente' },
  { id: '3', icone: '🏃', titulo: 'Caminhar 20 min', categoria: 'Exercício', horario: '18:00', status: 'pendente' },
  { id: '4', icone: '😴', titulo: 'Dormir às 23h', categoria: 'Sono', horario: '23:00', status: 'pendente' },
];

export default function RotinaScreen() {
  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-6">
          <Text variant="h2" className="text-violet-800">Minha Rotina</Text>
          <View className="bg-violet-100 px-3 py-1 rounded-full">
            <Text variant="small" className="text-violet-700 font-semibold">+ Nova tarefa</Text>
          </View>
        </View>

        <Card variant="flat" padding="md" className="mb-5">
          <Text variant="small" color="secondary">Progresso de hoje</Text>
          <View className="flex-row items-center gap-3 mt-2">
            <View className="flex-1 bg-slate-200 rounded-full h-3">
              <View className="bg-violet-500 h-3 rounded-full w-0" />
            </View>
            <Text variant="small" className="text-violet-700 font-bold">0/4</Text>
          </View>
        </Card>

        <Text variant="h3" className="mb-3">Tarefas de hoje</Text>

        <View className="gap-3">
          {tarefasExemplo.map((tarefa) => (
            <Card key={tarefa.id} variant="default" padding="md">
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 bg-violet-100 rounded-2xl items-center justify-center">
                  <Text className="text-2xl">{tarefa.icone}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800">{tarefa.titulo}</Text>
                  <Text variant="small" color="secondary">{tarefa.categoria} • {tarefa.horario}</Text>
                </View>
                <View className="w-7 h-7 rounded-full border-2 border-slate-300" />
              </View>
            </Card>
          ))}
        </View>

        <Card variant="flat" padding="md" className="mt-5 items-center">
          <Text className="text-3xl mb-2">✨</Text>
          <Text color="secondary" className="text-center text-sm">
            Sua rotina está vazia.{'\n'}Adicione sua primeira tarefa!
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
