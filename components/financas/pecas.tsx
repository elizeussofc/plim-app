import Icone, { type NomeIcone } from '@/components/Icone';
import { Text } from '@/components/Texto';
import { brl, categoriasDe, lerValor, type Tipo } from '@/lib/financas';
import { C, F, R } from '@/lib/theme';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

/** Janela que sobe do rodapé, usada em todos os formulários das Finanças. */
export function Folha({ titulo, visivel, aoFechar, children }: { titulo: string; visivel: boolean; aoFechar: () => void; children: ReactNode }) {
  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={aoFechar}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={aoFechar} accessibilityLabel="Fechar" />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '92%', width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.displayX, fontSize: 23, color: C.text }}>{titulo}</Text>
              <Pressable onPress={aoFechar} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.displayX, fontSize: 20, color: C.textSub }}>✕</Text>
              </Pressable>
            </View>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ROTULO = { fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 } as const;
const CAMPO = { backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 16, fontFamily: F.regular } as const;

/** Campo de dinheiro: a pessoa digita do jeito que fala ("12,50") e embaixo aparece como o app entendeu. */
export function CampoValor({ rotulo, valor, aoMudar, grande, dica }: { rotulo: string; valor: string; aoMudar: (t: string) => void; grande?: boolean; dica?: string }) {
  const centavos = lerValor(valor);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={ROTULO}>{rotulo}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', ...CAMPO, paddingVertical: grande ? 6 : 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: grande ? 22 : 16, color: C.textSub, marginRight: 8 }}>R$</Text>
        <TextInput
          value={valor}
          onChangeText={(t) => aoMudar(t.replace(/[^\d.,]/g, '').slice(0, 12))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0,00"
          placeholderTextColor={C.textMuted}
          accessibilityLabel={rotulo}
          selectTextOnFocus
          style={{ flex: 1, minWidth: 0, paddingVertical: 10, color: C.text, fontFamily: grande ? F.displayX : F.regular, fontSize: grande ? 30 : 16, outlineWidth: 0 }}
        />
      </View>
      {(dica || (valor !== '' && centavos > 0)) && <Text style={{ fontSize: 13, color: C.textSub, marginTop: 5 }}>{valor !== '' && centavos > 0 ? brl(centavos) : ''}{dica ? `${valor !== '' && centavos > 0 ? ' · ' : ''}${dica}` : ''}</Text>}
    </View>
  );
}

export function CampoTexto({ rotulo, valor, aoMudar, exemplo, numero, max = 40 }: { rotulo: string; valor: string; aoMudar: (t: string) => void; exemplo?: string; numero?: boolean; max?: number }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={ROTULO}>{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={(t) => aoMudar((numero ? t.replace(/[^\d.,]/g, '') : t).slice(0, max))}
        keyboardType={numero ? 'decimal-pad' : 'default'}
        inputMode={numero ? 'decimal' : 'text'}
        placeholder={exemplo}
        placeholderTextColor={C.textMuted}
        accessibilityLabel={rotulo}
        style={CAMPO}
      />
    </View>
  );
}

/** Grade de categorias com ícone, para escolher uma. */
export function EscolherCategoria({ tipo, valor, aoEscolher, so }: { tipo: Tipo; valor: string; aoEscolher: (id: string) => void; so?: string[] }) {
  const lista = categoriasDe(tipo).filter((c) => !so || so.includes(c.id));
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={ROTULO}>Categoria</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
        {lista.map((c) => {
          const ativo = valor === c.id;
          return (
            <Pressable key={c.id} onPress={() => aoEscolher(c.id)} accessibilityRole="radio" accessibilityState={{ selected: ativo }} accessibilityLabel={`Categoria ${c.nome}`} style={{ flexBasis: '30%', flexGrow: 1, minHeight: 78, alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: R.md, backgroundColor: ativo ? C.glass : C.surface, borderWidth: ativo ? 3 : 2, borderBottomWidth: 5, borderColor: ativo ? C.primary : C.border }}>
              <Icone nome={c.icone as NomeIcone} tamanho={34} />
              <Text numberOfLines={2} style={{ fontFamily: F.bold, fontSize: 12, color: ativo ? C.primaryLight : C.textSub, textAlign: 'center', marginTop: 2, lineHeight: 15 }}>{c.nome}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Fileira de opções em que só uma fica marcada. */
export function Opcoes<T extends string | number>({ rotulo, valor, opcoes, aoEscolher }: { rotulo?: string; valor: T; opcoes: { id: T; nome: string }[]; aoEscolher: (v: T) => void }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {!!rotulo && <Text style={ROTULO}>{rotulo}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
        {opcoes.map((o) => {
          const ativo = valor === o.id;
          return (
            <Pressable key={String(o.id)} onPress={() => aoEscolher(o.id)} accessibilityRole="radio" accessibilityState={{ selected: ativo }} accessibilityLabel={rotulo ? `${rotulo}: ${o.nome}` : o.nome} style={{ flexGrow: 1, flexBasis: opcoes.length > 3 ? '22%' : '30%', minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: R.md, backgroundColor: ativo ? C.glass : C.surface, borderWidth: ativo ? 3 : 2, borderBottomWidth: 5, borderColor: ativo ? C.primary : C.border }}>
              <Text style={{ fontFamily: F.display, fontSize: 14, color: ativo ? C.primaryLight : C.textSub, textAlign: 'center' }}>{o.nome}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Linha com rótulo à esquerda e valor à direita. */
export function Linha({ rotulo, valor, forte, cor }: { rotulo: string; valor: string; forte?: boolean; cor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, paddingVertical: 4 }}>
      <Text style={{ flex: 1, fontSize: 15, color: C.textSub }}>{rotulo}</Text>
      <Text style={{ fontFamily: forte ? F.displayX : F.bold, fontSize: forte ? 19 : 15, color: cor ?? C.text }}>{valor}</Text>
    </View>
  );
}

/** Cartão dourado que explica o que o Pro abre naquele ponto. */
export function TrancaPro({ titulo, texto, aoTocar }: { titulo: string; texto: string; aoTocar: () => void }) {
  return (
    <Pressable onPress={aoTocar} accessibilityRole="button" accessibilityLabel={`${titulo}. ${texto} Faz parte do Plim Pro.`} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.goldSoft, borderRadius: R.lg, borderWidth: 2, borderBottomWidth: 5, borderColor: '#F2D98A', padding: 14, marginBottom: 14 }}>
      <Icone nome="coroa" tamanho={38} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{titulo}</Text>
        <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>{texto}</Text>
      </View>
      <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textMuted }}>›</Text>
    </Pressable>
  );
}
