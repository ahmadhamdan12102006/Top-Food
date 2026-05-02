import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Trash2, Plus, ArrowRight } from 'lucide-react';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useCartStore } from '../store/useCartStore';
import toast from 'react-hot-toast';

const formatCurrency = (n: number) => `₪${n}`;

const FavoritesPage: React.FC = () => {
  const { items, removeItem } = useFavoritesStore();
  const addToCart = useCartStore(state => state.addItem);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'basic' | 'custom'>('basic');

  const basicItems = items.filter(i => !i.isCustom);
  const customItems = items.filter(i => i.isCustom);
  const displayItems = activeTab === 'basic' ? basicItems : customItems;

  const handleAddToCart = (fav: typeof items[0]) => {
    const customizationExtrasTotal = fav.customization.extras?.reduce((sum, extraName) => {
      const extra = fav.menuItem.customizationOptions?.extras?.find(e => e.name === extraName);
      return sum + (extra ? extra.price : 0);
    }, 0) || 0;

    const subtotal = fav.menuItem.price + customizationExtrasTotal;

    addToCart({
      menuItem: fav.menuItem,
      quantity: 1,
      subtotal,
      customization: fav.customization,
    });
    
    toast.success('تمت إضافة الوجبة للسلة', { icon: '🛒' });
  };

  return (
    <div className="px-4 sm:px-6 max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Heart size={28} className="text-primary-main" fill="currentColor" />
        <h1 className="text-2xl font-black">المفضلة</h1>
      </div>

      <div className="mb-6 flex gap-2 p-1 bg-white dark:bg-[#111317] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'basic' ? 'bg-primary-main text-black shadow' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          المفضلة العادية
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'custom' ? 'bg-primary-main text-black shadow' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          وجباتي الخاصة
        </button>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-primary-main/10 flex items-center justify-center">
            <Heart size={36} className="text-primary-main" />
          </div>
          <p className="text-lg font-bold">
            {activeTab === 'basic' ? 'لا يوجد وجبات مفضلة' : 'لم تقم بحفظ وجبات خاصة بعد'}
          </p>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm max-w-[250px]">
            {activeTab === 'basic' 
              ? 'تصفح المنيو وأضف وجباتك المفضلة هنا!'
              : 'يمكنك تخصيص وجبتك (بدون بصل، اكسترا جبنة...) وحفظها لطلبها بسرعة لاحقاً!'}
          </p>
          <Link
            to="/menu"
            className="bg-primary-main text-black font-bold px-8 py-3 rounded-2xl hover:bg-primary-dark transition mt-2"
          >
            تصفح المنيو
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map((fav, i) => (
            <motion.div
              key={fav.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-white dark:bg-[#1c1c22] border border-gray-100 dark:border-white/6 overflow-hidden hover:border-primary-main/20 transition-all"
            >
              <div className="flex p-3 gap-3">
                <Link to={`/menu/${fav.menuItem.id}`} className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative">
                  <img src={fav.menuItem.images?.[0] || '/favicon.svg'} alt={fav.menuItem.name} className="w-full h-full object-cover" />
                </Link>
                
                <div className="flex-1 min-w-0 text-right py-1">
                  <div className="flex justify-between items-start mb-1">
                    <Link to={`/menu/${fav.menuItem.id}`} className="font-black text-base truncate block hover:text-primary-main transition-colors">
                      {fav.menuItem.name}
                    </Link>
                    <button
                      onClick={() => removeItem(fav.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {/* Customization Badges */}
                  {fav.isCustom && (
                    <div className="flex flex-wrap gap-1 mt-2 mb-2">
                      {fav.customization.breadType && (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                          {fav.customization.breadType}
                        </span>
                      )}
                      {fav.customization.extras?.map(e => (
                        <span key={e} className="bg-primary-main/10 text-primary-main text-[10px] px-1.5 py-0.5 rounded font-bold">
                          + {e}
                        </span>
                      ))}
                      {fav.customization.removals?.map(r => (
                        <span key={r} className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold line-through">
                          {r.replace('بدون ', '')}
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="text-primary-main font-black text-sm">{formatCurrency(fav.menuItem.price)}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-black/20 p-3 flex gap-2">
                <button
                  onClick={() => handleAddToCart(fav)}
                  className="flex-1 bg-primary-main text-black font-bold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-dark transition"
                >
                  <Plus size={16} />
                  إضافة للسلة
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
