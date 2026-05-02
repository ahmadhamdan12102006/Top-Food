import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { Invoice } from '../types';

export const saveInvoice = async (invoice: Omit<Invoice, 'id' | 'createdAt'>, existingId?: string): Promise<string> => {
  const invoiceRef = existingId ? doc(db, 'invoices', existingId) : doc(collection(db, 'invoices'));
  const newInvoice: Invoice = {
    id: invoiceRef.id,
    ...invoice,
    createdAt: existingId ? (invoice as any).createdAt || Date.now() : Date.now()
  };
  await setDoc(invoiceRef, newInvoice);
  return invoiceRef.id;
};

export const getInvoices = async (): Promise<Invoice[]> => {
  const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Invoice);
};

export const deleteInvoice = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'invoices', id));
};
