import { Botao, Cabecalho, Peca, Secao } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar, confirmar } from '@/lib/avisar';
import { C, F, R } from '@/lib/theme';
import { useDespejoStore, type Despejo } from '@/stores/despejoStore';
import { useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function quando(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return mesmoDia ? `hoje, ${hora}` : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}, ${hora}`;
}

/** Um despejo guardado: dá para transformar em tarefa ou apagar. */
function Guardado({ d }: { d: Despejo }) {
  const remover = useDespejoStore((s) => s.remover);
  const adicionarTarefa = useRotinaStore((s) => s.adicionarTarefa);
  const [aberto, setAberto] = useState(false);
  const titulo = d.texto.split('\n')[0].trim().slice(0, 60);

  function virarTarefa() {
    adicionarTarefa({ icone: '💭', titulo, categoria: 'Do despejo', horario: '--:--' });
    avisar('✅ Virou tarefa', `"${titulo}" entrou na sua rotina.`);
  }

  return (
    <Peca padding={14}>
      <Pressable onPress={() => setAberto((v) => !v)} accessibilityRole="button" accessibilityLabel={`Despejo de ${quando(d.criadoEm)}. Toque para ${aberto ? 'recolher' : 'ler inteiro'}.`}>
        <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{quando(d.criadoEm)}</Text>
        <Text selectable style={{ fontSize: 15, color: C.text, lineHeight: 22 }} numberOfLines={aberto ? undefined : 3}>{d.texto}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Botao rotulo="Virar tarefa" icone="rotina" cor="suave" pequeno onPress={virarTarefa} estilo={{ flex: 1 }} accessibilityLabel={`Transformar em tarefa: ${titulo}`} />
        <Botao rotulo="Apagar" cor="claro" pequeno onPress={() => confirmar('Apagar despejo', 'Este texto some de vez.', 'Apagar', () => remover(d.id))} />
      </View>
    </Peca>
  );
}

export default function DespejoMentalScreen() {
  const [texto, setTexto] = useState('');
  const despejos = useDespejoStore((s) => s.despejos);
  const salvarDespejo = useDespejoStore((s) => s.salvar);
  const unlockConquista = useUserStore((s) => s.unlockConquista);
  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);

  function salvar() {
    if (!texto.trim()) return;
    const premiado = salvarDespejo(texto);
    unlockConquista('despejou');
    if (premiado) { addXp(15); addMoedas(5); }
    setTexto('');
    avisar(premiado ? '✅ Guardado! +15 XP' : '✅ Guardado', 'Saiu da cabeça e ficou aqui embaixo.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Cabecalho titulo="Despejo Mental" icone="cerebro" />

          <Text style={{ fontSize: 15, color: C.textSub, lineHeight: 22, marginBottom: 14 }}>
            Escreva tudo o que está na cabeça, do jeito que vier. Ninguém vai ler: fica só neste aparelho.
          </Text>

          <View style={{ backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 2, borderBottomWidth: 5, borderColor: C.borderPrimary, padding: 14 }}>
            <TextInput
              multiline
              autoFocus
              placeholder="O que está passando na sua cabeça agora?"
              placeholderTextColor={C.textMuted}
              value={texto}
              onChangeText={setTexto}
              accessibilityLabel="Texto do despejo"
              style={[
                { minHeight: 190, color: C.text, fontSize: 17, lineHeight: 26, fontFamily: F.regular, textAlignVertical: 'top' },
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
              ]}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Botao rotulo="Limpar" cor="claro" onPress={() => setTexto('')} disabled={!texto} />
            <Botao rotulo="Guardar despejo" icone="pensamento" onPress={salvar} disabled={!texto.trim()} estilo={{ flex: 1 }} />
          </View>

          {despejos.length > 0 && (
            <View style={{ marginTop: 28 }}>
              <Secao titulo="Guardados" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{despejos.length}</Text>} />
              <View style={{ gap: 10 }}>
                {despejos.map((d) => <Guardado key={d.id} d={d} />)}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
