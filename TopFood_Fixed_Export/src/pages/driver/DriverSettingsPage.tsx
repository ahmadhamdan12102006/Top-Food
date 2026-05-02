import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  User, 
  Phone, 
  Shield, 
  LogOut,
  ArrowRight,
  Save,
  Loader2
} from 'lucide-react';
import { useDriverStore } from '../../store/useDriverStore';
import { db, storage } from '../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { uploadDriverImage, validateImageFile } from '../../services/imageUploadService';
import toast from 'react-hot-toast';
import type { Driver } from '../../types';

// ✅ FIX: Replace `any` with proper Driver type
const DriverSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentDriverId, driverLogout } = useDriverStore();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // ✅ FIX: typed state instead of `any`
  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!currentDriverId) {
      navigate('/driver');
      return;
    }
    fetchDriver();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDriverId]);

  const fetchDriver = async () => {
    if (!currentDriverId) return;
    try {
      const snap = await getDoc(doc(db, 'drivers', currentDriverId));
      if (snap.exists()) {
        const data = snap.data() as Driver;
        setDriverData(data);
        setImageUrl(data.profileImage || '');
      }
    } catch (error) {
      console.error('Error fetching driver:', error);
      toast.error('فشل تحميل بيانات السائق');
    }
  };

  // ✅ FIX: Delete old image from Storage before uploading new one
  const deleteOldImageFromStorage = async (oldUrl: string) => {
    if (!oldUrl || oldUrl.startsWith('data:')) return; // skip data URIs
    
    try {
      // Extract path from Firebase Storage URL
      const url = new URL(oldUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        const oldRef = ref(storage, filePath);
        await deleteObject(oldRef);
      }
    } catch {
      // Silently fail - old image cleanup is not critical
      console.warn('Could not delete old profile image from storage');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'ملف غير صالح');
      return;
    }

    setUploading(true);
    try {
      // ✅ FIX: Delete old image first to avoid accumulating unused files
      const currentSavedImage = driverData?.profileImage || '';
      if (currentSavedImage && currentSavedImage !== imageUrl) {
        await deleteOldImageFromStorage(currentSavedImage);
      }

      const url = await uploadDriverImage(file);
      setImageUrl(url);
      toast.success('تم رفع الصورة بنجاح');
    } catch {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentDriverId) return;
    setLoading(true);
    try {
      // ✅ FIX: If image changed, delete old one from storage
      const oldImageUrl = driverData?.profileImage || '';
      if (oldImageUrl && oldImageUrl !== imageUrl) {
        await deleteOldImageFromStorage(oldImageUrl);
      }

      await updateDoc(doc(db, 'drivers', currentDriverId), {
        profileImage: imageUrl,
        updatedAt: Date.now(),
        updatedAtServer: serverTimestamp(),
      });
      toast.success('تم تحديث الملف الشخصي');
      navigate('/driver/dashboard');
    } catch {
      toast.error('فشل في التحديث');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    driverLogout();
    navigate('/driver');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0c] text-gray-900 dark:text-white p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-6">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/driver/dashboard')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none"
          >
            <ArrowRight size={20} className="text-gray-500" />
          </button>
          <h1 className="text-2xl font-black">إعدادات الحساب</h1>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-primary-main shadow-xl shadow-primary-main/20 bg-white dark:bg-gray-900 relative">
              {imageUrl ? (
                <img src={imageUrl} alt="Profile" className={`w-full h-full object-cover ${uploading ? 'opacity-40' : ''}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <User size={48} />
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={32} className="text-primary-main animate-spin" />
                </div>
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -left-2 w-10 h-10 bg-primary-main rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera size={20} className="text-black" />
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          <p className="mt-4 text-gray-400 dark:text-gray-500 text-sm font-bold">اضغط على الكاميرا لاختيار صورة</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
            <label className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1 block">الاسم الكامل</label>
            <div className="flex items-center gap-3">
              <User size={18} className="text-primary-main" />
              <span className="font-bold text-gray-900 dark:text-white">{driverData?.name || '---'}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
            <label className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1 block">رقم الهاتف</label>
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-primary-main" />
              <span className="font-bold text-gray-900 dark:text-white" dir="ltr">{driverData?.phone || '---'}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
            <label className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1 block">رقم التعريف (PIN)</label>
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-primary-main" />
              <span className="font-bold text-gray-900 dark:text-white">••••</span>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-3">
          <button
            onClick={handleSave}
            disabled={loading || uploading}
            className="w-full bg-primary-main text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary-main/20 disabled:opacity-50"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={20} />}
            حفظ التغييرات
          </button>

          <button
            onClick={handleLogout}
            disabled={loading || uploading}
            className="w-full bg-red-500/10 text-red-500 border border-red-500/20 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverSettingsPage;
