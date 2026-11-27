import { FUNDO_STORY } from '@/components/grupo/StoryViewer';
import { Botao } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar } from '@/lib/avisar';
import { CORES_STORY, LIMITE, type CorStory } from '@/lib/grupo';
import { escolherImagem, type ImagemPronta } from '@/lib/grupoImagem';
import { somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

export interface Rascunho { texto: string; local: string; cor: CorStory; imagem: ImagemPronta | null }

interface Props {
  tipo: 'post' | 'story';
  visivel: boolean;
  /** Onde isso vai aparecer, dito com todas as letras (grupo de verdade ou só neste aparelho). */
  aviso: string;
  aoFechar: () => void;
  /** Devolve true quando publicou (a janela fecha e limpa o rascunho). */
  aoPublicar: (r: Rascunho) => Promise<boolean>;
}

/** Janela de publicar: foto da galeria, lugar escrito à mão e texto. Serve para post e para story. */
export default function Compositor({ tipo, visivel, aviso, aoFechar, aoPublicar }: Props) {
  const [texto, setTexto] = useState('');
  const [local, setLocal] = useState('');
  const [comLocal, setComLocal] = useState(false);
  const [cor, setCor] = useState<CorStory>('roxo');
  const [imagem, setImagem] = useState<ImagemPronta | null>(null);
  const [ocupado, setOcupado] = useState<'foto' | 'enviando' | null>(null);

  const limite = tipo === 'post' ? LIMITE.texto : LIMITE.story;
  const pode = (texto.trim().length > 0 || !!imagem) && !ocupado;

  useEffect(() => {
    if (!visivel) setOcupado(null);
  }, [visivel]);

  async function pegarFoto() {
    setOcupado('foto');
    try {
      const foto = await escolherImagem();
      if (foto) { setImagem(foto); somToque(); }
    } catch {
      avisar('Não deu para abrir essa foto', 'Tente outra imagem, de preferência JPG ou PNG.');
    }
    setOcupado(null);
  }

  async function publicar() {
    if (!pode) return;
    setOcupado('enviando');
    const ok = await aoPublicar({ texto, local: comLocal ? local : '', cor, imagem });
    setOcupado(null);
    if (ok) { setTexto(''); setLocal(''); setComLocal(false); setImagem(null); setCor('roxo'); }
  }

  const campo = { backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 16, fontFamily: F.regular } as const;

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={aoFechar}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={aoFechar} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '92%', width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 24, color: C.text }}>{tipo === 'post' ? 'Nova publicação' : 'Novo story'}</Text>
              <Pressable onPress={aoFechar} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.displayX, fontSize: 20, color: C.textSub }}>✕</Text>
              </Pressable>
            </View>

            {/* Prévia */}
            {imagem ? (
              <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: C.border, marginBottom: 12, backgroundColor: C.surfaceHigh }}>
                <Image source={{ uri: imagem.dataUri }} style={{ width: '100%', aspectRatio: Math.max(0.7, Math.min(1.8, imagem.largura / imagem.altura)) }} resizeMode="cover" accessibilityLabel="Foto escolhida" />
                <Pressable onPress={() => setImagem(null)} accessibilityRole="button" accessibilityLabel="Tirar a foto" style={{ position: 'absolute', top: 10, right: 10, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#FFFFFF' }}>Tirar foto</Text>
                </Pressable>
              </View>
            ) : tipo === 'story' ? (
              <View style={{ borderRadius: 20, minHeight: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: FUNDO_STORY[cor], marginBottom: 12, padding: 18 }}>
                <Text style={{ fontFamily: F.displayX, fontSize: 22, lineHeight: 29, color: '#FFFFFF', textAlign: 'center', opacity: texto.trim() ? 1 : 0.7 }}>{texto.trim() || 'Seu texto aparece aqui'}</Text>
              </View>
            ) : null}

            <TextInput
              multiline
              value={texto}
              onChangeText={(t) => setTexto(t.slice(0, limite))}
              placeholder={tipo === 'post' ? 'O que você quer contar?' : imagem ? 'Legenda (opcional)' : 'Escreva algo curto'}
              placeholderTextColor={C.textMuted}
              accessibilityLabel={tipo === 'post' ? 'Texto da publicação' : 'Texto do story'}
              style={{ ...campo, minHeight: tipo === 'post' ? 110 : 70, textAlignVertical: 'top' }}
            />
            <Text style={{ fontSize: 12, color: texto.length >= limite ? C.accentDim : C.textMuted, textAlign: 'right', marginTop: 4, marginBottom: 10 }}>{texto.length} de {limite}</Text>

            {tipo === 'story' && !imagem && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }} accessibilityRole="radiogroup">
                {CORES_STORY.map((c) => (
                  <Pressable key={c} onPress={() => setCor(c)} accessibilityRole="radio" accessibilityState={{ selected: cor === c }} accessibilityLabel={`Fundo ${c}`} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: FUNDO_STORY[c], borderWidth: cor === c ? 4 : 0, borderColor: C.text }} />
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <Pressable onPress={pegarFoto} disabled={!!ocupado} accessibilityRole="button" accessibilityLabel={imagem ? 'Trocar a foto' : 'Escolher uma foto'} style={{ flex: 1, minHeight: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: C.surface, borderWidth: 2, borderBottomWidth: 5, borderColor: C.border }}>
                {ocupado === 'foto' ? <ActivityIndicator color={C.primary} /> : <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text }}>🖼️ {imagem ? 'Trocar foto' : 'Foto'}</Text>}
              </Pressable>
              <Pressable onPress={() => setComLocal((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: comLocal }} accessibilityLabel="Dizer onde você está" style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: comLocal ? C.glass : C.surface, borderWidth: 2, borderBottomWidth: 5, borderColor: comLocal ? C.primary : C.border }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: comLocal ? C.primaryLight : C.text }}>📍 Lugar</Text>
              </Pressable>
            </View>

            {comLocal && (
              <View style={{ marginBottom: 12 }}>
                <TextInput value={local} onChangeText={(t) => setLocal(t.slice(0, LIMITE.local))} placeholder="Ex.: Academia do bairro, Recife" placeholderTextColor={C.textMuted} accessibilityLabel="Lugar" style={campo} />
                <Text style={{ fontSize: 13, color: C.textSub, marginTop: 6, lineHeight: 19 }}>Você escreve o lugar. O Plim não usa o GPS nem guarda onde você está. Evite pôr o endereço de casa.</Text>
              </View>
            )}

            <Text style={{ fontSize: 13, color: C.textSub, marginBottom: 14, lineHeight: 19 }}>{aviso}{tipo === 'story' ? ' O story some sozinho em 24 horas.' : ''}</Text>

            {ocupado === 'enviando'
              ? <View style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.primary} /></View>
              : <Botao rotulo={tipo === 'post' ? 'Publicar' : 'Publicar story'} onPress={publicar} disabled={!pode} />}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
