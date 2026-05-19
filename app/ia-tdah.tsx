import { MensagemChat, enviarMensagem } from '@/lib/anthropic';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';

const SUGESTOES = [
  'Estou travado numa tarefa',
  'Não consigo começar nada hoje',
  'Minha cabeça está cheia demais',
  'Como focar por mais tempo?',
];

export default function IATDAHScreen() {
  const router = useRouter();
  const [historico, setHistorico] = useState<MensagemChat[]>([
    {
      role: 'assistant',
      content: 'Oi! 👋 Sou o Plim IA, aqui pra te ajudar com o que precisar.\n\nEstou travado em algo, preciso organizar minha cabeça ou só quer conversar? Me conta! 🧠',
    },
  ]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function enviar(mensagem?: string) {
    const msg = (mensagem ?? texto).trim();
    if (!msg || enviando) return;

    const novoHistorico: MensagemChat[] = [
      ...historico,
      { role: 'user', content: msg },
    ];
    setHistorico(novoHistorico);
    setTexto('');
    setEnviando(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const resposta = await enviarMensagem(
      novoHistorico.map((m) => ({ role: m.role, content: m.content }))
    );

    setHistorico((prev) => [...prev, { role: 'assistant', content: resposta }]);
    setEnviando(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4 pb-3 bg-white border-b border-violet-100">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 mr-2">
            <Text className="text-violet-600 font-semibold">← Voltar</Text>
          </Pressable>
          <View className="flex-1 items-center">
            <Text variant="h3" className="text-violet-800">🤖 Plim IA</Text>
            <Text variant="caption" color="secondary">Assistente especializado em TDAH</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Mensagens */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {historico.map((msg, i) => (
            <View
              key={i}
              className={`mb-3 max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}
            >
              {msg.role === 'assistant' && (
                <View className="flex-row items-center gap-1 mb-1">
                  <Text className="text-sm">🤖</Text>
                  <Text variant="caption" className="text-violet-600 font-semibold">Plim IA</Text>
                </View>
              )}
              <View
                className={`px-4 py-3 rounded-3xl ${
                  msg.role === 'user'
                    ? 'bg-violet-600 rounded-tr-sm'
                    : 'bg-white border border-slate-100 rounded-tl-sm shadow-sm'
                }`}
                style={msg.role === 'assistant' ? {
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
                } : {}}
              >
                <Text
                  className={`text-sm leading-6 ${msg.role === 'user' ? 'text-white' : 'text-slate-800'}`}
                >
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

          {enviando && (
            <View className="self-start mb-3 bg-white border border-slate-100 px-4 py-3 rounded-3xl rounded-tl-sm flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text variant="caption" color="secondary">digitando...</Text>
            </View>
          )}

          {/* Sugestões iniciais */}
          {historico.length === 1 && (
            <View className="mt-2 gap-2">
              <Text variant="caption" color="muted" className="text-center mb-1">Sugestões para começar:</Text>
              {SUGESTOES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => enviar(s)}
                  className="bg-white border border-violet-200 px-4 py-2.5 rounded-2xl active:opacity-70"
                >
                  <Text variant="small" className="text-violet-700">{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="flex-row items-end gap-2 px-4 py-3 bg-white border-t border-slate-100">
          <TextInput
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 max-h-32"
            placeholder="Me conta o que está passando..."
            placeholderTextColor="#94A3B8"
            value={texto}
            onChangeText={setTexto}
            multiline
            style={{ textAlignVertical: 'top' }}
          />
          <Pressable
            onPress={() => enviar()}
            disabled={!texto.trim() || enviando}
            className={`w-12 h-12 rounded-2xl items-center justify-center ${texto.trim() && !enviando ? 'bg-violet-600' : 'bg-violet-200'}`}
          >
            <Text className="text-white text-lg">↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
