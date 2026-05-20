import { Card, Text } from '@/components/ui';
import { useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { type Expressao } from './AvatarPersonagem';

type Nivel = {
  label: string;
  cor: string;
  fundo: string;
  emoji: string;
  expressao: Expressao;
  dica?: string;
};

const NIVEIS: Nivel[] = [
  {
    label: 'Rotina parada',
    cor: '#EF4444', fundo: '#FEE2E2',
    emoji: '😔', expressao: 'triste',
    dica: 'Comece com uma tarefa pequena — qualquer passo já conta!',
  },
  {
    label: 'Primeiros passos',
    cor: '#F97316', fundo: '#FFEDD5',
    emoji: '😐', expressao: 'neutro',
    dica: 'Você está andando! Continue com mais uma tarefa hoje.',
  },
  {
    label: 'No caminho certo',
    cor: '#EAB308', fundo: '#FEF9C3',
    emoji: '🙂', expressao: 'neutro',
    dica: 'Boa consistência! Mantenha o ritmo.',
  },
  {
    label: 'Indo muito bem!',
    cor: '#10B981', fundo: '#D1FAE5',
    emoji: '😊', expressao: 'feliz',
    dica: undefined,
  },
  {
    label: 'Em chamas! 🔥',
    cor: '#7C3AED', fundo: '#EDE9FE',
    emoji: '🤩', expressao: 'animado',
    dica: undefined,
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

export default function TermometroRotina() {
  const router  = useRouter();
  const tarefas = useRotinaStore((s) => s.tarefas);
  const profile = useUserStore((s) => s.profile);

  const score  = calcularScoreRotina(tarefas, profile.streak, profile.xp_total);
  const nivel  = nivelDoScore(score);
  const segsAtivos = Math.max(score > 0 ? 1 : 0, Math.ceil((score / 100) * SEGMENTOS));

  const totalTarefas = tarefas.length;
  const feitas = tarefas.filter((t) => t.status === 'feita').length;

  return (
    <Card variant="default" padding="md" className="mb-5">
      {/* Cabeçalho */}
      <View className="flex-row items-center justify-between mb-1">
        <Text variant="small" className="font-semibold text-slate-700">
          🌡️ Saúde da sua rotina
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/rotina')} className="active:opacity-70">
          <Text style={{ fontSize: 11, color: '#7C3AED' }}>Ver rotina →</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 10, color: '#94A3B8', marginBottom: 10 }}>
        Tarefas · streak · progresso geral
      </Text>

      {/* Barra termômetro */}
      <View className="flex-row gap-1.5 mb-2.5">
        {Array.from({ length: SEGMENTOS }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 10,
              borderRadius: 5,
              backgroundColor: i < segsAtivos ? nivel.cor : '#E2E8F0',
            }}
          />
        ))}
      </View>

      {/* Status + pontuação */}
      <View className="flex-row items-center justify-between mb-1">
        <View
          style={{
            backgroundColor: nivel.fundo,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: nivel.cor, fontWeight: '700' }}>
            {nivel.emoji} {nivel.label}
          </Text>
        </View>
        <View className="items-end">
          <Text style={{ fontSize: 16, fontWeight: '800', color: nivel.cor }}>
            {score}
            <Text style={{ fontSize: 11, fontWeight: '400', color: '#94A3B8' }}>/100</Text>
          </Text>
          <Text style={{ fontSize: 10, color: '#94A3B8' }}>
            {feitas}/{totalTarefas} tarefas · {profile.streak}🔥
          </Text>
        </View>
      </View>

      {/* Dica contextual */}
      {nivel.dica && (
        <View
          style={{
            marginTop: 10,
            backgroundColor: '#F8FAFC',
            borderRadius: 8,
            padding: 8,
            borderLeftWidth: 3,
            borderLeftColor: nivel.cor,
          }}
        >
          <Text style={{ fontSize: 11, color: '#64748B' }}>💡 {nivel.dica}</Text>
        </View>
      )}
    </Card>
  );
}
