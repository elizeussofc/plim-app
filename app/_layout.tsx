import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import '../global.css';
import { AuthProvider } from '@/components/AuthProvider';
import { configurarRevenueCat } from '@/lib/payments';

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
