import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { deleteUser, getAuth } from 'firebase/auth';
import { db } from './firebase';
import type { Address, User } from '../types';
import {
  buildFullPhoneNumber,
  buildPhoneSearchCandidates,
  normalizePhoneForStorage,
} from '../utils/phone';

const normalizeUser = (userId: string, data?: Partial<User> | null): User => ({
  id: userId,
  name: data?.name?.trim() || '',
  phone: data?.phone || '',
  countryCode: data?.countryCode || '+970',
  role: data?.role || 'customer',
  profileImage: data?.profileImage ?? null,
  loyaltyPoints: Number(data?.loyaltyPoints || 0),
  addresses: Array.isArray(data?.addresses) ? data.addresses : [],
});

const buildUserWritePayload = (
  userId: string,
  userData: Partial<User>,
  existing?: Partial<User> | null
) => {
  const normalized = normalizeUser(userId, userData);
  const phone = normalizePhoneForStorage(
    normalized.phone,
    normalized.countryCode || '+970'
  );

  return {
    ...normalized,
    phone,
    phoneSearch: buildPhoneSearchCandidates(
      phone,
      normalized.countryCode || '+970'
    ),
    role: existing?.role || userData.role || normalized.role || 'customer',
  };
};

export const createUser = async (
  userId: string,
  userData: Partial<User>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(
        userRef,
        buildUserWritePayload(
          userId,
          {
            ...userData,
            role: userData.role || 'customer',
          },
          null
        )
      );
      return;
    }

    const existing = snapshot.data() as Partial<User>;

    await setDoc(
      userRef,
      buildUserWritePayload(
        userId,
        {
          ...existing,
          ...userData,
          role: existing.role || userData.role || 'customer',
          loyaltyPoints:
            typeof userData.loyaltyPoints === 'number'
              ? userData.loyaltyPoints
              : existing.loyaltyPoints ?? 0,
          addresses:
            Array.isArray(userData.addresses)
              ? userData.addresses
              : Array.isArray(existing.addresses)
                ? existing.addresses
                : [],
          profileImage:
            userData.profileImage !== undefined
              ? userData.profileImage
              : existing.profileImage ?? null,
        },
        existing
      ),
      { merge: true }
    );
  } catch (error) {
    console.error('Error creating user context:', error);
    throw error;
  }
};

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    return normalizeUser(userId, snapshot.data() as Partial<User>);
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

export const getUserByPhone = async (
  phone: string,
  countryCode = '+970'
): Promise<User | null> => {
  try {
    const candidates = buildPhoneSearchCandidates(phone, countryCode);
    const e164Phone = buildFullPhoneNumber(countryCode, phone);

    if (!candidates.length && !e164Phone) return null;

    const searchCandidates = Array.from(
      new Set([e164Phone, ...candidates].filter(Boolean))
    );

    for (const candidate of searchCandidates) {
      const phoneSearchSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('phoneSearch', 'array-contains', candidate)
        )
      );

      if (!phoneSearchSnapshot.empty) {
        const matched = phoneSearchSnapshot.docs[0];
        return normalizeUser(matched.id, matched.data() as Partial<User>);
      }
    }

    const snapshot = await getDocs(
      query(collection(db, 'users'), where('phone', 'in', candidates))
    );

    if (snapshot.empty) return null;

    const matched = snapshot.docs[0];
    return normalizeUser(matched.id, matched.data() as Partial<User>);
  } catch (error) {
    console.error('Error fetching user by phone:', error);
    return null;
  }
};

export const migrateLegacyPhoneUser = async (params: {
  authUid: string;
  phone: string;
  countryCode?: string;
}) => {
  const { authUid, phone, countryCode = '+970' } = params;

  try {
    const matchedUser = await getUserByPhone(phone, countryCode);

    if (!matchedUser || matchedUser.id === authUid) {
      return null;
    }

    await createUser(authUid, {
      ...matchedUser,
      id: authUid,
      phone: matchedUser.phone || normalizePhoneForStorage(phone, countryCode),
      countryCode: matchedUser.countryCode || countryCode,
      role: matchedUser.role,
    });

    return await getUser(authUid);
  } catch (error) {
    console.error('Error migrating legacy phone user:', error);
    return null;
  }
};

export const updateUser = async (
  userId: string,
  data: Partial<User>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const nextPayload: Partial<User> & { phoneSearch?: string[] } = { ...data };

    if (data.phone) {
      nextPayload.phone = normalizePhoneForStorage(
        data.phone,
        data.countryCode || '+970'
      );
      nextPayload.phoneSearch = buildPhoneSearchCandidates(
        nextPayload.phone,
        data.countryCode || '+970'
      );
    }

    await updateDoc(userRef, nextPayload);
  } catch (error) {
    console.error('Error updating user docs:', error);
    throw error;
  }
};

export const addAddress = async (
  userId: string,
  address: Address
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        addresses: arrayUnion(address),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error adding address:', error);
    throw error;
  }
};

export const deleteAddress = async (
  userId: string,
  addressId: string
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const user = normalizeUser(userId, userSnap.data() as Partial<User>);
    const targetAddress = user.addresses.find((address) => address.id === addressId);

    if (!targetAddress) return;

    await updateDoc(userRef, {
      addresses: arrayRemove(targetAddress),
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
};

export const deleteAccount = async (userId: string): Promise<void> => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    await deleteDoc(doc(db, 'users', userId));

    if (currentUser && currentUser.uid === userId) {
      await deleteUser(currentUser);
    }
  } catch (error) {
    console.error('Error deleting account entirely:', error);
    throw error;
  }
};

export const getUserAddresses = async (userId: string): Promise<Address[]> => {
  try {
    const user = await getUser(userId);
    return user?.addresses || [];
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    return [];
  }
};

export const addUserAddress = async (
  userId: string,
  address: Omit<Address, 'id'>
): Promise<string> => {
  try {
    const id = doc(collection(db, 'dummy')).id; // Generate a unique ID
    const newAddress: Address = { ...address, id };
    await addAddress(userId, newAddress);
    return id;
  } catch (error) {
    console.error('Error in addUserAddress:', error);
    throw error;
  }
};

export const deleteUserAddress = deleteAddress;
export const updateUserProfile = updateUser;
