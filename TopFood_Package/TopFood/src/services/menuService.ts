import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Category, MenuItem } from '../types';

const categoriesRef = collection(db, 'categories');
const menuItemsRef = collection(db, 'menuItems');

export const getCategories = async (): Promise<Category[]> => {
  try {
    const q = query(categoriesRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as Category[];
  } catch (error) {
    console.error('Get categories error:', error);
    throw error;
  }
};

export const getActiveCategories = async (): Promise<Category[]> => {
  const categories = await getCategories();
  return categories
    .filter((cat) => cat.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const createCategory = async (
  payload: Omit<Category, 'id'>
): Promise<string> => {
  try {
    const docRef = await addDoc(categoriesRef, {
      name: payload.name,
      image: payload.image || '',
      order: payload.order || 0,
      isActive: payload.isActive ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Create category error:', error);
    throw error;
  }
};

export const updateCategory = async (
  categoryId: string,
  payload: Partial<Category>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'categories', categoryId), {
      ...payload,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.error('Update category error:', error);
    throw error;
  }
};

export const saveCategory = async (
  categoryId: string,
  payload: Omit<Category, 'id'>
): Promise<void> => {
  try {
    await setDoc(doc(db, 'categories', categoryId), {
      ...payload,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.error('Save category error:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    console.error('Delete category error:', error);
    throw error;
  }
};

export const getMenuItems = async (): Promise<MenuItem[]> => {
  try {
    const snapshot = await getDocs(menuItemsRef);

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as MenuItem[];
  } catch (error) {
    console.error('Get menu items error:', error);
    throw error;
  }
};

export const getMenuItem = async (itemId: string): Promise<MenuItem | null> => {
  const items = await getMenuItems();
  return items.find((item) => item.id === itemId) ?? null;
};

export const reorderCategories = async (
  categories: Category[]
): Promise<void> => {
  try {
    await Promise.all(
      categories.map((category, index) =>
        updateDoc(doc(db, 'categories', category.id), {
          order: index + 1,
          updatedAt: Date.now(),
          updatedAtServer: serverTimestamp(),
        })
      )
    );
  } catch (error) {
    console.error('Reorder categories error:', error);
    throw error;
  }
};
