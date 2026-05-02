import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, Trash2, Clock, MapPin, MessageSquare, Phone, X, Loader2, Star, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGetSettings, adminUpdateSettings } from '../../services/adminService';
import type { DeliveryArea, SiteSettings, SocialLinks } from '../../types';

const LocationPickerMap = lazy(() => import('../../components/map/LocationPickerMap'));

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [workingHours, setWorkingHours] = useState({ 
    open: '11:00', 
    close: '23:59', 
    days: 'السبت - الخميس',
    fridayOpen: '14:00',
    fridayClose: '23:59',
    isFridayActive: true
  });
  const [welcomeMessage, setWelcomeMessage] = useState('أهلاً وسهلاً بكم في Top Food! اطلب أفضل الوجبات الآن 🍔');
  const [contactPhone, setContactPhone] = useState('0599-000-000');
  const [socialLinks, setSocialLinks] = useState<Required<SocialLinks>>({
    whatsapp: '',
    instagram: '',
    snapchat: '',
    tiktok: ''
  });
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editArea, setEditArea] = useState<Partial<DeliveryArea> | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await adminGetSettings();
      if (settings) {
        setWorkingHours({
          open: settings.workingHoursOpen,
          close: settings.workingHoursClose,
          days: settings.workingDays,
          fridayOpen: settings.fridayOpen || '14:00',
          fridayClose: settings.fridayClose || '23:59',
          isFridayActive: settings.isFridayActive ?? true
        });
        setWelcomeMessage(settings.welcomeMessage || 'أهلاً وسهلاً بكم في Top Food!');
        setContactPhone(settings.contactPhone);
        setDeliveryAreas(settings.deliveryAreas || []);
        if (settings.socialLinks) {
          setSocialLinks({
            whatsapp: settings.socialLinks.whatsapp || '',
            instagram: settings.socialLinks.instagram || '',
            snapchat: settings.socialLinks.snapchat || '',
            tiktok: settings.socialLinks.tiktok || '',
          });
        }
        if (settings.storeLocation) {
          setStoreLocation(settings.storeLocation);
        }
      } else {
        // Defaults if no settings in DB
        setDeliveryAreas([
          { id: '1', name: 'رام الله - وسط البلد', fee: 10 },
          { id: '2', name: 'رام الله - المصيون', fee: 15 },
        ]);
      }
    } catch (error) {
      console.error("Failed to load settings", error);
      toast.error('فشل في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const settings: SiteSettings = {
        workingHoursOpen: workingHours.open,
        workingHoursClose: workingHours.close,
        workingDays: workingHours.days,
        fridayOpen: workingHours.fridayOpen,
        fridayClose: workingHours.fridayClose,
        isFridayActive: workingHours.isFridayActive,
        welcomeMessage,
        contactPhone,
        deliveryAreas,
        socialLinks,
        storeLocation: storeLocation || undefined,
      };
      await adminUpdateSettings(settings);
      toast.success('تم حفظ جميع الإعدادات بنجاح ✅');
    } catch (error) {
      console.error("Failed to save settings", error);
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveArea = () => {
    if (!editArea?.name || editArea?.fee === undefined) return;
    if (editArea.id) {
      setDeliveryAreas(prev => prev.map(a => a.id === editArea.id ? { ...a, ...editArea } as DeliveryArea : a));
    } else {
      setDeliveryAreas(prev => [...prev, { id: `area-${Date.now()}`, name: editArea.name!, fee: editArea.fee! }]);
    }
    setShowAreaModal(false);
    setEditArea(null);
    toast.success('تم تحديث قائمة المناطق');
  };

  const handleDeleteArea = (id: string) => {
    setDeliveryAreas(prev => prev.filter(a => a.id !== id));
    toast.success('تم حذف المنطقة من القائمة المؤقتة (اضغط حفظ للتثبيت)');
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 className="animate-spin" size={40} />
        <p>جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">الإعدادات</h1>
        <p className="admin-page__subtitle">تعديل إعدادات المتجر العامة</p>
      </div>

      <div className="admin-settings-grid">
        <div className="flex flex-col gap-6">
          {/* Working Hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card admin-settings-section"
          >
            <div className="admin-settings-section__header">
              <Clock size={22} className="text-amber-400" />
              <h2>ساعات العمل</h2>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-4 opacity-70">أيام الأسبوع العادية</h3>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>وقت الفتح</label>
                  <input type="time" value={workingHours.open} onChange={e => setWorkingHours({ ...workingHours, open: e.target.value })} className="admin-input" dir="ltr" />
                </div>
                <div className="admin-form-group">
                  <label>وقت الإغلاق</label>
                  <input type="time" value={workingHours.close} onChange={e => setWorkingHours({ ...workingHours, close: e.target.value })} className="admin-input" dir="ltr" />
                </div>
                <div className="admin-form-group">
                  <label>خلاصة الأيام</label>
          <input type="text" value={workingHours.days} onChange={e => setWorkingHours({ ...workingHours, days: e.target.value })} className="admin-input" placeholder="" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold opacity-70">يوم الجمعة</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={workingHours.isFridayActive} onChange={e => setWorkingHours({...workingHours, isFridayActive: e.target.checked})} className="w-4 h-4 rounded text-primary-main" />
                  <span className="text-sm">تخصيص مواعيد مختلفة</span>
                </label>
              </div>
              
              {workingHours.isFridayActive && (
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>وقت الفتح (الجمعة)</label>
                    <input type="time" value={workingHours.fridayOpen} onChange={e => setWorkingHours({ ...workingHours, fridayOpen: e.target.value })} className="admin-input" dir="ltr" />
                  </div>
                  <div className="admin-form-group">
                    <label>وقت الإغلاق (الجمعة)</label>
                    <input type="time" value={workingHours.fridayClose} onChange={e => setWorkingHours({ ...workingHours, fridayClose: e.target.value })} className="admin-input" dir="ltr" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Welcome Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card admin-settings-section"
          >
            <div className="admin-settings-section__header">
              <MessageSquare size={22} className="text-blue-400" />
              <h2>رسالة الترحيب</h2>
            </div>
            <div className="admin-form-group">
              <textarea
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                className="admin-input admin-textarea"
                rows={3}
              placeholder=""
              />
            </div>
          </motion.div>

          {/* Contact & Social */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Phone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="admin-card admin-settings-section h-full"
            >
              <div className="admin-settings-section__header">
                <Phone size={22} className="text-green-400" />
                <h2>رقم التواصل</h2>
              </div>
              <div className="admin-form-group">
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="admin-input"
                  dir="ltr"
              placeholder=""
                />
              </div>
            </motion.div>

            {/* Social Media Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="admin-card admin-settings-section"
            >
              <div className="admin-settings-section__header">
                <Star size={22} className="text-primary-main" />
                <h2>روابط السوشيال ميديا</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="admin-form-group">
                  <label className="text-xs opacity-60">WhatsApp</label>
          <input type="text" value={socialLinks.whatsapp} onChange={e => setSocialLinks({...socialLinks, whatsapp: e.target.value})} className="admin-input text-sm" placeholder="" dir="ltr" />
                </div>
                <div className="admin-form-group">
                  <label className="text-xs opacity-60">Instagram</label>
          <input type="text" value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} className="admin-input text-sm" placeholder="" dir="ltr" />
                </div>
                <div className="admin-form-group">
                  <label className="text-xs opacity-60">Snapchat</label>
          <input type="text" value={socialLinks.snapchat} onChange={e => setSocialLinks({...socialLinks, snapchat: e.target.value})} className="admin-input text-sm" placeholder="" dir="ltr" />
                </div>
                <div className="admin-form-group">
                  <label className="text-xs opacity-60">TikTok</label>
          <input type="text" value={socialLinks.tiktok} onChange={e => setSocialLinks({...socialLinks, tiktok: e.target.value})} className="admin-input text-sm" placeholder="" dir="ltr" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Store Location Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="admin-card admin-settings-section mt-6"
        >
          <div className="admin-settings-section__header">
            <Navigation size={22} className="text-emerald-400" />
            <h2>موقع المحل على الخريطة</h2>
          </div>
          <p className="text-xs opacity-60 mb-4">اضغط على الخريطة لتحديد موقع المحل. سيُستخدم لرسم مسار التوصيل.</p>
          {storeLocation && (
            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 rounded-xl px-4 py-2 w-fit">
              <MapPin size={14} />
              تم تحديد الموقع ✓
            </div>
          )}
          <Suspense fallback={
            <div className="flex items-center justify-center h-[300px] bg-gray-100 dark:bg-gray-900 rounded-2xl">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          }>
            <LocationPickerMap
              initialCoords={storeLocation}
              onLocationSelect={setStoreLocation}
              height="350px"
            />
          </Suspense>
        </motion.div>

        {/* Delivery Areas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="admin-card admin-settings-section mt-6"
        >
          <div className="admin-settings-section__header">
            <MapPin size={22} className="text-purple-400" />
            <h2>مناطق التوصيل</h2>
            <button
              onClick={() => { setEditArea({ name: '', fee: 0 }); setShowAreaModal(true); }}
              className="admin-btn admin-btn--primary admin-btn--sm"
              style={{ marginRight: 'auto' }}
            >
              <Plus size={16} /> إضافة
            </button>
          </div>

        <div className="admin-areas-list">
          {deliveryAreas.map((area, index) => (
            <motion.div
              key={area.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="admin-area-row"
            >
              <div className="admin-area-row__info">
                <span className="admin-area-row__name">{area.name}</span>
                <span className="admin-area-row__fee">{area.fee}₪</span>
              </div>
              <div className="admin-area-row__actions">
                <button
                  onClick={() => { setEditArea(area); setShowAreaModal(true); }}
                  className="admin-icon-btn admin-icon-btn--edit"
                  title="تعديل"
                >
                  تعديل
                </button>
                <button
                  onClick={() => handleDeleteArea(area.id)}
                  className="admin-icon-btn admin-icon-btn--delete"
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>

    {/* Save All Button */}
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button 
          onClick={handleSaveAll} 
          disabled={saving}
          className="admin-btn admin-btn--primary" 
          style={{ padding: '0.875rem 3rem', fontSize: '1.1rem' }}
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات'}
        </button>
      </div>

      {/* Area Modal */}
      <AnimatePresence>
        {showAreaModal && editArea && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="admin-modal-overlay" onClick={() => setShowAreaModal(false)}>
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="admin-modal admin-modal--sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="admin-modal__header">
                <h3>{editArea.id ? 'تعديل منطقة' : 'إضافة منطقة'}</h3>
                <button onClick={() => setShowAreaModal(false)}><X size={20} /></button>
              </div>
              <div className="admin-modal__body">
                <div className="admin-form-group">
                  <label>اسم المنطقة</label>
                    <input type="text" value={editArea.name || ''} onChange={e => setEditArea({ ...editArea, name: e.target.value })} className="admin-input" placeholder="" />
                </div>
                <div className="admin-form-group">
                  <label>رسوم التوصيل (₪)</label>
                  <input type="number" value={editArea.fee ?? ''} onChange={e => setEditArea({ ...editArea, fee: Number(e.target.value) })} className="admin-input" min={0} dir="ltr" />
                </div>
              </div>
              <div className="admin-modal__footer">
                <button onClick={() => setShowAreaModal(false)} className="admin-btn admin-btn--ghost">إلغاء</button>
                <button onClick={handleSaveArea} className="admin-btn admin-btn--primary"><Save size={16} /> حفظ</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
