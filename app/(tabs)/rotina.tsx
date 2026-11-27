import Icone, { type NomeIcone } from '@/components/Icone';
import { Barra, Botao, Peca, Secao, Tela } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar, confirmar } from '@/lib/avisar';
import { adicionarAoCalendario } from '@/lib/calendar';
import { premiarTarefa, sincronizarDia } from '@/lib/cicloDiario';
import { situacaoAoConcluir } from '@/lib/falas';
import { somTarefa } from '@/lib/sons';
import { dizer } from '@/stores/falaStore';
import { agendarLembreteDiario, cancelarLembrete } from '@/lib/notifications';
import { sincronizarPontuacao } from '@/lib/ranking';
import { C, F, R } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useRotinaStore, type Tarefa } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

const emojis = ['✅', '💧', '🥗', '🏃', '😴', '📚', '🎯', '💊', '🧘', '☀️', '🌙', '📱', '🎨', '💬'];
const NA_WEB = Platform.OS === 'web';
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Enquanto a pessoa digita só números, coloca os dois-pontos: 0800 → 08:00. */
function formatarHora(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** Botão pequeno das ações de uma tarefa. */
function Acao({ rotulo, icone, ativo, aoTocar, desligado, rotuloAcessivel }: { rotulo: string; icone?: NomeIcone; ativo?: boolean; aoTocar: () => void; desligado?: boolean; rotuloAcessivel: string }) {
  return (
    <Pressable
      onPress={aoTocar}
      disabled={desligado}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      accessibilityState={{ disabled: !!desligado, selected: !!ativo }}
      style={{
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
        minHeight: 44, borderRadius: 14, paddingHorizontal: 6,
        backgroundColor: ativo ? C.glass : C.surfaceHigh,
        borderWidth: 2, borderColor: ativo ? C.borderPrimary : 'transparent',
        opacity: desligado ? 0.5 : 1,
      }}
    >
      {icone && <Icone nome={icone} tamanho={20} />}
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: ativo ? C.primaryLight : C.textSub }} numberOfLines={1}>{rotulo}</Text>
    </Pressable>
  );
}

export default function RotinaScreen() {
  const { tarefas, definirStatus, adicionarTarefa, removerTarefa, marcarLembrete, marcarCalendario } = useRotinaStore();
  const profile = useUserStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);

  const [modalAberto, setModalAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [emojiSelecionado, setEmojiSelecionado] = useState('✅');
  const [carregando, setCarregando] = useState<Record<string, string | null>>({});

  const feitas   = tarefas.filter((t) => t.status === 'feita').length;
  const puladas  = tarefas.filter((t) => t.status === 'pulada').length;
  const completa = tarefas.length > 0 && feitas === tarefas.length;
  const progresso = tarefas.length > 0 ? feitas / tarefas.length : 0;
  const horarioOk = novoHorario === '' || HORA_VALIDA.test(novoHorario);

  useEffect(() => {
    if (!session?.user?.id) return;
    const pontos = Math.max(0, feitas * 10 - puladas * 5 + (completa ? 30 : 0) + profile.streak * 5);
    sincronizarPontuacao({ userId: session.user.id, nomeExibido: profile.apelido ?? profile.nome ?? 'Guerreiro', avatarEmoji: profile.avatar_emoji, pontos, nivel: profile.nivel, streak: profile.streak, tarefasFeitas: feitas, tarefasPuladas: puladas });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarefas, session?.user?.id]);

  /** Tocar na tarefa marca ou desmarca. Pular é um botão à parte. */
  function marcar(t: Tarefa) {
    if (t.status === 'feita') {
      definirStatus(t.id, 'pendente');
      dizer('desfez');
    } else {
      premiarTarefa(t.id);
      definirStatus(t.id, 'feita');
      somTarefa(feitas);
      dizer(situacaoAoConcluir(feitas + 1, tarefas.length));
    }
    sincronizarDia();
  }

  function pular(t: Tarefa) {
    const vaiPular = t.status !== 'pulada';
    definirStatus(t.id, vaiPular ? 'pulada' : 'pendente');
    if (vaiPular) dizer(puladas + 1 >= 3 ? 'pulou_varias' : 'pulou');
    sincronizarDia();
  }

  async function alternarLembrete(t: Tarefa) {
    if (!HORA_VALIDA.test(t.horario)) { avisar('Falta o horário', 'Esta tarefa não tem horário. Crie de novo com um horário para usar o lembrete.'); return; }
    setCarregando((s) => ({ ...s, [t.id]: 'lembrete' }));
    try {
      if (t.lembreteAgendado) {
        await cancelarLembrete(t.id);
        marcarLembrete(t.id, false);
        avisar('Lembrete desligado', `"${t.titulo}" não avisa mais.`);
      } else {
        const ok = await agendarLembreteDiario(t.id, t.titulo, t.horario);
        if (ok) { marcarLembrete(t.id, true); avisar('🔔 Lembrete ligado', `Todo dia às ${t.horario}.`); }
        else avisar('Sem permissão', 'Libere as notificações do Plim nos ajustes do celular.');
      }
    } finally { setCarregando((s) => ({ ...s, [t.id]: null })); }
  }

  async function colocarNaAgenda(t: Tarefa) {
    if (t.calendarioAdicionado) { avisar('Já está na agenda', 'Esta tarefa já foi para o seu calendário.'); return; }
    if (!HORA_VALIDA.test(t.horario)) { avisar('Falta o horário', 'Esta tarefa não tem horário. Crie de novo com um horário para pôr na agenda.'); return; }
    setCarregando((s) => ({ ...s, [t.id]: 'calendario' }));
    try {
      const ok = await adicionarAoCalendario(t.titulo, t.categoria, t.horario);
      if (ok) { marcarCalendario(t.id, true); avisar('📅 Foi para a agenda', `"${t.titulo}" está no seu calendário.`); }
    } finally { setCarregando((s) => ({ ...s, [t.id]: null })); }
  }

  function fecharModal() {
    setModalAberto(false);
    setNovoTitulo(''); setNovaCategoria(''); setNovoHorario(''); setEmojiSelecionado('✅');
  }

  function salvarNovaTarefa() {
    if (!novoTitulo.trim() || !horarioOk) return;
    adicionarTarefa({ icone: emojiSelecionado, titulo: novoTitulo.trim(), categoria: novaCategoria.trim() || 'Geral', horario: novoHorario || '--:--' });
    fecharModal();
  }

  const campo = { backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 16, fontFamily: F.regular } as const;

  return (
    <>
      <Tela>
        {/* Cabeçalho */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 30, color: C.text }}>Minha rotina</Text>
          <Botao rotulo="+ Nova" pequeno onPress={() => setModalAberto(true)} accessibilityLabel="Adicionar nova tarefa" />
        </View>

        {/* Progresso */}
        {completa ? (
          <Peca tinta="verde" padding={0} estilo={{ marginBottom: 22, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, padding: 18, paddingRight: 0 }}>
                <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.text, lineHeight: 26 }}>Rotina completa!</Text>
                <Text style={{ fontSize: 14, color: C.textSub, marginTop: 4, lineHeight: 20 }}>{feitas} de {tarefas.length} feitas. Hoje você cuidou de você.</Text>
              </View>
              <Image source={require('../../assets/cenas/vitoria.webp')} style={{ width: 104, height: 120, margin: 8 }} resizeMode="contain" accessible={false} />
            </View>
          </Peca>
        ) : (
          <Peca padding={16} estilo={{ marginBottom: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <Text style={{ fontSize: 15, color: C.textSub }}>Hoje</Text>
              <Text style={{ fontFamily: F.display, fontSize: 18, color: C.text }}>{feitas} de {tarefas.length} feitas</Text>
            </View>
            <Barra valor={progresso} altura={14} />
          </Peca>
        )}

        {tarefas.length > 0 && <Secao titulo="Tarefas de hoje" />}

        <View style={{ gap: 12 }}>
          {tarefas.map((t) => {
            const feita  = t.status === 'feita';
            const pulada = t.status === 'pulada';
            const load   = carregando[t.id];
            const temHora = HORA_VALIDA.test(t.horario);
            return (
              <View
                key={t.id}
                style={{
                  backgroundColor: feita ? C.successSoft : C.surface,
                  borderRadius: R.lg,
                  borderWidth: 2,
                  borderBottomWidth: 5,
                  borderColor: feita ? '#B9E8D2' : C.border,
                  opacity: pulada ? 0.6 : 1,
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  onPress={() => marcar(t)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: feita }}
                  accessibilityLabel={`${t.titulo}${temHora ? `, às ${t.horario}` : ''}. ${feita ? 'Feita' : pulada ? 'Pulada hoje' : 'Pendente'}. Toque para ${feita ? 'desmarcar' : 'marcar como feita'}.`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}
                >
                  <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: feita ? C.surface : C.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 30 }}>{t.icone}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text, textDecorationLine: feita ? 'line-through' : 'none' }} numberOfLines={2}>{t.titulo}</Text>
                    <Text style={{ fontSize: 13, color: C.textSub, marginTop: 1 }}>
                      {t.categoria}{temHora ? ` · ${t.horario}` : ''}{pulada ? ' · pulada hoje' : ''}
                    </Text>
                  </View>
                  {feita
                    ? <Icone nome="check" tamanho={40} />
                    : <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: C.borderBright, backgroundColor: C.surface }} />}
                </Pressable>

                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
                  {!NA_WEB && (
                    <Acao
                      rotulo={load === 'lembrete' ? '...' : t.lembreteAgendado ? 'Ligado' : 'Lembrar'}
                      icone="sino"
                      ativo={t.lembreteAgendado}
                      desligado={load === 'lembrete'}
                      aoTocar={() => alternarLembrete(t)}
                      rotuloAcessivel={t.lembreteAgendado ? `Desligar lembrete de ${t.titulo}` : `Ligar lembrete de ${t.titulo}`}
                    />
                  )}
                  {!NA_WEB && (
                    <Acao
                      rotulo={load === 'calendario' ? '...' : t.calendarioAdicionado ? 'Na agenda' : 'Agenda'}
                      icone="calendario"
                      ativo={t.calendarioAdicionado}
                      desligado={load === 'calendario'}
                      aoTocar={() => colocarNaAgenda(t)}
                      rotuloAcessivel={t.calendarioAdicionado ? `${t.titulo} já está na agenda` : `Pôr ${t.titulo} na agenda`}
                    />
                  )}
                  {!feita && (
                    <Acao
                      rotulo={pulada ? 'Voltar' : 'Pular hoje'}
                      ativo={pulada}
                      aoTocar={() => pular(t)}
                      rotuloAcessivel={pulada ? `Desfazer: ${t.titulo} volta a ficar pendente` : `Pular ${t.titulo} hoje`}
                    />
                  )}
                  <Acao
                    rotulo="Remover"
                    aoTocar={() => confirmar('Remover tarefa', `Tirar "${t.titulo}" da sua rotina?`, 'Remover', () => removerTarefa(t.id))}
                    rotuloAcessivel={`Remover ${t.titulo} da rotina`}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {tarefas.length === 0 && (
          <Peca estilo={{ alignItems: 'center', paddingVertical: 26 }}>
            <Image source={require('../../assets/cenas/ola.webp')} style={{ width: 170, height: 178 }} resizeMode="contain" accessible={false} />
            <Text style={{ fontFamily: F.display, fontSize: 20, color: C.text, marginTop: 10 }}>Vamos montar sua rotina?</Text>
            <Text style={{ fontSize: 14, color: C.textSub, textAlign: 'center', marginTop: 4, marginBottom: 16, lineHeight: 20 }}>Comece com uma tarefa só. Pequena já serve.</Text>
            <Botao rotulo="Criar primeira tarefa" onPress={() => setModalAberto(true)} estilo={{ alignSelf: 'stretch' }} />
          </Peca>
        )}

        {tarefas.length > 0 && (
          <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 18, lineHeight: 19 }}>
            A rotina recomeça todo dia, do zero e sem dívida.
          </Text>
        )}
      </Tela>

      {/* Nova tarefa */}
      <Modal visible={modalAberto} animationType="slide" transparent onRequestClose={fecharModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,29,78,0.55)' }} onPress={fecharModal} accessibilityLabel="Fechar" />
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
            <View style={{ width: 44, height: 5, backgroundColor: C.borderBright, borderRadius: 3, alignSelf: 'center', marginBottom: 16 }} />
            <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 22, color: C.text, marginBottom: 14 }}>Nova tarefa</Text>

            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>O que é?</Text>
            <TextInput
              placeholder="Ex.: beber um copo de água"
              placeholderTextColor={C.textMuted}
              value={novoTitulo}
              onChangeText={setNovoTitulo}
              onSubmitEditing={salvarNovaTarefa}
              returnKeyType="done"
              autoFocus
              maxLength={60}
              accessibilityLabel="Título da tarefa"
              style={[campo, { marginBottom: 14 }]}
            />

            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>Ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}>
              {emojis.map((e) => {
                const ativo = emojiSelecionado === e;
                return (
                  <Pressable
                    key={e}
                    onPress={() => setEmojiSelecionado(e)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={`Ícone ${e}`}
                    style={{ width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: ativo ? C.glass : C.surface, borderWidth: ativo ? 3 : 2, borderColor: ativo ? C.primary : C.border }}
                  >
                    <Text style={{ fontSize: 26 }}>{e}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 6 }}>
              <View style={{ flex: 1.4 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>Categoria (opcional)</Text>
                <TextInput placeholder="Ex.: saúde" placeholderTextColor={C.textMuted} value={novaCategoria} onChangeText={setNovaCategoria} maxLength={24} accessibilityLabel="Categoria" style={campo} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>Horário (opcional)</Text>
                <TextInput
                  placeholder="08:00"
                  placeholderTextColor={C.textMuted}
                  value={novoHorario}
                  onChangeText={(v) => setNovoHorario(formatarHora(v))}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={5}
                  accessibilityLabel="Horário, no formato hora e minuto"
                  style={[campo, !horarioOk && { borderColor: C.danger }]}
                />
              </View>
            </View>
            <Text style={{ fontSize: 13, color: horarioOk ? C.textMuted : C.danger, marginBottom: 16, minHeight: 18 }}>
              {horarioOk ? '' : 'Use hora e minuto, como 08:00 ou 21:30.'}
            </Text>

            <Botao rotulo="Adicionar tarefa" onPress={salvarNovaTarefa} disabled={!novoTitulo.trim() || !horarioOk} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
