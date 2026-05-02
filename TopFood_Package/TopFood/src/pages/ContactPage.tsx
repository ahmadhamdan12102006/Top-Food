import React, { useState, useEffect } from 'react';
import { ExternalLink, MapPin, Clock, Star, Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import { adminGetSettings } from '../services/adminService';
import type { SiteSettings } from '../types';

const ContactPage: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await adminGetSettings();
      if (data) {
        setSettings(data);
        checkStatus(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = (data: SiteSettings) => {
    const now = new Date();
    const day = now.getDay(); // 0=Sunday, 5=Friday
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    let openTime, closeTime;

    if (day === 5 && data.isFridayActive) {
      openTime = parseTime(data.fridayOpen || '14:00');
      closeTime = parseTime(data.fridayClose || '23:59');
    } else {
      openTime = parseTime(data.workingHoursOpen);
      closeTime = parseTime(data.workingHoursClose);
    }

    // Handle overnight shifts (e.g. 11:00 AM to 02:00 AM)
    if (closeTime < openTime) {
      setIsOpen(currentTime >= openTime || currentTime < closeTime);
    } else {
      setIsOpen(currentTime >= openTime && currentTime < closeTime);
    }
  };

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatDisplayTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const handleSubmitRating = async () => {
    if (rating === 0) return toast.error('اختر تقييم أولاً!');
    setSubmittingReview(true);
    await new Promise(r => setTimeout(r, 1000));
    setSubmittingReview(false);
    setReviewSubmitted(true);
    toast.success('شكراً على تقييمك! ⭐');
  };

  if (loading) return <div className="admin-loading"><Loader2 className="animate-spin" size={40} /></div>;

  const socials = [
    { 
      name: 'واتساب', 
      url: settings?.socialLinks?.whatsapp, 
      handle: settings?.contactPhone || '+970-59-XXX-XXXX',
      color: '#25D366', 
      icon: '💬' 
    },
    { name: 'إنستجرام', url: settings?.socialLinks?.instagram, handle: '@topfood', color: '#E1306C', icon: '📸' },
    { name: 'سناب شات', url: settings?.socialLinks?.snapchat, handle: 'Top Food', color: '#FFFC00', icon: '👻', darkText: true },
    { name: 'تيك توك', url: settings?.socialLinks?.tiktok, handle: '@topfood', color: '#000000', icon: '🎵' },
  ].filter(s => s.url && s.url !== '#');

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black mb-3">تواصل معنا 📞</h1>
        <p className="text-gray-500 dark:text-gray-400 text-xl">نحنا دايماً هون لخدمتك</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {socials.map((social) => (
          <a
            key={social.name}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-6 bg-white dark:bg-surface-dark rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md ${social.darkText ? 'text-black' : 'text-white'}`}
              style={{ backgroundColor: social.color }}
            >
              {social.icon}
            </div>
            <h3 className="font-bold text-lg">{social.name}</h3>
            {social.handle && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium opacity-80" dir="ltr">
                {social.handle}
              </span>
            )}
            <ExternalLink size={16} className="text-gray-400 group-hover:text-primary-main transition mt-auto" />
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="h-64 bg-gray-200 dark:bg-gray-800 relative">
            <iframe
              title="Top Food Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d54200.0!2d35.1!3d31.53!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDMxJzQ4LjAiTiAzNcKwMDYnMDAuMCJF!5e0!3m2!1sar!2sps!4v1700000000000"
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary-main/10 rounded-xl flex items-center justify-center">
                <MapPin size={24} className="text-primary-dark" />
              </div>
              <div>
                <h3 className="font-bold text-xl">📍 العنوان</h3>
                <p className="text-gray-500 dark:text-gray-400">الخليل، فلسطين</p>
              </div>
            </div>
            <a
              href="https://maps.google.com/?q=31.53,35.1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-primary-main text-black font-black px-6 py-4 rounded-2xl hover:bg-primary-dark transition shadow-lg shadow-primary-main/20"
            >
              افتح في خرائط جوجل
              <ExternalLink size={20} />
            </a>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 border-r-8 border-r-primary-main flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-400/10 rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-amber-500" />
              </div>
              <h3 className="font-bold text-2xl">ساعات العمل</h3>
            </div>

            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <span className="font-bold text-lg">{settings?.workingDays || 'السبت - الخميس'}</span>
                <span className="text-primary-dark font-black" dir="ltr">
                  {settings ? `${formatDisplayTime(settings.workingHoursOpen)} – ${formatDisplayTime(settings.workingHoursClose)}` : '11:00 AM – 12:00 AM'}
                </span>
              </div>
              {settings?.isFridayActive && (
                <div className="flex justify-between items-center p-4 bg-primary-main/5 dark:bg-primary-main/10 rounded-2xl border border-primary-main/20">
                  <span className="font-bold text-lg text-primary-dark">الجمعة</span>
                  <span className="text-primary-dark font-black" dir="ltr">
                    {formatDisplayTime(settings.fridayOpen || '14:00')} – {formatDisplayTime(settings.fridayClose || '23:59')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className={`flex items-center gap-4 p-6 rounded-2xl ${isOpen ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <span className={`w-4 h-4 rounded-full ${isOpen ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
            <span className={`font-black text-xl ${isOpen ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {isOpen ? 'مفتوح هلق ✅' : 'مسكّر هلق 🔴'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary-main to-primary-dark rounded-[3rem] p-10 text-black text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">عجبك تجربتك؟ قيّمنا ⭐</h2>
          <p className="text-black/70 mb-8 font-bold text-lg text-center mx-auto max-w-sm">رأيك بيهمنا وبيساعدنا نتحسن ونقدم الك الأفضل دايماً</p>

          {!reviewSubmitted ? (
            <div className="flex flex-col items-center gap-8">
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-125 hover:-rotate-12"
                  >
                    <Star
                      size={54}
                      className={`transition-colors drop-shadow-sm ${
                        star <= (hoverRating || rating) ? 'fill-black text-black' : 'text-black/20'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Button
                onClick={handleSubmitRating}
                disabled={submittingReview || rating === 0}
                className="bg-black text-white hover:bg-gray-900 px-12 py-4 rounded-2xl text-xl font-black flex items-center justify-center gap-3 shadow-2xl"
              >
                {submittingReview ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                إرسال التقييم
              </Button>
            </div>
          ) : (
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6">
              <div className="text-7xl mb-4">🎉</div>
              <p className="text-3xl font-black text-black">شكراً إلك!</p>
              <p className="text-black/70 text-lg font-bold">تقييمك وصلنا وبنقدره كتير ♥</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
