import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { useAuthStore } from '../../store/useAuthStore';

const isAdminRole = (role?: string | null) =>
  String(role || '')
    .trim()
    .toLowerCase() === 'admin';

const AdminLoginPage: React.FC = () => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { adminLogin, isAdminAuthenticated, checkSession } = useAdminStore();
  const { user, isAuthenticated, isLoading, setAuthModalOpen } = useAuthStore();

  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    const timeout = setTimeout(() => {
      setCheckingUser(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [isLoading, user]);

  const normalizedRole = useMemo(() => user?.role?.trim().toLowerCase() || '', [user]);

  const isAdminUser = useMemo(() => {
    if (checkingUser) return false;
    return isAuthenticated && isAdminRole(user?.role);
  }, [checkingUser, isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user?.id) {
      setError('يجب تسجيل الدخول أولًا بحساب الأدمن');
      return;
    }

    if (!isAdminRole(user.role)) {
      setError('هذا الحساب لا يملك صلاحية دخول لوحة التحكم');
      return;
    }

    if (pin.length < 4) {
      setError('الرقم السري لازم يكون 4 أرقام على الأقل');
      return;
    }

    setSubmitting(true);
    setError('');

    const success = await adminLogin({
      pin,
      userId: user.id,
    });

    setSubmitting(false);

    if (success) {
      navigate('/admin/dashboard', { replace: true });
    } else {
      setError('فشل الدخول. تأكد من صلاحية الحساب والرقم السري');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
    }
  };

  return (
    <div className="admin-login-page" dir="rtl">
      <div className="admin-login-bg">
        <div className="admin-login-bg__circle admin-login-bg__circle--1" />
        <div className="admin-login-bg__circle admin-login-bg__circle--2" />
        <div className="admin-login-bg__circle admin-login-bg__circle--3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="admin-login-card"
      >
        <div className="admin-login-card__logo">
          <div className="admin-login-card__logo-icon">
            <ShieldCheck size={40} />
          </div>
          <h1 className="admin-login-card__title">لوحة التحكم</h1>
          <p className="admin-login-card__subtitle">Top Food - Admin Panel</p>
        </div>

        {!isAuthenticated && !isLoading && (
          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-right">
            <div className="flex items-start gap-3">
              <Smartphone size={20} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <h3 className="mb-1 font-black">خطوة 1: سجّل دخولك أولًا</h3>
                <p className="text-sm leading-7 text-gray-700">
                  للدخول للوحة الأدمن يجب أولًا تسجيل الدخول بحسابك من خلال رقم الهاتف،
                  ثم يجب أن يكون هذا الحساب لديه صلاحية <strong>admin</strong> داخل قاعدة البيانات.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="mt-4 w-full rounded-2xl bg-primary-main py-3 font-black text-black transition hover:opacity-90"
            >
              تسجيل الدخول بالحساب
            </button>
          </div>
        )}

        {checkingUser && (
          <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center">
            <p className="text-sm">جاري التحقق من الصلاحيات...</p>
          </div>
        )}

        {!checkingUser && isAuthenticated && user && (
          <div
            className={`mb-5 rounded-2xl border px-4 py-4 text-right ${
              isAdminUser ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {isAdminUser ? (
                <UserCheck size={20} className="mt-0.5 shrink-0 text-green-600" />
              ) : (
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
              )}

              <div className="min-w-0">
                <h3 className="mb-1 font-black">
                  {isAdminUser ? 'تم التعرف على حساب أدمن' : 'الحساب الحالي ليس أدمن'}
                </h3>

                <p className="break-words text-sm text-gray-700">
                  <strong>الاسم:</strong> {user.name || 'غير معروف'}
                </p>
                <p className="break-words text-sm text-gray-700" dir="ltr">
                  <strong>الهاتف:</strong> {user.phone || 'غير معروف'}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>الصلاحية:</strong> {user.role || 'customer'}
                </p>
                {!isAdminUser && normalizedRole && normalizedRole !== user.role && (
                  <p className="mt-2 text-xs text-gray-600" dir="ltr">
                    normalized role: {normalizedRole}
                  </p>
                )}
              </div>
            </div>

            {!isAdminUser && (
              <p className="mt-3 text-sm leading-7 text-red-700">
                يجب تعديل هذا المستخدم داخل Firestore ليصبح:
                <strong dir="ltr"> role: 'admin' </strong>
                قبل السماح له بالدخول.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-card__form">
          <div className="admin-login-card__input-group">
            <Lock size={20} className="admin-login-card__input-icon" />
            <motion.input
              animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
                    placeholder=""
              maxLength={6}
              className="admin-login-card__input"
              dir="ltr"
              autoFocus
              disabled={!isAdminUser || submitting}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="admin-login-card__eye-btn"
              disabled={!isAdminUser || submitting}
            >
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-login-card__error"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="admin-login-card__submit"
            disabled={!isAdminUser || submitting}
            style={{
              opacity: !isAdminUser || submitting ? 0.6 : 1,
              cursor: !isAdminUser || submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'جاري التحقق...' : 'دخول 🔐'}
          </button>
        </form>

        <a href="/" className="admin-login-card__back">
          ← العودة للموقع
        </a>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
