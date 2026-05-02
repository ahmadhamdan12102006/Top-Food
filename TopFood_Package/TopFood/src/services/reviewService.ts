import { collection, doc, query, where, orderBy, getDocs, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import type { Review, MenuItem } from '../types';

export const addReview = async (reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const newReviewId = doc(reviewsRef).id;

    const finalReview: Review = {
      id: newReviewId,
      ...reviewData,
      createdAt: Date.now()
    };

    // Transaction protects multiple writes concurrently happening to the same MenuItem ratings average.
    await runTransaction(db, async (transaction) => {
      const itemRef = doc(db, 'menuItems', reviewData.itemId);
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists()) {
        throw new Error("MenuItem does not exist!");
      }

      const itemData = itemDoc.data() as MenuItem;
      const currentRating = itemData.rating || 0;
      const currentCount = itemData.reviewCount || 0;

      // Mathematically rebuild the standard ratings average resolving new constraints.
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + reviewData.rating) / newCount;

      // 1. Commit the actual review node
      const reviewRef = doc(db, 'reviews', newReviewId);
      transaction.set(reviewRef, finalReview);

      // 2. Adjust target menu item statistics locally globally.
      transaction.update(itemRef, {
        rating: Number(newRating.toFixed(1)),
        reviewCount: newCount
      });
    });

    return newReviewId;
  } catch (error) {
    console.error("Error adding review context & transaction hook: ", error);
    throw error;
  }
};

export const getReviewsByItem = async (itemId: string): Promise<Review[]> => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef,
      where('itemId', '==', itemId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
  } catch (error) {
    console.error(`Error fetching reviews for item ${itemId}:`, error);
    throw error;
  }
};
