import Icone from '@/components/Icone';
import { Botao, Peca } from '@/components/plim';
import { Text } from '@/components/Texto';
import { supabase } from '@/lib/supabase';
import { C, F, R } from '@/lib/theme';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const campo = { backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 16, fontFamily: F.regular } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function explicar(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'Já existe uma conta com este e-mail. Tente entrar.';
  if (m.includes('password')) return 'Essa senha é fraca demais. Use pelo menos 6 caracteres.';
  if (m.includes('fetch') || m.includes('network')) return 'Sem conexão com o servidor. Confira sua internet e tente de novo.';
  if (m.includes('rate') || m.includes('too many')) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  return 'Não deu para criar a conta agora. Tente de novo em instantes.';
}

export default function CadastroScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const campoEmail = useRef<TextInput>(null);
  const campoSenha = useRef<TextInput>(null);
  const router = useRouter();

  async function cadastrar() {
    const endereco = email.trim();
    if (!nome.trim() || !endereco || !senha) { setErro('Preencha nome, e-mail e senha.'); return; }
    if (!EMAIL.test(endereco)) { setErro('Esse e-mail parece incompleto. Confira.'); return; }
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    setErro('');
    try {
      const { error } = await supabase.auth.signUp({ email: endereco, password: senha, options: { data: { nome: nome.trim() } } });
      if (error) setErro(explicar(error.message));
      else setSucesso(true);
    } catch {
      setErro(explicar('network'));
    } finally {
      setLoading(false);
    }
  }

  if (sucesso) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, maxWidth: 480, width: '100%', alignSelf: 'center', justifyContent: 'center', padding: 22 }}>
          <Peca tinta="verde" estilo={{ alignItems: 'center' }} padding={24}>
            <Image source={require('../../assets/cenas/vitoria.webp')} style={{ width: 170, height: 196 }} resizeMode="contain" accessible={false} />
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 26, color: C.text, marginTop: 8 }}>Conta criada!</Text>
            <Text style={{ fontSize: 16, color: C.textSub, textAlign: 'center', marginTop: 6, marginBottom: 18, lineHeight: 23 }}>
              Mandamos um e-mail para {email.trim()}. Abra, toque no link de confirmação e depois volte aqui para entrar.
            </Text>
            <Botao rotulo="Ir para a tela de entrar" onPress={() => router.replace('/(auth)/login')} estilo={{ alignSelf: 'stretch' }} />
          </Peca>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Icone nome="raio" tamanho={72} />
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 30, color: C.text, marginTop: 4 }}>Criar conta</Text>
            <Text style={{ fontSize: 16, color: C.textSub, marginTop: 2 }}>Grátis e sem cartão.</Text>
          </View>

          <Peca padding={20}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>Como podemos te chamar?</Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              autoComplete="given-name"
              returnKeyType="next"
              onSubmitEditing={() => campoEmail.current?.focus()}
              placeholder="Seu nome ou apelido"
              placeholderTextColor={C.textMuted}
              maxLength={40}
              accessibilityLabel="Nome"
              style={[campo, { marginBottom: 14 }]}
            />

            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>E-mail</Text>
            <TextInput
              ref={campoEmail}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => campoSenha.current?.focus()}
              placeholder="voce@email.com"
              placeholderTextColor={C.textMuted}
              accessibilityLabel="E-mail"
              style={[campo, { marginBottom: 14 }]}
            />

            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>Senha</Text>
            <TextInput
              ref={campoSenha}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={cadastrar}
              placeholder="Pelo menos 6 caracteres"
              placeholderTextColor={C.textMuted}
              accessibilityLabel="Senha, pelo menos 6 caracteres"
              style={campo}
            />

            {!!erro && (
              <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ backgroundColor: C.goldSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 }}>
                <Text style={{ color: C.text, fontSize: 14, lineHeight: 20 }}>{erro}</Text>
              </View>
            )}

            <Botao rotulo={loading ? 'Criando...' : 'Criar conta grátis'} onPress={cadastrar} disabled={loading} estilo={{ marginTop: 16 }} />
          </Peca>

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18, gap: 6 }}>
            <Text style={{ color: C.textSub, fontSize: 15 }}>Já tem conta?</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="link" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: C.primaryLight, fontSize: 15, fontFamily: F.bold }}>Entrar</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
