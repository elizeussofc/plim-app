import { usePaywallStore } from '@/stores/paywallStore';
import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

function mostrarAlerta(titulo: string, msg: string) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n${msg}`);
  } else {
    Alert.alert(titulo, msg);
  }
}
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Text } from '@/components/ui';
import { iniciarAssinatura, restaurarCompra, type PlanoId } from '@/lib/payments';

const BENEFICIOS = [
  { icone: '🤖', titulo: 'Plim IA Coach', desc: 'Análise semanal do seu padrão e sugestões personalizadas' },
  { icone: '🎯', titulo: 'Foco ilimitado', desc: 'Sessões Pomodoro sem limite diário + sons binaurais' },
  { icone: '📊', titulo: 'Relatório semanal', desc: 'Insights detalhados sobre sua produtividade em PDF' },
  { icone: '🤝', titulo: 'Parceiro de foco', desc: 'Conecte com alguém e se responsabilizem juntos' },
  { icone: '🎨', titulo: 'Avatar premium', desc: '15+ roupas e acessórios exclusivos para seu personagem' },
  { icone: '☁️', titulo: 'Backup na nuvem', desc: 'Progresso salvo automaticamente, nunca perde nada' },
];

const PLANOS = [
  {
    id: 'mensal',
    label: 'Mensal',
    preco: 'R$ 19,90',
    sub: 'por mês',
    destaque: false,
    badge: null,
  },
  {
    id: 'anual',
    label: 'Anual',
    preco: 'R$ 149',
    sub: 'por ano  ·  R$ 12,40/mês',
    destaque: true,
    badge: 'ECONOMIZE 38%',
  },
];

export default function PaywallModal() {
  const { visivel, origem, fechar } = usePaywallStore();
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const translateY = useSharedValue(600);

  useEffect(() => {
    if (visivel) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      translateY.value = 600;
    }
  }, [visivel]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  async function handleAssinar(planoId: PlanoId) {
    if (!session?.user?.id) {
      mostrarAlerta('Conta necessária', 'Faça login para assinar o Plim Pro.');
      return;
    }
    setLoading(true);
    const sucesso = await iniciarAssinatura(planoId, session.user.id);
    setLoading(false);
    if (sucesso) {
      fechar();
      mostrarAlerta('👑 Bem-vindo ao Plim Pro!', 'Todas as features premium estão desbloqueadas.');
    } else {
      mostrarAlerta('Ops', 'Não foi possível concluir a assinatura. Tente novamente.');
    }
  }

  async function handleRestaurar() {
    setLoading(true);
    const sucesso = await restaurarCompra();
    setLoading(false);
    if (sucesso) {
      fechar();
      mostrarAlerta('✅ Compra restaurada!', 'Seu plano Pro foi reativado.');
    } else {
      mostrarAlerta('Nenhuma compra encontrada', 'Não encontramos assinaturas ativas nesta conta.');
    }
  }

  if (!visivel) return null;

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="none"
      onRequestClose={fechar}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1 }}
        onPress={fechar}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: 480,
            alignSelf: 'center',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '90%',
            overflow: 'hidden',
            zIndex: 2,
          },
          sheetStyle,
        ]}
      >
        {/* Header roxo com coroa */}
        <View
          style={{
            backgroundColor: '#7C3AED',
            paddingTop: 28,
            paddingBottom: 28,
            paddingHorizontal: 24,
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Fechar */}
          <Pressable
            onPress={fechar}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>✕</Text>
          </Pressable>

          {/* Decoração de pontos */}
          <View style={{ position: 'absolute', top: 12, left: 20, opacity: 0.15 }}>
            <Text style={{ fontSize: 60 }}>✦</Text>
          </View>

          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.35)',
            }}
          >
            <Text style={{ fontSize: 30 }}>👑</Text>
          </View>

          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
            Plim Pro
          </Text>

          {origem ? (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' }}>
              "{origem}" é exclusivo para assinantes
            </Text>
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' }}>
              Desbloqueie seu potencial completo
            </Text>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Benefícios */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
            {BENEFICIOS.map((b) => (
              <View key={b.titulo} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: '#EDE9FE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{b.icone}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: '#1E293B' }}>{b.titulo}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1, lineHeight: 17 }}>{b.desc}</Text>
                </View>
                <Text style={{ color: '#7C3AED', fontSize: 16, fontWeight: '800' }}>✓</Text>
              </View>
            ))}
          </View>

          {/* Divisor */}
          <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20, marginTop: 22, marginBottom: 20 }} />

          {/* Planos */}
          <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 12 }}>
            {PLANOS.map((plano) => (
              <Pressable
                key={plano.id}
                onPress={() => handleAssinar(plano.id as PlanoId)}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: plano.destaque ? 2.5 : 1.5,
                  borderColor: plano.destaque ? '#7C3AED' : '#E2E8F0',
                  backgroundColor: plano.destaque ? '#F5F3FF' : '#FAFAFA',
                  padding: 16,
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {plano.badge && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -12,
                      backgroundColor: '#F97316',
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{plano.badge}</Text>
                  </View>
                )}
                <Text style={{ fontSize: 12, fontWeight: '600', color: plano.destaque ? '#7C3AED' : '#64748B', marginBottom: 4 }}>
                  {plano.label}
                </Text>
                <Text style={{ fontSize: plano.destaque ? 24 : 22, fontWeight: '800', color: plano.destaque ? '#5B21B6' : '#1E293B' }}>
                  {plano.preco}
                </Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, textAlign: 'center' }}>
                  {plano.sub}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* CTA principal */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Pressable
              onPress={() => handleAssinar('anual')}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#A78BFA' : '#7C3AED',
                borderRadius: 18,
                paddingVertical: 17,
                alignItems: 'center',
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.38,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
                  🚀 Experimentar 7 dias grátis
                </Text>
              )}
            </Pressable>
            <Text style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
              Sem compromisso · Cancele quando quiser
            </Text>
          </View>

          {/* Restaurar compra */}
          <Pressable
            onPress={handleRestaurar}
            disabled={loading}
            style={{ paddingTop: 16, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 12, color: '#94A3B8', textDecorationLine: 'underline' }}>
              Já sou assinante? Restaurar compra
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
