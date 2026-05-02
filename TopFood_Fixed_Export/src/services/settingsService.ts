import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { SiteSettings } from '../types';

/**
 * Fetches the global site settings (delivery areas, app state, etc.)
 */
export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  try {
    const settingsRef = doc(db, 'siteSettings', 'app');
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      return docSnap.data() as SiteSettings;
    }

    return null;
  } catch (error) {
    console.error('Error fetching site settings:', error);
    throw error;
  }
};

/**
 * Updates the global site settings
 */
export const updateSiteSettings = async (settings: SiteSettings): Promise<void> => {
  try {
    const settingsRef = doc(db, 'siteSettings', 'app');
    await setDoc(settingsRef, settings);
  } catch (error) {
    console.error('Error updating site settings:', error);
    throw error;
  }
};
