import { Card, Text } from '@/components/ui';
import { StatusDia, useRotinaStore } from '@/stores/rotinaStore';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const corDia: Record<StatusDia, string> = {
  vazia:    'bg-slate-100',
  parcial:  'bg-violet-300',
  completa: 'bg-violet-600',
};

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function gerarGrade(): { data: string; label: string }[] {
  const dias: { data: string; label: string }[] = [];
  const hoje = new Date();
  for (let i = 34; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    dias.push({
      data: d.toISOString().slice(0, 10),
      label: d.getDate().toString(),
    });
  }
  return dias;
}

export default function HistoricoScreen() {
  const router = useRouter();
  const historicoDias = useRotinaStore((s) => s.historicoDias);
  const tarefas = useRotinaStore((s) => s.tarefas);
  const grade = gerarGrade();

  const completos = grade.filter((d) => historicoDias[d.data] === 'completa').length;
  const parciais  = grade.filter((d) => historicoDias[d.data] === 'parcial').length;
  const vazios    = grade.filter((d) => historicoDias[d.data] === 'vazia' && d.data <= new Date().toISOString().slice(0, 10)).length;

  // Agrupa por semanas (linhas de 7)
  const semanas: typeof grade[] = [];
  for (let i = 0; i < grade.length; i += 7) {
    semanas.push(grade.slice(i, i + 7));
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <View className="flex-row items-center px-5 pt-4 pb-3 bg-white border-b border-violet-100">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <Text className="text-violet-600 font-semibold">← Voltar</Text>
        </Pressable>
        <Text variant="h3" className="flex-1 text-center text-violet-800">📊 Histórico</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Resumo */}
        <View className="flex-row gap-3 mb-6">
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-violet-600">{completos}</Text>
            <Text variant="caption" color="secondary">Completas</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-violet-300">{parciais}</Text>
            <Text variant="caption" color="secondary">Parciais</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-slate-300">{vazios}</Text>
            <Text variant="caption" color="secondary">Vazias</Text>
          </Card>
        </View>

        {/* Heatmap */}
        <Card variant="default" padding="lg" className="mb-6">
          <Text variant="h3" className="text-slate-800 mb-4">Últimos 35 dias</Text>

          {/* Cabeçalho dias da semana */}
          <View className="flex-row gap-1.5 mb-1.5 px-0.5">
            {DIAS_SEMANA.map((d, i) => (
              <View key={i} className="flex-1 items-center">
                <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600' }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Grade */}
          {semanas.map((semana, si) => (
            <View key={si} className="flex-row gap-1.5 mb-1.5">
              {semana.map((dia) => {
                const status: StatusDia = historicoDias[dia.data] ?? 'vazia';
                const ehHoje = dia.data === new Date().toISOString().slice(0, 10);
                return (
                  <View
                    key={dia.data}
                    className={`flex-1 aspect-square rounded-md items-center justify-center ${corDia[status]} ${ehHoje ? 'border-2 border-violet-600' : ''}`}
                  >
                    <Text style={{ fontSize: 9, color: status === 'completa' ? '#fff' : '#94A3B8' }}>
                      {dia.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Legenda */}
          <View className="flex-row items-center gap-4 mt-4 justify-center">
            {(['vazia', 'parcial', 'completa'] as StatusDia[]).map((s) => (
              <View key={s} className="flex-row items-center gap-1.5">
                <View className={`w-3.5 h-3.5 rounded-sm ${corDia[s]}`} />
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                  {s === 'vazia' ? 'Nenhuma' : s === 'parcial' ? 'Parcial' : 'Completa'}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Tarefas com mais falhas */}
        <Text variant="h3" className="mb-3">Tarefas de hoje</Text>
        <View className="gap-2">
          {tarefas.map((t) => (
            <Card key={t.id} variant="flat" padding="md">
              <View className="flex-row items-center gap-3">
                <Text className="text-xl">{t.icone}</Text>
                <Text className="flex-1 font-medium text-slate-700">{t.titulo}</Text>
                <View className={`px-2 py-0.5 rounded-full ${
                  t.status === 'feita' ? 'bg-violet-100' :
                  t.status === 'pulada' ? 'bg-red-100' : 'bg-slate-100'
                }`}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color:
                    t.status === 'feita' ? '#7C3AED' :
                    t.status === 'pulada' ? '#EF4444' : '#94A3B8'
                  }}>
                    {t.status === 'feita' ? '✓ Feita' : t.status === 'pulada' ? '✗ Pulada' : '· Pendente'}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
