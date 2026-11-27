import AvatarPersonagem from '@/components/AvatarPersonagem';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { quandoSome, tempoRelativo, type CorStory, type FilaDeStories } from '@/lib/grupo';
import { somToque } from '@/lib/sons';
import { C, F, TINTA } from '@/lib/theme';
import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SEGUNDOS = 6;

/** Fundo do story só de texto, na cor que a pessoa escolheu. */
export const FUNDO_STORY: Record<CorStory, string> = {
  roxo: '#7C3AED', laranja: '#EA580C', verde: '#0E9F6E', azul: '#2F7FE6', rosa: '#DB4F93', ouro: '#D97706',
};
export const TINTA_STORY: Record<CorStory, keyof typeof TINTA> = { roxo: 'roxo', laranja: 'laranja', verde: 'verde', azul: 'azul', rosa: 'rosa', ouro: 'ouro' };

interface Props {
  filas: FilaDeStories[];
  /** Em qual pessoa e em qual story começar. */
  inicio: { fila: number; story: number };
  aoFechar: () => void;
  aoVer: (storyId: string) => void;
  aoApagar?: (storyId: string) => void;
  aoDenunciar?: (storyId: string) => void;
  aoAbrirPessoa?: (userId: string) => void;
}

/** Tela cheia dos stories: toque à direita avança, à esquerda volta; passa sozinho a cada 6 segundos. */
export default function StoryViewer({ filas, inicio, aoFechar, aoVer, aoApagar, aoDenunciar, aoAbrirPessoa }: Props) {
  const [f, setF] = useState(inicio.fila);
  const [i, setI] = useState(inicio.story);
  const [progresso, setProgresso] = useState(0);
  const [pausado, setPausado] = useState(false);
  const comecou = useRef(Date.now());
  const acumulado = useRef(0);

  const fila = filas[f];
  const story = fila?.stories[Math.min(i, (fila?.stories.length ?? 1) - 1)];

  useEffect(() => {
    if (!fila || !story) aoFechar();
  }, [fila, story, aoFechar]);

  useEffect(() => {
    if (!story) return;
    aoVer(story.id);
    acumulado.current = 0;
    comecou.current = Date.now();
    setProgresso(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  function avancar() {
    if (!fila) return;
    if (i < fila.stories.length - 1) setI(i + 1);
    else if (f < filas.length - 1) { setF(f + 1); setI(0); }
    else aoFechar();
  }

  function voltar() {
    if (i > 0) setI(i - 1);
    else if (f > 0) { setF(f - 1); setI(Math.max(0, filas[f - 1].stories.length - 1)); }
    else { acumulado.current = 0; comecou.current = Date.now(); setProgresso(0); }
  }

  useEffect(() => {
    if (!story || pausado) return;
    comecou.current = Date.now();
    const id = setInterval(() => {
      const p = (acumulado.current + (Date.now() - comecou.current)) / (SEGUNDOS * 1000);
      if (p >= 1) { clearInterval(id); avancar(); } else setProgresso(p);
    }, 80);
    return () => { acumulado.current += Date.now() - comecou.current; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, pausado]);

  if (!fila || !story) return null;
  const agora = Date.now();

  return (
    <Modal visible animationType="fade" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#1B1233' }}>
        <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          {/* Miolo */}
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: story.imagem ? '#1B1233' : FUNDO_STORY[story.cor] }}>
            {story.imagem
              ? <Image source={{ uri: story.imagem }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={story.texto ?? `Foto do story de ${fila.autor.apelido}`} />
              : <Text style={{ fontFamily: F.displayX, fontSize: (story.texto?.length ?? 0) > 90 ? 26 : 34, lineHeight: (story.texto?.length ?? 0) > 90 ? 34 : 42, color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 30 }}>{story.texto}</Text>}
          </View>

          {/* Áreas de toque: esquerda volta, direita avança; segurar pausa */}
          <View style={{ position: 'absolute', top: 90, bottom: 110, left: 0, right: 0, flexDirection: 'row' }}>
            <Pressable style={{ flex: 1, outlineWidth: 0 }} onPress={voltar} onLongPress={() => setPausado(true)} onPressOut={() => setPausado(false)} accessibilityRole="button" accessibilityLabel="Story anterior" />
            <Pressable style={{ flex: 2, outlineWidth: 0 }} onPress={avancar} onLongPress={() => setPausado(true)} onPressOut={() => setPausado(false)} accessibilityRole="button" accessibilityLabel="Próximo story" />
          </View>

          {/* Barrinhas e cabeçalho */}
          <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
              {fila.stories.map((s, k) => (
                <View key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: '#FFFFFF', width: `${k < i ? 100 : k === i ? Math.round(progresso * 100) : 0}%` }} />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={aoAbrirPessoa && !fila.meu ? () => aoAbrirPessoa(fila.autor.id) : undefined}
                disabled={!aoAbrirPessoa || fila.meu}
                accessibilityRole="button"
                accessibilityLabel={`Ver o perfil de ${fila.autor.apelido}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
              >
                <AvatarPersonagem config={fila.autor.avatar} size={40} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 16, color: '#FFFFFF' }}>{fila.meu ? 'Seu story' : fila.autor.apelido}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{tempoRelativo(story.criadoEm, agora)} · {quandoSome(story.expiraEm, agora)}</Text>
                </View>
              </Pressable>
              <Pressable onPress={aoFechar} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontFamily: F.displayX, fontSize: 20 }}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Rodapé: lugar, legenda da foto e ações */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 10 }}>
            {!!story.local && (
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#FFFFFF' }}>📍 {story.local}</Text>
              </View>
            )}
            {!!story.imagem && !!story.texto && (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 12 }}>
                <Text style={{ fontSize: 16, lineHeight: 23, color: '#FFFFFF' }}>{story.texto}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              {fila.meu && aoApagar && (
                <Pressable
                  onPress={() => { setPausado(true); confirmar('Apagar este story', 'Ele some para todo mundo agora.', 'Apagar', () => { somToque(); aoApagar(story.id); }); setTimeout(() => setPausado(false), 400); }}
                  accessibilityRole="button"
                  style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' }}>Apagar</Text>
                </Pressable>
              )}
              {!fila.meu && aoDenunciar && (
                <Pressable
                  onPress={() => confirmar('Denunciar este story', 'A equipe do Plim recebe o aviso e avalia. Quem publicou não fica sabendo que foi você.', 'Denunciar', () => aoDenunciar(story.id))}
                  accessibilityRole="button"
                  style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' }}>Denunciar</Text>
                </Pressable>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

