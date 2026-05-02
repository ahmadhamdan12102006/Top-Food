import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, DollarSign, Wallet, TrendingDown, 
  TrendingUp, Printer, Plus, Trash2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency } from '../../utils';
import { getTodayOrders } from '../../services/adminService';
import { 
  getExpensesByDateRange, getLoansByDateRange, addExpense, 
  deleteExpense, addLoan, deleteLoan, saveDailyReport, getDailyReportByDate
} from '../../services/accountingService';
import { generateDailyReportObject } from '../../utils/accountingUtils';
import type { Expense, Loan, Order, DailyReport } from '../../types';

const AccountingPage: React.FC = () => {
  const { user } = useAuthStore();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  // New Expense Form
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('مشتريات');

  // New Loan Form
  const [loanPerson, setLoanPerson] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanType, setLoanType] = useState<'given' | 'received'>('given');

  const EXPENSE_CATEGORIES = ['مشتريات', 'رواتب', 'تشغيلية', 'أخرى'];

  const getStartOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const startOfDay = getStartOfToday();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  const loadData = async () => {
    setLoading(true);
    try {
      const [todayOrders, todayExpenses, todayLoans, existingReport] = await Promise.all([
        getTodayOrders(),
        getExpensesByDateRange(startOfDay, endOfDay),
        getLoansByDateRange(startOfDay, endOfDay),
        getDailyReportByDate(startOfDay)
      ]);

      setOrders(todayOrders);
      setExpenses(todayExpenses);
      setLoans(todayLoans);
      setDailyReport(existingReport);
    } catch (error) {
      console.error('Error loading accounting data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reportPreview = useMemo(() => {
    return generateDailyReportObject(startOfDay, orders, expenses, loans, user?.name || 'Admin');
  }, [orders, expenses, loans, startOfDay, user]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || !expenseAmount || isNaN(Number(expenseAmount))) {
      toast.error('الرجاء إدخال بيانات المصروف بشكل صحيح');
      return;
    }

    try {
      await addExpense({
        description: expenseDesc,
        amount: Number(expenseAmount),
        category: expenseCategory,
        date: Date.now(),
        createdBy: user?.name || 'Admin'
      });
      toast.success('تمت إضافة المصروف');
      setExpenseDesc('');
      setExpenseAmount('');
      loadData();
    } catch (err) {
      toast.error('فشل إضافة المصروف');
    }
  };

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanPerson || !loanAmount || isNaN(Number(loanAmount))) {
      toast.error('الرجاء إدخال بيانات السلفة بشكل صحيح');
      return;
    }

    try {
      await addLoan({
        personName: loanPerson,
        amount: Number(loanAmount),
        type: loanType,
        date: Date.now(),
        notes: ''
      });
      toast.success('تم تسجيل السلفة');
      setLoanPerson('');
      setLoanAmount('');
      loadData();
    } catch (err) {
      toast.error('فشل تسجيل السلفة');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      await deleteExpense(id);
      toast.success('تم الحذف');
      loadData();
    } catch (err) {
      toast.error('فشل الحذف');
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه السلفة؟')) return;
    try {
      await deleteLoan(id);
      toast.success('تم الحذف');
      loadData();
    } catch (err) {
      toast.error('فشل الحذف');
    }
  };

  const handleCloseDay = async () => {
    if (dailyReport) {
      toast.error('تم إغلاق هذا اليوم مسبقاً');
      return;
    }

    if (!window.confirm('هل أنت متأكد من إغلاق اليوم؟ لن تتمكن من التعديل على التقرير بعد إغلاقه.')) {
      return;
    }

    try {
      await saveDailyReport(reportPreview);
      toast.success('تم إغلاق اليوم بنجاح');
      loadData();
    } catch (err) {
      toast.error('حدث خطأ أثناء إغلاق اليوم');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="admin-loading__spinner"></div>
      </div>
    );
  }

  const isClosed = !!dailyReport;
  const currentReport = dailyReport || reportPreview;

  return (
    <div className="admin-page print-container">
      <div className="admin-page__header hide-on-print">
        <div>
          <h1 className="admin-page__title">المحاسبة وتسفير الكاش</h1>
          <p className="admin-page__subtitle">
            تقرير يوم: {new Date().toLocaleDateString('ar-EG')}
            {isClosed && <span className="mr-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">يوم مغلق</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="admin-btn admin-btn--ghost">
            <Printer size={18} /> طباعة التقرير
          </button>
          {!isClosed && (
            <button onClick={handleCloseDay} className="admin-btn admin-btn--primary">
              <Calculator size={18} /> إغلاق وتسفير
            </button>
          )}
        </div>
      </div>

      <div className="admin-stats-grid mb-6 print-stats">
        <div className="admin-stat-card border-green-500">
          <div className="admin-stat-card__icon bg-green-50 text-green-500"><DollarSign size={24}/></div>
          <div>
            <p className="admin-stat-card__value">{formatCurrency(currentReport.totalRevenue)}</p>
            <p className="admin-stat-card__label">المبيعات الإجمالية</p>
          </div>
        </div>
        <div className="admin-stat-card border-red-500">
          <div className="admin-stat-card__icon bg-red-50 text-red-500"><TrendingDown size={24}/></div>
          <div>
            <p className="admin-stat-card__value">{formatCurrency(currentReport.totalExpenses)}</p>
            <p className="admin-stat-card__label">المصاريف</p>
          </div>
        </div>
        <div className="admin-stat-card border-blue-500">
          <div className="admin-stat-card__icon bg-blue-50 text-blue-500"><TrendingUp size={24}/></div>
          <div>
            <p className="admin-stat-card__value">
              {formatCurrency(currentReport.totalLoansGiven)} / {formatCurrency(currentReport.totalLoansReceived)}
            </p>
            <p className="admin-stat-card__label">سلف (منصرف / مستلم)</p>
          </div>
        </div>
        <div className="admin-stat-card border-purple-500">
          <div className="admin-stat-card__icon bg-purple-50 text-purple-500"><Wallet size={24}/></div>
          <div>
            <p className="admin-stat-card__value">{formatCurrency(currentReport.netProfit)}</p>
            <p className="admin-stat-card__label">صافي الربح التقديري</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 hide-on-print">
        {/* Expenses Section */}
        <div className="admin-card">
          <h2 className="admin-card__title">المصاريف اليومية</h2>
          {!isClosed && (
            <form onSubmit={handleAddExpense} className="flex gap-2 mb-4">
              <input
                type="text"
                    placeholder=""
                className="admin-input flex-1"
                value={expenseDesc}
                onChange={e => setExpenseDesc(e.target.value)}
              />
              <input
                type="number"
                    placeholder=""
                className="admin-input w-24"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
              />
              <select 
                className="admin-select w-28" 
                value={expenseCategory}
                onChange={e => setExpenseCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button type="submit" className="admin-btn admin-btn--primary px-3">
                <Plus size={18} />
              </button>
            </form>
          )}

          <div className="max-h-60 overflow-y-auto">
            {expenses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">لا توجد مصاريف اليوم</p>
            ) : (
              <table className="admin-table text-sm">
                <thead>
                  <tr>
                    <th>البيان</th>
                    <th>القسم</th>
                    <th>المبلغ</th>
                    {!isClosed && <th>إجراء</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.description}</td>
                      <td>{exp.category}</td>
                      <td className="font-bold text-red-500">{formatCurrency(exp.amount)}</td>
                      {!isClosed && (
                        <td>
                          <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Loans Section */}
        <div className="admin-card">
          <h2 className="admin-card__title">سلف اليوم</h2>
          {!isClosed && (
            <form onSubmit={handleAddLoan} className="flex gap-2 mb-4">
              <input
                type="text"
                    placeholder=""
                className="admin-input flex-1"
                value={loanPerson}
                onChange={e => setLoanPerson(e.target.value)}
              />
              <input
                type="number"
                    placeholder=""
                className="admin-input w-24"
                value={loanAmount}
                onChange={e => setLoanAmount(e.target.value)}
              />
              <select 
                className="admin-select w-28"
                value={loanType}
                onChange={e => setLoanType(e.target.value as any)}
              >
                <option value="given">سلفة له</option>
                <option value="received">سلفة منه</option>
              </select>
              <button type="submit" className="admin-btn admin-btn--primary px-3">
                <Plus size={18} />
              </button>
            </form>
          )}

          <div className="max-h-60 overflow-y-auto">
            {loans.length === 0 ? (
              <p className="text-gray-500 text-center py-4">لا توجد سلف اليوم</p>
            ) : (
              <table className="admin-table text-sm">
                <thead>
                  <tr>
                    <th>الشخص</th>
                    <th>النوع</th>
                    <th>المبلغ</th>
                    {!isClosed && <th>إجراء</th>}
                  </tr>
                </thead>
                <tbody>
                  {loans.map(loan => (
                    <tr key={loan.id}>
                      <td>{loan.personName}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs ${loan.type === 'given' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {loan.type === 'given' ? 'مصروفة' : 'مستردة'}
                        </span>
                      </td>
                      <td className="font-bold">{formatCurrency(loan.amount)}</td>
                      {!isClosed && (
                        <td>
                          <button onClick={() => handleDeleteLoan(loan.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card print-report-only hidden show-on-print">
        <h2 className="text-center font-black text-2xl mb-4">تقرير نهاية اليوم - TopFood</h2>
        <div className="border-b-2 border-black pb-4 mb-4">
          <p>التاريخ: {new Date(startOfDay).toLocaleDateString('ar-EG')}</p>
          <p>المشرف: {currentReport.closedBy || user?.name || 'غير محدد'}</p>
        </div>
        
        <table className="w-full text-right mb-4">
          <tbody>
            <tr className="border-b"><td className="py-2 font-bold">إجمالي الطلبات المستلمة</td><td className="py-2">{currentReport.orderCount - currentReport.cancelledCount}</td></tr>
            <tr className="border-b"><td className="py-2 font-bold">المبيعات (إيرادات)</td><td className="py-2">{formatCurrency(currentReport.totalRevenue)}</td></tr>
            <tr className="border-b"><td className="py-2 font-bold">المصاريف النقدية</td><td className="py-2 text-red-600">{formatCurrency(currentReport.totalExpenses)}</td></tr>
            <tr className="border-b"><td className="py-2 font-bold">إجمالي السلف الممنوحة</td><td className="py-2 text-red-600">{formatCurrency(currentReport.totalLoansGiven)}</td></tr>
            <tr className="border-b"><td className="py-2 font-bold">إجمالي السلف المستردة</td><td className="py-2 text-green-600">{formatCurrency(currentReport.totalLoansReceived)}</td></tr>
          </tbody>
        </table>
        
        <div className="bg-gray-100 p-4 font-black text-xl flex justify-between">
          <span>صافي الربح التقديري</span>
          <span>{formatCurrency(currentReport.netProfit)}</span>
        </div>
      </div>
    </div>
  );
};

export default AccountingPage;
