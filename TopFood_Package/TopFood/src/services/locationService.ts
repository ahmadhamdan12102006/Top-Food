import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ─── Update Driver Live Location ────────────────────────────
export const updateDriverLocation = async (
  driverId: string,
  coords: { lat: number; lng: number }
): Promise<void> => {
  const driverRef = doc(db, 'drivers', driverId);
  await updateDoc(driverRef, {
    liveLocation: {
      lat: coords.lat,
      lng: coords.lng,
      updatedAt: Date.now(),
    },
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
};

// ─── Clear Driver Location ──────────────────────────────────
export const clearDriverLocation = async (driverId: string): Promise<void> => {
  const driverRef = doc(db, 'drivers', driverId);
  await updateDoc(driverRef, {
    liveLocation: null,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
};

// ─── Toggle Location Sharing ────────────────────────────────
export const setLocationSharing = async (
  driverId: string,
  enabled: boolean
): Promise<void> => {
  const driverRef = doc(db, 'drivers', driverId);
  await updateDoc(driverRef, {
    isLocationSharingEnabled: enabled,
    ...(enabled ? {} : { liveLocation: null }),
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
};

// ─── Subscribe to Driver Location (Real-Time) ───────────────
export const subscribeToDriverLocation = (
  driverId: string,
  callback: (location: { lat: number; lng: number; updatedAt: number } | null) => void
) => {
  const driverRef = doc(db, 'drivers', driverId);

  return onSnapshot(driverRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.data();
    callback(data?.liveLocation || null);
  });
};

// ─── Geolocation Watcher (Browser API) ──────────────────────
let watchId: number | null = null;

export const startLocationWatching = (
  driverId: string,
  onError?: (msg: string) => void
): void => {
  if (!navigator.geolocation) {
    onError?.('المتصفح لا يدعم خدمة الموقع');
    return;
  }

  // Stop any existing watcher
  stopLocationWatching();

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      updateDriverLocation(driverId, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }).catch(console.error);
    },
    (error) => {
      console.error('Geolocation error:', error);
      if (error.code === 1) onError?.('تم رفض إذن الموقع. يرجى السماح بمشاركة الموقع.');
      else if (error.code === 2) onError?.('تعذر تحديد الموقع الحالي.');
      else onError?.('انتهت مهلة تحديد الموقع.');
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    }
  );
};

export const stopLocationWatching = (): void => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
};

// ─── Get Current Position (One-shot) ────────────────────────
export const getCurrentPosition = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('المتصفح لا يدعم خدمة الموقع'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};
