/**
 * "A ordem que protege o seu dinheiro": o caminho ensinado na aba Crescer.
 * Texto educativo, com fatos conferidos em 27/11/2026 (docs/financas/PESQUISA.md).
 * Não é recomendação de investimento: o app não indica produto, instituição nem rentabilidade.
 */
export interface Passo {
  icone: string;
  titulo: string;
  resumo: string;
  pontos: string[];
}

export const PASSOS: Passo[] = [
  {
    icone: 'fin-carteira',
    titulo: '1. Gaste menos do que entra',
    resumo: 'É a regra de ouro. Sem sobra, não há o que guardar.',
    pontos: [
      'Anote o que sai por um mês inteiro. Só de enxergar, muita gente já ajusta sem esforço.',
      'Separe o que é necessidade do que é desejo. O corte mais fácil quase sempre está nos desejos pequenos e repetidos.',
      'Revise as contas fixas uma vez por ano: plano de celular, internet, assinaturas e tarifas de banco.',
    ],
  },
  {
    icone: 'fin-divida',
    titulo: '2. Livre-se da dívida cara',
    resumo: 'Cartão e cheque especial cobram muito mais do que qualquer investimento seguro paga.',
    pontos: [
      'Pagar só o mínimo do cartão joga o resto no rotativo, o crédito mais caro que existe.',
      'Desde janeiro de 2024, os juros do rotativo e do parcelamento da fatura não podem passar de 100% do valor original da dívida. Ajuda, mas dobrar a dívida continua sendo muito.',
      'Você pode levar a dívida para outro banco que cobre menos (portabilidade) ou trocar por um crédito mais barato, como o consignado.',
      'Se as contas não fecham, negocie antes de atrasar. Os mutirões de renegociação e o Procon ajudam de graça.',
    ],
  },
  {
    icone: 'fin-reserva',
    titulo: '3. Monte a reserva de emergência',
    resumo: 'De 3 a 6 meses do seu gasto essencial, num lugar seguro e fácil de resgatar.',
    pontos: [
      'A reserva não é para render muito. É para estar lá no dia do aperto, sem perder valor.',
      'Dois critérios: baixo risco e resgate rápido (no mesmo dia ou no seguinte).',
      'Exemplos do que costuma servir: Tesouro Selic e CDB de liquidez diária. Poupança serve, mas costuma render menos.',
      'Programe uma transferência automática para o dia em que o dinheiro entra. Guardar primeiro, gastar depois.',
    ],
  },
  {
    icone: 'fin-cofre',
    titulo: '4. Dê um destino para cada objetivo',
    resumo: 'Prazo curto pede segurança. Prazo longo aguenta mais sobe e desce.',
    pontos: [
      'Até 2 anos (viagem, curso): mantenha em renda fixa de baixo risco. Não é hora de arriscar.',
      'De 2 a 5 anos (entrada da casa, carro): renda fixa com vencimento perto da data do objetivo.',
      'Mais de 5 anos (aposentadoria, liberdade): dá para ter uma parte em investimentos que oscilam mais, como fundos de índice e ações.',
      'O FGC cobre até R$ 250 mil por CPF em cada instituição (conta, poupança, CDB, LCI, LCA), com teto de R$ 1 milhão a cada 4 anos. Tesouro Direto é garantido pelo governo federal. Ações e fundos não têm essa cobertura.',
    ],
  },
  {
    icone: 'fin-investir',
    titulo: '5. Deixe o tempo trabalhar',
    resumo: 'Juros sobre juros: quem começa cedo e continua, chega mais longe com menos esforço.',
    pontos: [
      'Constância vale mais que valor. Guardar pouco todo mês por anos supera guardar muito de vez em quando.',
      'Olhe o custo: taxa de administração e imposto comem rendimento sem fazer barulho.',
      'Desconfie de ganho alto, rápido e garantido. Isso não existe: é o roteiro de quase todo golpe.',
      'Antes de investir, confira se a empresa é autorizada pelo Banco Central ou pela CVM.',
    ],
  },
  {
    icone: 'fin-extra',
    titulo: '6. Faça a renda crescer',
    resumo: 'Cortar gasto tem limite. Ganhar mais, não.',
    pontos: [
      'Estudar e se especializar costuma ser o investimento que mais paga ao longo da vida.',
      'Uma renda extra pequena, toda destinada ao futuro, muda a conta em poucos anos.',
      'Quando a renda subir, suba primeiro o valor que você guarda. Só depois o padrão de vida.',
    ],
  },
];

export const AVISO_FINANCAS =
  'Conteúdo educativo, baseado em materiais públicos do Banco Central, da CVM e do FGC. Não é recomendação de investimento: o Plim não indica produto, instituição nem promete rendimento. Para uma orientação feita para o seu caso, procure um planejador ou consultor certificado.';

/** Cenários do simulador. São exemplos redondos para comparar, não previsão de rendimento. */
export const TAXAS_DE_EXEMPLO = [0, 6, 10, 14];
