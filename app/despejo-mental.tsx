import { Text } from '@/components/ui';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DespejoMentalScreen() {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [salvo, setSalvo] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const unlockConquista = useUserStore((s) => s.unlockConquista);
  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);

  function salvar() {
    if (!texto.trim()) return;
    unlockConquista('despejou');
    addXp(15);
    addMoedas(5);
    setSalvo(true);
    setTimeout(() => router.back(), 1200);
  }

  function descartar() {
    setTexto('');
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 px-6 pt-4 pb-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Pressable onPress={descartar} className="p-2 -ml-2">
                <Text className="text-violet-600 text-base font-semibold">← Voltar</Text>
              </Pressable>
              <Text variant="h3" className="text-violet-800">🧠 Despejo Mental</Text>
              <View style={{ width: 70 }} />
            </View>

            <Text variant="small" color="secondary" className="mb-4 leading-5">
              Jogue pra fora tudo que está na sua cabeça.{'\n'}
              Sem filtro, sem julgamento. Só solte.
            </Text>

            {/* Área de texto */}
            <View className="flex-1 bg-white rounded-3xl p-4 shadow-sm"
              style={{ shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
              <TextInput
                ref={inputRef}
                multiline
                autoFocus
                placeholder="O que está passando na sua cabeça agora?..."
                placeholderTextColor="#94A3B8"
                value={texto}
                onChangeText={setTexto}
                className="flex-1 text-slate-800 text-base leading-7"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Contador */}
            <Text variant="caption" color="muted" className="text-right mt-2 mr-1">
              {texto.length} caracteres
            </Text>

            {/* Botões */}
            {salvo ? (
              <View className="bg-emerald-500 rounded-2xl py-4 items-center mt-3">
                <Text className="text-white font-bold text-base">✅ Salvo! +15 XP</Text>
              </View>
            ) : (
              <View className="flex-row gap-3 mt-3">
                <Pressable
                  onPress={descartar}
                  className="flex-1 bg-white border border-slate-200 rounded-2xl py-4 items-center"
                >
                  <Text className="text-slate-500 font-semibold">Descartar</Text>
                </Pressable>
                <Pressable
                  onPress={salvar}
                  className={`flex-1 rounded-2xl py-4 items-center ${texto.trim() ? 'bg-violet-600' : 'bg-violet-200'}`}
                  disabled={!texto.trim()}
                >
                  <Text className="text-white font-bold">Salvar despejo</Text>
                </Pressable>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
