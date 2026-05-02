import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { InventoryItem } from '../types';

const INVENTORY_COLLECTION = 'inventory';

const normalizeInventoryItem = (
  id: string,
  data?: Partial<InventoryItem> | null
): InventoryItem => ({
  id,
  name: data?.name || '',
  category: data?.category || 'extras',
  image: data?.image || '',
  isAvailable: data?.isAvailable !== false,
  isRequired: data?.isRequired === true,
  createdAt: data?.createdAt,
  updatedAt: data?.updatedAt,
});

export const getAllInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const q = query(collection(db, INVENTORY_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((document) =>
      normalizeInventoryItem(document.id, document.data() as Partial<InventoryItem>)
    );
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    // Return empty array if index is missing or collection is empty
    return [];
  }
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, INVENTORY_COLLECTION));
    const newItem = normalizeInventoryItem(docRef.id, {
      ...item,
      id: docRef.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await setDoc(docRef, {
      ...newItem,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding inventory item:', error);
    throw error;
  }
};

export const updateInventoryItem = async (id: string, data: Partial<InventoryItem>): Promise<void> => {
  try {
    const docRef = doc(db, INVENTORY_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, INVENTORY_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};
