/**
 * As falas do avatar: frases curtas, com ironia leve e um empurrãozinho de responsabilidade,
 * escolhidas pelo que a pessoa acabou de fazer (ou deixou de fazer) no app.
 *
 * Regra de tom: a piada é com a situação ou com o próprio avatar, nunca com a pessoa.
 * O Plim cobra com carinho; não humilha quem falhou. Quem tem TDAH já ouve bronca demais.
 *
 * Arquivo sem dependências, para ter teste (tests/regras.test.mjs).
 */

export type Humor = 'feliz' | 'neutro' | 'triste' | 'animado';

export type Situacao =
  | 'manha_zero' | 'tarde_zero' | 'noite_zero' | 'madrugada'
  | 'em_andamento' | 'noite_pendente'
  | 'primeira_tarefa' | 'tarefa' | 'falta_uma' | 'rotina_completa'
  | 'pulou' | 'pulou_varias' | 'desfez'
  | 'sequencia_3' | 'sequencia_7' | 'sequencia_longa' | 'sequencia_quebrou' | 'voltou'
  | 'nivel' | 'conquista' | 'desafio'
  | 'despejo' | 'foco_completo' | 'foco_parou' | 'calma'
  | 'toque' | 'toque_demais' | 'visual' | 'sem_rotina'
  | 'missao_inicio' | 'missao_ok' | 'missao_falhou' | 'missao_teto' | 'trilha_nova'
  | 'gym_plano' | 'gym_inicio' | 'gym_fim' | 'gym_carga' | 'gym_leve' | 'gym_parou'
  | 'fin_gasto' | 'fin_ganho' | 'fin_conta' | 'fin_meta' | 'fin_estourou' | 'fin_aporte'
  | 'grupo_post' | 'grupo_story' | 'grupo_comentou' | 'grupo_reagiu';

interface Fala { texto: string; humor: Humor }

const f = (humor: Humor, ...textos: string[]): Fala[] => textos.map((texto) => ({ texto, humor }));

export const FALAS: Record<Situacao, Fala[]> = {
  manha_zero: f('feliz',
    'Bom dia. A rotina está ali, te esperando. Sem pressão. (Um pouquinho.)',
    'Acordou! Eu já estou de moletom faz horas.',
    'Dia novo, lista zerada. Qual é a mais fácil? Começa por ela.'),
  tarde_zero: f('neutro',
    'Já é de tarde e a lista segue intacta. Que consistência.',
    'A primeira tarefa leva dois minutos. Eu cronometrei. Mentira, mas leva.',
    'Ainda dá tempo de sobra. Uma só e o dia já não foi em branco.'),
  noite_zero: f('neutro',
    'Dia quase no fim. Uma tarefinha e a gente finge que esse era o plano.',
    'Nada marcado hoje. Acontece. Uma só, e eu paro de olhar para você assim.'),
  madrugada: f('neutro',
    'Madrugada. Eu não durmo, mas você devia.',
    'A essa hora só eu devia estar acordado, e eu nem tenho olho que fecha.'),
  em_andamento: f('feliz',
    'Você já começou. O resto é ladeira abaixo. No bom sentido.',
    'Tem coisa feita aí. Eu vi. Estou fingindo que não estou orgulhoso.'),
  noite_pendente: f('neutro',
    'Já passou das nove. Escolhe uma e encerra o dia por cima.',
    'Ainda tem tarefa aberta. Fazer uma agora é presente para você de amanhã.'),

  primeira_tarefa: f('animado',
    'Olha só quem fez uma. Anotei aqui, com orgulho.',
    'A primeira já foi. O difícil era começar, e você começou.',
    'Uma feita! Agora ninguém pode dizer que o dia foi em branco.'),
  tarefa: f('feliz',
    'Mais uma! Está ficando perigoso de tão produtivo.',
    'Feito. Eu aplaudiria, mas meus braços só fazem pose.',
    'Marcou e seguiu. É assim que se faz, sem cerimônia.'),
  falta_uma: f('animado',
    'Falta uma. UMA. Não me deixa nesse suspense.',
    'Só mais uma e a rotina fecha. Eu já estou comemorando por dentro.'),
  rotina_completa: f('animado',
    'Tudo feito. Fiquei sem piada. Parabéns de verdade.',
    'Rotina completa. Pode descansar sem culpa, eu assino embaixo.',
    'Cem por cento. Vou precisar de um moletom mais chique para acompanhar.'),

  pulou: f('neutro',
    'Pulou. Anotado. Sem drama: amanhã ela volta, descansada.',
    'Pular também é decidir. Só não vale pular todas, combinado?',
    'Tudo bem pular. Eu só levantei a sobrancelha um milímetro.'),
  pulou_varias: f('neutro',
    'Está pulando tanto que já dá para contar como exercício.',
    'Muita tarefa pulada hoje. Que tal trocar uma delas por uma menor?'),
  desfez: f('neutro',
    'Desmarcou? Eu vi. Honestidade conta ponto comigo.',
    'Voltou atrás. Tudo bem, a tarefa não guarda rancor.'),

  sequencia_3: f('animado',
    'Três dias seguidos. Quem é você e o que fez com quem eu conhecia?',
    'Três dias! Isso já é um hábito engatinhando.'),
  sequencia_7: f('animado',
    'Uma semana inteira. Eu estava aqui o tempo todo. Vi tudo.',
    'Sete dias seguidos. Pode contar para alguém, eu deixo.'),
  sequencia_longa: f('animado',
    'Essa sequência já é maior que a minha paciência. E eu tenho muita.',
    'Tantos dias seguidos que eu parei de contar. Mentira, eu conto todos.'),
  sequencia_quebrou: f('neutro',
    'Ontem não rolou. Acontece. Hoje recomeça do zero, sem dívida.',
    'A sequência zerou. Eu não vou fazer drama. Você faz uma tarefa e a gente esquece.'),
  voltou: f('feliz',
    'Olha quem apareceu! Eu fiquei aqui. Parado. De braços abertos, literalmente.',
    'Você voltou. Sem sermão: escolhe uma coisa pequena e pronto.'),

  nivel: f('animado',
    'Subiu de nível! Eu continuo com o mesmo moletom, mas feliz por você.',
    'Nível novo. Daqui de baixo a vista já é outra.'),
  conquista: f('animado',
    'Conquista nova. Pode se gabar, eu deixo.',
    'Mais uma para a coleção. Eu guardo, você brilha.'),
  desafio: f('feliz',
    'Desafio fechado. Semana que vem tem mais, sem pressa.',
    'Desafio cumprido. Eu sabia. Ok, eu torcia.'),

  despejo: f('feliz',
    'Cabeça mais leve? A minha é só enfeite, então nem sei como é.',
    'Saiu da cabeça, foi para o papel. Agora ela para de ficar repetindo.'),
  foco_completo: f('animado',
    'Sessão inteira! O celular deve estar com saudade.',
    'Você ficou até o fim. Eu fiquei quietinho para não atrapalhar.'),
  foco_parou: f('feliz',
    'Parou antes do fim. Os minutos contam igual, eu conferi.',
    'Foi um pedaço. Pedaço também é foco.'),
  calma: f('feliz',
    'Respirou. Viu? O mundo esperou você.',
    'Trinta e poucos segundos de calma. Melhor investimento do dia.'),

  toque: f('feliz',
    'Oi. Sim, eu aceno. É meu único talento.',
    'Me cutucar não conta como tarefa. Eu perguntei.',
    'Estou aqui. Sempre estou. É meio que o meu trabalho.'),
  toque_demais: f('neutro',
    'Tá, entendi, você gosta de mim. A rotina também gosta de você.',
    'De tanto me girar eu vou ficar tonto. E a tarefa lá, esperando.'),
  visual: f('feliz',
    'Visual novo! Agora dá para fazer uma tarefa estreando ele.',
    'Gostei. Fiquei bem. Você tem bom gosto, pelo menos para mim.'),
  missao_inicio: f('feliz',
    'Valendo! Eu fico de olho no relógio, você fica de olho na missão.',
    'Relógio rodando. Eu torço daqui, bem quietinho.'),
  missao_ok: f('animado',
    'No tempo! A trilha subiu. A próxima vem um tiquinho maior, viu?',
    'Missão cumprida. Eu disse que dava. Ok, eu só pensei.',
    'Subiu de nível na trilha! Daqui a pouco eu que vou pedir dica.'),
  missao_falhou: f('neutro',
    'O relógio ganhou essa. A trilha desceu um degrau, e a próxima vem do seu tamanho.',
    'Não deu tempo. Sem drama: a próxima missão já vem menor.',
    'Dessa vez não foi. Descer um nível não é castigo, é ajuste de rota.'),
  missao_teto: f('animado',
    'Você zerou o que o grátis tinha nessa trilha. Respeito.',
    'Topo do nível cinco! Daqui para cima é com o Pro, mas o mérito já é seu.'),
  trilha_nova: f('feliz',
    'Trilha nova! Começa pequeno. Eu gosto de ver você ganhando.',
    'Boa escolha. A primeira missão é curtinha de propósito.'),
  gym_plano: f('feliz',
    'Plano montado. Ele cresce junto com você, sem pular degrau.',
    'Treino pronto! Eu fico com a parte difícil: contar o descanso.'),
  gym_inicio: f('animado',
    'Bora. Capricho na execução vale mais que peso no ego.',
    'Aquecimento primeiro. Eu sei, eu sei. Mas primeiro.'),
  gym_fim: f('animado',
    'Treino feito! Agora água e proteína. Ordem do treinador de moletom.',
    'Acabou! O músculo cresce no descanso, então descansar também é treinar.',
    'Mais um treino na conta. Constância ganha de intensidade.'),
  gym_carga: f('animado',
    'Hora de subir a carga! Pouquinho, do jeito certo.',
    'Você bateu a meta em tudo. O peso que se cuide.'),
  gym_leve: f('feliz',
    'Semana leve. Não é moleza, é estratégia: o corpo agradece.',
    'Uma série a menos em tudo esta semana. Recuperar também faz crescer.'),
  gym_parou: f('neutro',
    'Treino pela metade também conta. Ficou registrado o que você fez.',
    'Parou antes? Tudo bem. O próximo treino continua te esperando.'),
  fin_gasto: f('neutro',
    'Anotado. Dinheiro que a gente enxerga para de sumir.',
    'Gasto no caderno. Eu não julgo, só anoto.',
    'Registrado. Saber para onde foi já é metade do controle.'),
  fin_ganho: f('feliz',
    'Entrou dinheiro! Antes de gastar, separa a fatia de guardar.',
    'Opa, entrada. Que tal pagar você primeiro?'),
  fin_conta: f('feliz',
    'Conta paga. Uma coisa a menos morando na sua cabeça.',
    'Paga antes de vencer. Os juros ficaram sem assunto.'),
  fin_meta: f('animado',
    'Meta batida! Isso aí foi você, parcela por parcela.',
    'Chegou! Guardar aos poucos funciona. Eu vi acontecer.'),
  fin_estourou: f('neutro',
    'Essa categoria passou do combinado. Dá para compensar em outra.',
    'Estourou o teto aqui. Sem drama: o mês ainda tem conserto.'),
  fin_aporte: f('feliz',
    'Guardou! Pouco e sempre vira muito. A matemática garante.',
    'Mais um tijolinho na reserva. Eu contei.'),
  grupo_post: f('feliz',
    'Publicado! Vai que isso anima alguém que estava travado hoje.',
    'Foi para o grupo. Contar o que fez também é comemorar.'),
  grupo_story: f('feliz',
    'Story no ar por 24 horas. Depois some, igual a minha dignidade.',
    'Postou! Eu apareço em algum? Só curiosidade.'),
  grupo_comentou: f('feliz',
    'Comentário enviado. Palavra boa dá um empurrão em alguém.',
    'Gentileza registrada. Faz bem para os dois lados.'),
  grupo_reagiu: f('feliz',
    'Reagiu! Um emoji seu pode ser o empurrão de alguém.',
    'Torcida entregue. Barato e funciona.'),
  sem_rotina: f('neutro',
    'Sua rotina está vazia. Eu aceito qualquer tarefa, até beber água.',
    'Sem tarefas por aqui. Cria uma pequena e eu paro de encarar.'),
};

export interface EstadoParaFala {
  hora: number;
  feitas: number;
  puladas: number;
  total: number;
  sequencia: number;
  /** Dias desde o último dia com tarefa feita (0 = hoje, 1 = ontem; -1 = nunca). */
  diasParado: number;
}

/** Qual situação descreve a pessoa ao abrir o app agora. */
export function situacaoAoAbrir(e: EstadoParaFala): Situacao {
  if (e.total === 0) return 'sem_rotina';
  if (e.feitas >= e.total) return 'rotina_completa';
  if (e.feitas > 0) return e.hora >= 21 ? 'noite_pendente' : 'em_andamento';
  if (e.diasParado >= 3) return 'voltou';
  if (e.diasParado === 2 && e.sequencia === 0) return 'sequencia_quebrou';
  if (e.hora < 5) return 'madrugada';
  if (e.hora < 12) return 'manha_zero';
  if (e.hora < 18) return 'tarde_zero';
  return 'noite_zero';
}

/** Qual situação descreve o que aconteceu depois de marcar uma tarefa como feita. */
export function situacaoAoConcluir(feitas: number, total: number): Situacao {
  if (total > 0 && feitas >= total) return 'rotina_completa';
  if (feitas === 1) return 'primeira_tarefa';
  if (total - feitas === 1) return 'falta_uma';
  return 'tarefa';
}

/** Marcos de sequência que merecem uma fala. */
export function situacaoDaSequencia(dias: number): Situacao | null {
  if (dias === 3) return 'sequencia_3';
  if (dias === 7) return 'sequencia_7';
  if (dias === 14 || dias === 30 || dias === 60 || dias === 100) return 'sequencia_longa';
  return null;
}

/**
 * Escolhe uma fala da situação sem repetir a última dita.
 * `sorteio` é um número de 0 a 1 (Math.random por padrão; fixo nos testes).
 */
export function escolherFala(situacao: Situacao, ultima?: string, sorteio: number = Math.random()): Fala {
  const opcoes = FALAS[situacao];
  const candidatas = opcoes.length > 1 ? opcoes.filter((o) => o.texto !== ultima) : opcoes;
  return candidatas[Math.min(candidatas.length - 1, Math.floor(sorteio * candidatas.length))];
}
