const API_BASE_URL = 'http://localhost:3000';

export type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  originalImageUrl: string;
  cutoutImageUrl?: string | null;
  createdAt?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchWardrobe(userId: string): Promise<WardrobeItem[]> {
  const response = await fetch(`${API_BASE_URL}/wardrobe?userId=${encodeURIComponent(userId)}`);
  return parseResponse<WardrobeItem[]>(response);
}

export async function uploadWardrobeItem(
  userId: string,
  name: string,
  category: string,
  imageUri: string
): Promise<WardrobeItem> {
  const formData = new FormData();

  formData.append('userId', userId);
  formData.append('name', name);
  formData.append('category', category);
  formData.append('image', {
    uri: imageUri,
    name: getFileNameFromUri(imageUri),
    type: getMimeTypeFromUri(imageUri)
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/wardrobe/upload`, {
    method: 'POST',
    body: formData
  });

  return parseResponse<WardrobeItem>(response);
}

function getFileNameFromUri(uri: string): string {
  const lastSegment = uri.split('/').pop();
  return lastSegment && lastSegment.includes('.') ? lastSegment : 'photo.jpg';
}

function getMimeTypeFromUri(uri: string): string {
  if (/\.png$/i.test(uri)) {
    return 'image/png';
  }

  if (/\.webp$/i.test(uri)) {
    return 'image/webp';
  }

  return 'image/jpeg';
}
