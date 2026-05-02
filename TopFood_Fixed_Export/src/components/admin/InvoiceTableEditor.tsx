import React, { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import type { InvoiceColumn, InvoiceRow } from '../../types';

interface InvoiceTableEditorProps {
  initialColumns?: InvoiceColumn[];
  initialRows?: InvoiceRow[];
  onSave: (columns: InvoiceColumn[], rows: InvoiceRow[]) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

const InvoiceTableEditor: React.FC<InvoiceTableEditorProps> = ({
  initialColumns,
  initialRows,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [columns, setColumns] = useState<InvoiceColumn[]>(initialColumns || [
    { key: 'col_1', title: 'البيان', type: 'text' },
    { key: 'col_2', title: 'الكمية', type: 'number' },
    { key: 'col_3', title: 'السعر', type: 'currency' }
  ]);
  
  const [rows, setRows] = useState<InvoiceRow[]>(initialRows || []);

  const addColumn = () => {
    const newKey = `col_${Date.now()}`;
    setColumns([...columns, { key: newKey, title: 'عمود جديد', type: 'text' }]);
  };

  const removeColumn = (colKey: string) => {
    setColumns(columns.filter(c => c.key !== colKey));
    setRows(rows.map(row => {
      const newRow = { ...row };
      delete newRow[colKey];
      return newRow;
    }));
  };

  const updateColumnTitle = (colKey: string, newTitle: string) => {
    setColumns(columns.map(c => c.key === colKey ? { ...c, title: newTitle } : c));
  };

  const updateColumnType = (colKey: string, newType: InvoiceColumn['type']) => {
    setColumns(columns.map(c => c.key === colKey ? { ...c, type: newType } : c));
  };

  const addRow = () => {
    const newRow: InvoiceRow = { id: `row_${Date.now()}` };
    columns.forEach(col => {
      newRow[col.key] = col.type === 'text' ? '' : 0;
    });
    setRows([...rows, newRow]);
  };

  const removeRow = (rowId: string) => {
    setRows(rows.filter(r => r.id !== rowId));
  };

  const updateCell = (rowId: string, colKey: string, value: string) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        return { ...row, [colKey]: value };
      }
      return row;
    }));
  };

  return (
    <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow border border-gray-200 dark:border-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className="border border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900">
                  {readOnly ? (
                    <span className="font-bold">{col.title}</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={col.title}
                          onChange={e => updateColumnTitle(col.key, e.target.value)}
                          className="bg-transparent border-b border-dashed border-gray-400 font-bold focus:outline-none w-full"
                        />
                        <button onClick={() => removeColumn(col.key)} className="text-red-500 hover:text-red-700">
                          <X size={14} />
                        </button>
                      </div>
                      <select 
                        value={col.type} 
                        onChange={e => updateColumnType(col.key, e.target.value as InvoiceColumn['type'])}
                        className="text-xs bg-transparent border border-gray-300 dark:border-gray-700 rounded outline-none p-1"
                      >
                        <option value="text">نص</option>
                        <option value="number">رقم</option>
                        <option value="currency">عملة</option>
                      </select>
                    </div>
                  )}
                </th>
              ))}
              {!readOnly && (
                <th className="border border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900 w-12 text-center">
                  <button onClick={addColumn} className="text-blue-500 hover:text-blue-700 mx-auto" title="إضافة عمود">
                    <Plus size={18} />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                {columns.map(col => (
                  <td key={`${row.id}-${col.key}`} className="border border-gray-300 dark:border-gray-700 p-0">
                    {readOnly ? (
                      <div className="p-2">{row[col.key]}</div>
                    ) : (
                      <input
                        type={col.type === 'text' ? 'text' : 'number'}
                        value={row[col.key] || ''}
                        onChange={e => updateCell(row.id, col.key, e.target.value)}
                        className="w-full h-full p-2 bg-transparent focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20"
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="border border-gray-300 dark:border-gray-700 p-2 text-center">
                    <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="mt-4 flex flex-wrap gap-2 justify-between">
          <button onClick={addRow} className="admin-btn admin-btn--ghost text-sm">
            <Plus size={16} /> إضافة صف
          </button>
          
          <div className="flex gap-2">
            {onCancel && (
              <button onClick={onCancel} className="admin-btn admin-btn--ghost text-sm">
                إلغاء
              </button>
            )}
            <button onClick={() => onSave(columns, rows)} className="admin-btn admin-btn--primary text-sm">
              <Save size={16} /> حفظ الفاتورة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceTableEditor;
