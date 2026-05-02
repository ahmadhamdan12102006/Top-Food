import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Heart, Minus, Plus, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/common/Button';
import ReviewForm from '../components/features/ReviewForm';
import CustomizationModal from '../components/features/CustomizationModal';
import { getAllInventoryItems } from '../services/inventoryService';
import { getMenuItem } from '../services/menuService';
import { addReview, getReviewsByItem } from '../services/reviewService';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import type { InventoryItem, MenuItem, Review } from '../types';
import { formatCurrency } from '../utils';
import {
  buildInventoryMap,
  getInventoryItemByIngredientName,
  getUnavailableIngredients,
} from '../utils/inventory';

const DEFAULT_BREAD_TYPES = [
  { name: 'خبز عادي', price: 0 },
  { name: 'تورتيلا', price: 0 },
  { name: 'بدون خبز', price: 0 },
];

const DEFAULT_SAUCES = [
  { name: 'كتشب', price: 0 },
  { name: 'مايونيز', price: 0 },
  { name: 'حار', price: 0 },
  { name: 'ثوم', price: 0 },
  { name: 'ألف جزيرة', price: 0 },
];

const DEFAULT_EXTRAS = [
  { name: 'جبنة', price: 2 },
  { name: 'بيض', price: 3 },
  { name: 'بيكون', price: 5 },
];

const DEFAULT_REMOVALS = ['بدون بصل', 'بدون طماطم', 'بدون خيار', 'بدون خس'];

type IngredientOption = {
  name: string;
  category: string;
  image: string;
  price: number;
  isAvailable: boolean;
  isRequired: boolean;
};

const ItemDetailPage: React.FC = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const addItem = useCartStore((state) => state.addItem);
  const addFavorite = useFavoritesStore((state) => state.addItem);
  const { isAuthenticated, setAuthModalOpen, user } = useAuthStore();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [breadType, setBreadType] = useState(DEFAULT_BREAD_TYPES[0].name);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [sauces, setSauces] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [removals, setRemovals] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [openModal, setOpenModal] = useState<'vegetables' | 'sauces' | 'bread' | 'extras' | null>(null);

  const breadTypes = item?.customizationOptions?.breadTypes || DEFAULT_BREAD_TYPES;
  const availableSauces = item?.customizationOptions?.sauces || DEFAULT_SAUCES;
  const availableExtras = item?.customizationOptions?.extras || DEFAULT_EXTRAS;
  const availableRemovals = item?.customizationOptions?.removals || DEFAULT_REMOVALS;

  const loadItem = useCallback(async () => {
    if (!itemId) {
      setItem(null);
      setNotFound(true);
      return null;
    }

    const itemData = await getMenuItem(itemId);
    setItem(itemData);
    setNotFound(!itemData);

    return itemData;
  }, [itemId]);

  const loadReviews = useCallback(async () => {
    if (!itemId) {
      setReviews([]);
      return;
    }

    try {
      const reviewData = await getReviewsByItem(itemId);
      setReviews(reviewData);
    } catch (error) {
      console.error('Failed to fetch item reviews', error);
      setReviews([]);
    }
  }, [itemId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const itemData = await loadItem();

        if (!itemData) {
          setInventoryItems([]);
          setReviews([]);
          return;
        }

        await Promise.all([
          loadReviews(),
          getAllInventoryItems()
            .then((inventory) => setInventoryItems(inventory))
            .catch((error) => {
              console.error('Failed to fetch inventory for item details', error);
              setInventoryItems([]);
            }),
        ]);
      } catch (error) {
        console.error('Failed to fetch item data', error);
        setItem(null);
        setNotFound(true);
        setReviews([]);
        setInventoryItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [loadItem, loadReviews]);

  useEffect(() => {
    if (breadTypes.length === 0) return;

    if (!breadTypes.some((bread) => bread.name === breadType)) {
      setBreadType(breadTypes[0].name);
    }
  }, [breadType, breadTypes]);

  useEffect(() => {
    setQuantity(1);
    setSelectedIngredients([]);
    setSauces([]);
    setExtras([]);
    setRemovals([]);
    setNotes('');
  }, [item?.id]);

  const inventoryMap = useMemo(
    () => buildInventoryMap(inventoryItems),
    [inventoryItems]
  );

  const ingredientOptions = useMemo<IngredientOption[]>(
    () =>
      (item?.ingredients || []).map((ingredientName) => {
        const inventoryItem = getInventoryItemByIngredientName(
          inventoryMap,
          ingredientName
        );

        return {
          name: ingredientName,
          category: inventoryItem?.category || 'أخرى',
          image: inventoryItem?.image || '',
          price: inventoryItem?.price || 0,
          isAvailable: inventoryItem?.isAvailable !== false,
          isRequired: inventoryItem?.isRequired === true,
        };
      }),
    [inventoryMap, item?.ingredients]
  );

  const requiredIngredients = useMemo(
    () => ingredientOptions.filter((ingredient) => ingredient.isRequired),
    [ingredientOptions]
  );

  const optionalIngredients = useMemo(
    () => ingredientOptions.filter((ingredient) => !ingredient.isRequired),
    [ingredientOptions]
  );

  const categorizedOptionalIngredients = useMemo(() => {
    const groups: Record<string, IngredientOption[]> = {};
    optionalIngredients.forEach((ingredient) => {
      const cat = ingredient.category || 'إضافات أخرى';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ingredient);
    });
    return groups;
  }, [optionalIngredients]);

  const selectableIngredientNames = useMemo(
    () =>
      optionalIngredients
        .filter((ingredient) => ingredient.isAvailable)
        .map((ingredient) => ingredient.name),
    [optionalIngredients]
  );

  const ingredientExtrasTotal = selectedIngredients.reduce((sum, ingredientName) => {
    const ingredient = ingredientOptions.find((opt) => opt.name === ingredientName);
    return sum + (ingredient ? (ingredient.price || 0) : 0);
  }, 0);

  const customizationExtrasTotal = extras.reduce((sum, extraName) => {
    const extra = availableExtras.find((entry) => entry.name === extraName);
    return sum + (extra ? extra.price : 0);
  }, 0);

  const extrasTotal = ingredientExtrasTotal + customizationExtrasTotal;

  const finalItemPrice = (item?.price || 0) + extrasTotal;
  const totalPrice = finalItemPrice * quantity;
  const primaryImage = item?.images?.[0] || '/favicon.svg';

  useEffect(() => {
    setSelectedIngredients((current) =>
      current.filter((ingredientName) =>
        selectableIngredientNames.includes(ingredientName)
      )
    );
  }, [selectableIngredientNames]);

  const unavailableIngredients = useMemo(
    () => getUnavailableIngredients(item?.ingredients || [], inventoryMap),
    [inventoryMap, item?.ingredients]
  );

  const chosenIngredients = useMemo(
    () =>
      Array.from(
        new Set([
          ...requiredIngredients
            .filter((ingredient) => ingredient.isAvailable)
            .map((ingredient) => ingredient.name),
          ...selectedIngredients.filter((ingredientName) =>
            selectableIngredientNames.includes(ingredientName)
          ),
        ])
      ),
    [requiredIngredients, selectedIngredients, selectableIngredientNames]
  );

  const toggleListValue = (
    currentValues: string[],
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(
      currentValues.includes(value)
        ? currentValues.filter((entry) => entry !== value)
        : [...currentValues, value]
    );
  };

  const toggleIngredient = (ingredientName: string) => {
    if (!ingredientName) return;
    setSelectedIngredients((current) => {
      const safeCurrent = Array.isArray(current) ? current : [];
      return safeCurrent.includes(ingredientName)
        ? safeCurrent.filter((entry) => entry !== ingredientName)
        : [...safeCurrent, ingredientName];
    });
  };

  const handleAddToCart = () => {
    if (!item) return;

    if (!isAuthenticated) {
      setAuthModalOpen(true);
      toast('سجل دخولك أولاً حتى تضيف إلى السلة', { icon: '🛒' });
      return;
    }

    addItem({
      menuItem: item,
      quantity,
      subtotal: finalItemPrice,
      customization: {
        breadType,
        ingredients: chosenIngredients,
        sauces,
        extras,
        removals: ingredientOptions.length > 0 ? [] : removals,
        notes,
      },
    });

    toast.success('تمت إضافة الوجبة إلى السلة', { icon: '✅' });
    navigate('/menu');
  };

  const handleAddToFavorites = (isCustom: boolean = false) => {
    if (!item) return;
    
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      toast('سجل دخولك أولاً لإضافة الوجبة للمفضلة', { icon: '❤️' });
      return;
    }

    addFavorite({
      menuItem: item,
      isCustom,
      customization: isCustom ? {
        breadType,
        ingredients: chosenIngredients,
        sauces,
        extras,
        removals: ingredientOptions.length > 0 ? [] : removals,
        notes,
      } : {},
    });

    toast.success(isCustom ? 'تمت إضافة وجبتك الخاصة للمفضلة بنجاح!' : 'تمت إضافة الوجبة لمفضلتك بنجاح!', { icon: '❤️' });
  };

  const handleOpenReviewForm = () => {
    if (!isAuthenticated || !user) {
      setAuthModalOpen(true);
      return;
    }

    setShowReviewForm(true);
  };

  const handleSubmitReview = async (payload: {
    rating: number;
    comment: string;
  }) => {
    if (!item || !user) return;

    await addReview({
      itemId: item.id,
      userId: user.id,
      userName: user.name,
      rating: payload.rating,
      comment: payload.comment,
    });

    await Promise.all([loadItem(), loadReviews()]);
    toast.success('شكرًا على تقييمك');
  };

  if (loading) {
    return (
      <div className="p-8 pt-32 text-center text-text-light dark:text-text-dark">
        جاري التحميل...
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
          <h1 className="mb-3 text-2xl font-black">المنتج غير موجود</h1>
          <p className="mb-6 text-gray-500 dark:text-gray-400">
            تعذر العثور على هذا المنتج أو لم يعد متاحًا داخل القائمة.
          </p>
          <Button onClick={() => navigate('/menu')}>العودة إلى المنيو</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light pb-44 text-text-light dark:bg-background-dark dark:text-text-dark md:pb-28">
      {/* Top Navigation */}
      <div className="absolute left-4 right-4 top-24 z-10 flex justify-between items-center pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 pointer-events-auto items-center justify-center rounded-full bg-white/80 text-black shadow-md backdrop-blur-sm dark:bg-black/80 dark:text-white hover:scale-105 transition"
        >
          <ChevronRight size={24} className="rotate-180 transform" />
        </button>
        <button
          onClick={() => handleAddToFavorites(false)}
          className="flex h-10 w-10 pointer-events-auto items-center justify-center rounded-full bg-white/80 text-red-500 shadow-md backdrop-blur-sm dark:bg-black/80 hover:bg-red-50 dark:hover:bg-red-500/10 hover:scale-105 transition"
        >
          <Heart size={22} />
        </button>
      </div>

      {/* Hero Image */}
      <div className="relative h-64 w-full bg-gray-200 dark:bg-gray-800 md:h-80">
        <img src={primaryImage} alt={item.name} className="h-full w-full object-cover" />
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-xl bg-status-error px-6 py-2 text-xl font-bold text-white">غير متوفر</span>
          </div>
        )}
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Name, Price, Rating */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="mb-2 text-3xl font-black">{item.name}</h1>
              <p className="max-w-2xl leading-relaxed text-gray-600 dark:text-gray-300">{item.description}</p>
            </div>
            <div className="whitespace-nowrap text-3xl font-black text-primary-dark">{formatCurrency(item.price)}</div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-bold shadow-inner dark:bg-gray-800">
              <Star size={16} className="mr-1 fill-primary-main text-primary-main" />
              {item.rating} ({item.reviewCount})
            </div>
            <button
              onClick={() => handleAddToFavorites(true)}
              className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition"
            >
              <Heart size={14} />
              حفظ وجبتي
            </button>
          </div>
        </div>

        {/* Unavailable Ingredients Warning */}
        {unavailableIngredients.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
            <div className="space-y-1 text-sm font-semibold text-amber-800 dark:text-amber-300">
              {unavailableIngredients.map((name) => (
                <p key={name}>عذرًا، {name} غير متوفر حاليًا.</p>
              ))}
            </div>
          </div>
        )}

        {/* Customization Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Vegetables Card */}
          {(optionalIngredients.length > 0 || requiredIngredients.length > 0) && (
            <button
              type="button"
              onClick={() => setOpenModal('vegetables')}
              className="flex flex-col items-center gap-3 rounded-3xl border-2 border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-primary-main/30 hover:shadow-md dark:border-gray-800 dark:bg-surface-dark dark:hover:border-primary-main/30"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl dark:bg-green-900/30">🥬</div>
              <span className="text-sm font-black text-gray-900 dark:text-white">الخضراوات</span>
              <span className="text-xs font-bold text-primary-dark">
                {selectedIngredients.length > 0 ? `${selectedIngredients.length} مختار` : 'اختر'}
              </span>
            </button>
          )}

          {/* Sauces Card */}
          {availableSauces.length > 0 && (
            <button
              type="button"
              onClick={() => setOpenModal('sauces')}
              className="flex flex-col items-center gap-3 rounded-3xl border-2 border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-primary-main/30 hover:shadow-md dark:border-gray-800 dark:bg-surface-dark dark:hover:border-primary-main/30"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl dark:bg-red-900/30">🥫</div>
              <span className="text-sm font-black text-gray-900 dark:text-white">الصوصات</span>
              <span className="text-xs font-bold text-primary-dark">
                {sauces.length > 0 ? `${sauces.length} مختار` : 'اختر'}
              </span>
            </button>
          )}

          {/* Bread Card */}
          {breadTypes.length > 0 && (
            <button
              type="button"
              onClick={() => setOpenModal('bread')}
              className="flex flex-col items-center gap-3 rounded-3xl border-2 border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-primary-main/30 hover:shadow-md dark:border-gray-800 dark:bg-surface-dark dark:hover:border-primary-main/30"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl dark:bg-amber-900/30">🍞</div>
              <span className="text-sm font-black text-gray-900 dark:text-white">نوع الخبز</span>
              <span className="text-xs font-bold text-primary-dark">{breadType}</span>
            </button>
          )}

          {/* Extras Card */}
          {availableExtras.length > 0 && (
            <button
              type="button"
              onClick={() => setOpenModal('extras')}
              className="flex flex-col items-center gap-3 rounded-3xl border-2 border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-primary-main/30 hover:shadow-md dark:border-gray-800 dark:bg-surface-dark dark:hover:border-primary-main/30"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-2xl dark:bg-purple-900/30">➕</div>
              <span className="text-sm font-black text-gray-900 dark:text-white">الإضافات</span>
              <span className="text-xs font-bold text-primary-dark">
                {extras.length > 0 ? `${extras.length} • +${customizationExtrasTotal}₪` : 'اختر'}
              </span>
            </button>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
          <h3 className="mb-3 text-lg font-black">📝 ملاحظات إضافية</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثل: بدون بهارات، قليل ملح..."
            className="min-h-[80px] w-full rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm focus:border-primary-main focus:ring-primary-main dark:border-gray-700 dark:bg-black"
          />
        </div>

        {/* Reviews */}
        <section className="border-t border-gray-200 pt-8 dark:border-gray-800">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black">التقييمات</h3>
              <div className="flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-bold shadow-inner dark:bg-gray-800">
                <Star size={16} className="mr-1 fill-primary-main text-primary-main" />
                {item.rating} ({item.reviewCount})
              </div>
            </div>
            <Button variant="secondary" onClick={handleOpenReviewForm} className={!isAuthenticated ? 'opacity-90' : ''}>
              {isAuthenticated ? 'أضف مراجعتك' : 'سجل دخولك للتقييم'}
            </Button>
          </div>
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-800 dark:bg-surface-dark">
                لا توجد تقييمات بعد.
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-main/20 font-black text-primary-dark">{review.userName.charAt(0)}</div>
                    <div>
                      <h4 className="font-bold">{review.userName}</h4>
                      <div className="flex text-primary-main">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} className={i < review.rating ? 'fill-primary-main' : 'text-gray-300'} />
                        ))}
                      </div>
                    </div>
                    <span className="mr-auto text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString('ar-PS')}</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{review.comment || 'بدون تعليق'}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Bottom Bar - Quantity + Add to Cart */}
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed inset-x-0 bottom-[86px] z-40 p-3 md:p-4">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 rounded-[28px] border border-gray-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:border-gray-800 dark:bg-surface-dark/95 md:max-w-4xl">
          {extrasTotal > 0 && (
            <span className="rounded-xl bg-primary-main/10 px-3 py-1.5 text-xs font-black text-primary-dark">+{extrasTotal}₪</span>
          )}

          <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-gray-300 bg-white dark:border-gray-700 dark:bg-black">
            <button onClick={() => quantity > 1 && setQuantity((v) => v - 1)} className="flex h-full w-12 items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900"><Minus size={20} /></button>
            <div className="w-10 text-center text-lg font-bold">{quantity}</div>
            <button onClick={() => setQuantity((v) => v + 1)} className="flex h-full w-12 items-center justify-center text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-900"><Plus size={20} /></button>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={!item.isAvailable}
            className={`flex flex-1 items-center justify-between rounded-2xl px-4 shadow-lg ${
              !item.isAvailable ? 'cursor-not-allowed bg-gray-300 text-gray-500' : 'bg-primary-main text-black hover:scale-105 hover:bg-primary-dark'
            }`}
          >
            <span>{isAuthenticated ? 'أضف للسلة' : 'دخول للطلب'}</span>
            <span className="rounded-lg bg-white/20 px-2 py-1 font-black text-sm">{formatCurrency(totalPrice)}</span>
          </Button>
        </div>
      </motion.div>

      {/* Customization Modals */}
      <CustomizationModal
        title="الخضراوات والمكونات"
        icon={<span className="text-lg">🥬</span>}
        options={optionalIngredients.map((ing) => ({ name: ing.name, price: ing.price, isAvailable: ing.isAvailable, image: ing.image }))}
        selected={selectedIngredients}
        onSelectionChange={setSelectedIngredients}
        selectionMode="multiple"
        isOpen={openModal === 'vegetables'}
        onClose={() => setOpenModal(null)}
      />

      <CustomizationModal
        title="الصوصات"
        icon={<span className="text-lg">🥫</span>}
        options={availableSauces.map((s) => ({ name: s.name, price: s.price }))}
        selected={sauces}
        onSelectionChange={setSauces}
        selectionMode="multiple"
        isOpen={openModal === 'sauces'}
        onClose={() => setOpenModal(null)}
      />

      <CustomizationModal
        title="نوع الخبز"
        icon={<span className="text-lg">🍞</span>}
        options={breadTypes.map((b) => ({ name: b.name, price: b.price }))}
        selected={[breadType]}
        onSelectionChange={(sel) => { if (sel.length > 0) setBreadType(sel[0]); }}
        selectionMode="single"
        isOpen={openModal === 'bread'}
        onClose={() => setOpenModal(null)}
      />

      <CustomizationModal
        title="الإضافات"
        icon={<span className="text-lg">➕</span>}
        options={availableExtras.map((e) => ({ name: e.name, price: e.price }))}
        selected={extras}
        onSelectionChange={setExtras}
        selectionMode="multiple"
        isOpen={openModal === 'extras'}
        onClose={() => setOpenModal(null)}
      />

      {showReviewForm && (
        <ReviewForm onClose={() => setShowReviewForm(false)} onSubmit={handleSubmitReview} />
      )}
    </div>
  );
};

export default ItemDetailPage;
