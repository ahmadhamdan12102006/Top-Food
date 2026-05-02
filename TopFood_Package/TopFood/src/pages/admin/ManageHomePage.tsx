import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Image as ImageIcon, 
  Star,
  Check,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { getHomeSettings, saveHomeSettings, getDefaultHomeSettings } from '../../services/homeService';
import { getMenuItems } from '../../services/menuService';
import { uploadProductImage } from '../../services/imageUploadService';
import type { HomeSettings, HomeBanner, MenuItem } from '../../types';

const ManageHomePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HomeSettings>(getDefaultHomeSettings());
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<'banners' | 'popular' | 'sections'>('banners');
  const [uploadingBannerId, setUploadingBannerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [savedSettings, items] = await Promise.all([
          getHomeSettings(),
          getMenuItems()
        ]);
        
        if (savedSettings) {
          setSettings(savedSettings);
        }
        setAllMenuItems(items);
      } catch (error) {
        console.error('Failed to load home management data', error);
        toast.error('فشل في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveHomeSettings(settings);
      toast.success('تم حفظ التغييرات بنجاح');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('فشل في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const addBanner = () => {
    const newBanner: HomeBanner = {
      id: `banner-${Date.now()}`,
      image: '',
      title: 'عنوان جديد',
      description: '',
      link: '',
      order: settings.banners.length,
      isActive: true
    };
    setSettings({ ...settings, banners: [...settings.banners, newBanner] });
  };

  const updateBanner = (id: string, updates: Partial<HomeBanner>) => {
    setSettings({
      ...settings,
      banners: settings.banners.map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const removeBanner = (id: string) => {
    setSettings({
      ...settings,
      banners: settings.banners.filter(b => b.id !== id)
    });
  };

  const togglePopularItem = (itemId: string) => {
    const current = settings.popularItemIds || [];
    const updated = current.includes(itemId)
      ? current.filter(id => id !== itemId)
      : [...current, itemId];
    setSettings({ ...settings, popularItemIds: updated });
  };

  const handleImageUpload = async (bannerId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingBannerId(bannerId);
      const url = await uploadProductImage(file);
      updateBanner(bannerId, { image: url });
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploadingBannerId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-main" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">إدارة الصفحة الرئيسية</h1>
          <p className="text-gray-500">تحكم في البانرات، المنتجات المميزة، والأقسام</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ التغييرات
        </Button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('banners')}
          className={`flex items-center gap-2 px-6 py-3 font-bold transition ${
            activeTab === 'banners' ? 'border-b-2 border-primary-main text-primary-main' : 'text-gray-500'
          }`}
        >
          <ImageIcon size={18} />
          البانرات الإعلانية
        </button>
        <button
          onClick={() => setActiveTab('popular')}
          className={`flex items-center gap-2 px-6 py-3 font-bold transition ${
            activeTab === 'popular' ? 'border-b-2 border-primary-main text-primary-main' : 'text-gray-500'
          }`}
        >
          <Star size={18} />
          الأكثر طلباً
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'banners' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={addBanner} variant="ghost" className="flex items-center gap-2">
                <Plus size={18} />
                إضافة بانر جديد
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {settings.banners.map((banner) => (
                <div key={banner.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
                  <div className="mb-4 aspect-video overflow-hidden rounded-2xl bg-gray-100 dark:bg-black">
                    {banner.image ? (
                      <img src={banner.image} alt={banner.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <ImageIcon size={48} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-400">صورة البانر</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={banner.image}
                          onChange={(e) => updateBanner(banner.id, { image: e.target.value })}
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-black"
                    placeholder=""
                        />
                        <label className="relative flex cursor-pointer items-center justify-center rounded-xl bg-gray-100 px-3 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                          {uploadingBannerId === banner.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <ImageIcon size={18} />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(banner.id, e)}
                            disabled={uploadingBannerId === banner.id}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-400">العنوان</label>
                      <input
                        type="text"
                        value={banner.title}
                        onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-black"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => removeBanner(banner.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/10"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-bold">نشط</span>
                        <input
                          type="checkbox"
                          checked={banner.isActive}
                          onChange={(e) => updateBanner(banner.id, { isActive: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary-main focus:ring-primary-main"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'popular' && (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
            <h3 className="mb-4 text-lg font-black">اختر المنتجات لعرضها في "الأكثر طلباً"</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {allMenuItems.map((item) => {
                const isSelected = (settings.popularItemIds || []).includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => togglePopularItem(item.id)}
                    className={`relative overflow-hidden rounded-2xl border p-3 text-right transition ${
                      isSelected ? 'border-primary-main bg-primary-main/5' : 'border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <img src={item.images?.[0]} alt={item.name} className="mb-2 aspect-square w-full rounded-xl object-cover" />
                    <p className="text-xs font-bold truncate">{item.name}</p>
                    {isSelected && (
                      <div className="absolute top-2 right-2 rounded-full bg-primary-main p-1 text-black shadow-lg">
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageHomePage;
