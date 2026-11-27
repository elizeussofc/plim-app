import AvatarPersonagem from '@/components/AvatarPersonagem';
import Icone from '@/components/Icone';
import { Botao } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { LIMITE, podeComentar, tempoRelativo, type Comentario, type Post } from '@/lib/grupo';
import { C, F, R } from '@/lib/theme';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

interface Props {
  post: Post | null;
  comentarios: Comentario[];
  carregando: boolean;
  ehPro: boolean;
  aoFechar: () => void;
  /** Devolve true quando o comentário entrou. */
  aoEnviar: (texto: string) => Promise<boolean>;
  aoApagar: (id: string) => void;
  aoPedirPro: () => void;
  aoAbrirPessoa?: (userId: string) => void;
}

/** Janela de comentários de um post. Ler é de todo mundo; escrever em post dos outros é do Pro. */
export default function Comentarios({ post, comentarios, carregando, ehPro, aoFechar, aoEnviar, aoApagar, aoPedirPro, aoAbrirPessoa }: Props) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  if (!post) return null;
  const pode = podeComentar(ehPro, post.meu);
  const agora = Date.now();

  async function enviar() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const ok = await aoEnviar(texto);
    setEnviando(false);
    if (ok) setTexto('');
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={aoFechar}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={aoFechar} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '86%', minHeight: 320, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 22, color: C.text }}>Comentários</Text>
            <Pressable onPress={aoFechar} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.displayX, fontSize: 20, color: C.textSub }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {carregando && comentarios.length === 0 && <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />}
            {!carregando && comentarios.length === 0 && (
              <Text style={{ fontSize: 15, color: C.textSub, textAlign: 'center', marginVertical: 24, lineHeight: 22 }}>
                Ninguém comentou ainda.{pode ? ' Uma palavra boa já ajuda.' : ''}
              </Text>
            )}
            {comentarios.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <Pressable onPress={aoAbrirPessoa && !c.meu ? () => aoAbrirPessoa(c.autor.id) : undefined} disabled={!aoAbrirPessoa || c.meu} accessibilityRole="button" accessibilityLabel={`Ver o perfil de ${c.autor.apelido}`}>
                  <AvatarPersonagem config={c.autor.avatar} size={36} />
                </Pressable>
                <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 2, borderColor: C.border, padding: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14, color: C.text, flexShrink: 1 }}>{c.autor.apelido}</Text>
                    <Text style={{ fontSize: 12, color: C.textMuted }}>{tempoRelativo(c.criadoEm, agora)}</Text>
                  </View>
                  <Text style={{ fontSize: 15, lineHeight: 22, color: C.text, marginTop: 2 }}>{c.texto}</Text>
                  {(c.meu || post.meu) && (
                    <Pressable onPress={() => confirmar('Apagar o comentário', 'Ele some para todo mundo.', 'Apagar', () => aoApagar(c.id))} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, color: C.textSub, textDecorationLine: 'underline' }}>Apagar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: 16, paddingTop: 10, borderTopWidth: 2, borderColor: C.border }}>
            {pode ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
                <TextInput
                  multiline
                  value={texto}
                  onChangeText={(t) => setTexto(t.slice(0, LIMITE.comentario))}
                  placeholder={post.meu ? 'Responda quem comentou' : 'Escreva algo gentil'}
                  placeholderTextColor={C.textMuted}
                  accessibilityLabel="Seu comentário"
                  style={{ flex: 1, maxHeight: 110, minHeight: 50, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 16, fontFamily: F.regular }}
                />
                {enviando
                  ? <View style={{ width: 86, minHeight: 50, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.primary} /></View>
                  : <Botao rotulo="Enviar" pequeno onPress={enviar} disabled={!texto.trim()} />}
              </View>
            ) : (
              <Pressable onPress={aoPedirPro} accessibilityRole="button" accessibilityLabel="Comentar em publicações de outras pessoas faz parte do Plim Pro. Ver o Pro." style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.goldSoft, borderRadius: R.md, borderWidth: 2, borderBottomWidth: 5, borderColor: '#F2D98A', padding: 12 }}>
                <Icone nome="coroa" tamanho={34} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text }}>Comentar é do Plim Pro</Text>
                  <Text style={{ fontSize: 13, color: C.textSub, lineHeight: 19 }}>No grátis você lê tudo, reage com emoji e responde nas suas publicações.</Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
