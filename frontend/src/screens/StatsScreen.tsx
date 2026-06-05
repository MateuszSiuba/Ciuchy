import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NEON_LIME = '#D4FF00';

const STAT_ROWS = [
  { label: 'Drip Level', value: 78 },
  { label: 'Comfort', value: 64 },
  { label: 'Street Cred', value: 84 }
];

export function StatsScreen(): JSX.Element {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.subtitle}>Insights about your wardrobe.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Streetwear Meter</Text>
          {STAT_ROWS.map((stat) => (
            <View key={stat.label} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowLabel}>{stat.label}</Text>
                <Text style={styles.rowValue}>{stat.value}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${stat.value}%` }]} />
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