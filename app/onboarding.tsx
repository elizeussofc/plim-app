import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { useUserStore } from '@/stores/userStore';
import {
  classifyProfile,
  saveOnboardingProfile,
  type AdhdStatus,
  type Challenge,
  type Chronotype,
  type Distraction,
  type Motivation,
  type PlimProfileType,
} from '@/stores/onboardingStore';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface Answers {
  challenges: Challenge[];
  adhdStatus: AdhdStatus | null;
  chronotype: Chronotype | null;
  goal: string;
  distractions: Distraction[];
  motivation: Motivation | null;
}

// ─── Componentes de opção ─────────────────────────────────────────────────────

function OptionCard({
  emoji,
  label,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? '#7C3AED' : '#E2E8F0',
        backgroundColor: selected ? '#EDE9FE' : '#FAFAFA',
        marginBottom: 10,
        gap: 14,
        shadowColor: selected ? '#7C3AED' : '#000',
        shadowOffset: { width: 0, height: selected ? 3 : 1 },
        shadowOpacity: selected ? 0.15 : 0.04,
        shadowRadius: selected ? 8 : 3,
        elevation: selected ? 4 : 1,
      }}
    >
      {/* Emoji com fundo suave */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: selected ? '#DDD6FE' : '#F1F5F9',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <Text
        style={{
          flex: 1,
          color: selected ? '#5B21B6' : '#334155',
          fontWeight: selected ? '700' : '400',
          fontSize: 15,
          lineHeight: 20,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: selected ? '#7C3AED' : '#E2E8F0',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: selected ? 0 : 1.5,
          borderColor: '#CBD5E1',
        }}
      >
        {selected && (
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── Tela 0: Boas-vindas ──────────────────────────────────────────────────────

function StepWelcome() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900 }),
        withTiming(0.95, { duration: 900 }),
      ),
      -1,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
      <Animated.View
        style={[
          {
            width: 108,
            height: 108,
            borderRadius: 54,
            backgroundColor: '#7C3AED',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 36,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 14,
          },
          pulseStyle,
        ]}
      >
        <Text style={{ fontSize: 50 }}>⚡</Text>
      </Animated.View>

      <Text variant="h1" style={{ textAlign: 'center', marginBottom: 14, color: '#1E293B' }}>
        Oi! Eu sou o Plim 👋
      </Text>
      <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 16, lineHeight: 26 }}>
        Vou te conhecer em 1 minutinho pra deixar tudo do seu jeito.
      </Text>
      <Text style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 36, lineHeight: 20 }}>
        Suas respostas ficam só no seu aparelho.
      </Text>
    </View>
  );
}

// ─── Tela 1: Desafio principal ────────────────────────────────────────────────

const CHALLENGE_OPTIONS: { id: Challenge; emoji: string; label: string }[] = [
  { id: 'procrastinacao', emoji: '🌀', label: 'Procrastinação' },
  { id: 'esquecimento', emoji: '🧠', label: 'Esquecimento' },
  { id: 'hiperfoco', emoji: '🎯', label: 'Hiperfoco no errado' },
  { id: 'sobrecarga', emoji: '🌊', label: 'Sobrecarga mental' },
  { id: 'nao_termino', emoji: '🏁', label: 'Não termino o que começo' },
  { id: 'ansiedade', emoji: '😵', label: 'Ansiedade que paralisa' },
];

function StepChallenges({
  selected,
  onToggle,
}: {
  selected: Challenge[];
  onToggle: (id: Challenge) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <Text variant="h2" style={{ color: '#1E293B', marginBottom: 6 }}>
        O que mais te trava no dia a dia?
      </Text>
      <Text style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>
        Selecione até 2 opções
      </Text>
      {CHALLENGE_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          emoji={opt.emoji}
          label={opt.label}
          selected={selected.includes(opt.id)}
          onPress={() => onToggle(opt.id)}
        />
      ))}
    </ScrollView>
  );
}

// ─── Tela 2: Contexto neurológico ─────────────────────────────────────────────

const ADHD_OPTIONS: { id: AdhdStatus; emoji: string; label: string }[] = [
  { id: 'diagnosed', emoji: '✅', label: 'Tenho diagnóstico' },
  { id: 'suspect', emoji: '🤔', label: 'Suspeito que tenho' },
  { id: 'no', emoji: '🚫', label: 'Não tenho, só quero focar mais' },
];

function StepAdhd({
  selected,
  onSelect,
}: {
  selected: AdhdStatus | null;
  onSelect: (id: AdhdStatus) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="h2" style={{ color: '#1E293B', marginBottom: 6 }}>
        Sobre TDAH...
      </Text>
      <Text style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>
        Isso ajuda a ajustar a linguagem do app.
      </Text>
      {ADHD_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          emoji={opt.emoji}
          label={opt.label}
          selected={selected === opt.id}
          onPress={() => onSelect(opt.id)}
        />
      ))}
    </View>
  );
}

// ─── Tela 3: Cronotipo ────────────────────────────────────────────────────────

const CHRONO_OPTIONS: { id: Chronotype; emoji: string; label: string; time: string }[] = [
  { id: 'morning', emoji: '🌅', label: 'Manhã', time: '5h – 11h' },
  { id: 'afternoon', emoji: '☀️', label: 'Tarde', time: '12h – 17h' },
  { id: 'night', emoji: '🌙', label: 'Noite', time: '18h – 23h' },
  { id: 'dawn', emoji: '🦉', label: 'Madrugada', time: '0h – 4h' },
];

function StepChronotype({
  selected,
  onSelect,
}: {
  selected: Chronotype | null;
  onSelect: (id: Chronotype) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="h2" style={{ color: '#1E293B', marginBottom: 20 }}>
        Quando seu cérebro fica mais ligado?
      </Text>
      {CHRONO_OPTIONS.map((opt) => (
        <Pressable
          key={opt.id}
          onPress={() => onSelect(opt.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 18,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: selected === opt.id ? '#7C3AED' : '#E2E8F0',
            backgroundColor: selected === opt.id ? '#EDE9FE' : '#FFFFFF',
            marginBottom: 12,
            gap: 16,
          }}
        >
          <Text style={{ fontSize: 36 }}>{opt.emoji}</Text>
          <View>
            <Text
              style={{
                fontWeight: '600',
                fontSize: 16,
                color: selected === opt.id ? '#6D28D9' : '#1E293B',
              }}
            >
              {opt.label}
            </Text>
            <Text style={{ fontSize: 13, color: '#94A3B8' }}>{opt.time}</Text>
          </View>
          {selected === opt.id && (
            <View style={{ marginLeft: 'auto' }}>
              <Text style={{ color: '#7C3AED', fontSize: 18 }}>●</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

// ─── Tela 4: Objetivo 30 dias (opcional) ──────────────────────────────────────

const GOAL_PLACEHOLDERS = [
  'Ex: Estudar 1h por dia pro concurso',
  'Ex: Lançar meu produto digital',
  'Ex: Treinar 3x por semana',
  'Ex: Ler 1 livro por mês',
];

function StepGoal({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [phIdx, setPhIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % GOAL_PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Text variant="h2" style={{ color: '#1E293B', marginBottom: 8 }}>
        Qual seu maior objetivo nos próximos 30 dias?
      </Text>
      <Text style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>
        Escreva em suas próprias palavras — ou pule se preferir.
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.slice(0, 80))}
        placeholder={GOAL_PLACEHOLDERS[phIdx]}
        placeholderTextColor="#94A3B8"
        maxLength={80}
        multiline
        style={{
          borderWidth: 2,
          borderColor: value ? '#7C3AED' : '#E2E8F0',
          borderRadius: 16,
          padding: 16,
          fontSize: 15,
          color: '#1E293B',
          backgroundColor: '#FFFFFF',
          minHeight: 110,
          textAlignVertical: 'top',
        }}
      />
      <Text style={{ textAlign: 'right', fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
        {value.length}/80
      </Text>
    </KeyboardAvoidingView>
  );
}

// ─── Tela 5: Distrações ───────────────────────────────────────────────────────

const DISTRACTION_OPTIONS: { id: Distraction; emoji: string; label: string }[] = [
  { id: 'celular', emoji: '📱', label: 'Celular / Redes sociais' },
  { id: 'pessoas', emoji: '👥', label: 'Outras pessoas' },
  { id: 'ansiedade', emoji: '😰', label: 'Ansiedade' },
  { id: 'tedio', emoji: '🥱', label: 'Tédio' },
  { id: 'comida', emoji: '🍔', label: 'Comida' },
  { id: 'pensamentos', emoji: '💭', label: 'Pensamentos aleatórios' },
];

function StepDistractions({
  selected,
  onToggle,
}: {
  selected: Distraction[];
  onToggle: (id: Distraction) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <Text variant="h2" style={{ color: '#1E293B', marginBottom: 6 }}>
        O que mais te puxa pra fora do foco?
      </Text>
      <Text style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>
        Selecione todas que se aplicam
      </Text>
      {DISTRACTION_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          emoji={opt.emoji}
          label={opt.label}
          selected={selected.includes(opt.id)}
          onPress={() => onToggle(opt.id)}
        />
      ))}
    </ScrollView>
  );
}

// ─── Tela 6: Motivação ────────────────────────────────────────────────────────

const MOTIVATION_OPTIONS: { id: Motivation; emoji: string; label: string }[] = [
  { id: 'progresso', emoji: '📈', label: 'Ver meu progresso visual' },
  { id: 'recompensas', emoji: '🎁', label: 'Ganhar recompensas (XP/Moedas)' },
  { id: 'streak', emoji: '🔥', label: 'Manter streaks' },
  { id: 'acompanhamento', emoji: '👥', label: 'Ter alguém acompanhando' },
  { id: 'competicao', emoji: '🏆', label: 'Competição saudável' },
];

function StepMotivation({
  selected,
  onSelect,
}: {
  selected: Motivation | null;
  onSelect: (id: Motivation) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <Text variant="h2" style={{ color: '#1E293B', marginBottom: 20 }}>
        O que mais te dá vontade de continuar?
      </Text>
      {MOTIVATION_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.id}
          emoji={opt.emoji}
          label={opt.label}
          selected={selected === opt.id}
          onPress={() => onSelect(opt.id)}
        />
      ))}
    </ScrollView>
  );
}

// ─── Tela 7: Gerando perfil ───────────────────────────────────────────────────

const LOADING_MSGS = [
  'Cruzando suas respostas...',
  'Calibrando o Plim pra você...',
  'Quase lá...',
];

function StepLoading({ onDone }: { onDone: () => void }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    dot1.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1);
    setTimeout(() => {
      dot2.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1);
    }, 150);
    setTimeout(() => {
      dot3.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1);
    }, 300);

    const timers = [
      setTimeout(() => setMsgIdx(1), 650),
      setTimeout(() => setMsgIdx(2), 1300),
      setTimeout(onDone, 1950),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const d1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const d2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const d3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 44 }}>
        <Animated.View style={[{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#7C3AED' }, d1Style]} />
        <Animated.View style={[{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#A78BFA' }, d2Style]} />
        <Animated.View style={[{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#F97316' }, d3Style]} />
      </View>
      <Text style={{ fontSize: 16, color: '#64748B', textAlign: 'center' }}>{LOADING_MSGS[msgIdx]}</Text>
    </View>
  );
}

// ─── Tela 8: Perfil revelado ──────────────────────────────────────────────────

function StepProfile({ profile }: { profile: PlimProfileType | null }) {
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withTiming(1, { duration: 480 });
    cardOpacity.value = withTiming(1, { duration: 480 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  if (!profile) return null;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text
        style={{ color: '#64748B', fontSize: 14, marginBottom: 20, textAlign: 'center' }}
      >
        ✨ Seu perfil Plim foi criado!
      </Text>

      <Animated.View
        style={[
          {
            borderRadius: 24,
            backgroundColor: '#FFFFFF',
            padding: 28,
            marginBottom: 24,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 20,
            elevation: 10,
            borderWidth: 2,
            borderColor: '#EDE9FE',
          },
          cardStyle,
        ]}
      >
        <Text style={{ fontSize: 64, textAlign: 'center', marginBottom: 14 }}>{profile.emoji}</Text>
        <Text
          variant="h1"
          style={{ textAlign: 'center', color: '#6D28D9', marginBottom: 10 }}
        >
          {profile.name}
        </Text>
        <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 15, lineHeight: 24 }}>
          {profile.description}
        </Text>
      </Animated.View>

      <Text style={{ fontWeight: '700', color: '#1E293B', fontSize: 14, marginBottom: 14 }}>
        O que isso significa:
      </Text>
      {profile.insights.map((insight, i) => (
        <View
          key={i}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: '#EDE9FE',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
              flexShrink: 0,
            }}
          >
            <Text style={{ color: '#7C3AED', fontWeight: 'bold', fontSize: 12 }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, color: '#334155', fontSize: 15, lineHeight: 23 }}>{insight}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

const TOTAL_CONTENT_STEPS = 8;
const PROGRESS_STEPS = 6; // steps 1–6 mostram barra

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const BAR_WIDTH = width - 48; // 24px padding cada lado

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    challenges: [],
    adhdStatus: null,
    chronotype: null,
    goal: '',
    distractions: [],
    motivation: null,
  });
  const [profile, setProfile] = useState<PlimProfileType | null>(null);

  // Animação de transição entre steps
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  // Barra de progresso
  const progressVal = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: progressVal.value * BAR_WIDTH,
  }));

  useEffect(() => {
    if (step >= 1 && step <= PROGRESS_STEPS) {
      progressVal.value = withTiming(step / PROGRESS_STEPS, { duration: 320 });
    }
  }, [step]);

  function goToStep(next: number, dir: 1 | -1 = 1) {
    const exitX = dir * -28;
    const enterX = dir * 28;

    opacity.value = withTiming(0, { duration: 155 });
    translateX.value = withTiming(exitX, { duration: 155 });

    setTimeout(() => {
      setStep(next);
      translateX.value = enterX;
      setTimeout(() => {
        opacity.value = withTiming(1, { duration: 170 });
        translateX.value = withTiming(0, { duration: 170 });
      }, 10);
    }, 160);
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return answers.challenges.length >= 1;
      case 2: return answers.adhdStatus !== null;
      case 3: return answers.chronotype !== null;
      case 4: return true;
      case 5: return answers.distractions.length >= 1;
      case 6: return answers.motivation !== null;
      default: return true;
    }
  }

  function handleNext() {
    if (!canAdvance()) return;
    goToStep(step + 1, 1);
  }

  function handleBack() {
    if (step > 0 && step < 7) {
      goToStep(step - 1, -1);
    }
  }

  function handleLoaderDone() {
    // Classifica perfil com as respostas coletadas
    const computed = classifyProfile({
      challenges: answers.challenges,
      adhdStatus: answers.adhdStatus ?? 'no',
      chronotype: answers.chronotype ?? 'morning',
      goal: answers.goal || null,
      distractions: answers.distractions,
      motivation: answers.motivation ?? 'progresso',
    });
    setProfile(computed);
    goToStep(8, 1);
  }

  async function handleEnterApp() {
    if (profile) {
      useUserStore.getState().updateProfile({ apelido: profile.name });
    }
    await saveOnboardingProfile({
      challenges: answers.challenges,
      adhdStatus: answers.adhdStatus ?? 'no',
      chronotype: answers.chronotype ?? 'morning',
      goal: answers.goal || null,
      distractions: answers.distractions,
      motivation: answers.motivation ?? 'progresso',
    });
    router.replace('/(tabs)');
  }

  function toggleChallenge(id: Challenge) {
    setAnswers((prev) => {
      if (prev.challenges.includes(id))
        return { ...prev, challenges: prev.challenges.filter((c) => c !== id) };
      if (prev.challenges.length >= 2) return prev;
      return { ...prev, challenges: [...prev.challenges, id] };
    });
  }

  function toggleDistraction(id: Distraction) {
    setAnswers((prev) => ({
      ...prev,
      distractions: prev.distractions.includes(id)
        ? prev.distractions.filter((d) => d !== id)
        : [...prev.distractions, id],
    }));
  }

  function renderStep() {
    switch (step) {
      case 0: return <StepWelcome />;
      case 1: return <StepChallenges selected={answers.challenges} onToggle={toggleChallenge} />;
      case 2:
        return (
          <StepAdhd
            selected={answers.adhdStatus}
            onSelect={(id) => setAnswers((a) => ({ ...a, adhdStatus: id }))}
          />
        );
      case 3:
        return (
          <StepChronotype
            selected={answers.chronotype}
            onSelect={(id) => setAnswers((a) => ({ ...a, chronotype: id }))}
          />
        );
      case 4:
        return (
          <StepGoal
            value={answers.goal}
            onChange={(v) => setAnswers((a) => ({ ...a, goal: v }))}
          />
        );
      case 5:
        return (
          <StepDistractions selected={answers.distractions} onToggle={toggleDistraction} />
        );
      case 6:
        return (
          <StepMotivation
            selected={answers.motivation}
            onSelect={(id) => setAnswers((a) => ({ ...a, motivation: id }))}
          />
        );
      case 7: return <StepLoading onDone={handleLoaderDone} />;
      case 8: return <StepProfile profile={profile} />;
      default: return null;
    }
  }

  const showProgressBar = step >= 1 && step <= PROGRESS_STEPS;
  const isStep0 = step === 0;
  const isLoader = step === 7;
  const isReveal = step === 8;
  const showBackBtn = step > 0 && step < 7;
  const showNextBtn = step >= 1 && step <= 6;
  const isOptional = step === 4;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F3FF' }}>
      {/* Barra de progresso */}
      {showProgressBar && (
        <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6 }}>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: '#DDD6FE',
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[
                { height: 6, borderRadius: 3, backgroundColor: '#7C3AED' },
                progressStyle,
              ]}
            />
          </View>
        </View>
      )}

      {/* Área de conteúdo */}
      <Animated.View
        style={[{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }, contentStyle]}
      >
        {renderStep()}
      </Animated.View>

      {/* Navegação */}
      {!isLoader && (
        <View style={{ paddingHorizontal: 24, paddingBottom: 20, paddingTop: 8, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          {isStep0 && (
            <Pressable
              onPress={handleNext}
              style={{
                backgroundColor: '#7C3AED',
                borderRadius: 18,
                padding: 19,
                alignItems: 'center',
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 17 }}>
                Bora começar
              </Text>
            </Pressable>
          )}

          {showNextBtn && (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              {showBackBtn && (
                <Pressable
                  onPress={handleBack}
                  style={{
                    flex: 1,
                    borderWidth: 2,
                    borderColor: '#DDD6FE',
                    borderRadius: 16,
                    padding: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#64748B', fontWeight: '600', fontSize: 15 }}>
                    Voltar
                  </Text>
                </Pressable>
              )}

              {isOptional && (
                <Pressable
                  onPress={() => goToStep(step + 1, 1)}
                  style={{ paddingHorizontal: 12, paddingVertical: 16 }}
                >
                  <Text style={{ color: '#94A3B8', fontWeight: '500', fontSize: 14 }}>
                    Pular
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleNext}
                disabled={!canAdvance()}
                style={{
                  flex: 2,
                  backgroundColor: canAdvance() ? '#7C3AED' : '#C4B5FD',
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
                  Continuar
                </Text>
              </Pressable>
            </View>
          )}

          {isReveal && (
            <Pressable
              onPress={handleEnterApp}
              style={{
                backgroundColor: '#7C3AED',
                borderRadius: 18,
                padding: 19,
                alignItems: 'center',
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 17 }}>
                Entrar no Plim 🚀
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
