import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Star, Search, MessageSquare, Check, Phone } from 'lucide-react';
import { getAllReviews, deleteReview } from '../../services/adminService';
import { getAllCustomerFeedback, markFeedbackAsRead } from '../../services/feedbackService';
import type { Review } from '../../types';
import type { CustomerFeedback } from '../../services/feedbackService';
import toast from 'react-hot-toast';

const ManageReviewsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'meal_reviews' | 'customer_feedback'>('meal_reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [customerFeedbacks, setCustomerFeedbacks] = useState<CustomerFeedback[]>([]);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const reviewsData = await getAllReviews();
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('فشل في جلب تقييمات الوجبات. ربما تحتاج إلى تحديث الصلاحيات أو الفهارس.');
      setReviews([]);
    }

    try {
      const feedbackData = await getAllCustomerFeedback();
      setCustomerFeedbacks(Array.isArray(feedbackData) ? feedbackData : []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('فشل في جلب رسائل الزبائن.');
      setCustomerFeedbacks([]);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredReviews = reviews.filter((review) => {
    if (!normalizedSearch) return true;
    return (review.userName || '').toLowerCase().includes(normalizedSearch) || 
           (review.comment || '').toLowerCase().includes(normalizedSearch);
  });

  const filteredFeedbacks = customerFeedbacks.filter((feedback) => {
    if (!normalizedSearch) return true;
    return (feedback.customerName || '').toLowerCase().includes(normalizedSearch) || 
           (feedback.customerPhone || '').toLowerCase().includes(normalizedSearch) ||
           (feedback.message || '').toLowerCase().includes(normalizedSearch);
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((review) => review.id !== id));
      setDeleteConfirm(null);
      toast.success('تم حذف التقييم');
    } catch (error) {
      console.error('Failed to delete review', error);
      toast.error('فشل حذف التقييم');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markFeedbackAsRead(id);
      setCustomerFeedbacks(prev => 
        prev.map(f => f.id === id ? { ...f, isRead: true } : f)
      );
      toast.success('تم التحديد كمقروء');
    } catch (error) {
      console.error('Failed to mark as read', error);
      toast.error('حدث خطأ');
    }
  };

  const getTimeAgo = (timestamp: number | string | Date) => {
    const ts = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    if (Number.isNaN(ts)) return 'تاريخ غير معروف';
    const diff = Date.now() - ts;
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return 'اليوم';
    if (days === 1) return 'أمس';
    return `قبل ${days} يوم`;
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        fill={i < rating ? '#F59E0B' : 'transparent'}
        color={i < rating ? '#F59E0B' : '#4B5563'}
      />
    ));

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1 className="admin-page__title">الدردشات والتقييمات</h1>
          <p className="admin-page__subtitle">
            إدارة تقييمات الوجبات ورسائل الزبائن
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-800">
        <button
          className={`pb-3 px-2 font-bold text-lg transition-colors border-b-2 ${
            activeTab === 'meal_reviews' 
            ? 'border-primary-main text-primary-dark' 
            : 'border-transparent text-gray-500'
          }`}
          onClick={() => setActiveTab('meal_reviews')}
        >
          تقييمات الوجبات
        </button>
        <button
          className={`pb-3 px-2 font-bold text-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'customer_feedback' 
            ? 'border-primary-main text-primary-dark' 
            : 'border-transparent text-gray-500'
          }`}
          onClick={() => setActiveTab('customer_feedback')}
        >
          رسائل الزبائن
          {customerFeedbacks.filter(f => !f.isRead).length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {customerFeedbacks.filter(f => !f.isRead).length}
            </span>
          )}
        </button>
      </div>

      <div className="admin-filters">
        <div className="admin-search">
          <Search size={18} className="admin-search__icon" />
          <input
            type="text"
              placeholder=""
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search__input"
          />
        </div>
      </div>

      {activeTab === 'meal_reviews' ? (
        <>
          <div className="admin-reviews-list">
            {filteredReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="admin-review-card"
              >
                <div className="admin-review-card__header">
                  <div className="admin-review-card__user">
                    <div className="admin-review-card__avatar">
                      {(review.userName || '؟')[0]}
                    </div>
                    <div>
                      <p className="admin-review-card__name">
                        {review.userName || 'مستخدم غير معروف'}
                      </p>
                      <p className="admin-review-card__date">
                        {getTimeAgo(review.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="admin-review-card__stars">
                    {renderStars(Number(review.rating || 0))}
                  </div>
                </div>

                <p className="admin-review-card__comment">
                  {review.comment || 'لا يوجد تعليق'}
                </p>

                <div className="admin-review-card__footer">
                  <button
                    onClick={() => setDeleteConfirm(review.id)}
                    className="admin-icon-btn admin-icon-btn--delete"
                    title="حذف التقييم"
                  >
                    <Trash2 size={16} />
                    <span>حذف</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          {filteredReviews.length === 0 && (
            <div className="admin-empty">
              <p>⭐ لا توجد تقييمات</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="admin-reviews-list">
            {filteredFeedbacks.map((feedback, index) => (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`admin-review-card ${!feedback.isRead ? 'border-2 border-primary-main/50 bg-primary-main/5 dark:bg-primary-main/10' : ''}`}
              >
                <div className="admin-review-card__header">
                  <div className="admin-review-card__user">
                    <div className="admin-review-card__avatar bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                      {(feedback.customerName || '؟')[0]}
                    </div>
                    <div>
                      <p className="admin-review-card__name">
                        {feedback.customerName || 'زبون غير معروف'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <p>{getTimeAgo(feedback.createdAt)}</p>
                        {feedback.customerPhone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1" dir="ltr">
                              <Phone size={12} /> {feedback.customerPhone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="admin-review-card__stars">
                    {renderStars(Number(feedback.rating || 0))}
                  </div>
                </div>

                <p className="admin-review-card__comment mt-4 p-4 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800">
                  {feedback.message || 'لم يكتب رسالة'}
                </p>

                <div className="admin-review-card__footer mt-4 flex gap-3">
                  <a
                    href={`https://wa.me/${feedback.customerPhone?.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg font-bold hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                  >
                    <MessageSquare size={16} /> رد واتساب
                  </a>
                  {!feedback.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(feedback.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <Check size={16} /> تم القراءة
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          {filteredFeedbacks.length === 0 && (
            <div className="admin-empty">
              <p>💬 لا توجد رسائل من الزبائن</p>
            </div>
          )}
        </>
      )}

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
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="admin-modal admin-modal--sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="admin-modal__body"
                style={{ textAlign: 'center', padding: '2rem' }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
                <h3 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>حذف التقييم؟</h3>
                <p style={{ color: '#9CA3AF', marginBottom: '1.5rem' }}>
                  هل أنت متأكد من حذف هذا التقييم؟
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button onClick={() => setDeleteConfirm(null)} className="admin-btn admin-btn--ghost">لا</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="admin-btn admin-btn--danger">أيوا، احذف</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageReviewsPage;
