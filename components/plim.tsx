/**
 * Peças de interface do Plim na identidade "massinha".
 * Tudo que se repete nas telas mora aqui: cartão, botão, cabeçalho, barra, selo.
 */
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icone, { type NomeIcone } from '@/components/Icone';
import { Text } from '@/components/Texto';
import { C, F, R, TINTA } from '@/lib/theme';

export type Tinta = keyof typeof TINTA;

/** Moldura de tela: fundo creme, coluna de no máximo 480 px, rolagem. */
export function Tela({ children, rolar = true, espacoFinal = 120, estilo }: { children: ReactNode; rolar?: boolean; espacoFinal?: number; estilo?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {rolar ? (
        <ScrollView
          style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
          contentContainerStyle={[{ padding: 20, paddingBottom: espacoFinal }, estilo]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, maxWidth: 480, width: '100%', alignSelf: 'center', padding: 20 }, estilo]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** Cabeçalho das telas internas: voltar, ícone e título. */
export function Cabecalho({ titulo, icone, aoVoltar, direita, sub }: { titulo: string; icone?: NomeIcone; aoVoltar?: () => void; direita?: ReactNode; sub?: string }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <Pressable
        onPress={aoVoltar ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')))}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={8}
        style={({ pressed }) => ({
          width: 46,
          height: 46,
          borderRadius: 16,
          backgroundColor: C.surface,
          borderWidth: 2,
          borderBottomWidth: pressed ? 2 : 4,
          marginTop: pressed ? 2 : 0,
          borderColor: C.border,
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text style={{ fontFamily: F.displayX, fontSize: 20, color: C.primaryLight, marginTop: -2 }}>‹</Text>
      </Pressable>
      {icone && <Icone nome={icone} tamanho={38} />}
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 22, color: C.text }} numberOfLines={1}>{titulo}</Text>
        {sub && <Text style={{ fontSize: 13, color: C.textSub, marginTop: 1 }} numberOfLines={1}>{sub}</Text>}
      </View>
      {direita}
    </View>
  );
}

/** Cartão de massinha. `tinta` pinta o fundo e a borda com uma das cores suaves. */
export function Peca({ children, tinta, estilo, padding = 18 }: { children: ReactNode; tinta?: Tinta; estilo?: StyleProp<ViewStyle>; padding?: number }) {
  const fundo = tinta ? TINTA[tinta][0] : C.surface;
  const borda = tinta ? TINTA[tinta][1] + '40' : C.border;
  return (
    <View style={[{ backgroundColor: fundo, borderRadius: R.lg, borderWidth: 2, borderBottomWidth: 5, borderColor: borda, padding }, estilo]}>
      {children}
    </View>
  );
}

/** Cartão clicável: afunda quando apertado. */
export function PecaBotao({ children, tinta, estilo, padding = 16, ...p }: PressableProps & { children: ReactNode; tinta?: Tinta; estilo?: StyleProp<ViewStyle>; padding?: number }) {
  const fundo = tinta ? TINTA[tinta][0] : C.surface;
  const borda = tinta ? TINTA[tinta][1] + '40' : C.border;
  return (
    <Pressable
      accessibilityRole="button"
      {...p}
      style={({ pressed }) => [
        { backgroundColor: fundo, borderRadius: R.lg, borderWidth: 2, borderBottomWidth: pressed ? 2 : 5, marginTop: pressed ? 3 : 0, borderColor: borda, padding },
        estilo,
      ]}
    >
      {children}
    </Pressable>
  );
}

const CORES_BOTAO = {
  roxo:    [C.primary, C.primaryDim, C.onPrimary],
  laranja: [C.accent, C.accentDim, C.onPrimary],
  verde:   [C.success, C.successDim, C.onPrimary],
  claro:   [C.surface, C.border, C.textSub],
  suave:   [C.glass, C.borderPrimary, C.primaryLight],
} as const;

/** Botão principal: gordinho, com a base mais escura, afunda ao toque. */
export function Botao({ rotulo, cor = 'roxo', icone, pequeno, estilo, disabled, ...p }: PressableProps & { rotulo: string; cor?: keyof typeof CORES_BOTAO; icone?: NomeIcone; pequeno?: boolean; estilo?: StyleProp<ViewStyle> }) {
  const [fundo, baixo, texto] = CORES_BOTAO[cor];
  const contorno = cor === 'claro' || cor === 'suave';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...p}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: pequeno ? 44 : 54,
          paddingHorizontal: pequeno ? 16 : 22,
          borderRadius: pequeno ? 14 : R.md,
          backgroundColor: fundo,
          borderColor: baixo,
          borderWidth: contorno ? 2 : 0,
          borderBottomWidth: pressed ? 2 : 5,
          marginTop: pressed ? 3 : 0,
          opacity: disabled ? 0.45 : 1,
        },
        estilo,
      ]}
    >
      {icone && <Icone nome={icone} tamanho={pequeno ? 22 : 26} />}
      <Text style={{ fontFamily: F.display, fontSize: pequeno ? 14 : 16, color: texto }}>{rotulo}</Text>
    </Pressable>
  );
}

/** Título de seção, em caixa normal (nada de letrinha miúda espaçada). */
export function Secao({ titulo, direita }: { titulo: string; direita?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 18, color: C.text }}>{titulo}</Text>
      {direita}
    </View>
  );
}

export function Selo({ texto, tinta = 'roxo', icone }: { texto: string; tinta?: Tinta; icone?: NomeIcone }) {
  const [fundo, cor] = TINTA[tinta];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: fundo, borderRadius: R.pill, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' }}>
      {icone && <Icone nome={icone} tamanho={16} />}
      <Text style={{ fontFamily: F.bold, fontSize: 12, color: tinta === 'roxo' ? C.primaryLight : cor }}>{texto}</Text>
    </View>
  );
}

/** Barra de progresso gordinha. `valor` de 0 a 1. */
export function Barra({ valor, cor = C.primary, altura = 12 }: { valor: number; cor?: string; altura?: number }) {
  const pct = Math.max(0, Math.min(1, valor || 0));
  return (
    <View
      style={{ height: altura, borderRadius: altura, backgroundColor: C.track, overflow: 'hidden' }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View style={{ width: `${pct * 100}%`, height: altura, borderRadius: altura, backgroundColor: cor }} />
    </View>
  );
}

/** Ícone sobre uma almofada colorida. */
export function Almofada({ icone, tinta = 'roxo', tamanho = 56 }: { icone: NomeIcone; tinta?: Tinta; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, borderRadius: tamanho * 0.32, backgroundColor: TINTA[tinta][0], alignItems: 'center', justifyContent: 'center' }}>
      <Icone nome={icone} tamanho={tamanho * 0.7} />
    </View>
  );
}

/** Número grande com ícone e legenda (XP, sequência, moedas). */
export function Numero({ valor, legenda, icone, tinta = 'roxo' }: { valor: string | number; legenda: string; icone: NomeIcone; tinta?: Tinta }) {
  return (
    <View
      style={{ flex: 1, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, borderBottomWidth: 5, borderColor: C.border, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' }}
      accessible
      accessibilityLabel={`${legenda}: ${valor}`}
    >
      <Icone nome={icone} tamanho={30} />
      <Text style={{ fontFamily: F.displayX, fontSize: 22, color: TINTA[tinta][1], marginTop: 2 }}>{valor}</Text>
      <Text style={{ fontSize: 12, color: C.textSub }}>{legenda}</Text>
    </View>
  );
}

/** Estado vazio: cena, título, explicação e uma ação. */
export function Vazio({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <Peca estilo={{ alignItems: 'center', paddingVertical: 26 }}>
      <Text style={{ fontFamily: F.display, fontSize: 18, color: C.text, textAlign: 'center' }}>{titulo}</Text>
      {texto && <Text style={{ fontSize: 14, color: C.textSub, textAlign: 'center', marginTop: 6, lineHeight: 21 }}>{texto}</Text>}
      {children && <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{children}</View>}
    </Peca>
  );
}
