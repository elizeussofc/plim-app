import PaywallModal from '@/components/PaywallModal';
import { C } from '@/lib/theme';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

function IconInicio({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
        stroke={color}
        strokeWidth={focused ? 2.5 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color : 'none'}
        fillOpacity={focused ? 0.2 : 0}
      />
    </Svg>
  );
}

function IconRotina({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        stroke={color}
        strokeWidth={focused ? 2.5 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconComunidade({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        stroke={color}
        strokeWidth={focused ? 2.5 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconPerfil({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={focused ? 2.5 : 1.8} />
      <Path
        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
        stroke={color}
        strokeWidth={focused ? 2.5 : 1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function FABDespejo() {
  const router = useRouter();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1400 }),
        withTiming(1,    { duration: 1400 }),
      ),
      -1,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function onPress() {
    scale.value = withSpring(0.88, { damping: 12 }, () => {
      scale.value = withSpring(1);
    });
    router.push('/despejo-mental');
  }

  const tabBarHeight = Platform.OS === 'ios' ? 88 : 68;

  return (
    <Animated.View
      style={[
        { position: 'absolute', right: 16, bottom: tabBarHeight + 12, zIndex: 999 },
        animStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel="Despejo Mental — jogar pensamentos para fora"
        accessibilityRole="button"
        android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true }}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: C.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.55,
          shadowRadius: 12,
          elevation: 12,
          borderWidth: 1.5,
          borderColor: 'rgba(167,139,250,0.4)',
        }}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M9.5 2A6.5 6.5 0 0 1 16 8.5c0 1.7-.65 3.25-1.72 4.4L9.5 18.5 4.72 12.9A6.5 6.5 0 0 1 9.5 2Z" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M9.5 2C9.5 2 7 5 7 8.5s2.5 5 2.5 5" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M14 19h6M17 16v6" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Pressable>
    </Animated.View>
  );
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 16,
          },
          tabBarActiveTintColor: C.primaryLight,
          tabBarInactiveTintColor: C.textMuted,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
            letterSpacing: 0.3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Início',
            tabBarIcon: ({ color, focused }) => <IconInicio color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="rotina"
          options={{
            title: 'Rotina',
            tabBarIcon: ({ color, focused }) => <IconRotina color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="foco"
          options={{
            title: 'Plim',
            tabBarAccessibilityLabel: 'Botão Plim — hub de foco',
            tabBarIcon: () => (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: C.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -20,
                  shadowColor: C.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 10,
                  borderWidth: 2,
                  borderColor: 'rgba(167,139,250,0.35)',
                }}
              >
                <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                  <Path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" fill="#fff" stroke="rgba(255,255,255,0.3)" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen
          name="comunidade"
          options={{
            title: 'Grupo',
            tabBarIcon: ({ color, focused }) => <IconComunidade color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, focused }) => <IconPerfil color={color} focused={focused} />,
          }}
        />
      </Tabs>
      <FABDespejo />
      <PaywallModal />
    </View>
  );
}
