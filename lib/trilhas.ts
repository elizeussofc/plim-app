/**
 * Trilhas: missões cronometradas por área da vida, que crescem ou encolhem com a pessoa.
 *
 * Como funciona:
 *  - a pessoa escolhe as áreas que fazem parte do dia dela (estudo, casa, corpo...);
 *  - cada trilha tem um nível de 1 a 10, e o nível decide o tamanho das missões
 *    (ler 4 páginas no nível 1, 22 no nível 10);
 *  - a pessoa escolhe em quanto tempo faz a missão e o relógio corre;
 *  - cumpriu no tempo: a trilha sobe um nível. Não deu: desce um, e a próxima vem menor.
 *
 * Arquivo sem dependências, para ter teste (tests/regras.test.mjs).
 */

export type AreaId = 'estudo' | 'casa' | 'corpo' | 'trabalho' | 'mente' | 'dinheiro' | 'filhos' | 'pet';

export interface Area {
  id: AreaId;
  nome: string;
  desc: string;
  /** Nome do ícone de massinha (components/Icone). */
  icone: string;
  tinta: 'roxo' | 'laranja' | 'verde' | 'azul' | 'rosa' | 'ouro';
}

export const AREAS: Area[] = [
  { id: 'estudo',   nome: 'Estudo',   desc: 'Ler, revisar, praticar',        icone: 'trilha-estudo',  tinta: 'roxo' },
  { id: 'casa',     nome: 'Casa',     desc: 'Arrumar, limpar, organizar',    icone: 'trilha-casa',    tinta: 'laranja' },
  { id: 'corpo',    nome: 'Corpo',    desc: 'Mexer, comer bem, descansar',   icone: 'trilha-corpo',   tinta: 'verde' },
  { id: 'trabalho', nome: 'Trabalho', desc: 'Destravar o que está parado',   icone: 'trilha-trabalho',    tinta: 'azul' },
  { id: 'mente',    nome: 'Mente',    desc: 'Desacelerar e respirar',        icone: 'trilha-mente',   tinta: 'rosa' },
  { id: 'dinheiro', nome: 'Dinheiro', desc: 'Saber para onde ele vai',       icone: 'trilha-dinheiro', tinta: 'ouro' },
  { id: 'filhos',   nome: 'Filhos',   desc: 'Para mamães e papais',          icone: 'trilha-filhos',   tinta: 'rosa' },
  { id: 'pet',      nome: 'Pet',      desc: 'Para quem cuida de um bichinho', icone: 'trilha-pet',     tinta: 'verde' },
];

export const NIVEL_MIN = 1;
export const NIVEL_MAX = 10;
/** No plano grátis as trilhas vão até este nível; do 6 ao 10 é do Pro. */
export const NIVEL_MAX_GRATIS = 5;
/** No plano grátis a pessoa segue até este número de trilhas ao mesmo tempo. */
export const TRILHAS_GRATIS = 2;

export interface Missao {
  id: string;
  area: AreaId;
  titulo: string;
  /** Tempo sugerido, em minutos. A pessoa pode mudar antes de começar. */
  minutos: number;
  /** Missão criada pela própria pessoa. */
  propria?: boolean;
}

export interface MissaoPropria {
  id: string;
  titulo: string;
  minutos: number;
}

interface Modelo {
  id: string;
  /** Níveis em que a missão aparece: [de, até]. */
  niveis: [number, number];
  titulo: (n: number) => string;
  minutos: (n: number) => number;
}

const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const chao = Math.floor;

const MODELOS: Record<AreaId, Modelo[]> = {
  estudo: [
    { id: 'ler',        niveis: [1, 10], titulo: (n) => `Ler ${2 + n * 2} páginas de um livro`,                    minutos: (n) => 5 + n * 2 },
    { id: 'revisar',    niveis: [1, 10], titulo: (n) => `Revisar suas anotações por ${5 + n * 2} minutos`,         minutos: (n) => 5 + n * 2 },
    { id: 'questoes',   niveis: [1, 10], titulo: (n) => `Resolver ${pl(1 + n, 'questão', 'questões')}`,            minutos: (n) => 6 + n * 3 },
    { id: 'resumo',     niveis: [2, 10], titulo: (n) => `Escrever um resumo de ${3 + n} linhas do que estudou`,    minutos: (n) => 5 + n * 2 },
    { id: 'aula',       niveis: [3, 10], titulo: (n) => `Assistir a uma aula e anotar ${2 + chao(n / 3)} ideias`,  minutos: (n) => 10 + n * 3 },
    { id: 'idioma',     niveis: [1, 10], titulo: (n) => `Praticar um idioma por ${4 + n * 2} minutos`,             minutos: (n) => 4 + n * 2 },
  ],
  casa: [
    { id: 'cama',       niveis: [1, 3],  titulo: () => 'Arrumar a cama',                                           minutos: () => 3 },
    { id: 'lixo',       niveis: [1, 5],  titulo: () => 'Recolher e levar o lixo para fora',                        minutos: () => 5 },
    { id: 'superficie', niveis: [1, 6],  titulo: (n) => `Deixar ${pl(1 + chao(n / 3), 'superfície livre', 'superfícies livres')} (mesa, pia ou bancada)`, minutos: (n) => 4 + n * 2 },
    { id: 'louca',      niveis: [1, 10], titulo: () => 'Lavar toda a louça da pia',                                minutos: (n) => 8 + n },
    { id: 'roupa',      niveis: [2, 10], titulo: (n) => `Dobrar e guardar ${5 + n * 3} peças de roupa`,            minutos: (n) => 5 + n * 2 },
    { id: 'gaveta',     niveis: [3, 10], titulo: () => 'Organizar uma gaveta ou prateleira',                       minutos: (n) => 8 + n },
    { id: 'comodo',     niveis: [4, 8],  titulo: (n) => `Limpar ${pl(n >= 7 ? 2 : 1, 'cômodo', 'cômodos')} da casa`, minutos: (n) => (n >= 7 ? 35 : 20) },
    { id: 'faxina',     niveis: [9, 10], titulo: () => 'Faxina geral: limpar a casa inteira',                      minutos: (n) => 50 + (n - 9) * 15 },
  ],
  corpo: [
    { id: 'agua',       niveis: [1, 3],  titulo: () => 'Beber um copo cheio de água',                              minutos: () => 2 },
    { id: 'alongar',    niveis: [1, 10], titulo: (n) => `Alongar o corpo por ${2 + n} minutos`,                    minutos: (n) => 2 + n },
    { id: 'caminhar',   niveis: [1, 10], titulo: (n) => `Caminhar por ${5 + n * 3} minutos`,                       minutos: (n) => 5 + n * 3 },
    { id: 'series',     niveis: [3, 10], titulo: (n) => `Fazer ${pl(1 + chao(n / 2), 'série', 'séries')} de um exercício`, minutos: (n) => 4 + n * 2 },
    { id: 'refeicao',   niveis: [4, 10], titulo: () => 'Preparar uma refeição de verdade',                         minutos: (n) => 18 + n },
    { id: 'quarto',     niveis: [1, 10], titulo: () => 'Preparar o quarto para dormir: luz baixa e celular longe', minutos: () => 5 },
  ],
  trabalho: [
    { id: 'mensagens',  niveis: [1, 10], titulo: (n) => `Responder ${pl(1 + n, 'mensagem parada', 'mensagens paradas')}`, minutos: (n) => 4 + n * 2 },
    { id: 'chata',      niveis: [1, 10], titulo: (n) => `Avançar na tarefa mais chata por ${5 + n * 3} minutos`,   minutos: (n) => 5 + n * 3 },
    { id: 'prioridades', niveis: [1, 10], titulo: () => 'Escrever as 3 prioridades de amanhã',                     minutos: () => 5 },
    { id: 'mesa',       niveis: [1, 6],  titulo: () => 'Organizar a mesa de trabalho',                             minutos: () => 7 },
    { id: 'bloco',      niveis: [4, 10], titulo: (n) => `Trabalhar ${10 + n * 4} minutos sem pegar no celular`,    minutos: (n) => 10 + n * 4 },
  ],
  mente: [
    { id: 'respirar',   niveis: [1, 10], titulo: (n) => `Respirar fundo por ${pl(1 + chao(n / 2), 'minuto', 'minutos')}`, minutos: (n) => 1 + chao(n / 2) },
    { id: 'certo',      niveis: [1, 10], titulo: (n) => `Escrever ${pl(1 + chao(n / 3), 'coisa que deu', 'coisas que deram')} certo hoje`, minutos: () => 4 },
    { id: 'semtela',    niveis: [1, 10], titulo: (n) => `Ficar ${5 + n * 3} minutos longe do celular`,             minutos: (n) => 5 + n * 3 },
    { id: 'despejo',    niveis: [1, 10], titulo: () => 'Fazer um despejo mental: tudo o que está na cabeça',       minutos: () => 5 },
    { id: 'prazer',     niveis: [2, 10], titulo: (n) => `Fazer algo só porque você gosta, por ${8 + n * 2} minutos`, minutos: (n) => 8 + n * 2 },
  ],
  dinheiro: [
    { id: 'gastos',     niveis: [1, 10], titulo: () => 'Anotar os gastos de hoje',                                 minutos: () => 5 },
    { id: 'boleto',     niveis: [1, 10], titulo: (n) => `Conferir ${pl(1 + chao(n / 4), 'conta ou boleto', 'contas ou boletos')} a pagar`, minutos: (n) => 4 + n },
    { id: 'extrato',    niveis: [3, 10], titulo: () => 'Olhar o extrato da semana com calma',                      minutos: () => 8 },
    { id: 'assinatura', niveis: [4, 10], titulo: () => 'Rever uma assinatura que você quase não usa',              minutos: () => 10 },
    { id: 'controle',   niveis: [5, 10], titulo: () => 'Atualizar o seu controle do mês',                          minutos: (n) => 10 + n },
  ],
  filhos: [
    { id: 'brincar',    niveis: [1, 10], titulo: (n) => `Brincar ${5 + n * 2} minutos sem celular por perto`,      minutos: (n) => 5 + n * 2 },
    { id: 'historia',   niveis: [1, 10], titulo: () => 'Ler uma história juntos',                                  minutos: (n) => 6 + n },
    { id: 'mochila',    niveis: [1, 10], titulo: () => 'Deixar mochila e roupa de amanhã prontas',                 minutos: () => 8 },
    { id: 'lanche',     niveis: [2, 10], titulo: () => 'Preparar o lanche de amanhã',                              minutos: () => 10 },
    { id: 'brinquedos', niveis: [1, 10], titulo: (n) => `Guardar os brinquedos juntos (${5 + n} minutos)`,         minutos: (n) => 5 + n },
    { id: 'conversa',   niveis: [3, 10], titulo: (n) => `Conversar ${5 + n} minutos sobre o dia dele ou dela`,     minutos: (n) => 5 + n },
    { id: 'respiro',    niveis: [1, 10], titulo: (n) => `Um respiro só seu: ${3 + n} minutos sem ninguém pedindo nada`, minutos: (n) => 3 + n },
    { id: 'passeio',    niveis: [5, 10], titulo: (n) => `Passear ao ar livre juntos por ${10 + n * 3} minutos`,    minutos: (n) => 10 + n * 3 },
  ],
  pet: [
    { id: 'agua',       niveis: [1, 10], titulo: () => 'Trocar a água e conferir a ração',                         minutos: () => 4 },
    { id: 'brincar',    niveis: [1, 10], titulo: (n) => `Brincar com seu pet por ${4 + n * 2} minutos`,            minutos: (n) => 4 + n * 2 },
    { id: 'passear',    niveis: [1, 10], titulo: (n) => `Passear por ${6 + n * 3} minutos`,                        minutos: (n) => 6 + n * 3 },
    { id: 'cantinho',   niveis: [2, 10], titulo: () => 'Limpar o cantinho dele (caixa de areia, tapete ou caminha)', minutos: (n) => 6 + n },
    { id: 'escovar',    niveis: [3, 10], titulo: () => 'Escovar o pelo com calma',                                 minutos: (n) => 5 + n },
    { id: 'truque',     niveis: [4, 10], titulo: (n) => `Treinar um comando ou truque por ${4 + n} minutos`,       minutos: (n) => 4 + n },
    { id: 'saude',      niveis: [5, 10], titulo: () => 'Conferir vacinas, remédio e data do banho',                minutos: () => 8 },
  ],
};

export const limitarNivel = (n: number) => Math.max(NIVEL_MIN, Math.min(NIVEL_MAX, Math.round(n)));

/**
 * As missões de uma trilha num nível: três do catálogo (mudam conforme o nível) e,
 * antes delas, as que a própria pessoa criou.
 * `fator` encurta o tempo sugerido para quem trava para começar (ver fatorDeTempo).
 */
export function missoesDoNivel(area: AreaId, nivel: number, proprias: MissaoPropria[] = [], fator = 1): Missao[] {
  const n = limitarNivel(nivel);
  const cabem = MODELOS[area].filter((m) => n >= m.niveis[0] && n <= m.niveis[1]);
  const escolhidas: Modelo[] = [];
  for (let i = 0; i < cabem.length && escolhidas.length < 3; i++) {
    escolhidas.push(cabem[(n + i) % cabem.length]);
  }
  return [
    ...proprias.map((p) => ({ id: p.id, area, titulo: p.titulo, minutos: p.minutos, propria: true })),
    ...escolhidas.map((m) => ({ id: `${area}:${m.id}`, area, titulo: m.titulo(n), minutos: Math.max(1, Math.round(m.minutos(n) * fator)) })),
  ];
}

export interface Resultado {
  sucesso: boolean;
  nivelAntes: number;
  nivelDepois: number;
  xp: number;
  moedas: number;
  /** Cumpriu a missão no último nível do plano grátis: a trilha continua no Pro. */
  bateuNoTeto: boolean;
}

/**
 * Cumpriu: sobe um nível e ganha XP. Não deu: desce um nível (a próxima vem menor) e leva
 * um XP de consolo. `teto` é o nível máximo do plano da pessoa: quem chega nele continua
 * ganhando XP, mas não sobe (bateuNoTeto avisa a tela para oferecer o Pro).
 */
export function resultadoDaMissao(nivel: number, sucesso: boolean, teto: number = NIVEL_MAX): Resultado {
  const antes = limitarNivel(nivel);
  if (!sucesso) return { sucesso, nivelAntes: antes, nivelDepois: limitarNivel(antes - 1), xp: 3, moedas: 0, bateuNoTeto: false };
  const limite = Math.max(antes, Math.min(NIVEL_MAX, teto));
  const depois = Math.min(limite, antes + 1);
  return { sucesso, nivelAntes: antes, nivelDepois: depois, xp: 15 + antes * 5, moedas: 5 + antes * 2, bateuNoTeto: depois === antes && antes < NIVEL_MAX };
}

export type Ritmo = 'zero' | 'as_vezes' | 'sempre';

export const RITMOS: { id: Ritmo; rotulo: string; desc: string; nivel: number }[] = [
  { id: 'zero',     rotulo: 'Começando do zero', desc: 'Missões bem pequenas',    nivel: 1 },
  { id: 'as_vezes', rotulo: 'Faço às vezes',     desc: 'Missões de tamanho médio', nivel: 3 },
  { id: 'sempre',   rotulo: 'Já é hábito',       desc: 'Missões maiores',          nivel: 5 },
];

export interface PerfilParaTrilha {
  desafios?: string[];
  objetivo?: string | null;
}

const PALAVRAS: [AreaId, RegExp][] = [
  ['estudo',   /estud|prova|concurso|faculdade|curso|vestib|enem|ler |livro|idioma|ingl/i],
  ['trabalho', /trabalh|projeto|cliente|emprego|carreira|negóc|negoc|empresa/i],
  ['casa',     /casa|limp|organiz|arrum|faxin|bagun/i],
  ['corpo',    /saúde|saude|exerc|academia|emagrec|dorm|sono|treino|corr|aliment/i],
  ['mente',    /ansied|calma|mente|terapia|estress|medit/i],
  ['dinheiro', /dinheiro|financ|dívida|divida|guardar|econom|conta/i],
  ['filhos',   /filh|criança|crianca|bebê|bebe|mãe|mae |pai |matern|patern/i],
  ['pet',      /pet|cachorr|gato|bicho/i],
];

/**
 * Áreas sugeridas para a pessoa, pelo que ela contou nas boas-vindas
 * (o objetivo escrito e o que mais trava o dia dela). Sempre devolve pelo menos duas.
 */
export function sugerirAreas(perfil: PerfilParaTrilha): AreaId[] {
  const areas: AreaId[] = [];
  const pôr = (a: AreaId) => { if (!areas.includes(a)) areas.push(a); };
  const objetivo = perfil.objetivo ?? '';
  for (const [area, padrao] of PALAVRAS) if (padrao.test(objetivo)) pôr(area);
  const d = perfil.desafios ?? [];
  if (d.includes('sobrecarga') || d.includes('ansiedade')) pôr('mente');
  if (d.includes('esquecimento')) pôr('casa');
  if (d.includes('procrastinacao') || d.includes('nao_termino')) pôr('trabalho');
  if (d.includes('hiperfoco')) pôr('corpo');
  for (const padrao of ['casa', 'corpo'] as AreaId[]) if (areas.length < 2) pôr(padrao);
  return areas.slice(0, 3);
}

/** Quem trava para começar ou não termina recebe missões com tempo sugerido menor. */
export function fatorDeTempo(desafios: string[] = []): number {
  return desafios.some((x) => x === 'procrastinacao' || x === 'nao_termino' || x === 'ansiedade') ? 0.8 : 1;
}

/** Opções de tempo oferecidas antes de começar: mais curto, o sugerido e mais folgado. */
export function opcoesDeTempo(sugerido: number): number[] {
  const s = Math.max(1, Math.round(sugerido));
  const curto = Math.max(1, Math.round(s * 0.6));
  const folgado = Math.max(s + 1, Math.round(s * 1.5));
  return [...new Set([curto, s, folgado])];
}
