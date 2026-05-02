import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeDollarSign,
  Edit3,
  Phone,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  Truck,
  UserPlus,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Driver } from '../../types';
import {
  deleteDriver,
  getAllDrivers,
  resetDriverBalance,
  saveDriver,
  toggleDriverActive,
} from '../../services/driverService';

const emptyDriver: Partial<Driver> = {
  name: '',
  phone: '',
  pin: '',
  isActive: true,
  balance: 0,
};

const formatCurrency = (value: number) =>
  `${Number(value || 0).toLocaleString('ar-PS')} ₪`;

const ManageDriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState<Partial<Driver> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeCount = useMemo(
    () => drivers.filter((driver) => driver.isActive).length,
    [drivers]
  );
  const totalBalance = useMemo(
    () => drivers.reduce((sum, driver) => sum + Number(driver.balance || 0), 0),
    [drivers]
  );

  useEffect(() => {
    void loadDrivers();
  }, []);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await getAllDrivers();
      setDrivers(data);
    } catch (error) {
      console.error('Failed to load drivers', error);
      toast.error('تعذر تحميل السائقين');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditDriver(null);
  };

  const handleSave = async () => {
    if (!editDriver?.name || !editDriver?.phone || !editDriver?.pin) {
      toast.error('الرجاء تعبئة جميع الحقول');
      return;
    }

    if (editDriver.pin.length < 4) {
      toast.error('الرمز السري يجب أن يكون 4 أرقام على الأقل');
      return;
    }

    setSaving(true);

    try {
      const savedDriver = await saveDriver(editDriver);
      setDrivers((current) => {
        const exists = current.some((driver) => driver.id === savedDriver.id);
        if (!exists) {
          return [savedDriver, ...current];
        }

        return current.map((driver) =>
          driver.id === savedDriver.id ? savedDriver : driver
        );
      });

      toast.success(editDriver.id ? 'تم تحديث بيانات السائق' : 'تم إضافة السائق');
      closeModal();
    } catch (error) {
      console.error('Failed to save driver', error);
      toast.error('فشل حفظ بيانات السائق');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (driverId: string) => {
    try {
      await deleteDriver(driverId);
      setDrivers((current) => current.filter((driver) => driver.id !== driverId));
      setDeleteConfirm(null);
      toast.success('تم حذف السائق');
    } catch (error) {
      console.error('Failed to delete driver', error);
      toast.error('فشل حذف السائق');
    }
  };

  const handleToggleActive = async (driver: Driver) => {
    try {
      const nextState = !driver.isActive;
      await toggleDriverActive(driver.id, nextState);
      setDrivers((current) =>
        current.map((item) =>
          item.id === driver.id ? { ...item, isActive: nextState } : item
        )
      );
      toast.success(nextState ? 'تم تفعيل السائق' : 'تم تعطيل السائق');
    } catch (error) {
      console.error('Failed to toggle driver status', error);
      toast.error('تعذر تحديث حالة السائق');
    }
  };

  const handleResetBalance = async (driver: Driver) => {
    try {
      await resetDriverBalance(driver.id);
      setDrivers((current) =>
        current.map((item) =>
          item.id === driver.id ? { ...item, balance: 0 } : item
        )
      );
      toast.success(`تم تصفير رصيد ${driver.name}`);
    } catch (error) {
      console.error('Failed to reset balance', error);
      toast.error('تعذر تصفير الرصيد');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1 className="admin-page__title">إدارة السائقين</h1>
          <p className="admin-page__subtitle">
            {drivers.length} سائق مسجل، {activeCount} نشط، بإجمالي عهدة{' '}
            {formatCurrency(totalBalance)}
          </p>
        </div>

        <button
          onClick={() => {
            setEditDriver({ ...emptyDriver });
            setShowModal(true);
          }}
          className="admin-btn admin-btn--primary"
        >
          <UserPlus size={18} />
          إضافة سائق
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading__spinner" />
          <p>جاري تحميل السائقين...</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {drivers.map((driver, index) => (
            <motion.article
              key={driver.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,247,243,0.98))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:bg-[linear-gradient(180deg,rgba(28,30,36,0.98),rgba(17,19,24,0.98))]"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-main/15 text-primary-dark">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">{driver.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {driver.isActive ? 'سائق نشط' : 'سائق معطل'}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    driver.isActive
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
                  }`}
                >
                  {driver.isActive ? 'نشط' : 'موقوف'}
                </span>
              </div>

              <div className="space-y-3 rounded-[24px] border border-black/5 bg-white/75 p-4 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Phone size={16} />
                    الهاتف
                  </span>
                  <span className="font-bold" dir="ltr">
                    {driver.phone}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Shield size={16} />
                    الرمز السري
                  </span>
                  <span className="font-black tracking-[0.3em]" dir="ltr">
                    {driver.pin}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <BadgeDollarSign size={16} />
                    الرصيد الحالي
                  </span>
                  <span className="text-lg font-black text-primary-dark">
                    {formatCurrency(driver.balance || 0)}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleToggleActive(driver)}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    driver.isActive
                      ? 'bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black'
                      : 'bg-primary-main text-black hover:bg-primary-dark'
                  }`}
                >
                  {driver.isActive ? 'تعطيل السائق' : 'تفعيل السائق'}
                </button>

                <button
                  onClick={() => handleResetBalance(driver)}
                  className="rounded-2xl border border-primary-main/20 bg-primary-main/10 px-4 py-3 text-sm font-bold text-primary-dark transition hover:bg-primary-main/15"
                >
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw size={16} />
                    تصفير الرصيد
                  </span>
                </button>
              </div>

              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => {
                    setEditDriver(driver);
                    setShowModal(true);
                  }}
                  className="flex-1 rounded-2xl border border-black/10 px-4 py-3 text-sm font-bold transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <span className="inline-flex items-center gap-2">
                    <Edit3 size={16} />
                    تعديل
                  </span>
                </button>

                <button
                  onClick={() => setDeleteConfirm(driver.id)}
                  className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-900/10"
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 size={16} />
                    حذف
                  </span>
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {!loading && drivers.length === 0 && (
        <div className="admin-empty">
          <p>لا يوجد سائقون مسجلون بعد</p>
        </div>
      )}

      <AnimatePresence>
        {showModal && editDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="admin-modal-overlay"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="admin-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-modal__header">
                <h3>{editDriver.id ? 'تعديل سائق' : 'إضافة سائق جديد'}</h3>
                <button onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>

              <div className="admin-modal__body">
                <div className="admin-form-group">
                  <label>اسم السائق</label>
                  <input
                    type="text"
                    value={editDriver.name || ''}
                    onChange={(event) =>
                      setEditDriver({
                        ...editDriver,
                        name: event.target.value,
                      })
                    }
                    className="admin-input"
                    placeholder=""
                  />
                </div>

                <div className="admin-form-group">
                  <label>رقم الهاتف</label>
                  <input
                    type="tel"
                    value={editDriver.phone || ''}
                    onChange={(event) =>
                      setEditDriver({
                        ...editDriver,
                        phone: event.target.value,
                      })
                    }
                    className="admin-input"
                    placeholder=""
                    dir="ltr"
                  />
                </div>

                <div className="admin-form-group">
                  <label>الرمز السري</label>
                  <input
                    type="text"
                    value={editDriver.pin || ''}
                    onChange={(event) =>
                      setEditDriver({
                        ...editDriver,
                        pin: event.target.value.replace(/\D/g, '').slice(0, 6),
                      })
                    }
                    className="admin-input"
                    placeholder=""
                    dir="ltr"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="admin-modal__footer">
                <button onClick={closeModal} className="admin-btn admin-btn--ghost">
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="admin-btn admin-btn--primary"
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving
                    ? 'جاري الحفظ...'
                    : editDriver.id
                      ? 'حفظ التعديلات'
                      : 'إضافة السائق'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="admin-modal-overlay"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
              className="admin-modal admin-modal--sm"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-modal__body p-8 text-center">
                <div className="mb-4 text-5xl">🗑️</div>
                <h3 className="mb-2 text-xl font-black">حذف السائق</h3>
                <p className="mb-6 text-gray-500">
                  هل أنت متأكد أنك تريد حذف هذا السائق؟
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="admin-btn admin-btn--ghost"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="admin-btn admin-btn--danger"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageDriversPage;
