import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configura como a notificação aparece quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existente } = await Notifications.getPermissionsAsync();
  if (existente === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Agenda uma notificação diária para a tarefa no horário especificado.
 * Retorna o identifier da notificação (para cancelar depois).
 * Horário no formato "HH:MM".
 */
export async function agendarLembreteDiario(
  tarefaId: string,
  titulo: string,
  horario: string
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const ok = await pedirPermissaoNotificacoes();
  if (!ok) return null;

  const [hora, minuto] = horario.split(':').map(Number);
  if (isNaN(hora) || isNaN(minuto)) return null;

  // Cancela qualquer lembrete anterior para esta tarefa
  await cancelarLembrete(tarefaId);

  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: `rotina-${tarefaId}`,
    content: {
      title: '⚡ Hora da sua tarefa!',
      body: titulo,
      sound: true,
      data: { tarefaId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hora,
      minute: minuto,
    },
  });

  return identifier;
}

export async function cancelarLembrete(tarefaId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`rotina-${tarefaId}`);
  } catch {
    // ignora se não existia
  }
}

export async function cancelarTodosLembretes(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
