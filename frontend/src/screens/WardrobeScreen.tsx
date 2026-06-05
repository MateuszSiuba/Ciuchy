import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { fetchWardrobe, WardrobeItem } from '../services/api';

type Props = {
  userId: string;
};

export function WardrobeScreen({ userId }: Props): JSX.Element {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWardrobe(): Promise<void> {
      try {
        setError(null);
        setLoading(true);
        const wardrobeItems = await fetchWardrobe(userId);

        if (isMounted) {
          setItems(wardrobeItems);
        }
      } catch (currentError) {
        if (isMounted) {
          setError(currentError instanceof Error ? currentError.message : 'Failed to load wardrobe');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadWardrobe();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.helperText}>Loading wardrobe...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={2}
      ListEmptyComponent={<Text style={styles.helperText}>No wardrobe items yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image
            source={{ uri: item.cutoutImageUrl ?? item.originalImageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardSubtitle}>{item.category}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  helperText: {
    marginTop: 12,
    color: '#475569'
  },
  errorText: {
    color: '#b91c1c'
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 12,
    elevation: 2
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#e2e8f0'
  },
  cardTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600'
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#64748b',
    textTransform: 'capitalize'
  }
});
