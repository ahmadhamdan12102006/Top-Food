import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Category, InventoryItem, MenuItem } from '../types';
import MenuCard from '../components/features/MenuCard';
import MenuSkeleton from '../components/common/MenuSkeleton';
import { getActiveCategories, getMenuItems } from '../services/menuService';
import { getAllInventoryItems } from '../services/inventoryService';
import { buildInventoryMap, getUnavailableIngredients } from '../utils/inventory';

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

const CategoryPage: React.FC = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [menu, cats, inventory] = await Promise.all([
          getMenuItems(),
          getActiveCategories(),
          getAllInventoryItems(),
        ]);

        setItems(menu);
        setCategories(cats);
        setInventoryItems(inventory);
      } catch (error) {
        console.error('Category page load error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  const category = useMemo(
    () => categories.find((c) => c.id === categoryId) || null,
    [categories, categoryId]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const categoryMatch = item.categoryId === categoryId;
      const searchMatch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);

      return categoryMatch && searchMatch;
    });
  }, [items, categoryId, searchQuery]);

  const heroImage = useMemo(() => {
    if (!category) return '';
    return getCategoryCover(category, items);
  }, [category, items]);

  const inventoryMap = useMemo(
    () => buildInventoryMap(inventoryItems),
    [inventoryItems]
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="rounded-[32px] h-72 bg-gray-100 dark:bg-gray-900 animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <MenuSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <h1 className="text-2xl font-black mb-3">القسم غير موجود</h1>
          <button
            onClick={() => navigate('/menu')}
            className="mt-4 px-5 py-3 rounded-2xl bg-primary-main text-black font-black"
          >
            العودة إلى المطبخ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8 max-w-7xl">
      <div className="relative overflow-hidden rounded-[30px] sm:rounded-[38px] border border-white/10 bg-black text-white mb-8">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt={category.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/75 via-black/45 to-black/75" />
        </div>

        <div className="relative z-10 p-5 sm:p-8 lg:p-10 min-h-[260px] sm:min-h-[320px] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <button
              onClick={() => navigate('/menu')}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/10"
            >
              <ArrowRight size={22} />
            </button>

            <div className="rounded-full bg-primary-main/15 border border-primary-main/20 px-4 py-2 text-sm font-black text-primary-light">
              قسم مميز
            </div>
          </div>

          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4">
              {category.name}
            </h1>

            <p className="text-white/75 text-base sm:text-lg leading-8">
              تصفح جميع المنتجات الموجودة داخل هذا القسم بسرعة ووضوح.
            </p>
          </div>
        </div>
      </div>

      <div className="sticky top-24 z-30 mb-6 md:top-40">
        <div className="rounded-[24px] border border-white/10 bg-white/85 dark:bg-[#101114]/90 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)] p-3">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {categories.map((cat) => {
              const isActive = cat.id === category.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/menu/category/${cat.id}`)}
                  className={`shrink-0 px-4 py-3 rounded-2xl font-black transition ${
                    isActive
                      ? 'bg-primary-main text-black'
                      : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
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

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.28, delay: index * 0.03 }}
            >
              <MenuCard
                item={item}
                unavailableIngredients={getUnavailableIngredients(
                  item.ingredients || [],
                  inventoryMap
                )}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="min-h-[240px] flex items-center justify-center text-center text-gray-500">
          لا توجد منتجات في هذا القسم
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
