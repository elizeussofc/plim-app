import { Botao, Peca } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar } from '@/lib/avisar';
import { supabase } from '@/lib/supabase';
import { C, F, R } from '@/lib/theme';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const campo = { backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 16, fontFamily: F.regular } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Traduz o erro do servidor para uma frase que diz o que fazer. */
function explicar(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('not confirmed')) return 'Falta confirmar seu e-mail. Abra a mensagem que o Plim mandou e toque no link.';
  if (m.includes('invalid login')) return 'E-mail ou senha não conferem. Confira e tente de novo.';
  if (m.includes('fetch') || m.includes('network')) return 'Sem conexão com o servidor. Confira sua internet e tente de novo.';
  if (m.includes('rate') || m.includes('too many')) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  return 'Não deu para entrar agora. Tente de novo em instantes.';
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const campoSenha = useRef<TextInput>(null);
  const router = useRouter();

  function voltar() {
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)');
  }

  async function entrar() {
    const endereco = email.trim();
    if (!endereco || !senha) { setErro('Preencha e-mail e senha.'); return; }
    setLoading(true);
    setErro('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: endereco, password: senha });
      if (error) setErro(explicar(error.message));
      else router.replace('/(tabs)');
    } catch {
      setErro(explicar('network'));
    } finally {
      setLoading(false);
    }
  }

  async function esqueciSenha() {
    const endereco = email.trim();
    if (!EMAIL.test(endereco)) { setErro('Escreva seu e-mail no campo acima e toque de novo em "Esqueci minha senha".'); return; }
    setErro('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(endereco);
      if (error) setErro(explicar(error.message));
      else avisar('E-mail enviado', `Se existe uma conta com ${endereco}, o link para criar outra senha chega em instantes.`);
    } catch {
      setErro(explicar('network'));
    }
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
            <Image source={require('../../assets/cenas/ola.webp')} style={{ width: 200, height: 209 }} resizeMode="contain" accessible={false} />
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 34, color: C.text, marginTop: 6 }}>Plim</Text>
            <Text style={{ fontSize: 16, color: C.textSub, marginTop: 2 }}>Foco sem culpa. Um passo por dia.</Text>
          </View>

          <Peca padding={20}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>E-mail</Text>
            <TextInput
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
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={entrar}
              placeholder="Sua senha"
              placeholderTextColor={C.textMuted}
              accessibilityLabel="Senha"
              style={campo}
            />

            {!!erro && (
              <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ backgroundColor: C.goldSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 }}>
                <Text style={{ color: C.text, fontSize: 14, lineHeight: 20 }}>{erro}</Text>
              </View>
            )}

            <Botao rotulo={loading ? 'Entrando...' : 'Entrar'} onPress={entrar} disabled={loading} estilo={{ marginTop: 16 }} />

            <Pressable onPress={esqueciSenha} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 4 }}>
              <Text style={{ fontSize: 14, color: C.textSub, textDecorationLine: 'underline' }}>Esqueci minha senha</Text>
            </Pressable>
          </Peca>

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18, gap: 6 }}>
            <Text style={{ color: C.textSub, fontSize: 15 }}>Não tem conta?</Text>
            <Link href="/(auth)/cadastro" asChild>
              <Pressable accessibilityRole="link" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: C.primaryLight, fontSize: 15, fontFamily: F.bold }}>Criar conta grátis</Text>
              </Pressable>
            </Link>
          </View>

          <Pressable onPress={voltar} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, color: C.textMuted }}>Agora não, voltar ao app</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
