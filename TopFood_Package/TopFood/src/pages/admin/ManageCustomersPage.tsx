import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  User as UserIcon, 
  Star, 
  Award, 
  ShieldAlert, 
  CheckCircle2, 
  Phone, 
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { User, Review, DriverRating } from '../../types';
import toast from 'react-hot-toast';

const ManageCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<User[]>([]);
  const [foodReviews, setFoodReviews] = useState<Review[]>([]);
  const [driverRatings, setDriverRatings] = useState<DriverRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'customer')));
      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setCustomers(usersData);

      // Fetch food reviews
      const reviewsSnap = await getDocs(collection(db, 'reviews'));
      const reviewsData = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setFoodReviews(reviewsData);

      // Fetch driver ratings
      const driverRatingsSnap = await getDocs(collection(db, 'driverRatings'));
      const driverRatingsData = driverRatingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverRating));
      setDriverRatings(driverRatingsData);

    } catch (error) {
      console.error('Error fetching customers data:', error);
      toast.error('فشل في جلب بيانات الزبائن');
    } finally {
      setLoading(false);
    }
  };

  const toggleVipStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVip: !currentStatus
      });
      setCustomers(prev => prev.map(c => c.id === userId ? { ...c, isVip: !currentStatus } : c));
      toast.success(currentStatus ? 'تم إزالة حالة VIP' : 'تم منح الزبون حالة VIP بنجاح');
    } catch (error) {
      console.error('Error toggling VIP status:', error);
      toast.error('فشل في تحديث حالة الزبون');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.includes(search) || c.phone?.includes(search)
  );

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1 className="admin-page__title">إدارة الزبائن</h1>
          <p className="admin-page__subtitle">{customers.length} زبون مسجل في النظام</p>
        </div>
      </div>

      <div className="admin-filters">
        <div className="admin-search w-full max-w-md">
          <Search size={18} className="admin-search__icon" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search__input"
          />
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading__spinner" />
          <p>جاري تحميل البيانات...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCustomers.map(customer => {
            const customerFoodReviews = foodReviews.filter(r => r.userId === customer.id);
            const customerDriverRatings = driverRatings.filter(r => r.userId === customer.id);
            const isExpanded = expandedCustomer === customer.id;

            return (
              <motion.div 
                key={customer.id}
                layout
                className={`admin-card overflow-hidden transition-all ${customer.isVip ? 'ring-2 ring-yellow-400 dark:ring-yellow-600' : ''}`}
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${
                      customer.isVip 
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg shadow-yellow-500/30' 
                        : 'bg-primary-main/10 text-primary-main'
                    }`}>
                      {customer.isVip ? <Award size={28} /> : (customer.name?.[0] || 'ز')}
                    </div>
                    <div>
                      <h3 className="font-black text-lg flex items-center gap-2">
                        {customer.name || 'زبون جديد'}
                        {customer.isVip && (
                          <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                            VIP
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1" dir="ltr">
                          <Phone size={14} /> {customer.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500" />
                          {customerFoodReviews.length + customerDriverRatings.length} تقييمات
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVipStatus(customer.id, customer.isVip || false);
                      }}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                        customer.isVip
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                          : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-500'
                      }`}
                    >
                      {customer.isVip ? 'إلغاء VIP' : 'منح VIP'}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-4"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Food Reviews Column */}
                        <div className="space-y-3">
                          <h4 className="font-black text-primary-main flex items-center gap-2">
                            <span>🍔</span> تقييمات الوجبات
                          </h4>
                          {customerFoodReviews.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                              {customerFoodReviews.map(review => (
                                <div key={review.id} className="bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-sm">طلب: {review.itemId}</span>
                                    <div className="flex text-yellow-400">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={12} fill={i < review.rating ? 'currentColor' : 'none'} />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment || 'بدون تعليق'}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl text-center">لا توجد تقييمات للوجبات</p>
                          )}
                        </div>

                        {/* Driver Ratings Column */}
                        <div className="space-y-3">
                          <h4 className="font-black text-blue-500 flex items-center gap-2">
                            <span>🛵</span> تقييمات السائقين
                          </h4>
                          {customerDriverRatings.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                              {customerDriverRatings.map(rating => (
                                <div key={rating.id} className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-sm text-blue-900 dark:text-blue-300">سائق ID: {rating.driverId.slice(0, 5)}...</span>
                                    <div className="flex text-yellow-400">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={12} fill={i < rating.rating ? 'currentColor' : 'none'} />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{rating.comment || 'بدون تعليق'}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl text-center">لا توجد تقييمات للسائقين</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          
          {filteredCustomers.length === 0 && (
            <div className="admin-empty">
              <ShieldAlert size={48} className="mx-auto mb-4 text-gray-300" />
              <p>لا يوجد زبائن مسجلين</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageCustomersPage;
