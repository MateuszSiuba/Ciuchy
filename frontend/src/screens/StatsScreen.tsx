import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchUserProfile, type UserProfile } from '../services/api';

const NEON_LIME = '#D4FF00';

type Props = {
  userId: string;
};

export function StatsScreen({ userId }: Props): React.ReactElement {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStats(): Promise<void> {
      try {
        setError(null);
        setLoading(true);
        const userProfile = await fetchUserProfile(userId);

        if (isMounted) {
          setProfile(userProfile);
        }
      } catch (currentError) {
        if (isMounted) {
          setError(currentError instanceof Error ? currentError.message : 'Failed to load stats');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const statRows = profile
    ? [
        { label: 'Level', value: profile.level },
        { label: 'Drip', value: profile.drip },
        { label: 'Swag', value: profile.swag },
        { label: 'XP', value: profile.xp }
      ]
    : [];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={styles.centeredState}>
          <ActivityIndicator />
          <Text style={styles.subtitle}>Loading your streetwear stats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{error ?? 'Stats unavailable'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.subtitle}>Insights about {profile.name}'s wardrobe.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{profile.isGuest ? 'Guest Run' : 'Streetwear Meter'}</Text>
          {statRows.map((stat) => (
            <View key={stat.label} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowLabel}>{stat.label}</Text>
                <Text style={styles.rowValue}>{stat.value}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(100, stat.value)}%` }]} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'flex-start', backgroundColor: '#f8fafc', padding: 16 },
  header: { alignSelf: 'stretch', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800' },
  subtitle: { marginTop: 4, color: '#64748b' },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#b91c1c', textAlign: 'center' },
  card: {
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    padding: 14
  },
  cardTitle: {
    color: NEON_LIME,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12
  },
  row: {
    marginBottom: 12
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  rowLabel: {
    color: '#cbd5e1',
    fontWeight: '700'
  },
  rowValue: {
    color: '#f8fafc',
    fontWeight: '800'
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: NEON_LIME
  }
});