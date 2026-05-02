import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from './firebase';
import type { Category, MenuItem } from '../types';
import { topFoodMenuSeed } from '../data/topFoodMenuSeed';

const normalizeText = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

type ImportSummary = {
  createdCategories: number;
  updatedCategories: number;
  createdItems: number;
  updatedItems: number;
};

export const importTopFoodMenuSeed = async (): Promise<ImportSummary> => {
  const summary: ImportSummary = {
    createdCategories: 0,
    updatedCategories: 0,
    createdItems: 0,
    updatedItems: 0,
  };

  const categoriesSnapshot = await getDocs(collection(db, 'categories'));
  const menuItemsSnapshot = await getDocs(collection(db, 'menuItems'));

  const existingCategories = categoriesSnapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Omit<Category, 'id'>),
  }));

  const existingItems = menuItemsSnapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Omit<MenuItem, 'id'>),
  }));

  const categoryIdByName = new Map<string, string>();
  const categoryImageById = new Map<string, string>();

  for (const seedCategory of topFoodMenuSeed) {
    const existingCategory = existingCategories.find(
      (category) => normalizeText(category.name) === normalizeText(seedCategory.name)
    );

    if (existingCategory) {
      const nextImage = existingCategory.image || seedCategory.image;

      await updateDoc(doc(db, 'categories', existingCategory.id), {
        name: seedCategory.name,
        image: nextImage,
        order: seedCategory.order,
        isActive: true,
        updatedAt: Date.now(),
      });

      categoryIdByName.set(seedCategory.name, existingCategory.id);
      categoryImageById.set(existingCategory.id, nextImage);
      summary.updatedCategories += 1;
      continue;
    }

    const newCategoryRef = doc(collection(db, 'categories'));

    await setDoc(newCategoryRef, {
      id: newCategoryRef.id,
      name: seedCategory.name,
      image: seedCategory.image,
      order: seedCategory.order,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    categoryIdByName.set(seedCategory.name, newCategoryRef.id);
    categoryImageById.set(newCategoryRef.id, seedCategory.image);
    summary.createdCategories += 1;
  }

  for (const seedCategory of topFoodMenuSeed) {
    const categoryId = categoryIdByName.get(seedCategory.name);
    if (!categoryId) continue;

    const categoryImage = categoryImageById.get(categoryId) || seedCategory.image;

    for (const seedItem of seedCategory.items) {
      const existingItem = existingItems.find(
        (item) =>
          item.categoryId === categoryId &&
          normalizeText(item.name) === normalizeText(seedItem.name)
      );

      const payload = {
        name: seedItem.name,
        description: existingItem?.description || seedItem.description || '',
        price: seedItem.price,
        categoryId,
        images:
          existingItem?.images && existingItem.images.length > 0
            ? existingItem.images
            : [categoryImage],
        isAvailable: existingItem?.isAvailable !== false,
        rating: existingItem?.rating || 0,
        reviewCount: existingItem?.reviewCount || 0,
        updatedAt: Date.now(),
      };

      if (existingItem) {
        await updateDoc(doc(db, 'menuItems', existingItem.id), payload);
        summary.updatedItems += 1;
        continue;
      }

      const newItemRef = doc(collection(db, 'menuItems'));

      await setDoc(newItemRef, {
        id: newItemRef.id,
        ...payload,
        createdAt: Date.now(),
      });

      summary.createdItems += 1;
    }
  }

  return summary;
};
