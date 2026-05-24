import { adicionarAoCalendario } from '@/lib/calendar';
import { agendarLembreteDiario, cancelarLembrete } from '@/lib/notifications';
import { sincronizarPontuacao } from '@/lib/ranking';
import { C } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';

const emojis = ['💧','🥗','🏃','😴','📚','🎯','💊','🧘','🚿','☀️','🌙','✅'];

export default function RotinaScreen() {
  const { tarefas, alternarStatus, adicionarTarefa, removerTarefa, marcarLembrete, marcarCalendario } = useRotinaStore();
  const { addXp, addMoedas, unlockConquista, profile } = useUserStore();
  const registrarEvento = useDesafiosStore((s) => s.registrarEvento);
  const session = useAuthStore((s) => s.session);

  const [modalAberto, setModalAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [emojiSelecionado, setEmojiSelecionado] = useState('✅');
  const [carregando, setCarregando] = useState<Record<string, string | null>>({});

  const feitas   = tarefas.filter((t) => t.status === 'feita').length;
  const puladas  = tarefas.filter((t) => t.status === 'pulada').length;
  const rotinacompleta = tarefas.length > 0 && feitas === tarefas.length;
  const progresso = tarefas.length > 0 ? feitas / tarefas.length : 0;

  const barWidth = useSharedValue(0);
  useEffect(() => { barWidth.value = withTiming(progresso * 100, { duration: 900 }); }, [progresso]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` as any }));

  useEffect(() => {
    if (!session?.user?.id) return;
    const pontos = Math.max(0, feitas * 10 - puladas * 5 + (rotinacompleta ? 30 : 0) + profile.streak * 5);
    sincronizarPontuacao({ userId: session.user.id, nomeExibido: profile.apelido ?? profile.nome ?? 'Guerreiro', avatarEmoji: profile.avatar_emoji, pontos, nivel: profile.nivel, streak: profile.streak, tarefasFeitas: feitas, tarefasPuladas: puladas });
  }, [tarefas, session?.user?.id]);

  function tocarTarefa(id: string, statusAtual: string) {
    if (statusAtual === 'pendente') {
      addXp(10); addMoedas(5);
      if (feitas === 0) unlockConquista('primeiro_passo');
      registrarEvento('tarefas_dia', 1)(addXp, addMoedas);
      if (feitas + 1 >= 3) registrarEvento('streak_3')(addXp, addMoedas);
    }
    alternarStatus(id);
  }

  async function toggleLembrete(id: string, titulo: string, horario: string, jaAgendado: boolean) {
    if (Platform.OS === 'web') { Alert.alert('Não disponível na web', 'Os lembretes funcionam apenas no app mobile.'); return; }
    if (!horario.includes(':') || horario === '--:--') { Alert.alert('Horário inválido', 'Defina um horário antes de agendar.'); return; }
    setCarregando((s) => ({ ...s, [id]: 'lembrete' }));
    try {
      if (jaAgendado) {
        await cancelarLembrete(id); marcarLembrete(id, false);
        Alert.alert('Lembrete removido', `Alarme de "${titulo}" cancelado.`);
      } else {
        const ok = await agendarLembreteDiario(id, titulo, horario);
        if (ok) { marcarLembrete(id, true); Alert.alert('🔔 Lembrete agendado!', `Você será lembrado às ${horario} todo dia.`); }
        else Alert.alert('Permissão negada', 'Precisamos de permissão para notificações.');
      }
    } finally { setCarregando((s) => ({ ...s, [id]: null })); }
  }

  async function toggleCalendario(id: string, titulo: string, categoria: string, horario: string, jaAdicionado: boolean) {
    if (jaAdicionado) { Alert.alert('Já adicionado', 'Esta tarefa já está no seu calendário.'); return; }
    if (!horario.includes(':') || horario === '--:--') { Alert.alert('Horário inválido', 'Defina um horário antes de agendar.'); return; }
    setCarregando((s) => ({ ...s, [id]: 'calendario' }));
    try {
      const ok = await adicionarAoCalendario(titulo, categoria, horario);
      if (ok) { marcarCalendario(id, true); Alert.alert('📅 Adicionado!', `"${titulo}" criado no calendário.`); }
    } finally { setCarregando((s) => ({ ...s, [id]: null })); }
  }

  function salvarNovaTarefa() {
    if (!novoTitulo.trim()) return;
    adicionarTarefa({ icone: emojiSelecionado, titulo: novoTitulo.trim(), categoria: novaCategoria.trim() || 'Geral', horario: novoHorario.trim() || '--:--' });
    setModalAberto(false); setNovoTitulo(''); setNovaCategoria(''); setNovoHorario(''); setEmojiSelecionado('✅');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(0).springify()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>minha rotina</Text>
          <Pressable
            onPress={() => setModalAberto(true)}
            style={{ backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ nova</Text>
          </Pressable>
        </Animated.View>

        {/* Progresso */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: C.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 12, color: C.textSub, fontWeight: '600' }}>progresso de hoje</Text>
            <Text style={{ fontSize: 12, color: C.primaryLight, fontWeight: '700' }}>{feitas}/{tarefas.length}</Text>
          </View>
          <View style={{ backgroundColor: C.border, borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <Animated.View style={[{ height: 8, borderRadius: 6, backgroundColor: rotinacompleta ? C.success : C.primaryLight }, barStyle]} />
          </View>
          {rotinacompleta && tarefas.length > 0 && (
            <Text style={{ color: C.success, fontWeight: '700', fontSize: 13, textAlign: 'center', marginTop: 10 }}>🎉 Rotina completa! Incrível!</Text>
          )}
        </Animated.View>

        <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>tarefas de hoje</Text>

        <View style={{ gap: 10 }}>
          {tarefas.map((tarefa, i) => {
            const feita  = tarefa.status === 'feita';
            const pulada = tarefa.status === 'pulada';
            const load   = carregando[tarefa.id];
            return (
              <Animated.View key={tarefa.id} entering={FadeInDown.delay(140 + i * 50).springify()}>
                <View style={{
                  backgroundColor: C.surface,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: feita ? C.primaryLight + '44' : C.border,
                  opacity: pulada ? 0.5 : 1,
                  overflow: 'hidden',
                }}>
                  <Pressable
                    onPress={() => tocarTarefa(tarefa.id, tarefa.status)}
                    onLongPress={() => Alert.alert('Remover', `Remover "${tarefa.titulo}"?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Remover', style: 'destructive', onPress: () => removerTarefa(tarefa.id) },
                    ])}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}
                  >
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: feita ? C.primary + '22' : C.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{tarefa.icone}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: feita ? C.textSub : C.text, textDecorationLine: feita ? 'line-through' : 'none' }}>{tarefa.titulo}</Text>
                      <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{tarefa.categoria} · {tarefa.horario}</Text>
                    </View>
                    <View style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: feita ? C.primaryLight : 'transparent',
                      borderWidth: feita ? 0 : 2,
                      borderColor: C.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {feita && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}
                      {pulada && <Text style={{ color: C.textMuted, fontSize: 13 }}>–</Text>}
                    </View>
                  </Pressable>

                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }}>
                    <Pressable
                      onPress={() => toggleLembrete(tarefa.id, tarefa.titulo, tarefa.horario, tarefa.lembreteAgendado)}
                      disabled={load === 'lembrete'}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        paddingVertical: 8, borderRadius: 12,
                        backgroundColor: tarefa.lembreteAgendado ? C.primary + '22' : C.surfaceHigh,
                        borderWidth: 1, borderColor: tarefa.lembreteAgendado ? C.primaryLight + '44' : C.border,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>{tarefa.lembreteAgendado ? '🔔' : '🔕'}</Text>
                      <Text style={{ fontSize: 11, color: tarefa.lembreteAgendado ? C.primaryLight : C.textSub, fontWeight: '600' }}>
                        {load === 'lembrete' ? 'Aguarde...' : tarefa.lembreteAgendado ? 'Ativo' : 'Lembrar'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleCalendario(tarefa.id, tarefa.titulo, tarefa.categoria, tarefa.horario, tarefa.calendarioAdicionado)}
                      disabled={load === 'calendario'}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        paddingVertical: 8, borderRadius: 12,
                        backgroundColor: tarefa.calendarioAdicionado ? C.success + '22' : C.surfaceHigh,
                        borderWidth: 1, borderColor: tarefa.calendarioAdicionado ? C.success + '44' : C.border,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>📅</Text>
                      <Text style={{ fontSize: 11, color: tarefa.calendarioAdicionado ? C.success : C.textSub, fontWeight: '600' }}>
                        {load === 'calendario' ? 'Aguarde...' : tarefa.calendarioAdicionado ? 'Agendado' : 'Agendar'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {tarefas.length === 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 16 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🚀</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.primaryLight, marginBottom: 6 }}>Vamos começar?</Text>
            <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center' }}>Adicione sua primeira tarefa!</Text>
          </Animated.View>
        )}

        <Text style={{ fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 20 }}>toque para marcar · segure para remover</Text>
      </ScrollView>

      {/* Modal Nova Tarefa */}
      <Modal visible={modalAberto} animationType="slide" transparent onRequestClose={() => setModalAberto(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setModalAberto(false)} />
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: C.border }}>
            <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20 }}>nova tarefa</Text>

            <Text style={{ fontSize: 11, color: C.textSub, fontWeight: '700', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {emojis.map((e) => (
                  <Pressable key={e} onPress={() => setEmojiSelecionado(e)} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: emojiSelecionado === e ? C.primary : C.surfaceHigh, borderWidth: 1, borderColor: emojiSelecionado === e ? C.primaryLight : C.border }}>
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={{ fontSize: 11, color: C.textSub, fontWeight: '700', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>título *</Text>
            <TextInput placeholder="Ex: Beber 2 litros de água" placeholderTextColor={C.textMuted} value={novoTitulo} onChangeText={setNovoTitulo} autoFocus
              style={{ backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 15, marginBottom: 14 }} />

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: C.textSub, fontWeight: '700', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>categoria</Text>
                <TextInput placeholder="Ex: Saúde" placeholderTextColor={C.textMuted} value={novaCategoria} onChangeText={setNovaCategoria}
                  style={{ backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: C.text, fontSize: 14 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: C.textSub, fontWeight: '700', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>horário</Text>
                <TextInput placeholder="08:00" placeholderTextColor={C.textMuted} value={novoHorario} onChangeText={setNovoHorario} keyboardType="numbers-and-punctuation"
                  style={{ backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: C.text, fontSize: 14 }} />
              </View>
            </View>

            <Pressable onPress={salvarNovaTarefa} style={{ backgroundColor: novoTitulo.trim() ? C.primary : C.primary + '55', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Adicionar tarefa</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
