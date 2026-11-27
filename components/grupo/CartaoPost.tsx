import AvatarPersonagem from '@/components/AvatarPersonagem';
import { Selo } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { contar, EMOJIS, resumoReacoes, tempoRelativo, type Post } from '@/lib/grupo';
import { C, F, R } from '@/lib/theme';
import { useState } from 'react';
import { Image, Pressable, Text as Emoji, View } from 'react-native';

interface Props {
  post: Post;
  aoReagir: (emoji: string) => void;
  aoComentar: () => void;
  aoAbrirPessoa?: () => void;
  aoApagar?: () => void;
  aoDenunciar?: () => void;
}

/** Os seis mais usados ficam sempre à mão; o "+" abre a lista inteira. */
const RAPIDOS = EMOJIS.slice(0, 6);

/** Um post do Grupo: quem, quando, onde, texto, foto, reações com emoji e comentários. */
export default function CartaoPost({ post, aoReagir, aoComentar, aoAbrirPessoa, aoApagar, aoDenunciar }: Props) {
  const [escolhendo, setEscolhendo] = useState(false);
  const [todos, setTodos] = useState(false);
  const [proporcao, setProporcao] = useState(1.25);
  const resumo = resumoReacoes(post.reacoes, 4);
  const agora = Date.now();

  function reagir(e: string) {
    aoReagir(e);
    setEscolhendo(false);
    setTodos(false);
  }

  return (
    <View style={{ backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 2, borderBottomWidth: 5, borderColor: C.border, marginBottom: 14, overflow: 'hidden' }}>
      {/* Quem e quando */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10 }}>
        <Pressable onPress={aoAbrirPessoa} disabled={!aoAbrirPessoa} accessibilityRole="button" accessibilityLabel={`Ver o perfil de ${post.autor.apelido}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <AvatarPersonagem config={post.autor.avatar} size={44} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{post.meu ? `${post.autor.apelido} (você)` : post.autor.apelido}</Text>
            <Text numberOfLines={1} style={{ fontSize: 13, color: C.textSub }}>
              {tempoRelativo(post.criadoEm, agora)}{post.local ? ` · 📍 ${post.local}` : ''}
            </Text>
          </View>
        </Pressable>
        {post.exemplo && <Selo texto="exemplo" tinta="laranja" />}
        {post.meu && aoApagar && (
          <Pressable onPress={() => confirmar('Apagar a publicação', 'Ela some do Grupo junto com os comentários e as reações.', 'Apagar', aoApagar)} accessibilityRole="button" accessibilityLabel="Apagar a publicação" hitSlop={8} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>Apagar</Text>
          </Pressable>
        )}
        {!post.meu && !post.exemplo && aoDenunciar && (
          <Pressable onPress={() => confirmar('Denunciar a publicação', 'A equipe do Plim recebe o aviso e avalia. Quem publicou não fica sabendo que foi você.', 'Denunciar', aoDenunciar)} accessibilityRole="button" accessibilityLabel="Denunciar a publicação" hitSlop={8} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.displayX, fontSize: 20, color: C.textMuted }}>⋯</Text>
          </Pressable>
        )}
      </View>

      {!!post.texto && <Text style={{ fontSize: 16, lineHeight: 24, color: C.text, paddingHorizontal: 14, paddingBottom: 12 }}>{post.texto}</Text>}

      {!!post.imagem && (
        <Image
          source={{ uri: post.imagem }}
          onLoad={(e) => {
            const fonte = (e.nativeEvent as { source?: { width: number; height: number } }).source;
            if (fonte?.width && fonte.height) setProporcao(Math.max(0.75, Math.min(1.9, fonte.width / fonte.height)));
          }}
          style={{ width: '100%', aspectRatio: proporcao, backgroundColor: C.surfaceHigh }}
          resizeMode="cover"
          accessibilityLabel={`Foto publicada por ${post.autor.apelido}`}
        />
      )}

      {/* Quem reagiu */}
      {resumo.total > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 10 }} accessible accessibilityLabel={contar(resumo.total, 'reação', 'reações')}>
          <View style={{ flexDirection: 'row' }}>
            {resumo.emojis.map((e, k) => (
              <View key={e} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.surface, alignItems: 'center', justifyContent: 'center', marginLeft: k ? -7 : 0 }}>
                <Emoji style={{ fontSize: 14 }}>{e}</Emoji>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 13, color: C.textSub }}>{contar(resumo.total, 'reação', 'reações')}</Text>
        </View>
      )}

      {/* Ações */}
      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <Pressable
          onPress={() => (post.minhaReacao ? aoReagir(post.minhaReacao) : setEscolhendo((v) => !v))}
          onLongPress={() => setEscolhendo(true)}
          accessibilityRole="button"
          accessibilityState={{ selected: !!post.minhaReacao, expanded: escolhendo }}
          accessibilityLabel={post.minhaReacao ? `Você reagiu com ${post.minhaReacao}. Toque para tirar.` : 'Reagir com um emoji'}
          style={{ flex: 1, minHeight: 46, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: post.minhaReacao ? C.glass : C.surfaceHigh, borderWidth: 2, borderColor: post.minhaReacao ? C.borderPrimary : 'transparent' }}
        >
          {post.minhaReacao
            ? <><Emoji style={{ fontSize: 19 }}>{post.minhaReacao}</Emoji><Text style={{ fontFamily: F.display, fontSize: 14, color: C.primaryLight }}>Reagiu</Text></>
            : <Text style={{ fontFamily: F.display, fontSize: 14, color: C.textSub }}>☺ Reagir</Text>}
        </Pressable>
        {post.minhaReacao && (
          <Pressable onPress={() => setEscolhendo((v) => !v)} accessibilityRole="button" accessibilityLabel="Trocar o emoji" style={{ minHeight: 46, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: C.surfaceHigh }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.textSub }}>Trocar</Text>
          </Pressable>
        )}
        <Pressable onPress={aoComentar} accessibilityRole="button" accessibilityLabel={`Comentários: ${post.comentarios}`} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: C.surfaceHigh }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.textSub }}>{post.comentarios > 0 ? contar(post.comentarios, 'comentário', 'comentários') : 'Comentar'}</Text>
        </Pressable>
      </View>

      {/* Escolha do emoji */}
      {escolhendo && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, backgroundColor: C.glass, borderRadius: R.md, padding: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Escolha um emoji">
            {(todos ? EMOJIS : RAPIDOS).map((e) => {
              const ativo = post.minhaReacao === e;
              return (
                <Pressable key={e} onPress={() => reagir(e)} accessibilityRole="radio" accessibilityState={{ selected: ativo }} accessibilityLabel={`Reagir com ${e}`} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: ativo ? C.glassStrong : C.surface, borderWidth: ativo ? 2 : 0, borderColor: C.primary }}>
                  <Emoji style={{ fontSize: 23 }}>{e}</Emoji>
                </Pressable>
              );
            })}
            {!todos && (
              <Pressable onPress={() => setTodos(true)} accessibilityRole="button" accessibilityLabel="Ver mais emojis" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface }}>
                <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.primaryLight }}>+</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
