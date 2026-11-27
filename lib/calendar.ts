import * as Calendar from 'expo-calendar';
import { avisar } from '@/lib/avisar';
import { Alert, Platform } from 'react-native';

export async function pedirPermissaoCalendario(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

async function obterCalendarioPadrao(): Promise<string | null> {
  const calendarios = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  // Prefere calendário padrão do sistema
  const padrao = calendarios.find(
    (c) =>
      c.allowsModifications &&
      (c.isPrimary ||
        c.title === 'Calendar' ||
        c.title === 'Calendário' ||
        c.source?.type === Calendar.CalendarType.LOCAL)
  );

  return padrao?.id ?? calendarios.find((c) => c.allowsModifications)?.id ?? null;
}

/**
 * Adiciona a tarefa ao calendário nativo do celular.
 * Cria um evento recorrente diário no horário especificado.
 * Horário no formato "HH:MM".
 */
export async function adicionarAoCalendario(
  titulo: string,
  categoria: string,
  horario: string
): Promise<boolean> {
  if (Platform.OS === 'web') {
    avisar('Calendário só no celular', 'No site o Plim não acessa seu calendário. No app do celular, sim.');
    return false;
  }

  const ok = await pedirPermissaoCalendario();
  if (!ok) {
    avisar('Permissão negada', 'Precisamos de acesso ao seu calendário para criar o evento.');
    return false;
  }

  const calId = await obterCalendarioPadrao();
  if (!calId) {
    avisar('Calendário não encontrado', 'Não encontramos um calendário disponível no seu dispositivo.');
    return false;
  }

  const [hora, minuto] = horario.split(':').map(Number);
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), hora, minuto, 0);
  const fim = new Date(inicio.getTime() + 30 * 60 * 1000); // 30 min de duração

  await Calendar.createEventAsync(calId, {
    title: `⚡ ${titulo}`,
    notes: `Tarefa Plim — ${categoria}`,
    startDate: inicio,
    endDate: fim,
    recurrenceRule: {
      frequency: Calendar.Frequency.DAILY,
    },
    alarms: [
      { relativeOffset: -10 }, // lembrete 10 min antes
      { relativeOffset: 0 },   // lembrete na hora
    ],
  });

  return true;
}
