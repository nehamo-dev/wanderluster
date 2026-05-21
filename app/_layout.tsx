import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Suppress the default blue browser focus ring and replace with a warm neutral
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    *:focus { outline-color: #c4b89a !important; }
    *:focus-visible { outline-color: #c4b89a !important; outline-offset: 2px; }
    input, textarea, select { caret-color: #a8624c; }
  `;
  document.head.appendChild(style);
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) router.replace('/(app)');
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still loading session
  if (session === undefined) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="splash" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(app)" />
      </Stack>
    </SafeAreaProvider>
  );
}
