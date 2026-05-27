import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { UploadScreen } from './src/screens/UploadScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';

export default function App(): JSX.Element {
  const [activeScreen, setActiveScreen] = useState<'wardrobe' | 'upload'>('wardrobe');
  const userId = 'demo-user-id';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Ciuchy</Text>
        <Text style={styles.subtitle}>Digital wardrobe</Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeScreen === 'wardrobe' && styles.tabButtonActive]}
          onPress={() => setActiveScreen('wardrobe')}
        >
          <Text style={[styles.tabText, activeScreen === 'wardrobe' && styles.tabTextActive]}>Wardrobe</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeScreen === 'upload' && styles.tabButtonActive]}
          onPress={() => setActiveScreen('upload')}
        >
          <Text style={[styles.tabText, activeScreen === 'upload' && styles.tabTextActive]}>Upload</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {activeScreen === 'wardrobe' ? (
          <WardrobeScreen userId={userId} />
        ) : (
          <UploadScreen userId={userId} onUploaded={() => setActiveScreen('wardrobe')} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  title: {
    color: '#0f172a',
    fontSize: 32,
    fontWeight: '800'
  },
  subtitle: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 4
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center'
  },
  tabButtonActive: {
    backgroundColor: '#0f172a'
  },
  tabText: {
    color: '#0f172a',
    fontWeight: '700'
  },
  tabTextActive: {
    color: '#ffffff'
  },
  content: {
    flex: 1
  }
});
