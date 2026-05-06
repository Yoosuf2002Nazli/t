import AsyncStorage from '@react-native-async-storage/async-storage';
import { GalleryImage } from '../types';

const GALLERY_KEY = 'receipt_app_gallery_v5';

export const getAllGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    const data = await AsyncStorage.getItem(GALLERY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load gallery', e);
    return [];
  }
};

export const saveGalleryImage = async (image: GalleryImage): Promise<void> => {
  try {
    const images = await getAllGalleryImages();
    const existingIndex = images.findIndex((img) => img.id === image.id);
    if (existingIndex >= 0) {
      images[existingIndex] = image;
    } else {
      images.unshift(image);
    }
    await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(images));
  } catch (e) {
    console.error('Failed to save gallery image', e);
  }
};

export const deleteGalleryImage = async (id: string): Promise<void> => {
  try {
    const images = await getAllGalleryImages();
    const filtered = images.filter((img) => img.id !== id);
    await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete gallery image', e);
  }
};
