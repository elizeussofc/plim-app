/**
 * Comemorações: um lugar só que percebe nível novo, conquista, desafio e rotina completa
 * e responde com aviso na tela, som e a fala do avatar.
 *
 * Fica olhando os armazenamentos em vez de cada tela chamar: assim nada escapa (antes as
 * conquistas eram liberadas em silêncio) e, quando um toque só dispara várias coisas de uma
 * vez, sai um aviso e um som, não quatro.
 */
import { useEffect } from 'react';
import { avisar } from '@/lib/avisar';
import { calcularStatusDia } from '@/lib/rotinaDia';
import { configurarSons, somArpejo, somConquista, somNivel } from '@/lib/sons';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { dizer, useFalaStore } from '@/stores/falaStore';
import { useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';

type Tipo = 'nivel' | 'rotina' | 'conquista' | 'desafio';
interface Evento { tipo: Tipo; titulo: string; texto?: string }

const ORDEM: Tipo[] = ['nivel', 'rotina', 'conquista', 'desafio'];
let fila: Evento[] = [];
let relogio: ReturnType<typeof setTimeout> | null = null;

function agendar(evento: Evento) {
  fila.push(evento);
  if (!relogio) relogio = setTimeout(disparar, 140);
}

function disparar() {
  relogio = null;
  const eventos = [...fila].sort((a, b) => ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo));
  fila = [];
  const principal = eventos[0];
  if (!principal) return;
  const resto = eventos.slice(1).map((e) => e.titulo);
  avisar(principal.titulo, [principal.texto, ...resto].filter(Boolean).join(' · ') || undefined);

  if (principal.tipo === 'nivel') somNivel();
  else if (principal.tipo === 'conquista') somConquista();
  else somArpejo();

  if (principal.tipo === 'nivel') dizer('nivel');
  else if (principal.tipo === 'rotina') dizer('rotina_completa');
  else if (principal.tipo === 'conquista') dizer('conquista');
  else dizer('desafio');
}

/** Liga as comemorações enquanto o app está aberto. Chamado uma vez, no layout raiz. */
export function useCelebracoes() {
  useEffect(() => {
    // Nos primeiros instantes o app está lendo o que estava salvo (nível, conquistas...):
    // isso não é novidade para comemorar.
    let ativo = false;
    const espera = setTimeout(() => { ativo = true; }, 1600);

    const aplicarPreferencias = () => {
      const p = useUserStore.getState().profile.preferencias;
      const baixoEstimulo = p?.modo_baixo_estimulo === true;
      configurarSons({ ligado: p?.sons !== false && !baixoEstimulo });
      useFalaStore.getState().configurar(p?.falas !== false);
    };
    aplicarPreferencias();

    const pararUsuario = useUserStore.subscribe((estado, antes) => {
      aplicarPreferencias();
      if (!ativo) return;
      const a = antes.profile;
      const d = estado.profile;
      if (a.id !== d.id) return; // entrou ou saiu da conta: os números vieram da nuvem
      const ganho = d.xp_total - a.xp_total;
      if (d.nivel > a.nivel && ganho > 0 && ganho <= 300) {
        agendar({ tipo: 'nivel', titulo: `⭐ Nível ${d.nivel}!`, texto: 'Você subiu de nível.' });
      }
      for (const c of d.conquistas) {
        if (c.desbloqueada && !a.conquistas.find((x) => x.id === c.id)?.desbloqueada) {
          agendar({ tipo: 'conquista', titulo: `🏆 Conquista: ${c.nome}`, texto: c.desc });
        }
      }
    });

    const pararDesafios = useDesafiosStore.subscribe((estado, antes) => {
      if (!ativo || estado.semanaCarregada !== antes.semanaCarregada) return;
      for (const d of estado.desafios) {
        if (d.completo && !antes.desafios.find((x) => x.id === d.id)?.completo) {
          agendar({ tipo: 'desafio', titulo: `🎯 Desafio completo: ${d.titulo}`, texto: `+${d.xp} XP e +${d.moedas} moedas` });
        }
      }
    });

    const pararRotina = useRotinaStore.subscribe((estado, antes) => {
      if (!ativo || estado.diaAtual !== antes.diaAtual) return;
      if (calcularStatusDia(estado.tarefas) === 'completa' && calcularStatusDia(antes.tarefas) !== 'completa') {
        agendar({ tipo: 'rotina', titulo: '🎉 Rotina de hoje completa!', texto: 'Você fez tudo o que planejou.' });
      }
    });

    return () => {
      clearTimeout(espera);
      pararUsuario();
      pararDesafios();
      pararRotina();
    };
  }, []);
}
