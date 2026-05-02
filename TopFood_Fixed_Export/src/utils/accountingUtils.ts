import type { Expense, Loan, Order, DailyReport } from '../types';
import { isCompletedOrder } from '../services/orderService';

export const calculateNetProfit = (revenue: number, expenses: number, loansGiven: number, loansReceived: number): number => {
  return revenue + loansReceived - expenses - loansGiven;
};

export const calculateCashReconciliation = ({
  openingBalance = 0,
  cashSales,
  cashExpenses,
  cashLoansGiven,
  cashLoansReceived,
  actualCashInRegister
}: {
  openingBalance?: number;
  cashSales: number;
  cashExpenses: number;
  cashLoansGiven: number;
  cashLoansReceived: number;
  actualCashInRegister: number;
}): { expectedCash: number; variance: number } => {
  const expectedCash = openingBalance + cashSales + cashLoansReceived - cashExpenses - cashLoansGiven;
  const variance = actualCashInRegister - expectedCash;
  return { expectedCash, variance };
};

export const summarizeOrders = (orders: Order[]) => {
  let totalOrders = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  let totalRevenue = 0; // from delivered
  let totalDeliveryFees = 0; // from delivered
  let cancelledTotal = 0; // from cancelled

  orders.forEach(order => {
    totalOrders++;
    
    if (isCompletedOrder(order)) {
      deliveredCount++;
      totalRevenue += order.total;
      totalDeliveryFees += order.deliveryFee || 0;
    } else if (order.status === 'cancelled') {
      cancelledCount++;
      cancelledTotal += order.total;
    }
  });

  const averageOrderValue = deliveredCount > 0 ? totalRevenue / deliveredCount : 0;

  return {
    totalOrders,
    deliveredCount,
    cancelledCount,
    totalRevenue,
    totalDeliveryFees,
    cancelledTotal,
    averageOrderValue
  };
};

export const categorizeExpenses = (expenses: Expense[]): Record<string, number> => {
  return expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
};

export const generateDailyReportObject = (
  date: number,
  orders: Order[],
  expenses: Expense[],
  loans: Loan[],
  closedBy: string
): Omit<DailyReport, 'id'> => {
  const orderSummary = summarizeOrders(orders);
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const totalLoansGiven = loans
    .filter(l => l.type === 'given')
    .reduce((sum, l) => sum + l.amount, 0);
    
  const totalLoansReceived = loans
    .filter(l => l.type === 'received')
    .reduce((sum, l) => sum + l.amount, 0);

  const netProfit = calculateNetProfit(
    orderSummary.totalRevenue,
    totalExpenses,
    totalLoansGiven,
    totalLoansReceived
  );

  return {
    date,
    totalRevenue: orderSummary.totalRevenue,
    totalExpenses,
    totalLoansGiven,
    totalLoansReceived,
    cancelledTotal: orderSummary.cancelledTotal,
    netProfit,
    orderCount: orderSummary.totalOrders,
    cancelledCount: orderSummary.cancelledCount,
    closedBy,
    closedAt: Date.now()
  };
};
