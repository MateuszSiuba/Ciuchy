import Constants from 'expo-constants';

const API_URL = resolveApiUrl();

export type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  originalImageUrl: string;
  cutoutImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  subcategory?: string | null;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
};

export type UploadWardrobeItemResponse = {
  item: WardrobeItem;
  user: UserProfile;
};

export type WardrobeItemUpdate = {
  name?: string;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  subcategory?: string;
};

export type UserProfile = {
  id: string;
  email?: string | null;
  name: string;
  isGuest: boolean;
  level: number;
  drip: number;
  swag: number;
  xp: number;
  displayName?: string | null;
  avatarUrl?: string | null;
  basePhotoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DailySuggestion = {
  temperature: number;
  weatherCode: number | null;
  suggestedOutfit: WardrobeItem[];
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildUserHeaders(userId: string, contentType?: string): HeadersInit {
  const headers: Record<string, string> = {
    'x-user-id': userId
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return headers;
}

export async function authGuest(): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/auth/guest`, {
    method: 'POST'
  });

  return parseResponse<UserProfile>(response);
}

export async function authGoogle(email: string, name?: string, avatarUrl?: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, name, avatarUrl })
  });

  return parseResponse<UserProfile>(response);
}

export async function fetchWardrobe(userId: string): Promise<WardrobeItem[]> {
  const response = await fetch(`${API_URL}/wardrobe`, {
    headers: buildUserHeaders(userId)
  });
  return parseResponse<WardrobeItem[]>(response);
}

export async function fetchDailySuggestion(userId: string, lat?: number, lon?: number): Promise<DailySuggestion> {
  const query = new URLSearchParams();

  if (typeof lat === 'number') {
    query.set('lat', String(lat));
  }

  if (typeof lon === 'number') {
    query.set('lon', String(lon));
  }

  const response = await fetch(`${API_URL}/wardrobe/daily-suggestion${query.toString() ? `?${query.toString()}` : ''}`, {
    headers: buildUserHeaders(userId)
  });
  return parseResponse<DailySuggestion>(response);
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/user/profile`, {
    headers: buildUserHeaders(userId)
  });
  return parseResponse<UserProfile>(response);
}

export async function uploadUserAvatar(userId: string, imageUri: string): Promise<UserProfile> {
  const formData = new FormData();
  const uploadFile = getUploadFileDescriptorFromUri(imageUri);

  formData.append('image', {
    uri: imageUri,
    name: uploadFile.name,
    type: uploadFile.type
  } as unknown as Blob);

  const response = await fetch(`${API_URL}/user/avatar`, {
    method: 'POST',
    headers: buildUserHeaders(userId),
    body: formData
  });

  return parseResponse<UserProfile>(response);
}

export async function uploadWardrobeItem(
  userId: string,
  name: string,
  category: string,
  imageUri: string,
  metadata?: { brand?: string; color?: string; size?: string; subcategory?: string }
): Promise<UploadWardrobeItemResponse> {
  const formData = new FormData();
  const uploadFile = getUploadFileDescriptorFromUri(imageUri);

  formData.append('userId', userId);
  formData.append('name', name);
  formData.append('category', category);
  if (metadata?.brand) {
    formData.append('brand', metadata.brand);
  }
  if (metadata?.color) {
    formData.append('color', metadata.color);
  }
  if (metadata?.size) {
    formData.append('size', metadata.size);
  }
  if (metadata?.subcategory) {
    formData.append('subcategory', metadata.subcategory);
  }
  formData.append('image', {
    uri: imageUri,
    name: uploadFile.name,
    type: uploadFile.type
  } as unknown as Blob);

  const response = await fetch(`${API_URL}/wardrobe/upload`, {
    method: 'POST',
    headers: buildUserHeaders(userId),
    body: formData
  });

  return parseResponse<UploadWardrobeItemResponse>(response);
}

export async function updateWardrobeItem(userId: string, itemId: string, updates: WardrobeItemUpdate): Promise<WardrobeItem> {
  const response = await fetch(`${API_URL}/wardrobe/${itemId}`, {
    method: 'PATCH',
    headers: buildUserHeaders(userId, 'application/json'),
    body: JSON.stringify(updates)
  });

  return parseResponse<WardrobeItem>(response);
}

export async function deleteWardrobeItem(userId: string, itemId: string): Promise<void> {
  const response = await fetch(`${API_URL}/wardrobe/${itemId}`, {
    method: 'DELETE',
    headers: buildUserHeaders(userId)
  });

  await parseResponse<{ success: boolean }>(response);
}

function getUploadFileDescriptorFromUri(uri: string): { name: string; type: string } {
  const lastSegment = uri.split('/').pop();
  const normalizedName = lastSegment && lastSegment.includes('.') ? lastSegment : 'upload.jpg';

  if (/\.png$/i.test(normalizedName)) {
    return { name: normalizedName, type: 'image/png' };
  }

  if (/\.webp$/i.test(normalizedName)) {
    return { name: normalizedName, type: 'image/webp' };
  }

  if (/\.jpe?g$/i.test(normalizedName)) {
    return { name: normalizedName, type: 'image/jpeg' };
  }

  return { name: 'upload.jpg', type: 'image/jpeg' };
}

function resolveApiUrl(): string {
  const productionUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (productionUrl) {
    return productionUrl.replace(/\/+$/g, '');
  }

  return 'https://wardrobe-api-8fd5.onrender.com/api';
}
