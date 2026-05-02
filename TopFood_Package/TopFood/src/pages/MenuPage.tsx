import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Category, MenuItem } from '../types';
import { getActiveCategories, getMenuItems } from '../services/menuService';

const getCategoryCover = (category: Category, items: MenuItem[]) => {
  const exactMatch =
    items.find((item) => item.categoryId === category.id && item.images?.[0]) ||
    items.find(
      (item) =>
        item.categoryName === category.name ||
        item.category?.name === category.name
    );

  if (exactMatch?.images?.[0]) return exactMatch.images[0];
  if (category.image) return category.image;

  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80';
};

const MenuPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cats, items] = await Promise.all([
          getActiveCategories(),
          getMenuItems(),
        ]);

        setCategories(cats);
        setMenuItems(items);
      } catch (error) {
        console.error('Failed to load menu page', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) return categories;

    return categories.filter((category) => {
      const nameMatch = category.name.toLowerCase().includes(q);
      const itemsMatch = menuItems.some(
        (item) =>
          item.categoryId === category.id &&
          item.name.toLowerCase().includes(q)
      );

      return nameMatch || itemsMatch;
    });
  }, [categories, menuItems, searchQuery]);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8 max-w-7xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-black mb-3">المطبخ</h1>
      </div>

      <div className="mb-6 sm:mb-8 w-full max-w-2xl mx-auto relative">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500">
            <Search size={20} />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-12 py-4 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-black text-base sm:text-lg focus:ring-primary-main focus:border-primary-main"
            placeholder=""
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[24px] overflow-hidden border border-gray-200 dark:border-gray-800 animate-pulse bg-gray-100 dark:bg-gray-900 h-44 sm:h-56"
            />
          ))}
        </div>
      ) : filteredCategories.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {filteredCategories.map((category, index) => {
            const cover = getCategoryCover(category, menuItems);

            return (
              <motion.button
                key={category.id}
                type="button"
                onClick={() => navigate(`/menu/category/${category.id}`)}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.28, delay: index * 0.04 }}
                className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] border border-gray-200 dark:border-gray-800 text-right group"
              >
                <div className="relative h-44 sm:h-56 overflow-hidden">
                  <img
                    src={cover}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-4">
                    <div className="rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 px-2.5 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white text-base sm:text-2xl font-black leading-tight line-clamp-2">
                          {category.name}
                        </h3>
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-primary-main text-black">
                        <ChevronLeft size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="min-h-[240px] flex items-center justify-center text-center text-gray-500">
          لا توجد أقسام مطابقة للبحث
        </div>
      )}
    </div>
  );
};

export default MenuPage;
