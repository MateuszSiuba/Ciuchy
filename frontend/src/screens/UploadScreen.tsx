import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { uploadWardrobeItem } from '../services/api';

type Props = {
  userId: string;
  onUploaded?: () => void;
};

export function UploadScreen({ userId, onUploaded }: Props): JSX.Element {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('TOP');
  const [uploading, setUploading] = useState(false);

  async function pickFromGallery(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow gallery access to pick an item photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    });

    if (!result.canceled) {
      setImageUri(result.assets[0]?.uri ?? null);
    }
  }

  async function takePhoto(): Promise<void> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    });

    if (!result.canceled) {
      setImageUri(result.assets[0]?.uri ?? null);
    }
  }

  async function handleUpload(): Promise<void> {
    if (!imageUri) {
      Alert.alert('Missing photo', 'Please pick or take a photo first.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter an item name.');
      return;
    }

    if (!category.trim()) {
      Alert.alert('Missing category', 'Please enter a category.');
      return;
    }

    try {
      setUploading(true);
      await uploadWardrobeItem(userId, name.trim(), category.trim(), imageUri);
      setImageUri(null);
      setName('');
      setCategory('TOP');
      onUploaded?.();
      Alert.alert('Success', 'Item uploaded to your digital wardrobe.');
    } catch (currentError) {
      Alert.alert(
        'Upload failed',
        currentError instanceof Error ? currentError.message : 'Something went wrong during upload.'
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryButton} onPress={pickFromGallery}>
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </Pressable>
      </View>

      <View style={styles.previewBox}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <Text style={styles.placeholderText}>Selected photo preview appears here.</Text>
        )}
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Item name"
        placeholderTextColor="#94a3b8"
        style={styles.input}
      />

      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder="Category, e.g. TOP"
        placeholderTextColor="#94a3b8"
        style={styles.input}
      />

      <Pressable style={styles.primaryButton} onPress={handleUpload} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Upload to Digital Wardrobe</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonText: {
    fontWeight: '600',
    color: '#0f172a'
  },
  previewBox: {
    height: 280,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden'
  },
  previewImage: {
    width: '100%',
    height: '100%'
  },
  placeholderText: {
    color: '#64748b'
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});
