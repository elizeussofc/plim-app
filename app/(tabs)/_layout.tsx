import AvatarPersonagem from '@/components/AvatarPersonagem';
import { FalaFlutuante } from '@/components/Balao';
import Icone, { type NomeIcone } from '@/components/Icone';
import { useCicloDiario } from '@/lib/cicloDiario';
import { C, F } from '@/lib/theme';
import { useUserStore } from '@/stores/userStore';
import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';

const ALTURA_BARRA = Platform.OS === 'ios' ? 92 : 74;

/** Ícone de aba: massinha colorida quando ativa, apagada quando não. */
function IconeAba({ nome, ativo }: { nome: NomeIcone; ativo: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 52, height: 34, borderRadius: 14, backgroundColor: ativo ? C.glass : 'transparent' }}>
      <Icone nome={nome} tamanho={ativo ? 30 : 26} style={{ opacity: ativo ? 1 : 0.55 }} />
    </View>
  );
}

function IconePerfil({ ativo }: { ativo: boolean }) {
  const config = useUserStore((s) => s.profile.avatar_config);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 52, height: 34, borderRadius: 14, backgroundColor: ativo ? C.glass : 'transparent' }}>
      <View style={{ borderRadius: 16, borderWidth: 2, borderColor: ativo ? C.primary : C.borderBright, opacity: ativo ? 1 : 0.7 }}>
        <AvatarPersonagem config={config} size={26} />
      </View>
    </View>
  );
}

/** Atalho fixo para o Despejo Mental: tirar um pensamento da cabeça a qualquer momento. */
function BotaoDespejo() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/despejo-mental')}
      accessibilityLabel="Despejo Mental: anotar um pensamento agora"
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 16,
        bottom: ALTURA_BARRA + 14 - (pressed ? 3 : 0),
        zIndex: 20,
        width: 54,
        height: 54,
        borderRadius: 20,
        backgroundColor: C.surface,
        borderWidth: 2,
        borderBottomWidth: pressed ? 2 : 5,
        borderColor: C.borderPrimary,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Icone nome="pensamento" tamanho={32} />
    </Pressable>
  );
}

export default function TabsLayout() {
  useCicloDiario();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: C.bg },
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            borderTopWidth: 2,
            height: ALTURA_BARRA,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: C.primaryLight,
          tabBarInactiveTintColor: C.textMuted,
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: F.medium,
            marginTop: 3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Início',
            tabBarIcon: ({ focused }) => <IconeAba nome="casa" ativo={focused} />,
          }}
        />
        <Tabs.Screen
          name="rotina"
          options={{
            title: 'Rotina',
            tabBarIcon: ({ focused }) => <IconeAba nome="rotina" ativo={focused} />,
          }}
        />
        <Tabs.Screen
          name="foco"
          options={{
            title: 'Plim',
            tabBarAccessibilityLabel: 'Botão Plim: foco e ferramentas',
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 24,
                  backgroundColor: C.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -26,
                  borderWidth: 3,
                  borderBottomWidth: focused ? 4 : 7,
                  borderColor: C.primaryDim,
                }}
              >
                <Icone nome="raio" tamanho={38} />
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen
          name="comunidade"
          options={{
            title: 'Grupo',
            tabBarIcon: ({ focused }) => <IconeAba nome="conversa" ativo={focused} />,
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ focused }) => <IconePerfil ativo={focused} />,
          }}
        />
      </Tabs>
      <FalaFlutuante fundo={ALTURA_BARRA + 14} />
      <BotaoDespejo />
    </View>
  );
}
