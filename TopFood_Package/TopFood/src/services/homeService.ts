import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { HomeSettings } from '../types';

const SETTINGS_DOC_ID = 'home_settings_v1';
const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);

export const getHomeSettings = async (): Promise<HomeSettings | null> => {
  try {
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data() as HomeSettings;
    }
    return null;
  } catch (error) {
    console.error('Get home settings error:', error);
    throw error;
  }
};

export const saveHomeSettings = async (settings: HomeSettings): Promise<void> => {
  try {
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.error('Save home settings error:', error);
    throw error;
  }
};

export const getDefaultHomeSettings = (): HomeSettings => ({
  banners: [],
  featuredItemIds: [],
  popularItemIds: [],
  sections: [],
  updatedAt: Date.now(),
});
