import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import {
  fetchDailySuggestion,
  fetchUserProfile,
  fetchWardrobe,
  uploadUserAvatar,
  type DailySuggestion,
  type UserProfile,
  WardrobeItem
} from '../services/api';

type CategoryKey = 'tops' | 'bottoms' | 'footwear' | 'headwear';
type TryOnFlowStep = 'selection' | 'setup' | 'canvas';
type CanvasMode = 'avatar' | 'clothesOnly';

type LayeredWardrobeGroups = Record<CategoryKey, WardrobeItem[]>;
type LayerIndexes = Record<CategoryKey, number>;
type EquipmentMetric = {
  label: string;
  value: number;
};

const EMPTY_GROUPS: LayeredWardrobeGroups = {
  tops: [],
  bottoms: [],
  footwear: [],
  headwear: []
};

const CATEGORY_PATTERNS: Record<CategoryKey, RegExp> = {
  tops: /^(top|tops|outerwear|accessory|eyewear)$/i,
  bottoms: /^(bottom|bottoms|underwear)$/i,
  footwear: /^(footwear|shoes)$/i,
  headwear: /^(headwear|hat)$/i
};

const DEFAULT_INDEXES: LayerIndexes = {
  tops: 0,
  bottoms: 0,
  footwear: 0,
  headwear: 0
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  tops: 'Top',
  bottoms: 'Bottom',
  footwear: 'Footwear',
  headwear: 'Headwear'
};

const TRY_ON_CATEGORIES: CategoryKey[] = ['tops', 'bottoms', 'footwear', 'headwear'];

function mapCategoryToLayer(category: string): CategoryKey | null {
  if (/^(footwear|shoes)$/i.test(category)) {
    return 'footwear';
  }

  if (/^(headwear|hat)$/i.test(category)) {
    return 'headwear';
  }

  if (/^(bottom|bottoms|underwear)$/i.test(category)) {
    return 'bottoms';
  }

  if (/^(top|tops|outerwear|accessory|eyewear)$/i.test(category)) {
    return 'tops';
  }

  return null;
}

function getSuggestedSetupLayers(suggestion: DailySuggestion | null): CategoryKey[] {
  if (!suggestion) {
    return ['tops', 'bottoms', 'footwear'];
  }

  const inferredLayers = Array.from(
    new Set(
      suggestion.suggestedOutfit
        .map((item) => mapCategoryToLayer(item.category ?? ''))
        .filter((layer): layer is CategoryKey => layer !== null)
    )
  );

  if (inferredLayers.length === 0) {
    return ['tops', 'bottoms', 'footwear'];
  }

  return inferredLayers;
}

const NEON_LIME = '#D4FF00';

export function TryOnScreen() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [dailySuggestion, setDailySuggestion] = useState<DailySuggestion | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [indices, setIndices] = useState<LayerIndexes>({ tops: -1, bottoms: -1, footwear: -1, headwear: -1 });
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [avatarSkipped, setAvatarSkipped] = useState(false);
  const [tryOnStep, setTryOnStep] = useState<TryOnFlowStep>('selection');
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('avatar');
  const [selectedSetupLayers, setSelectedSetupLayers] = useState<CategoryKey[]>(['tops', 'bottoms', 'footwear']);
  const cameraRef = useRef<CameraView | null>(null);
  const { width } = useWindowDimensions();

  const avatarSize = Math.min(Math.max(width - 32, 320), 500);
  const avatarHeight = avatarSize * 1.38;

  useEffect(() => {
    let isMounted = true;

    async function loadWardrobe(): Promise<void> {
      try {
        setError(null);
        setLoading(true);
        const [wardrobeItems, userProfile] = await Promise.all([fetchWardrobe(), fetchUserProfile()]);

        if (isMounted) {
          setItems(wardrobeItems);
          setProfile(userProfile);
        }
      } catch (currentError) {
        if (isMounted) {
          setError(currentError instanceof Error ? currentError.message : 'Failed to load wardrobe items');
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
  }, []);

  useEffect(() => {
    if (tryOnStep !== 'setup') {
      return;
    }

    let isMounted = true;

    async function loadSetupSuggestion(): Promise<void> {
      try {
        setSetupLoading(true);
        const suggestion = await fetchDailySuggestion();

        if (!isMounted) {
          return;
        }

        setDailySuggestion(suggestion);
        setSelectedSetupLayers(getSuggestedSetupLayers(suggestion));
      } catch {
        if (isMounted) {
          setDailySuggestion(null);
          setSelectedSetupLayers(['tops', 'bottoms', 'footwear']);
        }
      } finally {
        if (isMounted) {
          setSetupLoading(false);
        }
      }
    }

    void loadSetupSuggestion();

    return () => {
      isMounted = false;
    };
  }, [tryOnStep]);

  const groupedItems = useMemo(() => {
    return items.reduce<LayeredWardrobeGroups>((groups, item) => {
      const category = item.category ?? '';

      if (CATEGORY_PATTERNS.tops.test(category)) {
        groups.tops.push(item);
      } else if (CATEGORY_PATTERNS.bottoms.test(category)) {
        groups.bottoms.push(item);
      } else if (CATEGORY_PATTERNS.footwear.test(category)) {
        groups.footwear.push(item);
      } else if (CATEGORY_PATTERNS.headwear.test(category)) {
        groups.headwear.push(item);
      }

      return groups;
    }, { ...EMPTY_GROUPS, tops: [], bottoms: [], footwear: [], headwear: [] });
  }, [items]);

  const currentItems = useMemo(() => {
    const getItem = (arr: WardrobeItem[], idx: number) => (idx >= 0 && arr.length > 0 ? arr[idx % arr.length] : null);

    return {
      tops: getItem(groupedItems.tops, indices.tops),
      bottoms: getItem(groupedItems.bottoms, indices.bottoms),
      footwear: getItem(groupedItems.footwear, indices.footwear),
      headwear: getItem(groupedItems.headwear, indices.headwear)
    };
  }, [groupedItems, indices]);

  const currentClothingImage = useMemo(() => {
    return currentItems.tops ?? currentItems.bottoms ?? currentItems.footwear ?? currentItems.headwear ?? null;
  }, [currentItems]);

  const equippedBrandCount = useMemo(() => {
    const equippedItems = [currentItems.tops, currentItems.bottoms, currentItems.footwear, currentItems.headwear].filter(
      Boolean
    ) as WardrobeItem[];

    const brandedItems = equippedItems.filter((item) => Boolean(item.brand));
    return new Set(brandedItems.map((item) => item.brand?.trim().toLowerCase())).size;
  }, [currentItems]);

  const stats = useMemo<EquipmentMetric[]>(() => {
    const equippedCount = [currentItems.tops, currentItems.bottoms, currentItems.footwear, currentItems.headwear].filter(
      Boolean
    ).length;

    return [
      { label: 'Drip Level', value: Math.min(100, 30 + equippedCount * 17 + equippedBrandCount * 5) },
      { label: 'Comfort', value: Math.min(100, 45 + (currentItems.bottoms ? 20 : 0) + (profile?.avatarUrl ? 10 : 0)) },
      { label: 'Street Cred', value: Math.min(100, 25 + equippedCount * 15 + equippedBrandCount * 12) }
    ];
  }, [currentItems, equippedBrandCount, profile?.avatarUrl]);

  async function openAvatarCamera(): Promise<void> {
    const permission = cameraPermission ?? (await requestCameraPermission());

    if (!permission?.granted) {
      Alert.alert('Permission required', 'Please allow camera access to take your avatar photo.');
      return;
    }

    setShowCamera(true);
  }

  function skipAvatarCapture(): void {
    setAvatarSkipped(true);
    setShowCamera(false);
    setTryOnStep('canvas');
    setCanvasMode('clothesOnly');
  }

  function flipCamera(): void {
    setCameraFacing((current) => (current === 'front' ? 'back' : 'front'));
  }

  async function captureAndUploadAvatar(): Promise<void> {
    if (!cameraRef.current || uploadingAvatar) {
      return;
    }

    try {
      setUploadingAvatar(true);
      const capturedPhoto = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: true });

      if (!capturedPhoto?.uri) {
        throw new Error('Camera capture failed');
      }

      const updatedProfile = await uploadUserAvatar(capturedPhoto.uri);
      setProfile(updatedProfile);
      setShowCamera(false);
    } catch (currentError) {
      Alert.alert(
        'Avatar upload failed',
        currentError instanceof Error ? currentError.message : 'We could not upload your avatar image.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  function closeCamera(): void {
    if (!uploadingAvatar) {
      setShowCamera(false);
    }
  }

  function toggleSetupLayer(category: CategoryKey): void {
    setSelectedSetupLayers((current) => {
      return current.includes(category) ? current.filter((item) => item !== category) : [...current, category];
    });
  }

  function enterCanvas(): void {
    const nextIndices = TRY_ON_CATEGORIES.reduce<LayerIndexes>((accumulator, category) => {
      if (!selectedSetupLayers.includes(category)) {
        accumulator[category] = -1;
        return accumulator;
      }

      const categoryItems = groupedItems[category];
      accumulator[category] = categoryItems.length > 0 ? 0 : -1;
      return accumulator;
    }, { tops: -1, bottoms: -1, footwear: -1, headwear: -1 });

    setIndices(nextIndices);
    setTryOnStep('canvas');
  }

  function shiftIndex(category: CategoryKey, direction: 1 | -1): void {
    const categoryItems = groupedItems[category];

    if (categoryItems.length === 0) {
      return;
    }

    setIndices((current) => {
      const nextIndex = (current[category] + direction + categoryItems.length) % categoryItems.length;

      return {
        ...current,
        [category]: nextIndex
      };
    });
  }

  function renderControlRow(category: CategoryKey) {
    const selectedItem = currentItems[category];
    const hasItems = groupedItems[category].length > 0;

    return (
      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>{CATEGORY_LABELS[category]}</Text>
        <View style={styles.controlPill}>
          <Pressable
            style={[styles.arrowButton, !hasItems && styles.arrowButtonDisabled]}
            onPress={() => shiftIndex(category, -1)}
            disabled={!hasItems}
          >
            <Text style={styles.arrowText}>{'<'}</Text>
          </Pressable>
          <Text style={styles.controlValue} numberOfLines={1}>
            {selectedItem ? selectedItem.name : 'None'}
          </Text>
          <Pressable
            style={[styles.arrowButton, !hasItems && styles.arrowButtonDisabled]}
            onPress={() => shiftIndex(category, 1)}
            disabled={!hasItems}
          >
            <Text style={styles.arrowText}>{'>'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.stateTitle}>Loading try-on</Text>
        <Text style={styles.stateSubtitle}>Fetching clothes for your layered carousel.</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.stateTitle}>Could not load try-on</Text>
        <Text style={styles.stateSubtitle}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Try On</Text>
        <Text style={styles.subtitle}>Mix and match your digital wardrobe.</Text>
      </View>

      {tryOnStep === 'selection' ? (
        <View style={styles.selectionScreen}>
          <View style={styles.selectionCard}>
            <Text style={styles.selectionTitle}>Pick how to try on</Text>
            <Text style={styles.selectionSubtitle}>Choose avatar capture or browse clothes without one.</Text>
            <View style={styles.selectionActionRow}>
              <Pressable
                style={styles.avatarActionButton}
                onPress={() => {
                  setCanvasMode('avatar');
                  setTryOnStep('setup');
                }}
              >
                <Text style={styles.avatarActionButtonText}>Upload Your Avatar</Text>
              </Pressable>
              <Pressable
                style={styles.avatarSecondaryActionButton}
                onPress={() => {
                  setAvatarSkipped(true);
                  setCanvasMode('clothesOnly');
                  setTryOnStep('setup');
                }}
              >
                <Text style={styles.avatarSecondaryActionButtonText}>Try on without avatar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {tryOnStep === 'setup' ? (
        <View style={styles.setupScreen}>
          <View style={styles.setupCard}>
            <Text style={styles.setupTitle}>Try-On Pre-Setup</Text>
            <Text style={styles.setupSubtitle}>
              {setupLoading
                ? 'Loading recommended layers...'
                : dailySuggestion
                  ? `Weather suggests ${Math.round(dailySuggestion.temperature)}°C. Start with the layers below.`
                  : 'Pick the layers you want before entering Try On.'}
            </Text>

            <View style={styles.setupLayerList}>
              {TRY_ON_CATEGORIES.map((category) => {
                const hasItems = groupedItems[category].length > 0;
                const isSelected = selectedSetupLayers.includes(category);

                return (
                  <Pressable
                    key={category}
                    style={[styles.setupLayerChip, isSelected && styles.setupLayerChipActive, !hasItems && styles.setupLayerChipDisabled]}
                    onPress={() => toggleSetupLayer(category)}
                  >
                    <Text style={[styles.setupLayerChipText, isSelected && styles.setupLayerChipTextActive]}>
                      {CATEGORY_LABELS[category]}
                    </Text>
                    <Text style={[styles.setupLayerChipMeta, isSelected && styles.setupLayerChipTextActive]}>
                      {hasItems ? `${groupedItems[category].length} items` : 'None'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.setupPrimaryButton} onPress={enterCanvas} disabled={setupLoading}>
              <Text style={styles.setupPrimaryButtonText}>Enter Try On</Text>
            </Pressable>

            <Pressable style={styles.setupSecondaryButton} onPress={() => setTryOnStep('selection')}>
              <Text style={styles.setupSecondaryButtonText}>Back</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {tryOnStep === 'canvas' && canvasMode === 'avatar' ? (
        <View style={styles.avatarModeScreen}>
          <View style={styles.avatarModeCard}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarModeImage} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.avatarModePlaceholder}>
                <Text style={styles.avatarModePlaceholderText}>No avatar uploaded yet</Text>
              </View>
            )}

            <Pressable style={styles.avatarModePrimaryButton} onPress={() => void openAvatarCamera()}>
              <Text style={styles.avatarModePrimaryButtonText}>{profile?.avatarUrl ? 'Retake Avatar' : 'Open Camera'}</Text>
            </Pressable>

            <Pressable style={styles.avatarModeSecondaryButton} onPress={() => setCanvasMode('clothesOnly')}>
              <Text style={styles.avatarModeSecondaryButtonText}>Continue Without Avatar Layer</Text>
            </Pressable>

            <Pressable style={styles.avatarModeBackButton} onPress={() => setTryOnStep('setup')}>
              <Text style={styles.avatarModeBackText}>Back to Setup</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {tryOnStep === 'canvas' && canvasMode === 'clothesOnly' ? (
        <ScrollView contentContainerStyle={styles.clothesOnlyScrollContent}>
          <View style={styles.clothesOnlyScreen}>
            <Pressable style={styles.goBackButton} onPress={() => setTryOnStep('setup')}>
              <Text style={styles.goBackButtonText}>{'<'} Go Back</Text>
            </Pressable>

            <View style={styles.arrowRow}>
              <Pressable
                style={[styles.arrowButton, !groupedItems.tops.length && styles.arrowButtonDisabled]}
                onPress={() => shiftIndex('tops', -1)}
                disabled={!groupedItems.tops.length}
              >
                <Text style={styles.arrowText}>{'<'}</Text>
              </Pressable>

              <View style={styles.clothingPreviewWrap}>
                {currentClothingImage ? (
                  <Image
                    source={{ uri: currentClothingImage.cutoutImageUrl ?? currentClothingImage.originalImageUrl }}
                    style={styles.clothingPreviewImage}
                    contentFit="contain"
                    transition={200}
                  />
                ) : null}
              </View>

              <Pressable
                style={[styles.arrowButton, !groupedItems.tops.length && styles.arrowButtonDisabled]}
                onPress={() => shiftIndex('tops', 1)}
                disabled={!groupedItems.tops.length}
              >
                <Text style={styles.arrowText}>{'>'}</Text>
              </Pressable>
            </View>

            <View style={styles.categoryStrip}>
              {renderControlRow('tops')}
              {renderControlRow('bottoms')}
              {renderControlRow('footwear')}
              {renderControlRow('headwear')}
            </View>
          </View>
        </ScrollView>
      ) : null}

      {uploadingAvatar ? (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.uploadingText}>Uploading avatar...</Text>
        </View>
      ) : null}

      <Modal visible={showCamera} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeCamera}>
        <View style={styles.cameraScreen}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing={cameraFacing} />

          <View style={styles.cameraScrimTop} />
          <View style={styles.cameraScrimBottom} />

          <View style={styles.cameraHeader}>
            <Text style={styles.cameraInstructions}>
              Stand about 2 meters back. Keep the phone at waist level.
            </Text>
          </View>

          <View style={styles.cameraStageWrap}>
            <View style={[styles.cameraGuideFrame, { height: avatarHeight, width: avatarSize }]} />
          </View>

          <View style={styles.cameraControls}>
            <Pressable style={styles.cameraIconButton} onPress={closeCamera} disabled={uploadingAvatar}>
              <Ionicons name="close" size={28} color="#f8fafc" />
            </Pressable>
            <Pressable style={styles.cameraCaptureButton} onPress={() => void captureAndUploadAvatar()} disabled={uploadingAvatar}>
              <View style={styles.cameraCaptureButtonInner} />
            </Pressable>
            <Pressable style={styles.cameraIconButton} onPress={flipCamera} disabled={uploadingAvatar}>
              <Ionicons name="camera-reverse" size={28} color="#f8fafc" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    marginTop: 4,
    color: '#64748b'
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
    paddingBottom: 24,
    paddingTop: 8,
    overflow: 'hidden'
  },
  selectionScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 420
  },
  selectionCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    gap: 12
  },
  selectionTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800'
  },
  selectionSubtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20
  },
  selectionActionRow: {
    gap: 12
  },
  setupScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  setupCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16
  },
  setupTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800'
  },
  setupSubtitle: {
    marginTop: 6,
    color: '#475569',
    lineHeight: 20
  },
  setupLayerList: {
    marginTop: 14,
    gap: 10
  },
  setupLayerChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  setupLayerChipActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a'
  },
  setupLayerChipDisabled: {
    opacity: 0.6
  },
  setupLayerChipText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800'
  },
  setupLayerChipTextActive: {
    color: '#ffffff'
  },
  setupLayerChipMeta: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700'
  },
  setupPrimaryButton: {
    marginTop: 16,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  setupPrimaryButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  setupSecondaryButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  setupSecondaryButtonText: {
    color: '#475569',
    fontWeight: '700'
  },
  avatarModeScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  avatarModeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16
  },
  avatarModeImage: {
    width: '100%',
    height: 340,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    marginBottom: 12
  },
  avatarModePlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarModePlaceholderText: {
    color: '#475569',
    fontWeight: '600'
  },
  avatarModePrimaryButton: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10
  },
  avatarModePrimaryButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  avatarModeSecondaryButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8
  },
  avatarModeSecondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700'
  },
  avatarModeBackButton: {
    alignItems: 'center',
    paddingVertical: 4
  },
  avatarModeBackText: {
    color: '#475569',
    fontWeight: '700'
  },
  clothesOnlyScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    minHeight: 520,
    overflow: 'hidden'
  },
  clothesOnlyScrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
    backgroundColor: '#ffffff'
  },
  goBackButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  goBackButtonText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '700'
  },
  categoryStrip: {
    width: '100%',
    gap: 10,
    marginTop: 18
  },
  arrowRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  clothingPreviewWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280
  },
  clothingPreviewImage: {
    width: 250,
    height: 250
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc'
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
  avatarStage: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 4,
    marginBottom: 12
  },
  equipmentShell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 10,
    marginTop: 8,
    overflow: 'hidden'
  },
  slotColumn: {
    display: 'none'
  },
  slotCard: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.66)',
    borderRadius: 18,
    padding: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  slotCardHidden: {
    display: 'none'
  },
  avatarPressTarget: {
    width: '100%',
    height: '100%'
  },
  avatarFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    overflow: 'hidden'
  },
  avatarFrameEmpty: {
    borderWidth: 0
  },
  shadow: {
    position: 'absolute',
    bottom: '4%',
    left: '12%',
    right: '12%',
    height: '5%',
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.14)'
  },
  avatarImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0
  },
  avatarPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  avatarOutlineHead: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(226, 232, 240, 0.75)',
    marginBottom: 10
  },
  avatarOutlineBody: {
    width: '36%',
    height: '34%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(226, 232, 240, 0.75)',
    marginBottom: 12
  },
  avatarPlaceholderLabel: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center'
  },
  avatarPlaceholderHint: {
    marginTop: 8,
    color: '#cbd5e1',
    textAlign: 'center'
  },
  avatarActionRow: {
    width: '100%',
    gap: 10,
    marginTop: 14
  },
  avatarActionButton: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.45)',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarActionButtonText: {
    color: '#f8fafc',
    fontWeight: '800',
    textAlign: 'center'
  },
  avatarSecondaryActionButton: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.26)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  avatarSecondaryActionButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
    textAlign: 'center'
  },
  avatarFooter: {
    marginTop: 10,
    alignItems: 'center'
  },
  avatarFooterText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800'
  },
  avatarFooterSubtext: {
    marginTop: 4,
    color: '#64748b'
  },
  head: {
    position: 'absolute',
    top: '8%',
    width: '16%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#cbd5e1'
  },
  neck: {
    position: 'absolute',
    top: '19%',
    width: '5%',
    height: '5%',
    borderRadius: 12,
    backgroundColor: '#cbd5e1'
  },
  torso: {
    position: 'absolute',
    top: '23%',
    width: '34%',
    height: '28%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: '#e2e8f0'
  },
  armLeft: {
    position: 'absolute',
    top: '24%',
    left: '24%',
    width: '8%',
    height: '26%',
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    transform: [{ rotate: '-18deg' }]
  },
  armRight: {
    position: 'absolute',
    top: '24%',
    right: '24%',
    width: '8%',
    height: '26%',
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    transform: [{ rotate: '18deg' }]
  },
  legLeft: {
    position: 'absolute',
    top: '48%',
    left: '39%',
    width: '8%',
    height: '29%',
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    transform: [{ rotate: '4deg' }]
  },
  legRight: {
    position: 'absolute',
    top: '48%',
    right: '39%',
    width: '8%',
    height: '29%',
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    transform: [{ rotate: '-4deg' }]
  },
  footwearLayer: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    bottom: '2%',
    height: '17%',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  footwearImage: {
    width: '100%',
    height: '100%'
  },
  bottomsLayer: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '45%',
    height: '28%',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomsImage: {
    width: '100%',
    height: '100%'
  },
  topsLayer: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '19%',
    height: '28%',
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  topsImage: {
    width: '100%',
    height: '100%'
  },
  headwearLayer: {
    position: 'absolute',
    left: '24%',
    right: '24%',
    top: '0%',
    height: '17%',
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'flex-start'
  },
  headwearImage: {
    width: '100%',
    height: '100%'
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10
  },
  controlRow: {
    gap: 8
  },
  controlLabel: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  arrowButtonDisabled: {
    backgroundColor: '#cbd5e1'
  },
  arrowText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800'
  },
  controlValue: {
    flex: 1,
    marginHorizontal: 12,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center'
  },
  uploadingOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    alignItems: 'center'
  },
  uploadingText: {
    marginTop: 8,
    color: '#f8fafc',
    fontWeight: '700'
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between'
  },
  cameraScrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '14%',
    backgroundColor: 'rgba(2, 6, 23, 0.52)'
  },
  cameraScrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '18%',
    backgroundColor: 'rgba(2, 6, 23, 0.58)'
  },
  cameraHeader: {
    paddingTop: 56,
    paddingHorizontal: 18,
    zIndex: 3
  },
  cameraInstructions: {
    color: '#f8fafc',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    flexWrap: 'wrap',
    maxWidth: 280,
    alignSelf: 'center'
  },
  cameraStageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cameraGuideFrame: {
    borderWidth: 2,
    borderColor: 'rgba(248, 250, 252, 0.18)',
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },
  cameraIconButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.18)'
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 28,
    zIndex: 3
  },
  cameraCaptureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(248, 250, 252, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.42)'
  },
  cameraCaptureButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f8fafc'
  },
  cameraControlSpacer: {
    minWidth: 90
  }
});