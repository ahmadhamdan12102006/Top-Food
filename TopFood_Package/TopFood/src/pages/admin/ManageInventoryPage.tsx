import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Edit2,
  Image as ImageIcon,
  Loader2,
  PackageOpen,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import ImageDropzone, {
  type AdminImagePreview,
} from '../../components/admin/ImageDropzone';
import {
  createPreviewURL,
  uploadProductImage,
  validateImageFile,
} from '../../services/imageUploadService';
import {
  addInventoryItem,
  deleteInventoryItem,
  getAllInventoryItems,
  updateInventoryItem,
} from '../../services/inventoryService';
import type { InventoryItem } from '../../types';

const CATEGORIES = [
  { id: 'vegetables', label: 'خضروات' },
  { id: 'sauces', label: 'صوصات' },
  { id: 'bread', label: 'مخبوزات' },
  { id: 'meat', label: 'لحوم' },
  { id: 'extras', label: 'إضافات أخرى' },
];

type InventoryFormState = {
  name: string;
  category: string;
  price: string;
  isAvailable: boolean;
  isRequired: boolean;
};

const initialFormState: InventoryFormState = {
  name: '',
  category: 'vegetables',
  price: '0',
  isAvailable: true,
  isRequired: false,
};

const getCategoryLabel = (categoryId: string) =>
  CATEGORIES.find((category) => category.id === categoryId)?.label || categoryId;

const ManageInventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<InventoryFormState>(initialFormState);
  const [imagePreviews, setImagePreviews] = useState<AdminImagePreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getAllInventoryItems();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch inventory items', error);
      toast.error('فشل جلب عناصر المخزن');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [items, search, selectedCategory]);

  const resetModalState = () => {
    setEditingItem(null);
    setFormData(initialFormState);
    setImagePreviews([]);
  };

  const openModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        price: String(item.price || 0),
        isAvailable: item.isAvailable !== false,
        isRequired: item.isRequired === true,
      });
      setImagePreviews(item.image ? [{ url: item.image, isExisting: true }] : []);
    } else {
      resetModalState();
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetModalState();
  };

  const handleImageFiles = (files: FileList | File[]) => {
    const nextFile = Array.from(files)[0];
    if (!nextFile) return;

    const validation = validateImageFile(nextFile);
    if (!validation.valid) {
      toast.error(validation.error || 'ملف الصورة غير صالح');
      return;
    }

    setImagePreviews([{ url: createPreviewURL(nextFile), file: nextFile }]);
  };

  const handleRemoveImage = (index: number) => {
    const removedPreview = imagePreviews[index];
    if (removedPreview?.file) {
      URL.revokeObjectURL(removedPreview.url);
    }

    setImagePreviews((currentPreviews) =>
      currentPreviews.filter((_, previewIndex) => previewIndex !== index)
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم الصنف');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = '';

      if (imagePreviews[0]?.file) {
        imageUrl = await uploadProductImage(imagePreviews[0].file);
      } else if (imagePreviews[0]?.url) {
        imageUrl = imagePreviews[0].url;
      }

      const payload: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        category: formData.category,
        price: Number(formData.price) || 0,
        image: imageUrl,
        isAvailable: formData.isAvailable,
        isRequired: formData.isRequired,
      };

      if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
        toast.success('تم تحديث الصنف بنجاح');
      } else {
        await addInventoryItem(payload);
        toast.success('تمت إضافة الصنف بنجاح');
      }

      closeModal();
      await loadItems();
    } catch (error) {
      console.error('Failed to save inventory item', error);
      toast.error('حدث خطأ أثناء حفظ الصنف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      return;
    }

    try {
      await deleteInventoryItem(id);
      toast.success('تم حذف الصنف بنجاح');
      await loadItems();
    } catch (error) {
      console.error('Failed to delete inventory item', error);
      toast.error('حدث خطأ أثناء حذف الصنف');
    }
  };

  const handleToggleAvailability = async (item: InventoryItem) => {
    try {
      await updateInventoryItem(item.id, {
        isAvailable: item.isAvailable === false,
      });

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, isAvailable: currentItem.isAvailable === false }
            : currentItem
        )
      );

      toast.success(
        item.isAvailable === false
          ? 'تم جعل الصنف متوفراً'
          : 'تم تعليم الصنف كغير متوفر'
      );
    } catch (error) {
      console.error('Failed to toggle inventory availability', error);
      toast.error('تعذر تحديث حالة التوفر');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="admin-page__title">المخزن</h1>
          <p className="admin-page__subtitle">
            إدارة المكونات التي تدخل في تكوين الوجبات داخل التطبيق
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          className="admin-btn admin-btn--primary"
        >
          <Plus size={18} />
          إضافة صنف جديد
        </button>
      </div>

      <div className="admin-filters flex flex-col gap-4 md:flex-row">
        <div className="admin-search flex-1">
          <Search size={18} className="admin-search__icon" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن صنف..."
            className="admin-search__input"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              selectedCategory === 'all'
                ? 'bg-primary-main text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            الكل
          </button>

          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                selectedCategory === category.id
                  ? 'bg-primary-main text-black'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-main" size={40} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="admin-empty rounded-3xl border border-gray-100 bg-white py-20 text-center dark:border-gray-800 dark:bg-surface-dark">
          <PackageOpen size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-bold text-gray-500">لا توجد أصناف تطابق بحثك</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-surface-dark"
              >
                <div className="flex items-center gap-4 p-5">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 dark:bg-black">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={26} className="text-gray-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="rounded-full bg-primary-main/10 px-3 py-1 text-xs font-black text-primary-dark">
                        {item.price || 0} ₪
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.isRequired
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                        }`}
                      >
                        {item.isRequired ? 'إلزامي' : 'اختياري'}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.isAvailable
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {item.isAvailable ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </div>

                    <h3 className="truncate text-lg font-black">{item.name}</h3>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(item)}
                    className={`admin-toggle ${
                      item.isAvailable ? 'admin-toggle--on' : 'admin-toggle--off'
                    }`}
                    title={item.isAvailable ? 'تعليم كغير متوفر' : 'تعليم كمتوفر'}
                  >
                    {item.isAvailable ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openModal(item)}
                      className="rounded-xl bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                      title="تعديل"
                    >
                      <Edit2 size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-xl bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div
            className="admin-modal-overlay admin-modal-overlay--scrollable"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="admin-modal admin-modal--scrollable admin-modal--xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-modal__header">
                <h2 className="text-xl font-black">
                  {editingItem ? 'تعديل صنف من المخزن' : 'إضافة صنف جديد للمخزن'}
                </h2>

                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="admin-modal__form">
                <div className="admin-modal__body admin-modal__body--form space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block font-bold text-gray-700 dark:text-gray-300">
                      اسم الصنف
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-primary-main focus:ring-2 focus:ring-primary-main/20 dark:border-gray-800 dark:bg-black"
                  placeholder=""
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-bold text-gray-700 dark:text-gray-300">
                      الفئة
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {CATEGORIES.map((category) => (
                        <label
                          key={category.id}
                          className={`flex cursor-pointer items-center justify-center rounded-xl border p-3 text-sm font-bold transition ${
                            formData.category === category.id
                              ? 'border-primary-main bg-primary-main/10 text-primary-dark'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900'
                          }`}
                        >
                          <input
                            type="radio"
                            name="inventoryCategory"
                            className="hidden"
                            checked={formData.category === category.id}
                            onChange={() =>
                              setFormData((current) => ({
                                ...current,
                                category: category.id,
                              }))
                            }
                          />
                          {category.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-bold text-gray-700 dark:text-gray-300">
                    سعر الإضافة (₪)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((current) => ({ ...current, price: e.target.value }))
                    }
                    className="admin-input w-full font-bold"
                    placeholder="0.00"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    يُضاف هذا السعر للمجموع إذا اختار الزبون هذا المكون كإضافة.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block font-bold text-gray-700 dark:text-gray-300">
                    صورة الصنف
                  </label>
                  <ImageDropzone
                    previews={imagePreviews}
                    onFilesSelected={handleImageFiles}
                    onRemove={handleRemoveImage}
                    maxFiles={1}
                    disabled={isSubmitting}
                    title="اسحب صورة الصنف أو اضغط للاختيار"
                    hint="صورة واحدة واضحة تساعد في تمييز المكون داخل المخزن"
                  />
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-black">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black">حالة التوفر</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        حدّد هل هذا المكون متوفر حاليًا أم غير متوفر
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData((current) => ({
                          ...current,
                          isAvailable: !current.isAvailable,
                        }))
                      }
                      className={`admin-toggle ${
                        formData.isAvailable ? 'admin-toggle--on' : 'admin-toggle--off'
                      }`}
                    >
                      {formData.isAvailable ? (
                        <ToggleRight size={24} />
                      ) : (
                        <ToggleLeft size={24} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-black">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black">نوع المكوّن</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        المكوّن الإلزامي يظهر دائمًا داخل الوجبة ولا يستطيع الزبون إلغاءه.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          formData.isRequired
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                        }`}
                      >
                        {formData.isRequired ? 'إلزامي' : 'اختياري'}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setFormData((current) => ({
                            ...current,
                            isRequired: !current.isRequired,
                          }))
                        }
                        className={`admin-toggle ${
                          formData.isRequired ? 'admin-toggle--on' : 'admin-toggle--off'
                        }`}
                      >
                        {formData.isRequired ? (
                          <ToggleRight size={24} />
                        ) : (
                          <ToggleLeft size={24} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                </div>

                <div className="admin-modal__footer">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-main py-3 font-bold text-black transition hover:bg-primary-dark disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : null}
                    {editingItem ? 'حفظ التعديلات' : 'إضافة الصنف'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageInventoryPage;
