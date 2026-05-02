import React, { useState, useEffect } from 'react';
import { Plus, Printer, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceTableEditor from '../../components/admin/InvoiceTableEditor';
import { getInvoices, saveInvoice, deleteInvoice } from '../../services/invoiceService';
import type { Invoice, InvoiceColumn, InvoiceRow } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

const InvoicesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Partial<Invoice> | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      toast.error('فشل جلب الفواتير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleCreateNew = () => {
    setCurrentInvoice({
      title: 'فاتورة جديدة',
      columns: [
        { key: 'item', title: 'البيان', type: 'text' },
        { key: 'qty', title: 'الكمية', type: 'number' },
        { key: 'price', title: 'السعر', type: 'currency' },
        { key: 'total', title: 'الإجمالي', type: 'currency' }
      ],
      rows: []
    });
    setIsEditing(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
    try {
      await deleteInvoice(id);
      toast.success('تم حذف الفاتورة');
      loadInvoices();
    } catch (err) {
      toast.error('فشل حذف الفاتورة');
    }
  };

  const handleSaveInvoice = async (columns: InvoiceColumn[], rows: InvoiceRow[]) => {
    try {
      const title = prompt('ادخل عنوان الفاتورة', currentInvoice?.title || 'فاتورة جديدة') || 'فاتورة بدون عنوان';
      
      await saveInvoice({
        title,
        columns,
        rows,
        totals: {},
        date: Date.now(),
        createdBy: user?.name || 'Admin',
      }, currentInvoice?.id);
      
      toast.success('تم حفظ الفاتورة بنجاح');
      setIsEditing(false);
      setCurrentInvoice(null);
      loadInvoices();
    } catch (err) {
      toast.error('فشل حفظ الفاتورة');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="admin-loading__spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-page print-container">
      <div className="admin-page__header hide-on-print">
        <div>
          <h1 className="admin-page__title">الفواتير الحرة</h1>
          <p className="admin-page__subtitle">إنشاء وإدارة فواتير جداول (Excel-like)</p>
        </div>
        {!isEditing && (
          <button onClick={handleCreateNew} className="admin-btn admin-btn--primary">
            <Plus size={18} /> إنشاء فاتورة
          </button>
        )}
      </div>

      {isEditing && currentInvoice ? (
        <div className="mb-6 show-on-print">
          <h2 className="text-2xl font-black mb-4">{currentInvoice.title}</h2>
          <InvoiceTableEditor
            initialColumns={currentInvoice.columns}
            initialRows={currentInvoice.rows}
            onSave={handleSaveInvoice}
            onCancel={() => setIsEditing(false)}
            readOnly={false}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 hide-on-print">
          {invoices.length === 0 ? (
            <p className="text-center text-gray-500 py-8">لا توجد فواتير محفوظة. اضغط على "إنشاء فاتورة" للبدء.</p>
          ) : (
            invoices.map(invoice => (
              <div key={invoice.id} className="admin-card flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{invoice.title}</h3>
                  <p className="text-sm text-gray-500">
                    بواسطة: {invoice.createdBy} | التاريخ: {new Date(invoice.date).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    setCurrentInvoice(invoice);
                    setIsEditing(true);
                    setTimeout(() => window.print(), 500);
                  }} className="admin-btn admin-btn--ghost" title="طباعة">
                    <Printer size={18} />
                  </button>
                  <button onClick={() => handleEdit(invoice)} className="admin-btn admin-btn--ghost text-blue-500" title="تعديل">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(invoice.id)} className="admin-btn admin-btn--ghost text-red-500" title="حذف">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
