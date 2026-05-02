import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface FeedbackRequest {
  id: string;
  orderId: string;
  userId: string;
  scheduledAt: number;
  status: 'pending' | 'sent' | 'completed';
}

export interface CustomerFeedback {
  id: string;
  orderId: string;
  userId: string;
  customerName?: string;
  customerPhone?: string;
  rating: number;
  message: string;
  createdAt: number;
  isRead: boolean;
}

export const scheduleFeedbackRequest = async (orderId: string, userId: string): Promise<void> => {
  const requestRef = doc(collection(db, 'feedback_requests'));
  const scheduledAt = Date.now() + 30 * 60 * 1000; // 30 minutes from now

  await setDoc(requestRef, {
    id: requestRef.id,
    orderId,
    userId,
    scheduledAt,
    status: 'pending',
    createdAtServer: serverTimestamp()
  });
};

export const getPendingFeedbackRequestsForUser = async (userId: string): Promise<FeedbackRequest[]> => {
  const q = query(
    collection(db, 'feedback_requests'),
    where('userId', '==', userId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  const now = Date.now();
  
  return snapshot.docs
    .map(doc => doc.data() as FeedbackRequest)
    .filter(req => req.scheduledAt <= now); // Only return those whose time has come
};

export const markFeedbackRequestAsCompleted = async (requestId: string): Promise<void> => {
  const requestRef = doc(db, 'feedback_requests', requestId);
  await updateDoc(requestRef, {
    status: 'completed',
    updatedAtServer: serverTimestamp()
  });
};

export const submitCustomerFeedback = async (feedback: Omit<CustomerFeedback, 'id' | 'createdAt' | 'isRead'>): Promise<string> => {
  const feedbackRef = doc(collection(db, 'customer_feedback'));
  await setDoc(feedbackRef, {
    ...feedback,
    id: feedbackRef.id,
    createdAt: Date.now(),
    isRead: false,
    createdAtServer: serverTimestamp()
  });
  return feedbackRef.id;
};

export const getAllCustomerFeedback = async (): Promise<CustomerFeedback[]> => {
  const q = query(
    collection(db, 'customer_feedback'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as CustomerFeedback);
};

export const markFeedbackAsRead = async (feedbackId: string): Promise<void> => {
  const feedbackRef = doc(db, 'customer_feedback', feedbackId);
  await updateDoc(feedbackRef, {
    isRead: true,
    updatedAtServer: serverTimestamp()
  });
};
