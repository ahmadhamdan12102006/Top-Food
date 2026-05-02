import React from 'react';
import { Moon, Sun, Bell, Globe, Shield, ChevronLeft } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { updateUserProfile } from '../services/userService';
import toast from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const { isDark, toggleTheme } = useDarkMode();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const handleToggleAnonymous = async () => {
    if (!user) return;
    
    const newValue = !user.anonymousDriverRatings;
    try {
      await updateUserProfile(user.id, { anonymousDriverRatings: newValue });
      setUser({ ...user, anonymousDriverRatings: newValue });
      toast.success(newValue ? 'تقييماتك للسائقين ستظهر كمجهول' : 'تقييماتك للسائقين ستظهر باسمك');
    } catch (error) {
      toast.error('فشل في تحديث الإعدادات');
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm transition hover:bg-gray-50 dark:bg-surface-dark dark:hover:bg-gray-800"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-black">الإعدادات</h1>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 px-1 text-sm font-bold text-gray-500 dark:text-gray-400">
            تفضيلات العرض
          </h2>
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-surface-dark">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-main/10 text-primary-dark">
                  {isDark ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <p className="font-bold">الوضع الداكن</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    تبديل مظهر التطبيق
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDark ? 'bg-primary-main' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDark ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-800" />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="font-bold">لغة التطبيق</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    العربية
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 px-1 text-sm font-bold text-gray-500 dark:text-gray-400">
            الخصوصية والحساب
          </h2>
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-surface-dark">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="font-bold">تقييم مجهول</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    إخفاء اسمك عند تقييم السائقين
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleAnonymous}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  user?.anonymousDriverRatings ? 'bg-primary-main' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    user?.anonymousDriverRatings ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-800" />
            
            <button
              onClick={() => navigate('/privacy')}
              className="w-full flex items-center justify-between p-4 transition hover:bg-gray-50 dark:hover:bg-black/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  <Shield size={20} />
                </div>
                <div className="text-right">
                  <p className="font-bold">سياسة الخصوصية</p>
                </div>
              </div>
              <ChevronLeft size={20} className="text-gray-400" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
