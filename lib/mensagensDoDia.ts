// Pool de 5 mensagens por perfil = 60 mensagens total.
// Seleção determinística por dia do ano (mesma mensagem o dia todo, muda a cada 24h).

const POOL: Record<string, string[]> = {
  sprintador_noturno: [
    'Sua hora de ouro chega às 20h. Que tal só 1 tarefa hoje?',
    'À noite o mundo some e o foco aparece. Aproveita.',
    'Não precisa fazer tudo — só o mais importante desta noite.',
    'Proteção do horário noturno: desligue notificações a partir das 20h.',
    'Sprintadores noturnos não começam cedo — começam certo.',
  ],
  madrugador_construcao: [
    'Aproveita esse cérebro fresco — começa pela tarefa mais difícil.',
    'Manhã sem rede social é manhã produtiva. Você já sabe disso.',
    'Cada manhã bem usada te deixa 1% mais perto do objetivo.',
    'Hoje: 1 coisa feita antes das 9h vale mais que 5 às 22h.',
    'Madrugador em construção: cada tijolo de manhã monta o castelo.',
  ],
  iniciador_cronico: [
    'Hoje termina uma coisa antes de começar outra. Só uma.',
    'Defina o que significa "pronto" antes de abrir qualquer tarefa.',
    'O segundo passo é mais importante que o primeiro. Você consegue.',
    'Sua lista tem projetos abertos — escolha 1 para fechar agora.',
    'Terminar gera mais dopamina que começar. Experimenta hoje.',
  ],
  mente_tempestade: [
    'Respira fundo antes de abrir a lista. 3 segundos mudam tudo.',
    'Ansiedade não é fraqueza — é sinal de que você se importa.',
    'Hoje: 1 tarefa pequena. Só uma. E já é vitória.',
    'Despejo Mental antes de qualquer coisa — esvazia a cabeça.',
    'Tempestades passam. Você já sobreviveu a todas as anteriores.',
  ],
  cacador_sequencias: [
    'O streak não para hoje. Qual é a tarefa mínima para manter?',
    'Sequências são construídas também nos dias ruins. Segura!',
    'Não precisa ser perfeito — precisa ser consistente. Você é.',
    'Cada dia de streak é prova de que você honra seus compromissos.',
    'Segredo do streak: baixar o nível nos dias difíceis, nunca zerar.',
  ],
  foco_companhia: [
    'Compartilha na Comunidade hoje — alguém precisa te ver.',
    'Você foca melhor com audiência. Conta seu objetivo do dia.',
    'Escrito é compromisso. Qual é sua meta de hoje?',
    'Comunidade ativa multiplica sua energia. Usa ela hoje.',
    'Foco em dupla: convida alguém para uma sessão agora.',
  ],
  noturno_criativo: [
    'Noite de criação: define até que horas e desliga tudo depois.',
    'Seu melhor trabalho acontece quando o mundo silencia.',
    'Criatividade noturna pede uma regra: horário de encerramento.',
    'Ideias boas de madrugada precisam de anotação imediata.',
    'Despejo Mental antes de dormir libera a criatividade amanhã.',
  ],
  coruja_digital: [
    'Madrugada silenciosa, mente afiada. Usa esse privilégio.',
    'Você domina o horário em que ninguém te distrai. Aproveita.',
    'Cuida do sono compensatório — ele é seu superpoder.',
    'Na madrugada: sem multitarefa, só profundidade total.',
    'Água e luz adequada mantêm seu foco até o amanhecer.',
  ],
  guerreiro_tarde: [
    'Sua tarde começa agora. Bloqueia 2h para o que importa.',
    'Almoço leve, tarde produtiva. Você já sabe o que funciona.',
    'Notificações desligadas das 13h às 17h. Hoje você tenta?',
    'Guerreiros da tarde dominam o horário que outros desperdiçam.',
    'Pós-almoço pesado é inimigo do foco. A escolha é sua.',
  ],
  mestre_esquecimento: [
    'Antes de qualquer coisa: Despejo Mental. Esvazia a cabeça.',
    'Sua lista existe para que sua cabeça não precise lembrar.',
    'Escreve tudo. Tudo mesmo. Sua memória externa te serve melhor.',
    'Revisa a lista agora: tem algo urgente que você esqueceu?',
    'Mestre do Esquecimento não luta contra a memória — usa ferramentas.',
  ],
  cacador_progresso: [
    'Hoje você vai subir de nível? Confere seu XP e traça a rota.',
    'Progresso visível é progresso motivante. Quanto você acumulou?',
    'Números não mentem: cada XP é prova do seu esforço.',
    'Meta de hoje: +1 no indicador que mais importa pra você.',
    'Quem acompanha progresso chega mais longe. Você já sabe disso.',
  ],
  explorador: [
    'Cada dia é um dado novo sobre o que funciona pra você.',
    'Hoje você descobre mais uma coisa sobre seu ritmo.',
    'Exploradores documentam. O que você aprendeu ontem?',
    'Seu mapa está sendo desenhado. Cada ação é um ponto.',
    'Não existe rotina errada — existe rotina ainda em construção.',
  ],
};

export function getMensagemDoDia(profileId: string): string {
  const pool = POOL[profileId] ?? POOL.explorador;
  const inicio = new Date(new Date().getFullYear(), 0, 1).getTime();
  const diaDoAno = Math.floor((Date.now() - inicio) / 86_400_000);
  return pool[diaDoAno % pool.length];
}
