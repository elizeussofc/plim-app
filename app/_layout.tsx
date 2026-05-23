import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import '../global.css';
import { AuthProvider } from '@/components/AuthProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

const RC_KEY_IOS = 'test_YWBUdIQtLKNfmunQBMZGDrSaRnc';
const RC_KEY_ANDROID = 'goog_EfwRlQSSEexvVTJEXMHoDWqwDQH';

function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const { default: Purchases, LOG_LEVEL } = await import('react-native-purchases');
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        const key = Platform.OS === 'ios' ? RC_KEY_IOS : RC_KEY_ANDROID;
        Purchases.configure({ apiKey: key });
      } catch {}
    })();
  }, []);
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RevenueCatProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          </Stack>
        </AuthProvider>
      </RevenueCatProvider>
    </QueryClientProvider>
  );
}
