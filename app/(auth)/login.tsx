import { Button, Card, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const router = useRouter();

  async function entrar() {
    if (!email || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    setErro('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro('E-mail ou senha incorretos. Tente de novo!');
      setLoading(false);
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        {/* Logo / título */}
        <View className="items-center mb-10">
          <Text className="text-6xl mb-2">⚡</Text>
          <Text variant="h1" className="text-violet-700 text-4xl">Plim</Text>
          <Text variant="small" color="secondary" className="mt-1">Foco sem culpa. Progresso todo dia.</Text>
        </View>

        <Card variant="elevated" padding="lg">
          <Text variant="h3" className="mb-6">Entrar</Text>

          <View className="gap-4">
            <View>
              <Text variant="small" color="secondary" className="mb-1 font-medium">E-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="seu@email.com"
                placeholderTextColor="#94A3B8"
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800"
              />
            </View>

            <View>
              <Text variant="small" color="secondary" className="mb-1 font-medium">Senha</Text>
              <TextInput
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800"
              />
            </View>

            {erro ? (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <Text className="text-amber-700 text-sm">{erro}</Text>
              </View>
            ) : null}

            <Button label="Entrar" onPress={entrar} loading={loading} size="lg" className="mt-2" />
          </View>
        </Card>

        <View className="flex-row justify-center mt-6 gap-1">
          <Text variant="small" color="secondary">Não tem conta?</Text>
          <Link href="/(auth)/cadastro" asChild>
            <Pressable>
              <Text variant="small" className="text-violet-600 font-semibold">Criar conta grátis</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
