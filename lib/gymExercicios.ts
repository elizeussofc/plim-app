/**
 * Biblioteca de exercícios do Gym Plim: 36 exercícios com o passo a passo completo.
 * O `id` é o nome do arquivo da imagem em assets/gym (posição inicial à esquerda, final à direita).
 *
 * Texto de técnica padrão de musculação. Fontes e limites em docs/gym/PESQUISA.md.
 * Arquivo sem dependências, para ter teste.
 */

export type Grupo = 'pernas' | 'gluteos' | 'peito' | 'costas' | 'ombros' | 'bracos' | 'core' | 'cardio';
/** Onde dá para fazer: na academia (máquinas e barra), só com halteres, ou só com o corpo. */
export type Local = 'academia' | 'halteres' | 'corpo';
export type Cuidado = 'joelho' | 'ombro' | 'coluna';

/** Tipo de movimento. O gerador de treino monta cada dia escolhendo um exercício por movimento. */
export type Movimento =
  | 'agachar' | 'dobrar-quadril' | 'empurrar-pernas' | 'joelho-estender' | 'joelho-flexionar' | 'gluteo' | 'panturrilha'
  | 'empurrar-horizontal' | 'empurrar-vertical' | 'puxar-vertical' | 'puxar-horizontal'
  | 'ombro-lateral' | 'ombro-posterior' | 'peito-isolado' | 'biceps' | 'triceps'
  | 'core-frente' | 'core-lado' | 'core-costas' | 'cardio';

export interface Exercicio {
  id: string;
  nome: string;
  grupo: Grupo;
  movimento: Movimento;
  /** Equipamento mínimo. 'corpo' serve em qualquer lugar; 'halteres' serve em casa e na academia. */
  local: Local;
  /** Exercício grande (várias articulações): vem primeiro no treino e descansa mais. */
  composto: boolean;
  /** 1 = qualquer pessoa, 2 = pede alguma prática, 3 = avançado. */
  nivel: 1 | 2 | 3;
  /** Quem tem esse cuidado recebe outro exercício do mesmo movimento. */
  evitar?: Cuidado[];
  /** Contado em segundos (prancha) em vez de repetições. */
  porTempo?: boolean;
  /** Sem carga para anotar (peso do corpo). */
  semCarga?: boolean;
  musculos: string;
  preparo: string[];
  execucao: string[];
  respiracao: string;
  erros: string[];
  dica: string;
}

export const EXERCICIOS: Exercicio[] = [
  // ───────────────────────── pernas e glúteos ─────────────────────────
  {
    id: 'agachamento-livre', nome: 'Agachamento com o peso do corpo', grupo: 'pernas', movimento: 'agachar', local: 'corpo', composto: true, nivel: 1, semCarga: true,
    musculos: 'Coxas (quadríceps), glúteos e abdômen',
    preparo: ['Fique em pé com os pés na largura dos ombros e as pontas levemente para fora.', 'Estenda os braços à frente para ajudar no equilíbrio.'],
    execucao: ['Empurre o quadril para trás, como quem vai sentar numa cadeira, e dobre os joelhos.', 'Desça até as coxas ficarem paralelas ao chão, com o peito aberto e os calcanhares no chão.', 'Empurre o chão com os pés e suba até ficar em pé, sem travar os joelhos com força.'],
    respiracao: 'Puxe o ar ao descer e solte ao subir.',
    erros: ['Tirar os calcanhares do chão.', 'Deixar os joelhos caírem para dentro: mantenha-os apontando para as pontas dos pés.'],
    dica: 'Se não conseguir descer até o paralelo, coloque uma cadeira atrás e encoste de leve antes de subir.',
  },
  {
    id: 'agachamento-goblet', nome: 'Agachamento goblet (com um halter)', grupo: 'pernas', movimento: 'agachar', local: 'halteres', composto: true, nivel: 1,
    musculos: 'Coxas, glúteos e abdômen',
    preparo: ['Segure um halter na vertical, encostado no peito, com as duas mãos por baixo da cabeça do halter.', 'Pés um pouco mais abertos que os ombros, pontas levemente para fora.'],
    execucao: ['Desça dobrando quadril e joelhos ao mesmo tempo, com o tronco reto.', 'No fundo, os cotovelos passam por dentro dos joelhos.', 'Suba empurrando o chão, mantendo o halter colado no peito.'],
    respiracao: 'Puxe o ar ao descer e solte ao subir.',
    erros: ['Afastar o halter do peito, o que joga o tronco para a frente.', 'Arredondar as costas no fundo do movimento.'],
    dica: 'É o melhor agachamento para aprender: o peso na frente ajuda a manter o tronco reto.',
  },
  {
    id: 'agachamento-barra', nome: 'Agachamento livre com barra', grupo: 'pernas', movimento: 'agachar', local: 'academia', composto: true, nivel: 2, evitar: ['joelho', 'coluna'],
    musculos: 'Coxas, glúteos, lombar e abdômen',
    preparo: ['Ajuste a barra no suporte na altura do peito e entre embaixo dela.', 'Apoie a barra na parte alta das costas (nunca no pescoço) e segure firme, um pouco além dos ombros.', 'Tire a barra do suporte, dê dois passos para trás e posicione os pés na largura dos ombros.'],
    execucao: ['Contraia o abdômen e desça com o quadril para trás e os joelhos acompanhando as pontas dos pés.', 'Desça até as coxas ficarem paralelas ao chão, com as costas retas.', 'Suba empurrando o chão até ficar em pé e só então guarde a barra andando para a frente.'],
    respiracao: 'Encha o peito antes de descer, segure na descida e solte ao passar da parte mais difícil da subida.',
    erros: ['Inclinar demais o tronco e transformar o movimento num "bom dia".', 'Subir primeiro com o quadril e depois com o peito.'],
    dica: 'Use as travas de segurança do suporte na altura certa e comece só com a barra para aprender.',
  },
  {
    id: 'leg-press', nome: 'Leg press 45°', grupo: 'pernas', movimento: 'empurrar-pernas', local: 'academia', composto: true, nivel: 1,
    musculos: 'Coxas e glúteos',
    preparo: ['Sente com as costas e o quadril bem apoiados no encosto.', 'Apoie os pés no meio da plataforma, na largura dos ombros.', 'Empurre um pouco, solte as travas e segure nas alças laterais.'],
    execucao: ['Desça a plataforma devagar até os joelhos formarem cerca de 90 graus.', 'Empurre de volta com o pé inteiro, sem esticar os joelhos até travar.', 'Na última repetição, encaixe as travas antes de tirar os pés.'],
    respiracao: 'Puxe o ar ao descer e solte ao empurrar.',
    erros: ['Descer tanto que o quadril descola do banco e a lombar arredonda.', 'Travar os joelhos com força no fim do movimento.'],
    dica: 'Não empurre os joelhos com as mãos. Se precisar, a carga está alta.',
  },
  {
    id: 'cadeira-extensora', nome: 'Cadeira extensora', grupo: 'pernas', movimento: 'joelho-estender', local: 'academia', composto: false, nivel: 1, evitar: ['joelho'],
    musculos: 'Frente das coxas (quadríceps)',
    preparo: ['Ajuste o encosto para o joelho ficar alinhado com o eixo da máquina.', 'Coloque o rolo logo acima dos pés, na frente das canelas.'],
    execucao: ['Estenda as pernas até quase esticar por completo.', 'Segure um segundo no alto, apertando as coxas.', 'Desça devagar, controlando o peso, sem deixar as placas baterem.'],
    respiracao: 'Solte o ar ao estender e puxe ao descer.',
    erros: ['Dar impulso com o corpo para levantar.', 'Descer deixando o peso cair.'],
    dica: 'Segure nas alças do banco para o quadril não levantar.',
  },
  {
    id: 'mesa-flexora', nome: 'Mesa flexora', grupo: 'pernas', movimento: 'joelho-flexionar', local: 'academia', composto: false, nivel: 1,
    musculos: 'Parte de trás das coxas (posteriores)',
    preparo: ['Deite de barriga para baixo com os joelhos logo depois da borda do banco.', 'Ajuste o rolo para ficar acima dos calcanhares e segure nas alças.'],
    execucao: ['Dobre os joelhos trazendo o rolo em direção aos glúteos.', 'Segure um segundo no alto.', 'Volte devagar até quase esticar as pernas.'],
    respiracao: 'Solte o ar ao dobrar e puxe ao voltar.',
    erros: ['Levantar o quadril do banco para ajudar.', 'Fazer rápido, usando o balanço.'],
    dica: 'Mantenha o quadril pressionado contra o banco do começo ao fim.',
  },
  {
    id: 'terra-romeno', nome: 'Levantamento terra romeno com halteres', grupo: 'gluteos', movimento: 'dobrar-quadril', local: 'halteres', composto: true, nivel: 2, evitar: ['coluna'],
    musculos: 'Posteriores das coxas, glúteos e lombar',
    preparo: ['Fique em pé com um halter em cada mão, na frente das coxas.', 'Pés na largura do quadril e joelhos levemente dobrados.'],
    execucao: ['Empurre o quadril para trás e desça os halteres rente às pernas, com as costas retas.', 'Desça até sentir alongar a parte de trás das coxas, perto do meio das canelas.', 'Volte contraindo os glúteos, levando o quadril para a frente até ficar em pé.'],
    respiracao: 'Puxe o ar ao descer e solte ao subir.',
    erros: ['Arredondar as costas para alcançar mais baixo.', 'Dobrar demais os joelhos e virar um agachamento.'],
    dica: 'O movimento é do quadril, não das costas. Pense em fechar uma porta com o bumbum.',
  },
  {
    id: 'afundo', nome: 'Afundo com halteres', grupo: 'pernas', movimento: 'agachar', local: 'halteres', composto: true, nivel: 2, evitar: ['joelho'],
    musculos: 'Coxas e glúteos, uma perna de cada vez',
    preparo: ['Fique em pé com um halter em cada mão, braços ao lado do corpo.', 'Olhe para a frente e mantenha o tronco reto.'],
    execucao: ['Dê um passo grande à frente e desça até os dois joelhos formarem 90 graus.', 'O joelho de trás chega perto do chão sem bater.', 'Empurre com a perna da frente e volte à posição em pé. Faça todas as repetições e troque de perna.'],
    respiracao: 'Puxe o ar ao descer e solte ao subir.',
    erros: ['Passo curto, que joga o joelho muito à frente do pé.', 'Inclinar o tronco para a frente.'],
    dica: 'Sem equilíbrio no começo? Faça sem peso e ao lado de uma parede.',
  },
  {
    id: 'elevacao-pelvica', nome: 'Elevação pélvica com barra', grupo: 'gluteos', movimento: 'gluteo', local: 'academia', composto: true, nivel: 2,
    musculos: 'Glúteos e posteriores das coxas',
    preparo: ['Sente no chão com a parte alta das costas apoiada na lateral de um banco.', 'Role a barra até o quadril, com uma almofada ou colchonete por baixo.', 'Pés firmes no chão, na largura do quadril, joelhos dobrados.'],
    execucao: ['Empurre o chão com os calcanhares e suba o quadril até o tronco ficar reto, paralelo ao chão.', 'Aperte os glúteos por um segundo no alto.', 'Desça devagar até quase encostar no chão.'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Subir arqueando a lombar em vez de usar o glúteo.', 'Pés longe demais ou perto demais: no alto, a canela deve ficar na vertical.'],
    dica: 'Mantenha o queixo levemente para baixo, olhando para a frente.',
  },
  {
    id: 'ponte-gluteo', nome: 'Ponte de glúteos no chão', grupo: 'gluteos', movimento: 'gluteo', local: 'corpo', composto: false, nivel: 1, semCarga: true,
    musculos: 'Glúteos e posteriores das coxas',
    preparo: ['Deite de barriga para cima com os joelhos dobrados e os pés no chão, na largura do quadril.', 'Braços ao lado do corpo, palmas para baixo.'],
    execucao: ['Empurre o chão com os calcanhares e suba o quadril até joelhos, quadril e ombros formarem uma linha reta.', 'Aperte os glúteos por dois segundos no alto.', 'Desça devagar, sem relaxar de vez no chão.'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Subir demais e arquear a lombar.', 'Empurrar com a ponta dos pés.'],
    dica: 'Ficou fácil? Faça com uma perna só ou com um halter apoiado no quadril.',
  },
  {
    id: 'subida-banco', nome: 'Subida no banco (step-up)', grupo: 'pernas', movimento: 'agachar', local: 'corpo', composto: true, nivel: 1, semCarga: true, evitar: ['joelho'],
    musculos: 'Coxas e glúteos, com equilíbrio',
    preparo: ['Fique de frente para um banco ou degrau firme, na altura da canela.', 'Apoie um pé inteiro em cima do banco.'],
    execucao: ['Empurre com a perna de cima e suba até ficar em pé sobre o banco.', 'Desça devagar, controlando, com a mesma perna trabalhando.', 'Faça todas as repetições de um lado e troque.'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Dar impulso com a perna de baixo.', 'Descer de uma vez, deixando o corpo cair.'],
    dica: 'Confira se o banco não escorrega antes de começar.',
  },
  {
    id: 'panturrilha', nome: 'Panturrilha em pé com halteres', grupo: 'pernas', movimento: 'panturrilha', local: 'halteres', composto: false, nivel: 1,
    musculos: 'Panturrilhas',
    preparo: ['Fique em pé com um halter em cada mão e os pés na largura do quadril.', 'Para aumentar o movimento, apoie a ponta dos pés num degrau baixo.'],
    execucao: ['Suba na ponta dos pés o mais alto que conseguir.', 'Segure um segundo no alto.', 'Desça devagar até os calcanhares voltarem (ou passarem um pouco do degrau).'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Fazer rápido e quicando.', 'Dobrar os joelhos para ajudar.'],
    dica: 'Sem halteres, faça em uma perna só, apoiando a mão na parede.',
  },

  // ───────────────────────── peito ─────────────────────────
  {
    id: 'flexao-joelhos', nome: 'Flexão de braço com joelhos apoiados', grupo: 'peito', movimento: 'empurrar-horizontal', local: 'corpo', composto: true, nivel: 1, semCarga: true,
    musculos: 'Peito, ombros e tríceps',
    preparo: ['Apoie os joelhos no chão e as mãos um pouco além da largura dos ombros.', 'Alinhe cabeça, tronco e coxas numa linha reta.'],
    execucao: ['Dobre os cotovelos e desça o peito até perto do chão.', 'Mantenha os cotovelos a uns 45 graus do corpo.', 'Empurre o chão e suba até esticar os braços.'],
    respiracao: 'Puxe o ar ao descer e solte ao subir.',
    erros: ['Deixar o quadril para cima ou caído.', 'Abrir os cotovelos em linha com os ombros.'],
    dica: 'Quando fizer 12 seguidas com folga, passe para a flexão tradicional.',
  },
  {
    id: 'flexao', nome: 'Flexão de braço', grupo: 'peito', movimento: 'empurrar-horizontal', local: 'corpo', composto: true, nivel: 2, semCarga: true, evitar: ['ombro'],
    musculos: 'Peito, ombros, tríceps e abdômen',
    preparo: ['Apoie as mãos no chão um pouco além dos ombros e estique as pernas, na ponta dos pés.', 'Contraia abdômen e glúteos: o corpo fica reto da cabeça aos calcanhares.'],
    execucao: ['Desça o corpo inteiro de uma vez até o peito ficar perto do chão.', 'Cotovelos a uns 45 graus do corpo.', 'Empurre o chão e volte sem deixar o quadril ficar para trás.'],
    respiracao: 'Puxe o ar ao descer e solte ao subir.',
    erros: ['Quadril caído, com a lombar afundando.', 'Descer só metade do caminho.'],
    dica: 'Difícil demais hoje? Apoie as mãos num banco: quanto mais alto, mais leve.',
  },
  {
    id: 'supino-reto', nome: 'Supino reto com barra', grupo: 'peito', movimento: 'empurrar-horizontal', local: 'academia', composto: true, nivel: 2, evitar: ['ombro'],
    musculos: 'Peito, ombros e tríceps',
    preparo: ['Deite no banco com os olhos embaixo da barra e os pés firmes no chão.', 'Segure a barra um pouco além da largura dos ombros.', 'Junte as escápulas (ombros para trás e para baixo) e tire a barra do suporte.'],
    execucao: ['Desça a barra devagar até tocar de leve o meio do peito.', 'Cotovelos a uns 45 graus do corpo, punhos retos.', 'Empurre a barra para cima e um pouco para trás, até os braços esticarem.'],
    respiracao: 'Puxe o ar ao descer e solte ao empurrar.',
    erros: ['Quicar a barra no peito.', 'Tirar o quadril do banco para empurrar.'],
    dica: 'Com carga alta, peça para alguém acompanhar ou use o suporte com travas de segurança.',
  },
  {
    id: 'supino-inclinado', nome: 'Supino inclinado com halteres', grupo: 'peito', movimento: 'empurrar-horizontal', local: 'halteres', composto: true, nivel: 1,
    musculos: 'Parte alta do peito, ombros e tríceps',
    preparo: ['Regule o banco entre 30 e 45 graus.', 'Sente com um halter em cada coxa e use as pernas para levar os halteres até a altura do peito ao deitar.'],
    execucao: ['Empurre os halteres para cima até esticar os braços, sem bater um no outro.', 'Desça devagar até os halteres ficarem ao lado do peito.', 'Cotovelos a uns 45 graus do corpo o tempo todo.'],
    respiracao: 'Puxe o ar ao descer e solte ao empurrar.',
    erros: ['Banco inclinado demais, que passa o trabalho para o ombro.', 'Descer pouco, sem alongar o peito.'],
    dica: 'Sem banco em casa? Faça deitado no chão: o chão limita a descida e protege o ombro.',
  },
  {
    id: 'peck-deck', nome: 'Crucifixo na máquina (peck deck)', grupo: 'peito', movimento: 'peito-isolado', local: 'academia', composto: false, nivel: 1,
    musculos: 'Peito',
    preparo: ['Ajuste o banco para as alças ficarem na altura do peito.', 'Sente com as costas apoiadas e segure as alças com os cotovelos levemente dobrados.'],
    execucao: ['Feche os braços à frente do peito, como um abraço.', 'Aperte o peito por um segundo.', 'Abra devagar até sentir alongar, sem deixar as placas baterem.'],
    respiracao: 'Solte o ar ao fechar e puxe ao abrir.',
    erros: ['Abrir demais e forçar o ombro para trás.', 'Tirar as costas do encosto.'],
    dica: 'Carga moderada e movimento lento: aqui o que conta é sentir o peito trabalhar.',
  },

  // ───────────────────────── costas ─────────────────────────
  {
    id: 'puxada-alta', nome: 'Puxada alta na polia', grupo: 'costas', movimento: 'puxar-vertical', local: 'academia', composto: true, nivel: 1,
    musculos: 'Costas (dorsais) e bíceps',
    preparo: ['Ajuste o apoio das coxas para o quadril não levantar.', 'Segure a barra um pouco além da largura dos ombros, palmas para a frente.'],
    execucao: ['Incline o tronco levemente para trás e puxe a barra até a parte alta do peito.', 'Leve os cotovelos para baixo e para trás, juntando as escápulas.', 'Volte devagar até esticar os braços.'],
    respiracao: 'Solte o ar ao puxar e puxe o ar ao voltar.',
    erros: ['Puxar a barra atrás da nuca.', 'Balançar o tronco para trás para ganhar impulso.'],
    dica: 'Pense em puxar com os cotovelos, não com as mãos.',
  },
  {
    id: 'barra-fixa', nome: 'Barra fixa', grupo: 'costas', movimento: 'puxar-vertical', local: 'academia', composto: true, nivel: 3, semCarga: true, evitar: ['ombro'],
    musculos: 'Costas, bíceps e abdômen',
    preparo: ['Segure a barra um pouco além da largura dos ombros, palmas para a frente.', 'Pendure-se com os braços esticados e o abdômen contraído.'],
    execucao: ['Puxe o corpo para cima até o queixo passar da barra.', 'Cotovelos descem em direção às costelas.', 'Desça devagar até esticar os braços.'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Balançar as pernas para pegar impulso.', 'Descer só até a metade.'],
    dica: 'Ainda não sobe? Use a máquina de barra assistida ou um elástico, ou faça só a descida bem lenta.',
  },
  {
    id: 'remada-baixa', nome: 'Remada sentada no cabo', grupo: 'costas', movimento: 'puxar-horizontal', local: 'academia', composto: true, nivel: 1,
    musculos: 'Meio das costas e bíceps',
    preparo: ['Sente com os pés nos apoios e os joelhos levemente dobrados.', 'Segure o puxador com os braços esticados e o tronco reto.'],
    execucao: ['Puxe o puxador até a barriga, levando os cotovelos para trás, rente ao corpo.', 'Junte as escápulas por um segundo.', 'Volte devagar até esticar os braços, sem curvar as costas.'],
    respiracao: 'Solte o ar ao puxar e puxe o ar ao voltar.',
    erros: ['Balançar o tronco para a frente e para trás.', 'Encolher os ombros em direção às orelhas.'],
    dica: 'O tronco fica parado: quem se move são os braços e as escápulas.',
  },
  {
    id: 'remada-unilateral', nome: 'Remada unilateral com halter (serrote)', grupo: 'costas', movimento: 'puxar-horizontal', local: 'halteres', composto: true, nivel: 1,
    musculos: 'Costas e bíceps, um lado de cada vez',
    preparo: ['Apoie um joelho e a mão do mesmo lado num banco, com as costas retas e paralelas ao chão.', 'A outra perna fica no chão e a outra mão segura o halter com o braço esticado.'],
    execucao: ['Puxe o halter em direção ao quadril, com o cotovelo rente ao corpo.', 'Suba até o cotovelo passar da linha das costas.', 'Desça devagar até esticar o braço. Faça todas as repetições e troque de lado.'],
    respiracao: 'Solte o ar ao puxar e puxe o ar ao descer.',
    erros: ['Girar o tronco para ajudar a subir o peso.', 'Puxar o halter para o ombro em vez do quadril.'],
    dica: 'Sem banco, apoie a mão numa cadeira firme ou na cama.',
  },
  {
    id: 'remada-curvada', nome: 'Remada curvada com halteres', grupo: 'costas', movimento: 'puxar-horizontal', local: 'halteres', composto: true, nivel: 2, evitar: ['coluna'],
    musculos: 'Costas, bíceps e lombar',
    preparo: ['Em pé, com um halter em cada mão, dobre levemente os joelhos.', 'Incline o tronco para a frente uns 45 graus, com as costas retas.'],
    execucao: ['Puxe os dois halteres em direção à cintura.', 'Junte as escápulas no alto.', 'Desça devagar até esticar os braços, sem mexer o tronco.'],
    respiracao: 'Solte o ar ao puxar e puxe o ar ao descer.',
    erros: ['Arredondar as costas.', 'Ir levantando o tronco a cada repetição.'],
    dica: 'Se a lombar cansar antes das costas, troque pela remada unilateral com apoio.',
  },
  {
    id: 'face-pull', nome: 'Face pull na polia', grupo: 'ombros', movimento: 'ombro-posterior', local: 'academia', composto: false, nivel: 1,
    musculos: 'Parte de trás dos ombros e meio das costas',
    preparo: ['Coloque a corda na polia alta, na altura do rosto.', 'Segure com os polegares apontando para você e dê um passo para trás.'],
    execucao: ['Puxe a corda em direção ao rosto, abrindo as mãos para os lados.', 'Cotovelos altos, na linha dos ombros.', 'Volte devagar até esticar os braços.'],
    respiracao: 'Solte o ar ao puxar e puxe o ar ao voltar.',
    erros: ['Carga alta demais, que faz o corpo balançar.', 'Cotovelos caídos.'],
    dica: 'Ótimo para a postura de quem passa o dia sentado. Carga leve e bem feito.',
  },

  // ───────────────────────── ombros ─────────────────────────
  {
    id: 'desenvolvimento', nome: 'Desenvolvimento com halteres sentado', grupo: 'ombros', movimento: 'empurrar-vertical', local: 'halteres', composto: true, nivel: 1, evitar: ['ombro'],
    musculos: 'Ombros e tríceps',
    preparo: ['Sente num banco com encosto, costas apoiadas.', 'Leve os halteres até a altura dos ombros, cotovelos dobrados e um pouco à frente do corpo.'],
    execucao: ['Empurre os halteres para cima até quase esticar os braços.', 'Não deixe os halteres baterem no alto.', 'Desça devagar até a altura das orelhas.'],
    respiracao: 'Solte o ar ao empurrar e puxe ao descer.',
    erros: ['Arquear a lombar e desencostar do banco.', 'Cotovelos muito abertos para trás.'],
    dica: 'Sem banco com encosto, faça em pé com o abdômen bem contraído.',
  },
  {
    id: 'elevacao-lateral', nome: 'Elevação lateral', grupo: 'ombros', movimento: 'ombro-lateral', local: 'halteres', composto: false, nivel: 1,
    musculos: 'Lateral dos ombros',
    preparo: ['Em pé, com um halter em cada mão ao lado do corpo.', 'Cotovelos levemente dobrados e tronco reto.'],
    execucao: ['Levante os braços para os lados até a altura dos ombros.', 'Os cotovelos sobem junto com as mãos, nunca abaixo delas.', 'Desça devagar, sem deixar cair.'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Subir acima dos ombros encolhendo o pescoço.', 'Balançar o corpo para dar impulso.'],
    dica: 'Aqui a carga é baixa mesmo. Se precisa balançar, diminua o peso.',
  },

  // ───────────────────────── braços ─────────────────────────
  {
    id: 'rosca-direta', nome: 'Rosca direta com halteres', grupo: 'bracos', movimento: 'biceps', local: 'halteres', composto: false, nivel: 1,
    musculos: 'Bíceps',
    preparo: ['Em pé, com um halter em cada mão e as palmas viradas para a frente.', 'Cotovelos colados ao lado do corpo.'],
    execucao: ['Dobre os cotovelos e suba os halteres até perto dos ombros.', 'Aperte o bíceps por um segundo no alto.', 'Desça devagar até esticar os braços.'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Jogar os cotovelos para a frente.', 'Balançar o tronco para trás.'],
    dica: 'Encoste as costas numa parede se o corpo teimar em balançar.',
  },
  {
    id: 'rosca-martelo', nome: 'Rosca martelo', grupo: 'bracos', movimento: 'biceps', local: 'halteres', composto: false, nivel: 1,
    musculos: 'Bíceps e antebraços',
    preparo: ['Em pé, com um halter em cada mão e as palmas viradas uma para a outra.', 'Cotovelos colados ao corpo.'],
    execucao: ['Suba os halteres mantendo o polegar apontado para cima.', 'Pare perto dos ombros.', 'Desça devagar até esticar os braços.'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Girar o punho no meio do movimento.', 'Usar impulso do corpo.'],
    dica: 'Pode alternar os braços se preferir manter o tronco mais firme.',
  },
  {
    id: 'triceps-corda', nome: 'Tríceps na polia com corda', grupo: 'bracos', movimento: 'triceps', local: 'academia', composto: false, nivel: 1,
    musculos: 'Tríceps',
    preparo: ['Prenda a corda na polia alta e segure com as palmas viradas uma para a outra.', 'Cotovelos dobrados a 90 graus e colados ao corpo, tronco levemente inclinado.'],
    execucao: ['Empurre a corda para baixo até esticar os braços.', 'No fim, abra as mãos para os lados.', 'Volte devagar até os 90 graus, sem deixar os cotovelos subirem.'],
    respiracao: 'Solte o ar ao empurrar e puxe ao voltar.',
    erros: ['Abrir os cotovelos para os lados.', 'Usar o peso do corpo para empurrar.'],
    dica: 'Só o antebraço se move. Se o ombro mexe, a carga está alta.',
  },
  {
    id: 'triceps-banco', nome: 'Tríceps no banco (mergulho)', grupo: 'bracos', movimento: 'triceps', local: 'corpo', composto: false, nivel: 2, semCarga: true, evitar: ['ombro'],
    musculos: 'Tríceps e ombros',
    preparo: ['Sente na beira de um banco firme e apoie as mãos ao lado do quadril, dedos para a frente.', 'Tire o quadril do banco e estique as pernas, com os calcanhares no chão.'],
    execucao: ['Dobre os cotovelos e desça o quadril rente ao banco.', 'Desça até os cotovelos formarem cerca de 90 graus.', 'Empurre e suba até esticar os braços.'],
    respiracao: 'Puxe o ar ao descer e solte ao subir.',
    erros: ['Descer além dos 90 graus, o que força o ombro.', 'Afastar o quadril do banco.'],
    dica: 'Para deixar mais leve, dobre os joelhos e aproxime os pés.',
  },

  // ───────────────────────── abdômen e centro do corpo ─────────────────────────
  {
    id: 'prancha', nome: 'Prancha', grupo: 'core', movimento: 'core-frente', local: 'corpo', composto: false, nivel: 1, porTempo: true, semCarga: true,
    musculos: 'Abdômen, lombar e ombros',
    preparo: ['Apoie os antebraços no chão, com os cotovelos embaixo dos ombros.', 'Estique as pernas e apoie na ponta dos pés.'],
    execucao: ['Suba o corpo e fique reto da cabeça aos calcanhares.', 'Contraia abdômen e glúteos e olhe para o chão.', 'Segure a posição pelo tempo da série, respirando normalmente.'],
    respiracao: 'Respire curto e constante. Não prenda o ar.',
    erros: ['Quadril caído, afundando a lombar.', 'Quadril para cima, formando uma montanha.'],
    dica: 'Perdeu a linha reta? A série acabou. Melhor 20 segundos bem feitos que 60 tortos.',
  },
  {
    id: 'abdominal', nome: 'Abdominal curto', grupo: 'core', movimento: 'core-frente', local: 'corpo', composto: false, nivel: 1, semCarga: true,
    musculos: 'Abdômen',
    preparo: ['Deite de barriga para cima com os joelhos dobrados e os pés no chão.', 'Mãos ao lado da cabeça, sem entrelaçar os dedos na nuca.'],
    execucao: ['Tire os ombros do chão, aproximando as costelas do quadril.', 'A lombar continua no chão.', 'Desça devagar, sem relaxar de vez.'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Puxar a cabeça com as mãos.', 'Subir o tronco inteiro com impulso.'],
    dica: 'Olhe para o teto e imagine uma laranja entre o queixo e o peito.',
  },
  {
    id: 'elevacao-pernas', nome: 'Elevação de pernas deitado', grupo: 'core', movimento: 'core-frente', local: 'corpo', composto: false, nivel: 2, semCarga: true, evitar: ['coluna'],
    musculos: 'Parte baixa do abdômen',
    preparo: ['Deite de barriga para cima com as pernas esticadas.', 'Mãos ao lado do corpo ou embaixo do quadril, lombar pressionada no chão.'],
    execucao: ['Suba as pernas juntas até ficarem na vertical.', 'Desça devagar, sem deixar a lombar descolar do chão.', 'Pare um pouco antes de os pés tocarem o chão e suba de novo.'],
    respiracao: 'Solte o ar ao subir e puxe ao descer.',
    erros: ['Lombar arqueando na descida.', 'Descer rápido, usando o balanço.'],
    dica: 'A lombar descolou? Dobre os joelhos ou desça só até onde ela aguenta colada.',
  },
  {
    id: 'prancha-lateral', nome: 'Prancha lateral', grupo: 'core', movimento: 'core-lado', local: 'corpo', composto: false, nivel: 1, porTempo: true, semCarga: true,
    musculos: 'Lateral do abdômen e quadril',
    preparo: ['Deite de lado com o antebraço no chão e o cotovelo embaixo do ombro.', 'Pernas esticadas, um pé sobre o outro.'],
    execucao: ['Suba o quadril até o corpo formar uma linha reta.', 'Segure a posição pelo tempo da série.', 'Desça, troque de lado e repita.'],
    respiracao: 'Respire normalmente, sem prender o ar.',
    erros: ['Quadril caindo em direção ao chão.', 'Girar o tronco para a frente.'],
    dica: 'Para facilitar, apoie o joelho de baixo no chão.',
  },
  {
    id: 'perdigueiro', nome: 'Perdigueiro (bird dog)', grupo: 'core', movimento: 'core-costas', local: 'corpo', composto: false, nivel: 1, semCarga: true,
    musculos: 'Lombar, glúteos e abdômen, com equilíbrio',
    preparo: ['Fique de quatro apoios: mãos embaixo dos ombros e joelhos embaixo do quadril.', 'Costas retas, olhando para o chão.'],
    execucao: ['Estique um braço à frente e a perna oposta para trás, na altura do tronco.', 'Segure dois segundos sem deixar o quadril girar.', 'Volte e troque de lado. Cada troca conta uma repetição.'],
    respiracao: 'Solte o ar ao esticar e puxe ao voltar.',
    erros: ['Levantar a perna alto demais e arquear a lombar.', 'Fazer com pressa.'],
    dica: 'Imagine um copo de água nas costas que não pode derramar.',
  },

  // ───────────────────────── aquecimento e cardio ─────────────────────────
  {
    id: 'polichinelo', nome: 'Polichinelo', grupo: 'cardio', movimento: 'cardio', local: 'corpo', composto: false, nivel: 1, porTempo: true, semCarga: true, evitar: ['joelho'],
    musculos: 'Corpo inteiro, para aquecer',
    preparo: ['Fique em pé com os pés juntos e os braços ao lado do corpo.'],
    execucao: ['Salte abrindo as pernas e levando as mãos acima da cabeça.', 'Salte de novo e volte à posição inicial.', 'Mantenha um ritmo que ainda deixe você falar.'],
    respiracao: 'Respire de forma ritmada, sem prender o ar.',
    erros: ['Cair com o pé inteiro e os joelhos esticados.', 'Ritmo forte demais no aquecimento.'],
    dica: 'Sem impacto: em vez de saltar, dê um passo para o lado de cada vez.',
  },
  {
    id: 'esteira', nome: 'Caminhada na esteira', grupo: 'cardio', movimento: 'cardio', local: 'academia', composto: false, nivel: 1, porTempo: true, semCarga: true,
    musculos: 'Coração, pulmões e pernas',
    preparo: ['Suba na esteira com os pés nas laterais e ligue em velocidade baixa.', 'Prenda a trava de segurança na roupa.'],
    execucao: ['Comece a andar e aumente a velocidade até um passo firme.', 'Postura reta, braços balançando soltos.', 'No fim, diminua a velocidade aos poucos antes de parar.'],
    respiracao: 'Ritmo em que dá para conversar, mas não para cantar.',
    erros: ['Segurar no apoio o tempo todo e inclinar o corpo.', 'Passos longos demais.'],
    dica: 'Para deixar mais difícil sem correr, suba a inclinação.',
  },
];

export const EXERCICIO_POR_ID: Record<string, Exercicio> = Object.fromEntries(EXERCICIOS.map((e) => [e.id, e]));

export const NOME_GRUPO: Record<Grupo, string> = {
  pernas: 'Pernas', gluteos: 'Glúteos', peito: 'Peito', costas: 'Costas',
  ombros: 'Ombros', bracos: 'Braços', core: 'Abdômen', cardio: 'Aquecimento',
};
