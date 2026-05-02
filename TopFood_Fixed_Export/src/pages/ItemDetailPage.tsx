import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Minus, Plus, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/common/Button';
import ReviewForm from '../components/features/ReviewForm';
import { getAllInventoryItems } from '../services/inventoryService';
import { getMenuItem } from '../services/menuService';
import { addReview, getReviewsByItem } from '../services/reviewService';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
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
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 top-24 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-black shadow-md backdrop-blur-sm dark:bg-black/80 dark:text-white"
      >
        <ChevronRight size={24} className="rotate-180 transform" />
      </button>

      <div className="relative h-64 w-full bg-gray-200 dark:bg-gray-800 md:h-80">
        <img src={primaryImage} alt={item.name} className="h-full w-full object-cover" />
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-xl bg-status-error px-6 py-2 text-xl font-bold text-white">
              غير متوفر
            </span>
          </div>
        )}
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="mb-2 text-3xl font-black text-text-light dark:text-text-dark">
                {item.name}
              </h1>
              <p className="max-w-2xl leading-relaxed text-gray-600 dark:text-gray-300">
                {item.description}
              </p>
            </div>
            <div className="whitespace-nowrap text-3xl font-black text-primary-dark">
              {formatCurrency(item.price)}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-2 text-xl font-black text-text-light dark:text-text-dark">
              خصص وجبتك
            </h2>
            <p className="max-w-2xl leading-relaxed text-gray-500 dark:text-gray-400">
              اضغط فقط على المكونات التي تريدها داخل الوجبة. المكونات الإلزامية
              ستُضاف تلقائيًا.
            </p>
          </div>
          <div className="whitespace-nowrap text-3xl font-black text-primary-dark">
            {formatCurrency(finalItemPrice)}
          </div>
        </div>

        {ingredientOptions.length > 0 && (
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
                  <CheckCircle2 size={18} />
                </span>
                المكونات
              </h3>

              {unavailableIngredients.length > 0 && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                  <div className="space-y-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {unavailableIngredients.map((ingredientName) => (
                      <p key={ingredientName}>
                        عذرًا، {ingredientName} غير متوفر حاليًا ولن يتم إضافته للوجبة.
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {requiredIngredients.length > 0 && (
                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-2">
                    <h4 className="text-lg font-black">المكونات الإلزامية</h4>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      تضاف تلقائيًا
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {requiredIngredients.map((ingredient, index) => (
                      <motion.div
                        key={`required-${ingredient.name}`}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.04 }}
                        className={`overflow-hidden rounded-2xl border p-3 ${
                          ingredient.isAvailable
                            ? 'border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10'
                            : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white text-lg font-black text-primary-dark shadow-sm dark:bg-black">
                            {ingredient.image ? (
                              <img
                                src={ingredient.image}
                                alt={ingredient.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              ingredient.name.charAt(0)
                            )}
                          </div>

                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                              ingredient.isAvailable
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}
                          >
                            {ingredient.isAvailable ? 'إلزامي' : 'غير متوفر'}
                          </span>
                        </div>

                        <p className="text-sm font-bold leading-6">{ingredient.name}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {Object.entries(categorizedOptionalIngredients).map(([category, ingredients]) => (
                <div key={category} className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
                  <div className="mb-6 flex items-center justify-between gap-3 border-b border-gray-50 pb-4 dark:border-gray-800">
                    <div>
                      <h4 className="text-xl font-black text-primary-dark">{category}</h4>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        اختر الإضافات المناسبة لك من هذه المجموعة
                      </p>
                    </div>
                    <div className="rounded-full bg-primary-main/10 px-3 py-1 text-xs font-bold text-primary-dark">
                      {ingredients.length} خيارات
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {ingredients.map((ingredient) => {
                      const isSelected = Array.isArray(selectedIngredients) && selectedIngredients.includes(ingredient.name);

                      return (
                        <button
                          key={`optional-${ingredient.name}`}
                          type="button"
                          disabled={!ingredient.isAvailable}
                          onClick={() => toggleIngredient(ingredient.name)}
                          className={`flex items-center justify-between gap-4 rounded-2xl border-2 p-4 text-right transition-all duration-300 ${
                            !ingredient.isAvailable
                              ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50 dark:border-gray-800 dark:bg-gray-900'
                              : isSelected
                                ? 'border-primary-main bg-primary-main/5 shadow-md shadow-primary-main/10 scale-[1.02]'
                                : 'border-gray-100 bg-gray-50/50 hover:border-primary-main/30 hover:bg-white dark:border-gray-800 dark:bg-black/20 dark:hover:bg-black/40'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-900">
                              {ingredient.image ? (
                                <img
                                  src={ingredient.image}
                                  alt={ingredient.name}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                />
                              ) : (
                                <span className="text-xl font-black text-primary-main">
                                  {ingredient.name.charAt(0)}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-base font-black leading-tight text-gray-900 dark:text-white">
                                {ingredient.name}
                              </p>
                              <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                                {ingredient.isAvailable
                                  ? isSelected
                                    ? '✓ تم الاختيار'
                                    : 'إضغط للإضافة'
                                  : 'غير متوفر حالياً'}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                              !ingredient.isAvailable
                                ? 'bg-gray-200 text-gray-400 dark:bg-gray-800'
                                : isSelected
                                  ? 'bg-primary-main text-black shadow-sm'
                                  : 'bg-white text-primary-dark shadow-sm dark:bg-gray-800'
                            }`}
                          >
                            {!ingredient.isAvailable
                              ? 'نفذ'
                              : isSelected
                                ? 'مضاف'
                                : ingredient.price > 0 
                                  ? `+${ingredient.price} ₪`
                                  : 'مجاني'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 space-y-8">
          {breadTypes.length > 0 && (
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
              <h3 className="mb-4 text-xl font-bold">
                نوع الخبز <span className="text-sm text-status-error">إجباري</span>
              </h3>
              <div className="flex flex-col gap-3">
                {breadTypes.map((bread) => (
                  <label
                    key={bread.name}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-transparent p-3 transition hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="breadType"
                        value={bread.name}
                        checked={breadType === bread.name}
                        onChange={(event) => setBreadType(event.target.value)}
                        className="h-5 w-5 text-primary-main focus:ring-primary-main"
                      />
                      <span className="text-lg font-semibold">{bread.name}</span>
                    </div>
                    {bread.price > 0 && (
                      <span className="font-bold text-primary-dark">
                        +{formatCurrency(bread.price)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </section>
          )}

          {availableSauces.length > 0 && (
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
              <h3 className="mb-4 text-xl font-bold">الصوصات الإضافية</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {availableSauces.map((sauce) => (
                  <label
                    key={sauce.name}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={sauces.includes(sauce.name)}
                        onChange={() => toggleListValue(sauces, sauce.name, setSauces)}
                        className="h-5 w-5 rounded text-primary-main focus:ring-primary-main"
                      />
                      <span className="font-medium">{sauce.name}</span>
                    </div>
                    {sauce.price > 0 && (
                      <span className="font-bold text-primary-dark">
                        +{formatCurrency(sauce.price)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </section>
          )}

          {availableExtras.length > 0 && (
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
              <h3 className="mb-4 text-xl font-bold">الاضافات</h3>
              <div className="flex flex-col gap-3">
                {availableExtras.map((extra) => (
                  <label
                    key={extra.name}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={extras.includes(extra.name)}
                        onChange={() => toggleListValue(extras, extra.name, setExtras)}
                        className="h-5 w-5 rounded text-primary-main focus:ring-primary-main"
                      />
                      <span className="text-lg font-semibold">{extra.name}</span>
                    </div>
                    {extra.price > 0 && (
                      <span className="font-bold text-primary-dark">
                        +{formatCurrency(extra.price)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </section>
          )}

          {ingredientOptions.length === 0 && availableRemovals.length > 0 && (
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
              <h3 className="mb-4 text-xl font-bold">بدون</h3>
              <div className="grid grid-cols-2 gap-3 text-status-error">
                {availableRemovals.map((removal) => (
                  <label
                    key={removal}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-red-100 p-3 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/10"
                  >
                    <input
                      type="checkbox"
                      checked={removals.includes(removal)}
                      onChange={() => toggleListValue(removals, removal, setRemovals)}
                      className="h-5 w-5 rounded border-red-300 text-status-error focus:ring-status-error"
                    />
                    <span className="font-semibold">{removal}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
            <h3 className="mb-4 text-xl font-bold">ملاحظات إضافية</h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder=""
              className="min-h-[120px] w-full rounded-xl border border-gray-300 bg-gray-50 p-4 focus:border-primary-main focus:ring-primary-main dark:border-gray-700 dark:bg-black"
            />
          </section>

          <section className="mt-12 border-t border-gray-200 pt-12 dark:border-gray-800">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black">التقييمات</h3>
                <div className="flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-bold shadow-inner dark:bg-gray-800">
                  <Star size={16} className="mr-1 fill-primary-main text-primary-main" />
                  {item.rating} ({item.reviewCount})
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={handleOpenReviewForm}
                className={!isAuthenticated ? 'opacity-90' : ''}
              >
                {isAuthenticated ? 'أضف مراجعتك' : 'سجل دخولك للتقييم'}
              </Button>
            </div>

            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-800 dark:bg-surface-dark">
                  لا توجد تقييمات بعد لهذا المنتج.
                </div>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark"
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-main/20 text-xl font-black text-primary-dark shadow-inner">
                        {review.userName.charAt(0)}
                      </div>

                      <div>
                        <h4 className="text-lg font-bold">{review.userName}</h4>
                        <div className="flex text-primary-main">
                          {[...Array(5)].map((_, index) => (
                            <Star
                              key={index}
                              size={14}
                              className={
                                index < review.rating
                                  ? 'fill-primary-main'
                                  : 'text-gray-300'
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <span className="mr-auto text-sm text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('ar-PS')}
                      </span>
                    </div>

                    <p className="text-lg text-gray-700 dark:text-gray-300">
                      {review.comment || 'بدون تعليق'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed inset-x-0 bottom-[86px] z-40 p-3 md:p-4"
      >
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-4 rounded-[28px] border border-gray-200 bg-white/95 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:border-gray-800 dark:bg-surface-dark/95 dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)] md:max-w-4xl">
          <div className="flex h-14 items-center overflow-hidden rounded-full border border-gray-300 bg-white dark:border-gray-700 dark:bg-black">
            <button
              onClick={() => quantity > 1 && setQuantity((value) => value - 1)}
              className="flex h-full w-14 items-center justify-center text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-900"
            >
              <Minus size={20} />
            </button>
            <div className="w-12 text-center text-xl font-bold">{quantity}</div>
            <button
              onClick={() => setQuantity((value) => value + 1)}
              className="flex h-full w-14 items-center justify-center text-primary-dark transition hover:bg-gray-100 dark:hover:bg-gray-900"
            >
              <Plus size={20} />
            </button>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={!item.isAvailable}
            className={`flex flex-1 items-center justify-between rounded-full px-6 text-xl shadow-lg ${
              !item.isAvailable
                ? 'cursor-not-allowed bg-gray-300 text-gray-500 hover:scale-100'
                : 'bg-primary-main text-black hover:scale-105 hover:bg-primary-dark'
            }`}
          >
            <span>{isAuthenticated ? 'أضف للسلة' : 'سجل دخولك لتطلب'}</span>
            <span className="rounded-lg bg-white/20 px-3 py-1 font-black">
              {formatCurrency(totalPrice)}
            </span>
          </Button>
        </div>
      </motion.div>

      {showReviewForm && (
        <ReviewForm
          onClose={() => setShowReviewForm(false)}
          onSubmit={handleSubmitReview}
        />
      )}
    </div>
  );
};

export default ItemDetailPage;
