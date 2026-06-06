import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { authGuest, type UserProfile } from './src/services/api';

export default function App(): React.ReactElement {
  const [sessionUser, setSessionUser] = useState<UserProfile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession(): Promise<void> {
      try {
        setSessionError(null);
        const guestUser = await authGuest();

        if (isMounted) {
          setSessionUser(guestUser);
        }
      } catch (currentError) {
        if (isMounted) {
          setSessionError(currentError instanceof Error ? currentError.message : 'Could not start guest session');
        }
      } finally {
        if (isMounted) {
          setLoadingSession(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loadingSession) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12, color: '#475569' }}>Starting guest session...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (sessionError || !sessionUser) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 }}>
          <Text style={{ color: '#b91c1c', textAlign: 'center' }}>{sessionError ?? 'Failed to start session'}</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <BottomTabNavigator userId={sessionUser.id} />
    </SafeAreaProvider>
  );
}
