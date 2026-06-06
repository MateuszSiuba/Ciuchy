import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from 'react-native-modal';

import { authGoogle, authGuest, loginUser, registerUser, type UserProfile } from '../services/api';

type LoginScreenProps = {
  onAuthenticated: (user: UserProfile) => Promise<void> | void;
  loading?: boolean;
  message?: string;
};

type AuthMode = 'login' | 'register';

export function LoginScreen({ onAuthenticated, loading = false, message }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [logoOpacity, logoScale]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingSafeArea]}>
        <View style={styles.loadingState}>
          <ActivityIndicator color="#D4FF00" size="large" />
          <Text style={styles.loadingText}>{message ?? 'Ładowanie sesji...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleSuccess(user: UserProfile): Promise<void> {
    await onAuthenticated(user);
  }

  async function handleEmailSubmit(): Promise<void> {
    if (busy) {
      return;
    }

    try {
      setBusy(true);
      setAuthError(null);

      if (mode === 'register') {
        const user = await registerUser({ name: name.trim(), email: email.trim(), password });
        await handleSuccess(user);
        return;
      }

      const user = await loginUser({ email: email.trim(), password });
      await handleSuccess(user);
    } catch (currentError) {
      setAuthError(currentError instanceof Error ? currentError.message : 'Logowanie nie powiodło się');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSubmit(): Promise<void> {
    if (busy) {
      return;
    }

    try {
      setBusy(true);
      setAuthError(null);
      const user = await authGoogle(googleEmail.trim(), googleName.trim() || undefined);
      setGoogleModalVisible(false);
      await handleSuccess(user);
    } catch (currentError) {
      setAuthError(currentError instanceof Error ? currentError.message : 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleGuestSubmit(): Promise<void> {
    if (busy) {
      return;
    }

    try {
      setBusy(true);
      setAuthError(null);
      const user = await authGuest();
      await handleSuccess(user);
    } catch (currentError) {
      setAuthError(currentError instanceof Error ? currentError.message : 'Guest login failed');
    } finally {
      setBusy(false);
    }
  }

  const canSubmitEmailForm = mode === 'register' ? name.trim().length > 0 && email.trim().length > 0 && password.length > 0 : email.trim().length > 0 && password.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.backgroundGlow} />
        <View style={styles.backgroundGlowSecondary} />

        <Animated.View style={[styles.hero, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>C</Text>
          </View>
          <Text style={styles.title}>Ciuchy</Text>
          <Text style={styles.subtitle}>Streetwear RPG z trzema sposobami logowania.</Text>
        </Animated.View>

        {message ? <Text style={styles.systemMessage}>{message}</Text> : null}

        <View style={styles.card}>
          <Pressable style={styles.googleButton} onPress={() => setGoogleModalVisible(true)}>
            <Text style={styles.googleButtonText}>Zaloguj się przez Google</Text>
          </Pressable>

          <View style={styles.modeToggleRow}>
            <Pressable style={[styles.modeChip, mode === 'login' && styles.modeChipActive]} onPress={() => setMode('login')}>
              <Text style={[styles.modeChipText, mode === 'login' && styles.modeChipTextActive]}>Zaloguj się</Text>
            </Pressable>
            <Pressable style={[styles.modeChip, mode === 'register' && styles.modeChipActive]} onPress={() => setMode('register')}>
              <Text style={[styles.modeChipText, mode === 'register' && styles.modeChipTextActive]}>Zarejestruj się</Text>
            </Pressable>
          </View>

          {mode === 'register' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              autoCapitalize="words"
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
          />

          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

          <Pressable style={[styles.primaryButton, !canSubmitEmailForm && styles.buttonDisabled]} onPress={() => void handleEmailSubmit()} disabled={!canSubmitEmailForm || busy}>
            {busy ? <ActivityIndicator color="#0b1220" /> : <Text style={styles.primaryButtonText}>{mode === 'register' ? 'Zarejestruj się' : 'Zaloguj się'}</Text>}
          </Pressable>
        </View>

        <Pressable style={styles.guestButton} onPress={() => void handleGuestSubmit()} disabled={busy}>
          <Text style={styles.guestButtonText}>Wejdź jako Gość</Text>
        </Pressable>
      </KeyboardAvoidingView>

      <Modal
        isVisible={googleModalVisible}
        onBackdropPress={() => setGoogleModalVisible(false)}
        onSwipeComplete={() => setGoogleModalVisible(false)}
        swipeDirection={['down']}
        swipeThreshold={50}
        style={{ margin: 0, justifyContent: 'center' }}
        useNativeDriver={false}
        useNativeDriverForBackdrop={true}
      >
        <View style={styles.googleModalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Zaloguj się przez Google</Text>
          <Text style={styles.modalCopy}>Podaj nazwę i adres email, który chcesz przypisać do konta Google.</Text>
          <TextInput
            value={googleName}
            onChangeText={setGoogleName}
            placeholder="Name"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            autoCapitalize="words"
          />
          <TextInput
            value={googleEmail}
            onChangeText={setGoogleEmail}
            placeholder="Google Email"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={[styles.primaryButton, (!googleEmail.trim() || busy) && styles.buttonDisabled]} onPress={() => void handleGoogleSubmit()} disabled={!googleEmail.trim() || busy}>
            {busy ? <ActivityIndicator color="#0b1220" /> : <Text style={styles.primaryButtonText}>Kontynuuj</Text>}
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#081120'
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    justifyContent: 'center'
  },
  backgroundGlow: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(212, 255, 0, 0.14)'
  },
  backgroundGlowSecondary: {
    position: 'absolute',
    bottom: 50,
    left: -120,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59, 130, 246, 0.12)'
  },
  hero: {
    alignItems: 'center',
    marginBottom: 18
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  brandMarkText: {
    color: '#D4FF00',
    fontSize: 30,
    fontWeight: '900'
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  subtitle: {
    color: '#cbd5e1',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 280
  },
  systemMessage: {
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 12
  },
  loadingSafeArea: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#cbd5e1',
    fontWeight: '700'
  },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  googleButton: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  googleButtonText: {
    color: '#0b1220',
    fontWeight: '800',
    fontSize: 15
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 14
  },
  modeChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)'
  },
  modeChipActive: {
    backgroundColor: 'rgba(212, 255, 0, 0.14)',
    borderColor: 'rgba(212, 255, 0, 0.45)'
  },
  modeChipText: {
    color: '#cbd5e1',
    fontWeight: '700'
  },
  modeChipTextActive: {
    color: '#ffffff'
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    backgroundColor: '#111827',
    color: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12
  },
  errorText: {
    color: '#fca5a5',
    marginBottom: 12
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: '#D4FF00',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  buttonDisabled: {
    opacity: 0.55
  },
  primaryButtonText: {
    color: '#0b1220',
    fontWeight: '900',
    fontSize: 15
  },
  guestButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  guestButtonText: {
    color: '#cbd5e1',
    fontWeight: '700'
  },
  googleModalCard: {
    borderRadius: 24,
    backgroundColor: '#0b1220',
    padding: 18,
    marginHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)'
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(203, 213, 225, 0.45)',
    alignSelf: 'center',
    marginBottom: 12
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800'
  },
  modalCopy: {
    color: '#cbd5e1',
    marginTop: 8,
    marginBottom: 14
  }
});
