import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { uploadWardrobeItem } from '../services/api';

type Props = {
  userId: string;
  onUploaded?: () => void;
};

type PickerKey = 'category' | 'brand' | 'color' | 'size';

type SelectionOption = {
  label: string;
  value: string;
};

export const CATEGORY_OPTIONS: SelectionOption[] = [
  { label: 'Shoes', value: 'Shoes' },
  { label: 'Hat', value: 'Hat' },
  { label: 'Shirt', value: 'Shirt' },
  { label: 'Hoodie', value: 'Hoodie' },
  { label: 'Shorts', value: 'Shorts' },
  { label: 'Pants', value: 'Pants' },
  { label: 'Accessories', value: 'Accessories' },
  { label: 'Glasses', value: 'Glasses' }
];

export const BRAND_OPTIONS: SelectionOption[] = [
  { label: 'Nike', value: 'Nike' },
  { label: 'Adidas', value: 'Adidas' },
  { label: 'Jordan', value: 'Jordan' },
  { label: 'Puma', value: 'Puma' },
  { label: 'Supreme', value: 'Supreme' },
  { label: 'Stussy', value: 'Stussy' },
  { label: 'Carhartt', value: 'Carhartt' },
  { label: 'Ralph Lauren', value: 'Ralph Lauren' },
  { label: 'Balenciaga', value: 'Balenciaga' },
  { label: 'Off-White', value: 'Off-White' },
  { label: 'Mihara Yasuhiro', value: 'Mihara Yasuhiro' },
  { label: 'Other', value: 'Other' }
];

export const COLOR_OPTIONS: SelectionOption[] = [
  { label: 'Black', value: 'Black' },
  { label: 'White', value: 'White' },
  { label: 'Grey', value: 'Grey' },
  { label: 'Red', value: 'Red' },
  { label: 'Blue', value: 'Blue' },
  { label: 'Navy', value: 'Navy' },
  { label: 'Green', value: 'Green' },
  { label: 'Yellow', value: 'Yellow' },
  { label: 'Orange', value: 'Orange' },
  { label: 'Purple', value: 'Purple' },
  { label: 'Brown', value: 'Brown' },
  { label: 'Pink', value: 'Pink' },
  { label: 'Multi', value: 'Multi' }
];

export const SHOES_SIZE_OPTIONS: SelectionOption[] = [
  { label: '36', value: '36' },
  { label: '37', value: '37' },
  { label: '38', value: '38' },
  { label: '39', value: '39' },
  { label: '40', value: '40' },
  { label: '41', value: '41' },
  { label: '42', value: '42' },
  { label: '43', value: '43' },
  { label: '44', value: '44' },
  { label: '45', value: '45' },
  { label: '46', value: '46' },
  { label: '47', value: '47' }
];

export const APPAREL_SIZE_OPTIONS: SelectionOption[] = [
  { label: 'XS', value: 'XS' },
  { label: 'S', value: 'S' },
  { label: 'M', value: 'M' },
  { label: 'L', value: 'L' },
  { label: 'XL', value: 'XL' },
  { label: 'XXL', value: 'XXL' }
];

const NO_SIZE_CATEGORIES = new Set(['Hat', 'Accessories', 'Glasses']);

export function getBackendCategoryValue(categoryLabel: string): string {
  switch (categoryLabel) {
    case 'Shoes':
      return 'FOOTWEAR';
    case 'Hat':
      return 'HEADWEAR';
    case 'Shirt':
      return 'TOP';
    case 'Hoodie':
      return 'OUTERWEAR';
    case 'Shorts':
    case 'Pants':
      return 'BOTTOM';
    case 'Accessories':
      return 'ACCESSORY';
    case 'Glasses':
      return 'EYEWEAR';
    default:
      return '';
  }
}

export function getSizeOptions(categoryLabel: string): SelectionOption[] {
  if (categoryLabel === 'Shoes') {
    return SHOES_SIZE_OPTIONS;
  }

  if (categoryLabel === 'Shirt' || categoryLabel === 'Hoodie' || categoryLabel === 'Shorts' || categoryLabel === 'Pants') {
    return APPAREL_SIZE_OPTIONS;
  }

  return [];
}

export function isSizeHidden(categoryLabel: string): boolean {
  return NO_SIZE_CATEGORIES.has(categoryLabel);
}

function getPickerTitle(key: PickerKey): string {
  switch (key) {
    case 'category':
      return 'Select Category';
    case 'brand':
      return 'Select Brand';
    case 'color':
      return 'Select Color';
    case 'size':
      return 'Select Size';
  }
}

export function SelectionModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose
}: {
  visible: boolean;
  title: string;
  options: SelectionOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      swipeThreshold={50}
      propagateSwipe={true}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={400}
      animationOutTiming={300}
      backdropTransitionOutTiming={300}
      style={{ margin: 0, justifyContent: 'flex-end' }}
      useNativeDriver={false}
      useNativeDriverForBackdrop={true}
    >
      <View style={styles.selectionSheet}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 12, marginBottom: 12 }} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.modalList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isActive = item.value === selectedValue;

            return (
              <Pressable
                style={[styles.modalOption, isActive && styles.modalOptionActive]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

export function UploadScreen({ userId, onUploaded }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerKey | null>(null);

  const sizeHidden = category ? isSizeHidden(category) : false;
  const sizeOptions = useMemo(() => getSizeOptions(category), [category]);

  const activePickerOptions = useMemo(() => {
    switch (activePicker) {
      case 'category':
        return CATEGORY_OPTIONS;
      case 'brand':
        return BRAND_OPTIONS;
      case 'color':
        return COLOR_OPTIONS;
      case 'size':
        return sizeOptions;
      default:
        return [];
    }
  }, [activePicker, sizeOptions]);

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

  function selectCategory(nextCategory: string): void {
    setCategory(nextCategory);
    setSize('');
  }

  function selectPickerValue(nextValue: string): void {
    if (activePicker === 'category') {
      selectCategory(nextValue);
      return;
    }

    if (activePicker === 'brand') {
      setBrand(nextValue);
      return;
    }

    if (activePicker === 'color') {
      setColor(nextValue);
      return;
    }

    if (activePicker === 'size') {
      setSize(nextValue);
    }
  }

  function openSizePicker(): void {
    if (!category.trim()) {
      Alert.alert('Select Category First', 'Please select an item category before choosing a size.');
      return;
    }

    setActivePicker('size');
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
      Alert.alert('Missing category', 'Please select a category.');
      return;
    }

    const backendCategory = getBackendCategoryValue(category);

    if (!backendCategory) {
      Alert.alert('Missing category', 'Please select a category.');
      return;
    }

    const resolvedSize = sizeHidden ? 'One Size' : size.trim();

    if (!sizeHidden && !resolvedSize) {
      Alert.alert('Missing size', 'Please select a size.');
      return;
    }

    try {
      setUploading(true);
      await uploadWardrobeItem(userId, name.trim(), backendCategory, imageUri, {
        brand: brand.trim(),
        color: color.trim(),
        size: resolvedSize
      });
      setImageUri(null);
      setName('');
      setCategory('');
      setBrand('');
      setColor('');
      setSize('');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Item</Text>
        <Text style={styles.subtitle}>Upload and digitize your clothing.</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={pickFromGallery}>
            <Text style={styles.buttonText}>Pick from Gallery</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={takePhoto}>
            <Text style={styles.buttonText}>Take Photo</Text>
          </Pressable>
        </View>

        {imageUri ? (
          <View style={styles.previewBox}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" transition={200} />
          </View>
        ) : (
          <View style={styles.previewPrompt}>
            <Text style={styles.placeholderText}>Pick or take a photo to preview the item.</Text>
          </View>
        )}

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Item name"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <TouchableOpacity style={styles.fieldButton} onPress={() => setActivePicker('category')} activeOpacity={0.85}>
          <Text style={[styles.fieldButtonText, !category && styles.fieldButtonPlaceholder]}>
            {category || 'Select Category'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.fieldButton} onPress={() => setActivePicker('brand')} activeOpacity={0.85}>
          <Text style={[styles.fieldButtonText, !brand && styles.fieldButtonPlaceholder]}>{brand || 'Select Brand'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.fieldButton} onPress={() => setActivePicker('color')} activeOpacity={0.85}>
          <Text style={[styles.fieldButtonText, !color && styles.fieldButtonPlaceholder]}>{color || 'Select Color'}</Text>
        </TouchableOpacity>

        {!sizeHidden ? (
          <TouchableOpacity style={styles.fieldButton} onPress={openSizePicker} activeOpacity={0.85}>
            <Text style={[styles.fieldButtonText, !size && styles.fieldButtonPlaceholder]}>{size || 'Select Size'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.hiddenSizeSpacer}>
            <Text style={styles.hiddenSizeText}>Size: One Size</Text>
          </View>
        )}

        <Pressable style={styles.primaryButton} onPress={handleUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Upload to Digital Wardrobe</Text>}
        </Pressable>
      </ScrollView>

      <SelectionModal
        visible={activePicker !== null}
        title={activePicker ? getPickerTitle(activePicker) : 'Select'}
        options={activePickerOptions}
        selectedValue={
          activePicker === 'category' ? category : activePicker === 'brand' ? brand : activePicker === 'color' ? color : size
        }
        onSelect={selectPickerValue}
        onClose={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800'
  },
  subtitle: {
    marginTop: 4,
    color: '#64748b'
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
    backgroundColor: '#ffffff'
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff'
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
  previewPrompt: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
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
    borderColor: '#cbd5e1',
    color: '#0f172a'
  },
  fieldButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center'
  },
  fieldButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600'
  },
  fieldButtonPlaceholder: {
    color: '#94a3b8'
  },
  hiddenSizeSpacer: {
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc'
  },
  hiddenSizeText: {
    color: '#64748b',
    fontWeight: '600'
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
  },
  modalContainer: {
    margin: 0,
    justifyContent: 'flex-end'
  },
  selectionSheet: {
    backgroundColor: '#ffffff',
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '75%'
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 14
  },
  modalHeader: {
    paddingBottom: 2
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center'
  },
  modalList: {
    paddingBottom: 4
  },
  modalOption: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    paddingHorizontal: 14,
    justifyContent: 'center'
  },
  modalOptionActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a'
  },
  modalOptionText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700'
  },
  modalOptionTextActive: {
    color: '#ffffff'
  }
});
