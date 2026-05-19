import { Button, Card, Text } from '@/components/ui';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const duracoes = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '25 min', value: 25 },
  { label: '45 min', value: 45 },
];

export default function FocoScreen() {
  const [duracaoSelecionada, setDuracaoSelecionada] = useState(25);
  const [ativo, setAtivo] = useState(false);

  const progresso = 0; // 0-1, será calculado quando o timer estiver ativo

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <View className="flex-1 px-6 pt-6 pb-4">
        <Text variant="h2" className="text-violet-800 mb-1">Sessão de Foco</Text>
        <Text variant="small" color="secondary" className="mb-8">
          Parou no meio? Tudo bem — ainda conta. ✨
        </Text>

        {/* Timer visual circular */}
        <View className="items-center mb-8">
          <View className="w-56 h-56 rounded-full bg-violet-600 items-center justify-center shadow-xl" style={{ shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 }}>
            <Text className="text-white text-5xl font-bold">
              {String(duracaoSelecionada).padStart(2, '0')}:00
            </Text>
            <Text className="text-violet-200 text-sm mt-1">minutos</Text>
          </View>
        </View>

        {/* Seletor de duração */}
        <Text variant="small" color="secondary" className="mb-3 font-semibold">Duração</Text>
        <View className="flex-row gap-2 mb-8">
          {duracoes.map((d) => (
            <Pressable
              key={d.value}
              onPress={() => !ativo && setDuracaoSelecionada(d.value)}
              className={`flex-1 py-3 rounded-2xl items-center ${duracaoSelecionada === d.value ? 'bg-violet-600' : 'bg-white border border-slate-200'}`}
            >
              <Text className={`font-semibold text-sm ${duracaoSelecionada === d.value ? 'text-white' : 'text-slate-600'}`}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Botão principal */}
        <Button
          label={ativo ? 'Pausar sessão' : 'Começar agora'}
          onPress={() => setAtivo(!ativo)}
          variant={ativo ? 'secondary' : 'primary'}
          size="lg"
          className="mb-4"
        />

        {ativo && (
          <Button
            label="Encerrar e salvar"
            onPress={() => setAtivo(false)}
            variant="ghost"
            size="md"
          />
        )}

        {/* Cards de sons */}
        <Card variant="flat" padding="md" className="mt-6">
          <Text variant="small" color="secondary" className="mb-3 font-semibold">Sons ambiente</Text>
          <View className="flex-row gap-2">
            {['🌧️ Chuva', '🌊 Ondas', '☕ Café', '🤫 Silêncio'].map((som) => (
              <Pressable key={som} className="bg-white border border-slate-200 px-3 py-2 rounded-xl">
                <Text variant="caption" color="secondary">{som}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}
