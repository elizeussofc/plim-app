import { Button, Card, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CadastroScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  async function cadastrar() {
    if (!email || !senha || !nome) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setErro('');

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    if (error) {
      setErro('Não foi possível criar a conta. Tente novamente!');
    } else {
      setSucesso(true);
    }
    setLoading(false);
  }

  if (sucesso) {
    return (
      <SafeAreaView className="flex-1 bg-violet-50 justify-center px-6">
        <Card variant="elevated" padding="lg" className="items-center">
          <Text className="text-5xl mb-4">🎉</Text>
          <Text variant="h2" className="text-center mb-2">Conta criada!</Text>
          <Text color="secondary" className="text-center mb-6">
            Verifique seu e-mail para confirmar o cadastro e depois volte para entrar.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable className="bg-violet-600 px-6 py-3 rounded-2xl">
              <Text color="inverse" className="font-semibold">Ir para o login</Text>
            </Pressable>
          </Link>
        </Card>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        <View className="items-center mb-8">
          <Text className="text-5xl mb-2">⚡</Text>
          <Text variant="h2" className="text-violet-700">Criar conta</Text>
          <Text variant="small" color="secondary" className="mt-1">Grátis, sem cartão.</Text>
        </View>

        <Card variant="elevated" padding="lg">
          <View className="gap-4">
            <View>
              <Text variant="small" color="secondary" className="mb-1 font-medium">Seu nome</Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="Como posso te chamar?"
                placeholderTextColor="#94A3B8"
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800"
              />
            </View>

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
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#94A3B8"
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800"
              />
            </View>

            {erro ? (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <Text className="text-amber-700 text-sm">{erro}</Text>
              </View>
            ) : null}

            <Button label="Criar conta grátis" onPress={cadastrar} loading={loading} size="lg" className="mt-2" />
          </View>
        </Card>

        <View className="flex-row justify-center mt-6 gap-1">
          <Text variant="small" color="secondary">Já tem conta?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text variant="small" className="text-violet-600 font-semibold">Entrar</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
