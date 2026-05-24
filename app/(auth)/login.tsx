import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function LoginScreen() {
  const [email, setEmail]   = useState('');
  const [senha, setSenha]   = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro]     = useState('');
  const router = useRouter();

  async function entrar() {
    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return; }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
      >
        <Animated.View entering={FadeInUp.delay(0).springify()} style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            backgroundColor: C.primary + '22',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            borderWidth: 1.5,
            borderColor: C.primaryLight + '44',
          }}>
            <Text style={{ fontSize: 36 }}>⚡</Text>
          </View>
          <Text style={{ fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -1 }}>Plim</Text>
          <Text style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>Foco sem culpa. Progresso todo dia.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()} style={{
          backgroundColor: C.surface,
          borderRadius: 24,
          padding: 24,
          borderWidth: 1,
          borderColor: C.border,
        }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20 }}>entrar</Text>

          <View style={{ gap: 14 }}>
            <View>
              <Text style={{ fontSize: 12, color: C.textSub, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 }}>E-MAIL</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="seu@email.com"
                placeholderTextColor={C.textMuted}
                style={{
                  backgroundColor: C.surfaceHigh,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: C.text,
                  fontSize: 15,
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, color: C.textSub, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 }}>SENHA</Text>
              <TextInput
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                style={{
                  backgroundColor: C.surfaceHigh,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: C.text,
                  fontSize: 15,
                }}
              />
            </View>

            {erro ? (
              <View style={{ backgroundColor: '#EF444422', borderWidth: 1, borderColor: '#EF444444', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ color: '#FCA5A5', fontSize: 13 }}>{erro}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={entrar}
              disabled={loading}
              style={{
                backgroundColor: loading ? C.primary + '88' : C.primary,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 4,
                shadowColor: C.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 6 }}>
          <Text style={{ color: C.textSub, fontSize: 13 }}>Não tem conta?</Text>
          <Link href="/(auth)/cadastro" asChild>
            <Pressable>
              <Text style={{ color: C.primaryLight, fontSize: 13, fontWeight: '700' }}>Criar conta grátis</Text>
            </Pressable>
          </Link>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
