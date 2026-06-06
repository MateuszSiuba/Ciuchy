import React, { useEffect, useState } from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import type { UserProfile } from './src/services/api';

const SESSION_STORAGE_KEY = 'ciuchy.session';

export default function App(): React.ReactElement {
  const [sessionUser, setSessionUser] = useState<UserProfile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession(): Promise<void> {
      try {
        const storedSession = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        const parsedSession = storedSession ? (JSON.parse(storedSession) as UserProfile) : null;

        if (isMounted) {
          setSessionUser(parsedSession);
        }
      } catch {
        if (isMounted) {
          setSessionUser(null);
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

  async function handleAuthenticated(user: UserProfile): Promise<void> {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(user));
    setSessionUser(user);
  }

  async function handleLogout(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    setSessionUser(null);
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {loadingSession ? (
        <LoginScreen loading message="Ładowanie sesji..." onAuthenticated={handleAuthenticated} />
      ) : sessionUser ? (
        <BottomTabNavigator user={sessionUser} onLogout={handleLogout} />
      ) : (
        <LoginScreen onAuthenticated={handleAuthenticated} />
      )}
    </SafeAreaProvider>
  );
}
