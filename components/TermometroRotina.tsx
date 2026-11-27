import Icone, { type NomeIcone } from '@/components/Icone';
import { PecaBotao } from '@/components/plim';
import { Text } from '@/components/Texto';
import { type Expressao } from '@/lib/avatar';
import { C, F } from '@/lib/theme';
import { useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

type Nivel = {
  label: string;
  cor: string;
  fundo: string;
  icone: NomeIcone;
  emoji: string;
  expressao: Expressao;
  dica?: string;
};

// O Plim não dá bronca: o nível mais baixo é um convite, não um alerta vermelho.
const NIVEIS: Nivel[] = [
  {
    label: 'Dia em branco',
    cor: C.textSub, fundo: C.surfaceHigh,
    icone: 'humor-3', emoji: '😐', expressao: 'neutro',
    dica: 'Uma tarefa pequena já muda o dia. Qual é a mais fácil agora?',
  },
  {
    label: 'Primeiros passos',
    cor: C.accent, fundo: C.accentSoft,
    icone: 'humor-4', emoji: '🙂', expressao: 'neutro',
    dica: 'Você já começou. Mais uma e o dia engrena.',
  },
  {
    label: 'No caminho',
    cor: C.gold, fundo: C.goldSoft,
    icone: 'humor-4', emoji: '🙂', expressao: 'feliz',
    dica: 'Bom ritmo. Siga no seu tempo.',
  },
  {
    label: 'Indo muito bem',
    cor: C.success, fundo: C.successSoft,
    icone: 'humor-5', emoji: '😊', expressao: 'feliz',
  },
  {
    label: 'Em chamas',
    cor: C.primaryLight, fundo: C.glass,
    icone: 'chama', emoji: '🤩', expressao: 'animado',
  },
];

export function calcularScoreRotina(
  tarefas: { status: string }[],
  streak: number,
  xpTotal: number,
): number {
  const total = tarefas.length;
  const feitas = tarefas.filter((t) => t.status === 'feita').length;
  const ptTarefas = total > 0 ? (feitas / total) * 50 : 0;
  const ptStreak  = Math.min(streak * 8, 30);
  const ptXP      = Math.min(xpTotal / 100, 20);
  return Math.min(Math.round(ptTarefas + ptStreak + ptXP), 100);
}

export function nivelDoScore(score: number): Nivel {
  if (score < 20) return NIVEIS[0];
  if (score < 40) return NIVEIS[1];
  if (score < 60) return NIVEIS[2];
  if (score < 80) return NIVEIS[3];
  return NIVEIS[4];
}

export function expressaoDoScore(score: number): Expressao {
  return nivelDoScore(score).expressao;
}

const SEGMENTOS = 5;

/** Como está a rotina hoje: cinco gomos, um rosto e uma frase. Leva para a aba Rotina. */
export default function TermometroRotina() {
  const router  = useRouter();
  const tarefas = useRotinaStore((s) => s.tarefas);
  const profile = useUserStore((s) => s.profile);

  const score  = calcularScoreRotina(tarefas, profile.streak, profile.xp_total);
  const nivel  = nivelDoScore(score);
  const gomos  = Math.max(score > 0 ? 1 : 0, Math.ceil((score / 100) * SEGMENTOS));
  const total  = tarefas.length;
  const feitas = tarefas.filter((t) => t.status === 'feita').length;

  return (
    <PecaBotao
      onPress={() => router.push('/(tabs)/rotina')}
      accessibilityLabel={`Rotina de hoje: ${nivel.label}. ${feitas} de ${total} tarefas feitas. Abrir rotina.`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Icone nome={nivel.icone} tamanho={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: C.textSub }}>Sua rotina hoje</Text>
          <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>{nivel.label}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.text }}>{feitas}<Text style={{ fontFamily: F.regular, fontSize: 15, color: C.textSub }}>/{total}</Text></Text>
          <Text style={{ fontSize: 12, color: C.textSub }}>tarefas</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: score }}>
        {Array.from({ length: SEGMENTOS }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: i < gomos ? nivel.cor : C.track }} />
        ))}
      </View>

      {nivel.dica && (
        <View style={{ marginTop: 12, backgroundColor: nivel.fundo, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontSize: 14, color: C.text, lineHeight: 20 }}>{nivel.dica}</Text>
        </View>
      )}
    </PecaBotao>
  );
}
