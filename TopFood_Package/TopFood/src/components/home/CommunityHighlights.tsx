import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getRecentOrders } from '../../services/orderService';
import type { Order, MenuItem } from '../../types';

interface CommunityHighlightsProps {
  allItems: MenuItem[];
}

const CommunityHighlights: React.FC<CommunityHighlightsProps> = ({ allItems }) => {
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const recentOrders = await getRecentOrders(50);
        
        if (recentOrders.length > 0) {
          setLastOrder(recentOrders[0]);
          
          // Calculate popularity
          const itemCounts: Record<string, number> = {};
          recentOrders.forEach(order => {
            order.items.forEach(item => {
              const itemId = item.menuItem?.id;
              if (itemId) {
                itemCounts[itemId] = (itemCounts[itemId] || 0) + item.quantity;
              }
            });
          });

          const sortedIds = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id]) => id);

          const popular = allItems.filter(item => sortedIds.includes(item.id));
          setPopularItems(popular);
        }
      } catch (error) {
        console.error('Error fetching highlights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [allItems]);

  if (loading || (!lastOrder && popularItems.length === 0)) return null;

  return (
    <div className="space-y-12">
      {/* Most Popular Section */}
      {popularItems.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black flex items-center gap-3">
              <TrendingUp className="text-primary-main" size={28} />
              الأكثر طلباً الآن
            </h3>
            <span className="bg-primary-main/10 text-primary-main px-4 py-1 rounded-full text-sm font-bold">
              تحديث مباشر
            </span>
          </div>

          <div className="hide-scrollbar flex gap-6 overflow-x-auto pb-4 -mx-4 px-4">
            {popularItems.map((item, index) => (
              <Link 
                key={item.id} 
                to={`/menu/${item.id}`}
                className="flex-none w-[280px] group"
              >
                <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-surface-dark border border-white/5 shadow-sm group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-500">
                  <img 
                    src={item.images[0]} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  
                  <div className="absolute top-4 left-4 w-10 h-10 bg-primary-main rounded-full flex items-center justify-center text-black font-black text-xl shadow-lg">
                    {index + 1}
                  </div>

                  <div className="absolute bottom-6 right-6 left-6 text-right">
                    <h4 className="text-xl font-black text-white mb-1 truncate">{item.name}</h4>
                    <div className="flex items-center justify-end gap-3">
                      <div className="flex items-center gap-1 text-secondary-main text-sm font-bold">
                        <Star size={14} fill="currentColor" />
                        <span>4.9</span>
                      </div>
                      <p className="text-primary-main font-black">₪{item.price}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Last Order "Community" Section */}
      {lastOrder && (
        <section className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-secondary-main/10 to-transparent border border-secondary-main/20 p-8 sm:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-right flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-main/20 text-secondary-main text-xs font-black mb-6">
                <Users size={14} />
                <span>طلب الزبون الذي قبلي</span>
              </div>
              
              <h3 className="text-3xl font-black text-white mb-4">
                شوف شو طلبوا جيرانك!
              </h3>
              <p className="text-white/60 font-medium mb-8">
                أحدث طلب تم تنفيذه في توب فود كان يحتوي على هذه الأصناف المميزة
              </p>

              <div className="flex flex-wrap gap-3 justify-end">
                {lastOrder.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white font-bold flex items-center gap-2">
                    <ShoppingCart size={14} className="text-primary-main" />
                    {item.menuItem?.name || 'صنف'}
                  </div>
                ))}
                {lastOrder.items.length > 3 && (
                  <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white/40 font-bold">
                    +{lastOrder.items.length - 3} أصناف أخرى
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="w-24 h-24 bg-secondary-main rounded-full flex items-center justify-center shadow-2xl shadow-secondary-main/30 animate-pulse">
                <ShoppingCart className="text-black" size={40} />
              </div>
              <div className="absolute -top-2 -right-2 bg-white text-black px-3 py-1 rounded-full text-xs font-black shadow-lg">
                الآن
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default CommunityHighlights;
