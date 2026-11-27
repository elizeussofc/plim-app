import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import '../global.css';
import { AuthProvider } from '@/components/AuthProvider';
import Avisos from '@/components/Avisos';
import { FalaDasTelasInternas } from '@/components/Balao';
import PaywallModal from '@/components/PaywallModal';
import { useCelebracoes } from '@/lib/celebrar';
import { configurarRevenueCat } from '@/lib/payments';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    configurarRevenueCat();
  }, []);
  return <>{children}</>;
}

/** Aviso, som e fala do avatar quando a pessoa sobe de nível, ganha conquista etc. */
function Celebracoes() {
  useCelebracoes();
  return null;
}

export default function RootLayout() {
  const [carregou, erro] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });

  useEffect(() => {
    if (carregou || erro) SplashScreen.hideAsync().catch(() => {});
  }, [carregou, erro]);

  // Se a fonte falhar, o app abre com a fonte do sistema em vez de travar.
  if (!carregou && !erro) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <QueryClientProvider client={queryClient}>
      <RevenueCatProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          </Stack>
          <FalaDasTelasInternas />
          <PaywallModal />
          <Avisos />
          <Celebracoes />
        </AuthProvider>
      </RevenueCatProvider>
    </QueryClientProvider>
  );
}
