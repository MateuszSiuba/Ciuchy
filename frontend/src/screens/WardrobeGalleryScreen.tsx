import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Modal from 'react-native-modal';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  BRAND_OPTIONS,
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
  SelectionModal,
  getBackendCategoryValue,
  getSizeOptions,
  isSizeHidden
} from './UploadScreen';

import {
  DailySuggestion,
  deleteWardrobeItem,
  fetchDailySuggestion,
  fetchWardrobe,
  updateWardrobeItem,
  WardrobeItem
} from '../services/api';

const CATEGORY_FILTERS = [
  { key: 'tops', label: 'Tops', matcher: /^(top|tops|outerwear|accessory|eyewear)$/i },
  { key: 'bottoms', label: 'Bottoms', matcher: /^(bottom|bottoms|underwear)$/i },
  { key: 'footwear', label: 'Footwear', matcher: /^(footwear)$/i },
  { key: 'headwear', label: 'Headwear', matcher: /^(headwear)$/i }
] as const;

const NEON_LIME = '#D4FF00';
const WEATHER_REFRESH_INTERVAL = 30 * 60 * 1000;

type CategoryFilterKey = (typeof CATEGORY_FILTERS)[number]['key'];
type WardrobeItemDraft = {
  name: string;
  category: string;
  brand: string;
  color: string;
  size: string;
};
type EditPickerKey = 'category' | 'brand' | 'color' | 'size';

const EMPTY_DRAFT: WardrobeItemDraft = {
  name: '',
  category: '',
  brand: '',
  color: '',
  size: ''
};

type TempGradient = {
  colors: [string, string];
  locations: [number, number];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function makeGradient(firstColor: string, secondColor: string, blend: number): TempGradient {
  const balancedBlend = clamp(blend, 0, 1);

  return {
    colors: [firstColor, secondColor],
    locations: [0, 0.14 + balancedBlend * 0.72]
  };
}

function getTempGradient(temp: number): TempGradient {
  if (temp >= 30) {
    return { colors: ['#FF0000', '#FF0000'], locations: [0, 1] };
  }

  if (temp >= 20) {
    return makeGradient('#FF0000', '#FF9500', (temp - 20) / 9);
  }

  if (temp >= 11) {
    return makeGradient('#FF9500', '#FFCC00', (temp - 11) / 8);
  }

  if (temp >= 0) {
    return makeGradient('#007AFF', '#AF52DE', temp / 10);
  }

  if (temp >= -19) {
    return makeGradient('#AF52DE', '#FFFFFF', (temp + 19) / 18);
  }

  return { colors: ['#FFFFFF', '#FFFFFF'], locations: [0, 1] };
}

function toEditCategoryLabel(category: string): string {
  if (CATEGORY_OPTIONS.some((option) => option.value === category)) {
    return category;
  }

  switch (category) {
    case 'FOOTWEAR':
      return 'Shoes';
    case 'HEADWEAR':
      return 'Hat';
    case 'TOP':
      return 'Shirt';
    case 'OUTERWEAR':
      return 'Hoodie';
    case 'BOTTOM':
      return 'Pants';
    case 'ACCESSORY':
      return 'Accessories';
    case 'EYEWEAR':
      return 'Glasses';
    default:
      return category;
  }
}

function toBackendCategory(category: string): string {
  const normalized = category.trim().toUpperCase();
  const backendEnumSet = new Set(['TOP', 'BOTTOM', 'OUTERWEAR', 'FOOTWEAR', 'HEADWEAR', 'ACCESSORY', 'EYEWEAR', 'UNDERWEAR', 'OTHER']);

  if (backendEnumSet.has(normalized)) {
    return normalized;
  }

  return getBackendCategoryValue(category);
}

type Props = {
  userId: string;
};

export function WardrobeGalleryScreen({ userId }: Props) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [dailySuggestion, setDailySuggestion] = useState<DailySuggestion | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<CategoryFilterKey[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [draftItem, setDraftItem] = useState<WardrobeItemDraft>(EMPTY_DRAFT);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [activeEditPicker, setActiveEditPicker] = useState<EditPickerKey | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const lastWeatherRefreshAtRef = useRef<number | null>(null);

  const editSizeHidden = draftItem.category ? isSizeHidden(draftItem.category) : false;
  const editSizeOptions = useMemo(() => getSizeOptions(draftItem.category), [draftItem.category]);

  const editPickerOptions = useMemo(() => {
    switch (activeEditPicker) {
      case 'category':
        return CATEGORY_OPTIONS;
      case 'brand':
        return BRAND_OPTIONS;
      case 'color':
        return COLOR_OPTIONS;
      case 'size':
        return editSizeOptions;
      default:
        return [];
    }
  }, [activeEditPicker, editSizeOptions]);

  const loadItems = useCallback(async (isRefresh = false): Promise<void> => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      setSuggestionError(null);

      const wardrobeItems = await fetchWardrobe(userId);
      setItems(wardrobeItems);

      let smartSuggestion: DailySuggestion;
      const now = Date.now();
      const isWeatherFresh =
        !isRefresh &&
        lastWeatherRefreshAtRef.current !== null &&
        now - lastWeatherRefreshAtRef.current < WEATHER_REFRESH_INTERVAL;

      if (isWeatherFresh) {
        return;
      }

      try {
        setLocationLoading(true);
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.granted) {
          const position = await Location.getCurrentPositionAsync({});
          const [suggestionFromLocation, place] = await Promise.all([
            fetchDailySuggestion(userId, position.coords.latitude, position.coords.longitude),
            Location.reverseGeocodeAsync({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          ]);

          smartSuggestion = suggestionFromLocation;

          const resolvedCity =
            place[0]?.city ?? place[0]?.district ?? place[0]?.subregion ?? place[0]?.region ?? null;

          setCityName(resolvedCity);
        } else {
          smartSuggestion = await fetchDailySuggestion(userId);
          setCityName(null);
        }
      } catch {
        smartSuggestion = await fetchDailySuggestion(userId);
        setCityName(null);
      } finally {
        setLocationLoading(false);
      }

      setItems(wardrobeItems);
      setDailySuggestion(smartSuggestion);
      lastWeatherRefreshAtRef.current = now;
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : 'Failed to load wardrobe items';
      setError(message);

      if (currentError instanceof Error && /daily-suggestion|Weather|temperature/i.test(currentError.message)) {
        setSuggestionError(currentError.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems])
  );

  const uniqueBrands = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => item.brand?.trim())
          .filter((brand): brand is string => Boolean(brand))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [item.name, item.brand, item.subcategory]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));

      const matchesCategory =
        selectedCategories.length === 0 ||
        CATEGORY_FILTERS.filter((filter) => selectedCategories.includes(filter.key)).some((filter) =>
          filter.matcher.test(item.category ?? '')
        );

      const normalizedBrand = item.brand?.trim() ?? '';
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(normalizedBrand);

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [items, searchQuery, selectedCategories, selectedBrands]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategories.length > 0 || selectedBrands.length > 0;

  const suggestionMessage = useMemo(() => {
    if (!dailySuggestion) {
      return 'Smart suggestion is unavailable right now.';
    }

    if (dailySuggestion.temperature >= 20) {
      return "It's warm today. Try this light fit:";
    }

    return "It's chilly today. Try this cozy fit:";
  }, [dailySuggestion]);

  const temperatureGradient = useMemo(() => {
    if (!dailySuggestion) {
      return { colors: ['#94a3b8', '#cbd5e1'] as [string, string], locations: [0, 1] as [number, number] };
    }

    return getTempGradient(dailySuggestion.temperature);
  }, [dailySuggestion]);

  const weatherVisual = useMemo<'sunny' | 'rainy' | 'cloudy'>(() => {
    const weatherCode = dailySuggestion?.weatherCode;

    if (weatherCode === null || weatherCode === undefined) {
      return 'cloudy';
    }

    if (weatherCode === 0 || weatherCode === 1) {
      return 'sunny';
    }

    if (
      (weatherCode >= 51 && weatherCode <= 67) ||
      (weatherCode >= 80 && weatherCode <= 82) ||
      (weatherCode >= 95 && weatherCode <= 99)
    ) {
      return 'rainy';
    }

    return 'cloudy';
  }, [dailySuggestion]);

  function toggleCategory(category: CategoryFilterKey): void {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  }

  function toggleBrand(brand: string): void {
    setSelectedBrands((current) =>
      current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand]
    );
  }

  function openItemDetails(item: WardrobeItem): void {
    setSelectedItem(item);
    setDraftItem({
      name: item.name ?? '',
      category: toEditCategoryLabel(item.category ?? ''),
      brand: item.brand ?? '',
      color: item.color ?? '',
      size: item.size ?? ''
    });
    setActiveEditPicker(null);
    setIsEditingItem(false);
  }

  function closeItemDetails(): void {
    setSelectedItem(null);
    setIsEditingItem(false);
    setActiveEditPicker(null);
    setDraftItem(EMPTY_DRAFT);
  }

  function startEditingItem(): void {
    if (selectedItem) {
      setDraftItem({
        name: selectedItem.name ?? '',
        category: toEditCategoryLabel(selectedItem.category ?? ''),
        brand: selectedItem.brand ?? '',
        color: selectedItem.color ?? '',
        size: selectedItem.size ?? ''
      });
      setIsEditingItem(true);
    }
  }

  function selectEditPickerValue(nextValue: string): void {
    if (activeEditPicker === 'category') {
      setDraftItem((current) => ({ ...current, category: nextValue, size: '' }));
      return;
    }

    if (activeEditPicker === 'brand') {
      setDraftItem((current) => ({ ...current, brand: nextValue }));
      return;
    }

    if (activeEditPicker === 'color') {
      setDraftItem((current) => ({ ...current, color: nextValue }));
      return;
    }

    if (activeEditPicker === 'size') {
      setDraftItem((current) => ({ ...current, size: nextValue }));
    }
  }

  function openEditPicker(key: EditPickerKey): void {
    if (key === 'size' && !draftItem.category.trim()) {
      Alert.alert('Select Category First', 'Please select an item category before choosing a size.');
      return;
    }

    setActiveEditPicker(key);
  }

  async function handleSaveSelectedItem(): Promise<void> {
    if (!selectedItem || savingItemId) {
      return;
    }

    const backendCategory = toBackendCategory(draftItem.category);

    if (!backendCategory) {
      Alert.alert('Save failed', 'Please select a valid category.');
      return;
    }

    const resolvedSize = editSizeHidden ? 'One Size' : draftItem.size.trim();

    if (!editSizeHidden && !resolvedSize) {
      Alert.alert('Save failed', 'Please select a valid size.');
      return;
    }

    try {
      setSavingItemId(selectedItem.id);
      const updatedItem = await updateWardrobeItem(userId, selectedItem.id, {
        name: draftItem.name.trim(),
        category: backendCategory,
        brand: draftItem.brand.trim(),
        color: draftItem.color.trim(),
        size: resolvedSize
      });

      setItems((current) => current.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      setSelectedItem(updatedItem);
      setDraftItem({
        name: updatedItem.name ?? '',
        category: toEditCategoryLabel(updatedItem.category ?? ''),
        brand: updatedItem.brand ?? '',
        color: updatedItem.color ?? '',
        size: updatedItem.size ?? ''
      });
      setIsEditingItem(false);
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : 'Failed to update item';
      Alert.alert('Save failed', message);
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleDeleteSelectedItem(): Promise<void> {
    if (!selectedItem || deletingItemId) {
      return;
    }

    try {
      setDeletingItemId(selectedItem.id);
      await deleteWardrobeItem(userId, selectedItem.id);
      setItems((current) => current.filter((item) => item.id !== selectedItem.id));
      closeItemDetails();
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : 'Failed to delete item';
      Alert.alert('Delete failed', message);
    } finally {
      setDeletingItemId(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.stateTitle}>Loading gallery</Text>
          <Text style={styles.stateSubtitle}>Fetching your latest wardrobe items.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>Could not load gallery</Text>
          <Text style={styles.stateSubtitle}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadItems()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Wardrobe Gallery</Text>
        <Text style={styles.subtitle}>Your cutout items, sorted newest first.</Text>
      </View>

      <FlatList
        data={filteredItems}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadItems(true)} />}
        ListHeaderComponent={
          <View style={styles.listHeaderContent}>
            <View style={styles.smartCard}>
              <View pointerEvents="none" style={styles.weatherGraphicLayer}>
                {weatherVisual === 'sunny' ? (
                  <Ionicons name="sunny" size={140} color="rgba(255, 255, 255, 0.08)" />
                ) : null}

                {weatherVisual === 'cloudy' ? (
                  <Ionicons name="cloudy" size={140} color="rgba(255, 255, 255, 0.08)" />
                ) : null}

                {weatherVisual === 'rainy' ? (
                  <View style={styles.rainGraphicWrap}>
                    <Ionicons name="rainy" size={120} color="rgba(255, 255, 255, 0.08)" />
                    <View style={styles.rainLine} />
                    <View style={styles.rainLine} />
                    <View style={styles.rainLine} />
                  </View>
                ) : null}
              </View>

              <View style={styles.smartCardHeader}>
                <View style={{ flexShrink: 1, marginRight: 16 }}>
                  <Text style={[styles.smartCardTitle, { marginBottom: 4 }]}>Daily Smart Suggestion</Text>
                  <Text style={{ color: 'gray' }}>{suggestionError ? 'Could not load weather suggestion.' : suggestionMessage}</Text>
                </View>
                {locationLoading ? (
                  <ActivityIndicator size="small" color={NEON_LIME} />
                ) : (
                  <View style={styles.weatherMetaWrap}>
                    <View style={styles.weatherTextWrap}>
                      <Text style={styles.cityNameText}>{cityName ?? 'Local area'}</Text>
                      <MaskedView
                        style={{ width: 80, height: 30, alignItems: 'flex-end', justifyContent: 'center' }}
                        maskElement={
                          <Text style={[styles.smartCardTemp, { textAlign: 'right', width: 80 }]}>{dailySuggestion ? `${Math.round(dailySuggestion.temperature)}°C` : '--'}</Text>
                        }
                      >
                        <LinearGradient
                          colors={temperatureGradient.colors}
                          locations={temperatureGradient.locations}
                          start={{ x: 0.1, y: 0.1 }}
                          end={{ x: 0.9, y: 0.9 }}
                          style={styles.temperatureGradient}
                        />
                      </MaskedView>
                    </View>
                  </View>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
                {(dailySuggestion?.suggestedOutfit ?? []).map((item) => (
                  <View style={styles.suggestionItem} key={item.id}>
                    <Image source={{ uri: item.cutoutImageUrl ?? item.originalImageUrl }} style={styles.suggestionImage} contentFit="cover" transition={200} />
                  </View>
                ))}
                {(dailySuggestion?.suggestedOutfit ?? []).length === 0 ? (
                  <Text style={styles.suggestionFallback}>Add tops, bottoms, and shoes to unlock suggestions.</Text>
                ) : null}
              </ScrollView>
            </View>

            <View style={styles.searchBarWrap}>
              <Ionicons name="search-outline" size={18} color="#64748b" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name, brand, or subcategory"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>

            <Text style={styles.filterSectionTitle}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {CATEGORY_FILTERS.map((filter) => {
                const isActive = selectedCategories.includes(filter.key);

                return (
                  <Pressable key={filter.key} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => toggleCategory(filter.key)}>
                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.filterSectionTitle}>Brands</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowBrands}>
              {uniqueBrands.map((brand) => {
                const isActive = selectedBrands.includes(brand);

                return (
                  <Pressable key={brand} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => toggleBrand(brand)}>
                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{brand}</Text>
                  </Pressable>
                );
              })}
              {uniqueBrands.length === 0 ? (
                <Text style={styles.noBrandsText}>No brands available yet.</Text>
              ) : null}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.stateTitle}>No items match your filters</Text>
            <Text style={styles.stateSubtitle}>
              {hasActiveFilters
                ? 'Try clearing a few filters or broadening your search query.'
                : 'Upload your first item to populate the gallery.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const imageUrl = item.cutoutImageUrl ?? item.originalImageUrl;

          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => openItemDetails(item)}>
              <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={200} />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {item.category}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        isVisible={Boolean(selectedItem)}
        onBackdropPress={closeItemDetails}
        onSwipeComplete={closeItemDetails}
        swipeDirection={['down']}
        swipeThreshold={50}
        propagateSwipe={true}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationInTiming={400}
        backdropTransitionInTiming={400}
        animationOutTiming={300}
        backdropTransitionOutTiming={300}
        style={styles.modalContainer}
        useNativeDriver={false}
        useNativeDriverForBackdrop={true}
        hideModalContentWhileAnimating={true}
      >
        <View style={styles.modalCard}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 12, marginBottom: 12 }} />
          {selectedItem ? (
            <>
              <Image source={{ uri: selectedItem.cutoutImageUrl ?? selectedItem.originalImageUrl }} style={{ width: '100%', height: 250 }} contentFit="contain" transition={200} />
              {isEditingItem ? (
                <>
                  <TextInput style={styles.editInput} value={draftItem.name} onChangeText={(value) => setDraftItem((current) => ({ ...current, name: value }))} placeholder="Name" placeholderTextColor="#94a3b8" />
                  <View style={styles.editSelectTouchWrap}>
                    <TouchableOpacity activeOpacity={0.7} style={styles.editSelectField} onPress={() => openEditPicker('category')}>
                      <Text style={[styles.editSelectText, !draftItem.category && styles.editSelectPlaceholder]}>
                        {draftItem.category || 'Select Category'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.editSelectTouchWrap}>
                    <TouchableOpacity activeOpacity={0.7} style={styles.editSelectField} onPress={() => openEditPicker('brand')}>
                      <Text style={[styles.editSelectText, !draftItem.brand && styles.editSelectPlaceholder]}>
                        {draftItem.brand || 'Select Brand'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.editSelectTouchWrap}>
                    <TouchableOpacity activeOpacity={0.7} style={styles.editSelectField} onPress={() => openEditPicker('color')}>
                      <Text style={[styles.editSelectText, !draftItem.color && styles.editSelectPlaceholder]}>
                        {draftItem.color || 'Select Color'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {!editSizeHidden ? (
                    <View style={styles.editSelectTouchWrap}>
                      <TouchableOpacity activeOpacity={0.7} style={styles.editSelectField} onPress={() => openEditPicker('size')}>
                        <Text style={[styles.editSelectText, !draftItem.size && styles.editSelectPlaceholder]}>
                          {draftItem.size || 'Select Size'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.editSizeHintWrap}>
                      <Text style={styles.editSizeHintText}>Size: One Size</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                  <View style={styles.metadataBadgeWrap}>
                    <View style={styles.metadataBadge}>
                      <Text style={styles.metadataBadgeText}>Brand: {selectedItem.brand?.trim() || '—'}</Text>
                    </View>
                    <View style={styles.metadataBadge}>
                      <Text style={styles.metadataBadgeText}>Size: {selectedItem.size?.trim() || '—'}</Text>
                    </View>
                    <View style={styles.metadataBadge}>
                      <Text style={styles.metadataBadgeText}>Color: {selectedItem.color?.trim() || '—'}</Text>
                    </View>
                    <View style={styles.metadataBadge}>
                      <Text style={styles.metadataBadgeText}>Category: {selectedItem.category}</Text>
                    </View>
                  </View>
                </>
              )}

              <View style={styles.modalButtonRow}>
                {isEditingItem ? (
                  <Pressable style={styles.primaryModalButton} onPress={() => void handleSaveSelectedItem()} disabled={Boolean(savingItemId)}>
                    <Text style={styles.primaryModalButtonText}>{savingItemId ? 'Saving...' : 'Save'}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.primaryModalButton} onPress={startEditingItem}>
                    <Text style={styles.primaryModalButtonText}>Edit</Text>
                  </Pressable>
                )}

                {isEditingItem ? (
                  <Pressable style={styles.secondaryModalButton} onPress={() => setIsEditingItem(false)}>
                    <Text style={styles.secondaryModalButtonText}>Cancel</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.secondaryModalButton} onPress={closeItemDetails}>
                    <Text style={styles.secondaryModalButtonText}>Close</Text>
                  </Pressable>
                )}
              </View>

              <Pressable style={styles.deleteButton} onPress={() => void handleDeleteSelectedItem()} disabled={Boolean(deletingItemId)}>
                <Text style={styles.deleteButtonText}>{deletingItemId ? 'Deleting...' : 'Delete Item'}</Text>
              </Pressable>

              <SelectionModal
                visible={activeEditPicker !== null}
                title={
                  activeEditPicker === 'category'
                    ? 'Select Category'
                    : activeEditPicker === 'brand'
                      ? 'Select Brand'
                      : activeEditPicker === 'color'
                        ? 'Select Color'
                        : 'Select Size'
                }
                options={editPickerOptions}
                selectedValue={
                  activeEditPicker === 'category'
                    ? draftItem.category
                    : activeEditPicker === 'brand'
                      ? draftItem.brand
                      : activeEditPicker === 'color'
                        ? draftItem.color
                        : draftItem.size
                }
                onSelect={selectEditPickerValue}
                onClose={() => setActiveEditPicker(null)}
              />
            </>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
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
    color: '#64748b',
    marginTop: 4
  },
  listContent: {
    paddingBottom: 24
  },
  listHeaderContent: {
    paddingHorizontal: 16
  },
  smartCard: {
    borderRadius: 20,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden'
  },
  weatherGraphicLayer: {
    position: 'absolute',
    top: -18,
    right: -22,
    opacity: 1
  },
  rainGraphicWrap: {
    alignItems: 'center'
  },
  rainLine: {
    width: 34,
    height: 2,
    marginTop: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '-20deg' }]
  },
  smartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  smartCardTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: -4
  },
  weatherTextWrap: {
    alignItems: 'flex-end'
  },
  temperatureGradient: {
    width: '100%',
    height: '100%'
  },
  smartCardTemp: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900'
  },
  weatherMetaWrap: {
    alignItems: 'flex-end'
  },
  cityNameText: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 0
  },
  smartCardMessage: {
    marginTop: -6,
    marginBottom: 8,
    color: '#cbd5e1'
  },
  suggestionRow: {
    marginTop: 8,
    gap: 8,
    paddingRight: 6
  },
  suggestionItem: {
    width: 78,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 12,
    padding: 6
  },
  suggestionImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 9,
    backgroundColor: 'rgba(248, 250, 252, 0.92)'
  },
  suggestionFallback: {
    color: '#94a3b8',
    alignSelf: 'center',
    paddingVertical: 10
  },
  searchBarWrap: {
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#0f172a'
  },
  filterSectionTitle: {
    marginTop: 4,
    marginBottom: 4,
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 8,
    paddingRight: 12
  },
  filterRowBrands: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 10,
    paddingRight: 12
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#e2e8f0'
  },
  filterChipActive: {
    backgroundColor: '#0f172a'
  },
  filterText: {
    color: '#0f172a',
    fontWeight: '700'
  },
  filterTextActive: {
    color: '#ffffff'
  },
  noBrandsText: {
    color: '#94a3b8',
    alignSelf: 'center'
  },
  card: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  image: {
    width: '100%',
    aspectRatio: 0.9,
    borderRadius: 14,
    backgroundColor: '#f1f5f9'
  },
  cardTitle: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700'
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#64748b',
    textTransform: 'capitalize'
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24
  },
  stateTitle: {
    marginTop: 12,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center'
  },
  stateSubtitle: {
    marginTop: 8,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  modalContainer: {
    margin: 0,
    justifyContent: 'flex-end'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 18,
    paddingTop: 0,
    paddingBottom: 40
  },
  modalImage: {
    width: '100%',
    height: 280,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    marginBottom: 14,
    alignSelf: 'center'
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12
  },
  editInput: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    color: '#0f172a'
  },
  editSelectField: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    justifyContent: 'center'
  },
  editSelectText: {
    color: '#0f172a',
    fontWeight: '600'
  },
  editSelectPlaceholder: {
    color: '#94a3b8'
  },
  editSelectTouchWrap: {
    position: 'relative',
    zIndex: 999,
    elevation: 10
  },
  editSizeHintWrap: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10
  },
  editSizeHintText: {
    color: '#64748b',
    fontWeight: '600'
  },
  metadataBadgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4
  },
  metadataBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: NEON_LIME,
    backgroundColor: '#0f172a'
  },
  metadataBadgeText: {
    color: NEON_LIME,
    fontWeight: '700',
    fontSize: 12
  },
  deleteButton: {
    marginTop: 18,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  primaryModalButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  primaryModalButtonText: {
    color: NEON_LIME,
    fontWeight: '800'
  },
  secondaryModalButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  secondaryModalButtonText: {
    color: '#0f172a',
    fontWeight: '800'
  }
});