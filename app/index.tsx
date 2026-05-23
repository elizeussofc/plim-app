import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

export default function Root() {
  const [ready, setReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('plim_onboarding_completed').then((val) => {
      setOnboardingDone(val === 'true');
      setReady(true);
    });
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#F5F3FF' }} />;
  if (onboardingDone) return <Redirect href="/(tabs)" />;
  return <Redirect href={'/onboarding' as Href} />;
}
