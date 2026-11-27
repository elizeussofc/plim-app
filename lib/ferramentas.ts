/**
 * As ferramentas do Plim num lugar só: nome, ícone, cor e se fazem parte do Pro.
 * Início, aba Plim e Perfil usam esta lista, então a regra do Pro é a mesma em todo lugar
 * (antes o atalho do Início abria o Plim IA sem passar pela assinatura).
 */
import { useRouter } from 'expo-router';
import { type NomeIcone } from '@/components/Icone';
import { type TINTA } from '@/lib/theme';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';

export interface Ferramenta {
  rota: string;
  icone: NomeIcone;
  titulo: string;
  desc: string;
  tinta: keyof typeof TINTA;
  pro: boolean;
}

export const FERRAMENTAS = {
  trilhas:   { rota: '/trilhas',        icone: 'placa',    titulo: 'Trilhas',        desc: 'Missões com relógio, do seu tamanho.',          tinta: 'laranja', pro: false },
  despejo:   { rota: '/despejo-mental', icone: 'cerebro',  titulo: 'Despejo Mental', desc: 'Tire da cabeça o que está pesando. Sem filtro.', tinta: 'rosa',    pro: false },
  foco:      { rota: '/sessao-foco',    icone: 'alvo',     titulo: 'Sessão de Foco', desc: 'Um cronômetro e uma coisa só. Cada minuto conta.', tinta: 'laranja', pro: false },
  calma:     { rota: '/modo-calma',     icone: 'lotus',    titulo: 'Modo Calma',     desc: 'Respire junto com o círculo e desacelere.',    tinta: 'verde',   pro: false },
  ia:        { rota: '/ia-tdah',        icone: 'robo',     titulo: 'Plim IA',        desc: 'Um assistente que entende TDAH.',               tinta: 'azul',    pro: true  },
  medicacao: { rota: '/medicacao',      icone: 'pilula',   titulo: 'Medicação',      desc: 'Lembretes e registro',                          tinta: 'rosa',    pro: false },
  historico: { rota: '/historico',      icone: 'grafico',  titulo: 'Histórico',      desc: 'Seus últimos 35 dias',                          tinta: 'roxo',    pro: false },
  parceiro:  { rota: '/parceiro',       icone: 'parceria', titulo: 'Parceiro',       desc: 'Alguém acompanha você',                         tinta: 'azul',    pro: true  },
  ranking:   { rota: '/ranking',        icone: 'trofeu',   titulo: 'Ranking',        desc: 'Pontos da semana',                              tinta: 'ouro',    pro: false },
} as const satisfies Record<string, Ferramenta>;

/** Abre uma ferramenta; se ela é do Pro e a pessoa não assina, mostra a assinatura. */
export function useAbrirFerramenta() {
  const router = useRouter();
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  return (f: Ferramenta) => {
    if (f.pro && !ehPro) abrirPaywall(f.titulo);
    else router.push(f.rota as never);
  };
}
