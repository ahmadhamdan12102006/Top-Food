import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { Expense, Loan, DailyReport } from '../types';

export const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>): Promise<string> => {
  const expenseRef = doc(collection(db, 'expenses'));
  const newExpense: Expense = {
    id: expenseRef.id,
    ...expense,
    createdAt: Date.now()
  };
  await setDoc(expenseRef, newExpense);
  return expenseRef.id;
};

export const getExpensesByDateRange = async (start: number, end: number): Promise<Expense[]> => {
  const q = query(
    collection(db, 'expenses'),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Expense);
};

export const deleteExpense = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'expenses', id));
};

export const addLoan = async (loan: Omit<Loan, 'id' | 'createdAt'>): Promise<string> => {
  const loanRef = doc(collection(db, 'loans'));
  const newLoan: Loan = {
    id: loanRef.id,
    ...loan,
    createdAt: Date.now()
  };
  await setDoc(loanRef, newLoan);
  return loanRef.id;
};

export const getLoansByDateRange = async (start: number, end: number): Promise<Loan[]> => {
  const q = query(
    collection(db, 'loans'),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Loan);
};

export const deleteLoan = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'loans', id));
};

export const saveDailyReport = async (report: Omit<DailyReport, 'id'>): Promise<string> => {
  const reportRef = doc(collection(db, 'dailyReports'));
  const newReport: DailyReport = {
    id: reportRef.id,
    ...report
  };
  await setDoc(reportRef, newReport);
  return reportRef.id;
};

export const getDailyReports = async (limitNum = 30): Promise<DailyReport[]> => {
  const q = query(
    collection(db, 'dailyReports'),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as DailyReport).slice(0, limitNum);
};

export const getDailyReportByDate = async (startOfDay: number): Promise<DailyReport | null> => {
  const q = query(
    collection(db, 'dailyReports'),
    where('date', '==', startOfDay)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as DailyReport;
};
