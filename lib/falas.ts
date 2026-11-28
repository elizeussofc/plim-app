/**
 * As falas do avatar: frases curtas, com ironia leve e um empurrãozinho de responsabilidade,
 * escolhidas pelo que a pessoa acabou de fazer (ou deixou de fazer) no app.
 *
 * Regra de tom: a piada é com a situação ou com o próprio avatar, nunca com a pessoa.
 * O Plim cobra com carinho; não humilha quem falhou. Quem tem TDAH já ouve bronca demais.
 *
 * Arquivo sem dependências, para ter teste (tests/regras.test.mjs).
 */

/**
 * A cara que o avatar faz ao falar. São as mesmas expressões de lib/avatar.ts (repetidas aqui
 * para este arquivo continuar sem dependências). Quando usar cada uma:
 *   orgulhoso    conquista grande (rotina completa, sequência longa, nível, meta batida)
 *   determinado  algo está começando ou falta pouco (missão, treino, estudo, última tarefa)
 *   cansado      madrugada, noite curta, ou quando a pessoa cutuca o avatar sem parar
 *   triste       só em perda (sequência quebrada, missão perdida), sempre com fala de acolhimento
 */
export type Humor = 'feliz' | 'neutro' | 'triste' | 'animado' | 'cansado' | 'determinado' | 'orgulhoso';

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
  | 'grupo_post' | 'grupo_story' | 'grupo_comentou' | 'grupo_reagiu'
  | 'sono_meta' | 'sono_ritual' | 'sono_boa' | 'sono_curta'
  | 'estudo_inicio' | 'estudo_fim' | 'estudo_parou' | 'estudo_lembrei' | 'estudo_esqueci' | 'estudo_topico' | 'estudo_em_dia'
  | 'casa_tarefa' | 'casa_faxina' | 'casa_cardapio' | 'casa_compra'
  | 'roupa_vestiu' | 'roupa_comprou' | 'roupa_sem_moedas'
  | 'resumo_boa' | 'resumo_fraca';

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
  madrugada: f('cansado',
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
  falta_uma: f('determinado',
    'Falta uma. UMA. Não me deixa nesse suspense.',
    'Só mais uma e a rotina fecha. Eu já estou comemorando por dentro.'),
  rotina_completa: f('orgulhoso',
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
  sequencia_longa: f('orgulhoso',
    'Essa sequência já é maior que a minha paciência. E eu tenho muita.',
    'Tantos dias seguidos que eu parei de contar. Mentira, eu conto todos.'),
  sequencia_quebrou: f('triste',
    'Ontem não rolou. Acontece. Hoje recomeça do zero, sem dívida.',
    'A sequência zerou. Eu não vou fazer drama. Você faz uma tarefa e a gente esquece.'),
  voltou: f('feliz',
    'Olha quem apareceu! Eu fiquei aqui. Parado. De braços abertos, literalmente.',
    'Você voltou. Sem sermão: escolhe uma coisa pequena e pronto.'),

  nivel: f('orgulhoso',
    'Subiu de nível! Eu continuo com o mesmo moletom, mas feliz por você.',
    'Nível novo. Daqui de baixo a vista já é outra.'),
  conquista: f('orgulhoso',
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
  toque_demais: f('cansado',
    'Tá, entendi, você gosta de mim. A rotina também gosta de você.',
    'De tanto me girar eu vou ficar tonto. E a tarefa lá, esperando.'),
  visual: f('feliz',
    'Visual novo! Agora dá para fazer uma tarefa estreando ele.',
    'Gostei. Fiquei bem. Você tem bom gosto, pelo menos para mim.'),
  missao_inicio: f('determinado',
    'Valendo! Eu fico de olho no relógio, você fica de olho na missão.',
    'Relógio rodando. Eu torço daqui, bem quietinho.'),
  missao_ok: f('animado',
    'No tempo! A trilha subiu. A próxima vem um tiquinho maior, viu?',
    'Missão cumprida. Eu disse que dava. Ok, eu só pensei.',
    'Subiu de nível na trilha! Daqui a pouco eu que vou pedir dica.'),
  missao_falhou: f('triste',
    'O relógio ganhou essa. A trilha desceu um degrau, e a próxima vem do seu tamanho.',
    'Não deu tempo. Sem drama: a próxima missão já vem menor.',
    'Dessa vez não foi. Descer um nível não é castigo, é ajuste de rota.'),
  missao_teto: f('orgulhoso',
    'Você zerou o que o grátis tinha nessa trilha. Respeito.',
    'Topo do nível cinco! Daqui para cima é com o Pro, mas o mérito já é seu.'),
  trilha_nova: f('feliz',
    'Trilha nova! Começa pequeno. Eu gosto de ver você ganhando.',
    'Boa escolha. A primeira missão é curtinha de propósito.'),
  gym_plano: f('feliz',
    'Plano montado. Ele cresce junto com você, sem pular degrau.',
    'Treino pronto! Eu fico com a parte difícil: contar o descanso.'),
  gym_inicio: f('determinado',
    'Bora. Capricho na execução vale mais que peso no ego.',
    'Aquecimento primeiro. Eu sei, eu sei. Mas primeiro.'),
  gym_fim: f('animado',
    'Treino feito! Agora água e proteína. Ordem do treinador de moletom.',
    'Acabou! O músculo cresce no descanso, então descansar também é treinar.',
    'Mais um treino na conta. Constância ganha de intensidade.'),
  gym_carga: f('orgulhoso',
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
  fin_meta: f('orgulhoso',
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

  sono_meta: f('feliz',
    'Meta de sono anotada. Eu aviso a hora de desligar. Fingir que não ouviu é com você.',
    'Combinado. Hora marcada é hora marcada, até para dormir.'),
  sono_ritual: f('feliz',
    'Ritual completo. Agora é cama. Eu fico de vigia, que nem pisco.',
    'Tudo desligado, menos eu. Boa noite.',
    'Celular longe, luz baixa. Até amanhã.'),
  sono_boa: f('animado',
    'Noite bem dormida. Dá para ver daqui: você está quase com a minha disposição.',
    'Dormiu o que precisava. Hoje a cabeça agradece.'),
  sono_curta: f('cansado',
    'Noite curta. Acontece. Hoje a gente pega leve e deita mais cedo.',
    'Faltou sono. Não é dia de exigir muito de você. Uma coisa de cada vez.'),

  estudo_inicio: f('determinado',
    'Valendo. Eu fico quieto. É raro, aproveita.',
    'Relógio rodando. Uma matéria só, sem abrir outra aba.'),
  estudo_fim: f('animado',
    'Tempo cumprido! A cabeça cresceu um pouquinho. Eu medi.',
    'Sessão fechada. Agora descansa, que descanso também fixa.'),
  estudo_parou: f('neutro',
    'Parou antes. O que você estudou continua valendo.',
    'Tudo bem interromper. Da próxima, tenta um tempo menor.'),
  estudo_lembrei: f('feliz',
    'Lembrou! Essa já mora na sua cabeça. Volto a perguntar daqui a uns dias.',
    'Acertou sem olhar. É assim que a memória firma.'),
  estudo_esqueci: f('neutro',
    'Esqueceu. Normal: esquecer um pouco e tentar de novo é o que fixa. Amanhã eu pergunto outra vez.',
    'Essa escapou. Dá uma olhada no material e amanhã a gente repete.'),
  estudo_topico: f('feliz',
    'Anotado. Amanhã eu cobro. Com carinho, mas cobro.',
    'Tópico guardado. Eu apareço na hora certa de revisar.'),
  estudo_em_dia: f('orgulhoso',
    'Revisões em dia! Minha memória é de massinha e nem eu consigo isso.',
    'Zerou as revisões de hoje. Pode fechar o caderno sem culpa.'),

  casa_tarefa: f('feliz',
    'Uma a menos. A casa notou. Eu também.',
    'Feito! A bagunça perdeu essa.',
    'Limpo. Eu ajudaria, mas minha mão não solta do corpo.'),
  casa_faxina: f('animado',
    'Faxina relâmpago concluída. Poucos minutos e a casa já é outra.',
    'Acabou! E nem precisou do dia inteiro. Anota aí: dá para fazer em pedaços.'),
  casa_cardapio: f('feliz',
    'Cardápio montado. Decisão a menos para o você de amanhã.',
    'Semana planejada. Às seis da tarde ninguém vai perguntar "o que tem de janta?".'),
  casa_compra: f('feliz',
    'Compra fechada e anotada. Geladeira cheia e conta em dia.',
    'Mercado resolvido. O que foi para o carrinho saiu da lista.'),

  roupa_vestiu: f('animado',
    'Olha eu! Ficou bom, né? Pode falar.',
    'Gostei. Gira aí para eu me ver de costas.',
    'Estilo novo. Meu moletom está com ciúme.'),
  roupa_comprou: f('animado',
    'Peça nova no guarda-roupa! Suas moedas viraram estilo.',
    'Comprado. Eu prometo usar com responsabilidade.'),
  roupa_sem_moedas: f('neutro',
    'Faltam moedas para essa. Missão e desafio rendem, e eu espero.',
    'Ainda não dá. Mais umas tarefas e ela é minha. Digo, nossa.'),

  resumo_boa: f('orgulhoso',
    'Li a sua semana. Teve bastante coisa feita. Eu guardei tudo.',
    'Semana movimentada. Olha o resumo com calma, tem motivo para gostar.'),
  resumo_fraca: f('feliz',
    'Semana mais parada. Sem drama: o resumo mostra por onde recomeçar.',
    'Poucos registros esta semana. Escolhe uma coisa só do resumo e começa por ela.'),
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
