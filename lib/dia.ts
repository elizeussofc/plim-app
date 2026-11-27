/**
 * Datas do dia a dia no fuso do aparelho.
 * Antes o app usava a data em UTC (toISOString), e no Brasil o "dia" virava às 21h:
 * uma tarefa feita à noite caía no dia seguinte.
 */

const dois = (n: number) => String(n).padStart(2, '0');

/** 'AAAA-MM-DD' de uma data, no fuso do aparelho. */
export function dataLocal(d: Date): string {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/** 'AAAA-MM-DD' de hoje, no fuso do aparelho. */
export function hojeLocal(): string {
  return dataLocal(new Date());
}

/** A data `dias` dias antes de `base` ('AAAA-MM-DD'). */
export function diasAntes(base: string, dias: number): string {
  const [a, m, d] = base.split('-').map(Number);
  return dataLocal(new Date(a, m - 1, d - dias));
}

/**
 * Sequência de dias ativos. Um dia conta quando teve pelo menos uma tarefa feita
 * ('parcial' ou 'completa'). Hoje ainda sem nada não quebra a sequência: ela vale até ontem.
 */
export function sequenciaDeDias(historico: Record<string, string>, hoje: string = hojeLocal()): number {
  const ativo = (dia: string) => historico[dia] === 'parcial' || historico[dia] === 'completa';
  let cursor = ativo(hoje) ? hoje : diasAntes(hoje, 1);
  let n = 0;
  while (ativo(cursor) && n < 3650) {
    n += 1;
    cursor = diasAntes(cursor, 1);
  }
  return n;
}
