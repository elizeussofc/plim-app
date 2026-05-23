import AsyncStorage from '@react-native-async-storage/async-storage';

export type Challenge = 'procrastinacao' | 'esquecimento' | 'hiperfoco' | 'sobrecarga' | 'nao_termino' | 'ansiedade';
export type AdhdStatus = 'diagnosed' | 'suspect' | 'no';
export type Chronotype = 'morning' | 'afternoon' | 'night' | 'dawn';
export type Distraction = 'celular' | 'pessoas' | 'ansiedade' | 'tedio' | 'comida' | 'pensamentos';
export type Motivation = 'progresso' | 'recompensas' | 'streak' | 'acompanhamento' | 'competicao';

export interface OnboardingAnswers {
  challenges: Challenge[];
  adhdStatus: AdhdStatus;
  chronotype: Chronotype;
  goal: string | null;
  distractions: Distraction[];
  motivation: Motivation;
}

export interface PlimProfileType {
  id: string;
  name: string;
  emoji: string;
  description: string;
  insights: string[];
}

export interface PlimUserProfile {
  completedAt: string;
  answers: OnboardingAnswers;
  profileType: PlimProfileType;
}

const PROFILES: Record<string, Omit<PlimProfileType, 'id'>> = {
  sprintador_noturno: {
    name: 'Sprintador Noturno',
    emoji: '🌙',
    description: 'Sua mente explode à noite, mas a sobrecarga te trava antes de começar.',
    insights: [
      'Seu pico de foco é entre 20h e 23h — proteja esse horário',
      'Faça uma lista de 3 itens antes de começar cada sessão',
      'Blocos de 25min evitam a exaustão que a sobrecarga traz',
    ],
  },
  madrugador_construcao: {
    name: 'Madrugador em Construção',
    emoji: '🌅',
    description: 'Você tem energia de manhã, mas a procrastinação rouba esse momento precioso.',
    insights: [
      'Comece a tarefa mais difícil até as 9h — antes das redes sociais',
      'Rituais curtos de manhã aumentam sua consistência em até 40%',
      'Deixe a lista do dia pronta na noite anterior',
    ],
  },
  iniciador_cronico: {
    name: 'Iniciador Crônico',
    emoji: '🎯',
    description: 'Você começa tudo, termina pouco — o hiperfoco te sequestra antes do fim.',
    insights: [
      'Defina o critério de "concluído" antes de começar qualquer tarefa',
      'Liste suas tarefas abertas e finalize uma antes de iniciar outra',
      'Alarmes de 45min te ajudam a sair do hiperfoco a tempo',
    ],
  },
  mente_tempestade: {
    name: 'Mente em Tempestade',
    emoji: '🌊',
    description: 'A ansiedade é seu maior obstáculo — mas você já sabe identificá-la.',
    insights: [
      'Despejo Mental antes de qualquer sessão de foco',
      'Modo Calma em momentos de pico de ansiedade',
      'Tarefas curtas (máx 20min) reduzem a paralisia',
    ],
  },
  cacador_sequencias: {
    name: 'Caçador de Sequências',
    emoji: '🔥',
    description: 'Streaks são seu combustível — perder uma sequência te desmotiva mais que qualquer coisa.',
    insights: [
      'Mantenha uma tarefa mínima diária para não quebrar o streak',
      'Defina um "dia de reposição" semanal se precisar faltar',
      'Comemore cada marco: 7, 14, 30 dias consecutivos',
    ],
  },
  foco_companhia: {
    name: 'Foco em Companhia',
    emoji: '👥',
    description: 'Você produz melhor quando sente que alguém está junto — accountability é seu superpoder.',
    insights: [
      'Compartilhe seus objetivos na Comunidade do Plim',
      'Defina um parceiro de foco semanal',
      'Sessões de foco em dupla dobram sua produtividade',
    ],
  },
  noturno_criativo: {
    name: 'Noturno Criativo',
    emoji: '🎨',
    description: 'À noite seu cérebro entra em modo criativo — mas o hiperfoco pode te sequestrar até o amanhecer.',
    insights: [
      'Defina um horário de encerramento antes de começar',
      'Projetos criativos fluem melhor das 20h às 23h',
      'Despejo Mental ao dormir libera sua mente para o próximo dia',
    ],
  },
  coruja_digital: {
    name: 'Coruja Digital',
    emoji: '🦉',
    description: 'Madrugada é seu território — o mundo dorme e você finalmente consegue focar.',
    insights: [
      'Proteja seu sono compensatório — ele é essencial para o TDAH',
      'Sessões de foco de 50min funcionam bem nesse silêncio',
      'Hidratação e luz adequada são cruciais de madrugada',
    ],
  },
  guerreiro_tarde: {
    name: 'Guerreiro da Tarde',
    emoji: '☀️',
    description: 'Você esquenta no período da tarde — o desafio é manter o foco depois do almoço.',
    insights: [
      'Reserve 13h–17h para suas tarefas mais importantes',
      'Almoço leve melhora muito seu foco pós-prandial',
      'Bloqueie notificações nesse horário — sem exceções',
    ],
  },
  mestre_esquecimento: {
    name: 'Mestre do Esquecimento',
    emoji: '🧠',
    description: 'Sua memória de trabalho sobrecarrega rápido — externalizar tudo é a solução.',
    insights: [
      'Despejo Mental é seu ritual mais importante do dia',
      'Use a Rotina do Plim como sua memória externa',
      'Revise sua lista toda manhã por 5 minutos',
    ],
  },
  cacador_progresso: {
    name: 'Caçador de Progresso',
    emoji: '📈',
    description: 'Ver o progresso visual é o que te mantém motivado — números e gráficos te energizam.',
    insights: [
      'Acompanhe seu XP diariamente no dashboard',
      'Defina metas semanais mensuráveis e visíveis',
      'Comemore cada porcentagem conquistada',
    ],
  },
  explorador: {
    name: 'Explorador',
    emoji: '🔭',
    description: 'Você está descobrindo seu ritmo — e o Plim vai te ajudar a encontrá-lo.',
    insights: [
      'Experimente diferentes horários de foco por 1 semana',
      'Anote o que funcionou e o que não funcionou',
      'Sua rotina ideal está a poucos dias de distância',
    ],
  },
};

export function classifyProfile(answers: OnboardingAnswers): PlimProfileType {
  const { challenges, chronotype, motivation } = answers;
  const has = (c: Challenge) => challenges.includes(c);

  // Combinações específicas primeiro
  if (has('nao_termino') && has('hiperfoco'))
    return { id: 'iniciador_cronico', ...PROFILES.iniciador_cronico };

  if (chronotype === 'night' && has('sobrecarga'))
    return { id: 'sprintador_noturno', ...PROFILES.sprintador_noturno };

  if (chronotype === 'morning' && has('procrastinacao'))
    return { id: 'madrugador_construcao', ...PROFILES.madrugador_construcao };

  if (chronotype === 'night' && has('hiperfoco'))
    return { id: 'noturno_criativo', ...PROFILES.noturno_criativo };

  // Desafio dominante
  if (has('ansiedade'))
    return { id: 'mente_tempestade', ...PROFILES.mente_tempestade };

  if (has('esquecimento'))
    return { id: 'mestre_esquecimento', ...PROFILES.mestre_esquecimento };

  // Motivação
  if (motivation === 'streak')
    return { id: 'cacador_sequencias', ...PROFILES.cacador_sequencias };

  if (motivation === 'acompanhamento' || motivation === 'competicao')
    return { id: 'foco_companhia', ...PROFILES.foco_companhia };

  if (motivation === 'progresso')
    return { id: 'cacador_progresso', ...PROFILES.cacador_progresso };

  // Cronotipo como fallback
  if (chronotype === 'dawn')
    return { id: 'coruja_digital', ...PROFILES.coruja_digital };

  if (chronotype === 'afternoon')
    return { id: 'guerreiro_tarde', ...PROFILES.guerreiro_tarde };

  if (chronotype === 'morning')
    return { id: 'madrugador_construcao', ...PROFILES.madrugador_construcao };

  if (chronotype === 'night')
    return { id: 'sprintador_noturno', ...PROFILES.sprintador_noturno };

  return { id: 'explorador', ...PROFILES.explorador };
}

const KEY_COMPLETED = 'plim_onboarding_completed';
const KEY_PROFILE = 'plim_user_profile';

export async function saveOnboardingProfile(answers: OnboardingAnswers): Promise<PlimUserProfile> {
  const profileType = classifyProfile(answers);
  const profile: PlimUserProfile = {
    completedAt: new Date().toISOString(),
    answers,
    profileType,
  };
  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  await AsyncStorage.setItem(KEY_COMPLETED, 'true');
  return profile;
}

export async function loadOnboardingProfile(): Promise<PlimUserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as PlimUserProfile;
  } catch {
    return null;
  }
}

export async function isOnboardingCompleted(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEY_COMPLETED);
  return val === 'true';
}
