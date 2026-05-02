import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  Upload,
  Image as ImageIcon,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatCurrency } from '../../utils';
import {
  adminGetAllMenuItems,
  adminGetAllCategories,
  adminAddMenuItem,
  adminUpdateMenuItem,
  adminDeleteMenuItem
} from '../../services/adminService';
import {
  uploadMultipleImages,
  validateImageFile,
  createPreviewURL
} from '../../services/imageUploadService';
import { importTopFoodMenuSeed } from '../../services/menuImportService';
import { getAllInventoryItems } from '../../services/inventoryService';
import type { MenuItem, Category, InventoryItem } from '../../types';
import toast from 'react-hot-toast';

const INVENTORY_CATEGORIES = [
  { id: 'vegetables', label: 'خضروات', emoji: '🥬' },
  { id: 'sauces', label: 'صوصات', emoji: '🫙' },
  { id: 'bread', label: 'مخبوزات', emoji: '🍞' },
  { id: 'meat', label: 'لحوم', emoji: '🥩' },
  { id: 'extras', label: 'إضافات أخرى', emoji: '➕' }
];

const emptyItem: Partial<MenuItem> = {
  name: '',
  description: '',
  price: 0,
  categoryId: '',
  images: [],
  isAvailable: true,
  customizationOptions: {
    isBreadRequired: false,
    breadTypes: [],
    isSaucesRequired: false,
    sauces: [],
    extras: [],
    removals: []
  }
};

interface ImagePreview {
  url: string;
  file?: File;
  isExisting?: boolean;
}

const ManageMenuPage: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importingSeed, setImportingSeed] = useState(false);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedItems, fetchedCategories, fetchedInventory] = await Promise.all([
        adminGetAllMenuItems(),
        adminGetAllCategories(),
        getAllInventoryItems()
      ]);
      setItems(fetchedItems);
      setCategories(fetchedCategories);
      setInventoryItems(fetchedInventory);
    } catch (error) {
      console.error('Failed to fetch menu/categories', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.includes(search) || item.description.includes(search);
    const matchCategory = filterCategory === 'all' || item.categoryId === filterCategory;
    return matchSearch && matchCategory;
  });

  const getCategoryName = (id: string) =>
    categories.find(c => c.id === id)?.name || 'غير محدد';

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      await adminUpdateMenuItem(id, { isAvailable: !currentStatus });
      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, isAvailable: !currentStatus } : item
        )
      );
    } catch (error) {
      console.error('Failed to toggle availability', error);
    }
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const totalAfter = imagePreviews.length + fileArray.length;

      if (totalAfter > 4) {
        toast.error('الحد الأقصى 4 صور لكل منتج');
        return;
      }

      for (const file of fileArray) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(validation.error || 'ملف غير صالح');
          return;
        }
      }

      const newPreviews: ImagePreview[] = fileArray.map(file => ({
        url: createPreviewURL(file),
        file
      }));

      setImagePreviews(prev => [...prev, ...newPreviews]);
    },
    [imagePreviews.length]
  );

  const removeImage = (index: number) => {
    setImagePreviews(prev => {
      const removed = prev[index];
      if (removed.file) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const openEditModal = (item?: MenuItem) => {
    if (item) {
      setEditItem({
        ...item,
        customizationOptions: item.customizationOptions || {
          isBreadRequired: false,
          breadTypes: [],
          isSaucesRequired: false,
          sauces: [],
          extras: [],
          removals: []
        }
      });
      setSelectedIngredients(item.ingredients || []);
      setImagePreviews((item.images || []).map(url => ({ url, isExisting: true })));
    } else {
      setEditItem({ ...emptyItem });
      setSelectedIngredients([]);
      setImagePreviews([]);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editItem?.name || !editItem?.price || !editItem?.categoryId) {
      toast.error('يرجى تعبئة اسم الصنف والسعر والفئة');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const newFiles = imagePreviews.filter(p => p.file).map(p => p.file as File);
      const existingUrls = imagePreviews
        .filter(p => p.isExisting)
        .map(p => p.url);

      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        uploadedUrls = await uploadMultipleImages(newFiles, setUploadProgress);
      }

      const finalImages = [...existingUrls, ...uploadedUrls];

      if (finalImages.length === 0) {
        finalImages.push(
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
        );
      }

      const updateData = {
        name: editItem.name,
        description: editItem.description || '',
        price: editItem.price,
        categoryId: editItem.categoryId || '',
        images: finalImages,
        isAvailable: editItem.isAvailable !== false,
        ingredients: selectedIngredients,
        customizationOptions: editItem.customizationOptions || {}
      };

      if (editItem.id) {
        await adminUpdateMenuItem(editItem.id, updateData);
        setItems(prev =>
          prev.map(item =>
            item.id === editItem.id ? ({ ...item, ...updateData } as MenuItem) : item
          )
        );
        toast.success('تم تحديث الصنف بنجاح');
      } else {
        const newItem: Omit<MenuItem, 'id' | 'rating' | 'reviewCount'> = {
          name: updateData.name || '',
          description: updateData.description,
          price: updateData.price || 0,
          categoryId: updateData.categoryId,
          images: updateData.images,
          isAvailable: updateData.isAvailable,
          ingredients: updateData.ingredients,
          customizationOptions: updateData.customizationOptions
        };

        const newId = await adminAddMenuItem(newItem);
        setItems(prev => [
          { ...newItem, id: newId, rating: 0, reviewCount: 0 },
          ...prev
        ]);
        toast.success('تمت إضافة الصنف بنجاح');
      }

      setShowModal(false);
      setEditItem(null);
      setImagePreviews([]);
    } catch (error) {
      console.error('Failed to save item', error);
      toast.error('فشل في حفظ الصنف');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminDeleteMenuItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      setDeleteConfirm(null);
      toast.success('تم حذف الصنف');
    } catch (error) {
      console.error('Failed to delete item', error);
    }
  };

  const handleImportTopFoodMenu = async () => {
    const confirmed = window.confirm(
      'سيتم استيراد منيو Top Food من الصور مع إضافة الفئات والأصناف الناقصة وتحديث الأسعار الحالية. هل تريد المتابعة؟'
    );

    if (!confirmed) return;

    try {
      setImportingSeed(true);
      const summary = await importTopFoodMenuSeed();
      await loadData();
      toast.success(
        `تم استيراد المنيو: ${summary.createdCategories} فئات جديدة و${summary.createdItems} أصناف جديدة`
      );
    } catch (error) {
      console.error('Failed to import Top Food menu', error);
      toast.error('فشل استيراد المنيو');
    } finally {
      setImportingSeed(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1 className="admin-page__title">إدارة المنيو</h1>
          <p className="admin-page__subtitle">{items.length} صنف في القائمة</p>
        </div>
        <button
          onClick={() => openEditModal()}
          className="admin-btn admin-btn--primary"
        >
          <Plus size={18} />
          إضافة صنف
        </button>
        <button
          onClick={handleImportTopFoodMenu}
          className="admin-btn admin-btn--ghost"
          disabled={importingSeed}
        >
          {importingSeed ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Upload size={18} />
          )}
          {importingSeed ? 'جاري استيراد المنيو...' : 'استيراد منيو Top Food'}
        </button>
      </div>

      <div className="admin-filters">
        <div className="admin-search">
          <Search size={18} className="admin-search__icon" />
          <input
            type="text"
            placeholder=""
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="admin-search__input"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="admin-select"
        >
          <option value="all">كل الفئات</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading__spinner" />
          <p>جاري تحميل المنيو...</p>
        </div>
      ) : (
        <div className="admin-menu-grid">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`admin-menu-card ${!item.isAvailable ? 'admin-menu-card--disabled' : ''}`}
            >
              <div className="admin-menu-card__image">
                <img src={item.images[0]} alt={item.name} />
                {!item.isAvailable && (
                  <div className="admin-menu-card__unavailable">غير متوفر</div>
                )}
                {item.images.length > 1 && (
                  <span className="admin-menu-card__image-count">
                    +{item.images.length - 1}
                  </span>
                )}
              </div>
              <div className="admin-menu-card__body">
                <div className="admin-menu-card__header">
                  <h3 className="admin-menu-card__name">{item.name}</h3>
                  <span className="admin-menu-card__price">
                    {formatCurrency(item.price)}
                  </span>
                </div>
                <p className="admin-menu-card__desc">{item.description}</p>
                <div className="admin-menu-card__meta">
                  <span className="admin-menu-card__category">
                    {getCategoryName(item.categoryId)}
                  </span>
                  <span className="admin-menu-card__rating">
                    ⭐ {item.rating} ({item.reviewCount})
                  </span>
                </div>
                <div className="admin-menu-card__actions">
                  <button
                    onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                    className={`admin-toggle ${item.isAvailable ? 'admin-toggle--on' : 'admin-toggle--off'}`}
                    title={item.isAvailable ? 'إيقاف' : 'تفعيل'}
                  >
                    {item.isAvailable ? (
                      <ToggleRight size={24} />
                    ) : (
                      <ToggleLeft size={24} />
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    className="admin-icon-btn admin-icon-btn--edit"
                    title="تعديل"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="admin-icon-btn admin-icon-btn--delete"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="admin-empty">
          <p>🍽️ مفيش أصناف بتطابق البحث</p>
        </div>
      )}

      <AnimatePresence>
        {showModal && editItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="admin-modal-overlay"
            onClick={() => !uploading && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="admin-modal admin-modal--lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="admin-modal__header">
                <h3>{editItem.id ? 'تعديل صنف' : 'إضافة صنف جديد'}</h3>
                <button
                  onClick={() => !uploading && setShowModal(false)}
                  disabled={uploading}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="admin-modal__body">
                <div className="admin-form-group">
                  <label>اسم الصنف *</label>
                  <input
                    type="text"
                    value={editItem.name || ''}
                    onChange={e =>
                      setEditItem({ ...editItem, name: e.target.value })
                    }
                    className="admin-input"
                    placeholder=""
                  />
                </div>

                <div className="admin-form-group">
                  <label>الوصف</label>
                  <textarea
                    value={editItem.description || ''}
                    onChange={e =>
                      setEditItem({ ...editItem, description: e.target.value })
                    }
                    className="admin-input admin-textarea"
                    placeholder=""
                    rows={3}
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>السعر (₪) *</label>
                    <input
                      type="number"
                      value={editItem.price || ''}
                      onChange={e =>
                        setEditItem({
                          ...editItem,
                          price: Number(e.target.value)
                        })
                      }
                      className="admin-input"
                      min={0}
                      dir="ltr"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>الفئة *</label>
                    <select
                      value={editItem.categoryId || ''}
                      onChange={e =>
                        setEditItem({
                          ...editItem,
                          categoryId: e.target.value
                        })
                      }
                      className="admin-input"
                    >
                      <option value="">اختر فئة</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="text-xl font-black mb-4 block">تخصيص الوجبة</label>
                  
                  <div className="space-y-3">
                    {/* Ingredients Accordion */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
                      <button
                        type="button"
                        onClick={() => setOpenAccordion(openAccordion === 'ingredients' ? null : 'ingredients')}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-black text-lg">
                          <span>🥬</span> المكونات الأساسية
                        </div>
                        <span className="text-gray-400">{openAccordion === 'ingredients' ? '▲' : '▼'}</span>
                      </button>
                      
                      {openAccordion === 'ingredients' && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
                          <p className="text-xs text-gray-500">المكونات الافتراضية اللي بتدخل في الوجبة (الزبون بيقدر يحذفها)</p>
                          {selectedIngredients.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedIngredients.map(name => (
                                <span
                                  key={name}
                                  className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                >
                                  {name}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedIngredients(prev => prev.filter(i => i !== name))}
                                    className="mr-0.5 text-green-500 hover:text-red-500 transition"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-black/30">
                            {INVENTORY_CATEGORIES.map(cat => {
                              const catItems = inventoryItems.filter(inv => inv.category === cat.id);
                              if (catItems.length === 0) return null;
                              return (
                                <div key={cat.id}>
                                  <p className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <span>{cat.emoji}</span> {cat.label}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {catItems.map(inv => {
                                      const isSelected = selectedIngredients.includes(inv.name);
                                      return (
                                        <button
                                          key={inv.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedIngredients(prev =>
                                              isSelected ? prev.filter(i => i !== inv.name) : [...prev, inv.name]
                                            );
                                          }}
                                          className={`rounded-full border px-3 py-1 text-sm font-semibold transition-all ${isSelected
                                              ? 'border-green-500 bg-green-500 text-white shadow-sm'
                                              : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                                            }`}
                                        >
                                          {isSelected && '✓ '}{inv.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bread Accordion */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setOpenAccordion(openAccordion === 'bread' ? null : 'bread')}
                        className={`w-full flex items-center justify-between p-4 transition-colors ${openAccordion === 'bread' ? 'bg-amber-500 text-white' : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      >
                        <div className="flex items-center gap-3 font-black text-lg">
                          <span className="bg-white/20 p-1.5 rounded-lg">🍞</span> 
                          <div>
                            <span>الخبز</span>
                            <span className="block text-[10px] opacity-70 font-bold">({editItem.customizationOptions?.breadTypes?.length || 0} أنواع)</span>
                          </div>
                        </div>
                        <span className="opacity-60">{openAccordion === 'bread' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
                      </button>
                      
                      {openAccordion === 'bread' && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <label className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={editItem.customizationOptions?.isBreadRequired || false}
                              onChange={(e) => setEditItem({
                                ...editItem,
                                customizationOptions: {
                                  ...editItem.customizationOptions,
                                  isBreadRequired: e.target.checked
                                }
                              })}
                              className="w-5 h-5 accent-amber-600 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="font-black text-amber-900 dark:text-amber-300">إجباري</span>
                              <span className="text-[10px] text-amber-700/70 dark:text-amber-500/70">يجب على الزبون اختيار نوع الخبز ليتمكن من الطلب</span>
                            </div>
                          </label>

                          <div className="space-y-2">
                            <p className="text-xs font-black text-gray-500 px-1">الخيارات الحالية:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(editItem.customizationOptions?.breadTypes || []).map((b, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm group">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm">{b.name}</span>
                                    <span className="text-[10px] font-black text-primary-main">{b.price > 0 ? `+${formatCurrency(b.price)}` : 'مجاني'}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = editItem.customizationOptions?.breadTypes || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          breadTypes: current.filter((_, i) => i !== idx)
                                        }
                                      });
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                              {(!editItem.customizationOptions?.breadTypes || editItem.customizationOptions.breadTypes.length === 0) && (
                                <p className="col-span-full py-4 text-center text-xs text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">لا يوجد خيارات مضافة بعد</p>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
                            <div>
                              <p className="text-xs font-black text-gray-500 mb-2 px-1">إضافة خيار مخصص:</p>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="اسم الخبز" 
                                  id="new-bread-name"
                                  className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500"
                                />
                                <input 
                                  type="number" 
                                  placeholder="السعر" 
                                  id="new-bread-price"
                                  className="w-20 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500"
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const nameEl = document.getElementById('new-bread-name') as HTMLInputElement;
                                    const priceEl = document.getElementById('new-bread-price') as HTMLInputElement;
                                    if (nameEl.value) {
                                      const current = editItem.customizationOptions?.breadTypes || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          breadTypes: [...current, { name: nameEl.value, price: Number(priceEl.value) || 0 }]
                                        }
                                      });
                                      nameEl.value = '';
                                      priceEl.value = '';
                                    }
                                  }}
                                  className="bg-amber-500 text-white p-2 rounded-xl hover:bg-amber-600 transition-colors"
                                >
                                  <Plus size={20} />
                                </button>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-xs font-black text-gray-500 mb-2 px-1">إضافة سريعة من المخزن:</p>
                              <div className="flex flex-wrap gap-2">
                                {inventoryItems.filter(inv => inv.category === 'bread' && !editItem.customizationOptions?.breadTypes?.some(b => b.name === inv.name)).map(inv => (
                                  <button
                                    key={inv.id}
                                    type="button"
                                    onClick={() => {
                                      const current = editItem.customizationOptions?.breadTypes || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          breadTypes: [...current, { name: inv.name, price: inv.price || 0 }]
                                        }
                                      });
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold hover:border-amber-500 hover:text-amber-500 transition-all"
                                  >
                                    + {inv.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sauces Accordion */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setOpenAccordion(openAccordion === 'sauces' ? null : 'sauces')}
                        className={`w-full flex items-center justify-between p-4 transition-colors ${openAccordion === 'sauces' ? 'bg-rose-500 text-white' : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      >
                        <div className="flex items-center gap-3 font-black text-lg">
                          <span className="bg-white/20 p-1.5 rounded-lg">🧴</span> 
                          <div>
                            <span>الصوصات</span>
                            <span className="block text-[10px] opacity-70 font-bold">({editItem.customizationOptions?.sauces?.length || 0} صوصات)</span>
                          </div>
                        </div>
                        <span className="opacity-60">{openAccordion === 'sauces' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
                      </button>
                      
                      {openAccordion === 'sauces' && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <label className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={editItem.customizationOptions?.isSaucesRequired || false}
                              onChange={(e) => setEditItem({
                                ...editItem,
                                customizationOptions: {
                                  ...editItem.customizationOptions,
                                  isSaucesRequired: e.target.checked
                                }
                              })}
                              className="w-5 h-5 accent-rose-600 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="font-black text-rose-900 dark:text-rose-300">إجباري</span>
                              <span className="text-[10px] text-rose-700/70 dark:text-rose-500/70">يجب على الزبون اختيار صوص واحد على الأقل</span>
                            </div>
                          </label>

                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(editItem.customizationOptions?.sauces || []).map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm group">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm">{s.name}</span>
                                    <span className="text-[10px] font-black text-primary-main">{s.price > 0 ? `+${formatCurrency(s.price)}` : 'مجاني'}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = editItem.customizationOptions?.sauces || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          sauces: current.filter((_, i) => i !== idx)
                                        }
                                      });
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
                            <div>
                              <p className="text-xs font-black text-gray-500 mb-2 px-1">إضافة صوص مخصص:</p>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="اسم الصوص" 
                                  id="new-sauce-name"
                                  className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-rose-500"
                                />
                                <input 
                                  type="number" 
                                  placeholder="السعر" 
                                  id="new-sauce-price"
                                  className="w-20 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-rose-500"
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const nameEl = document.getElementById('new-sauce-name') as HTMLInputElement;
                                    const priceEl = document.getElementById('new-sauce-price') as HTMLInputElement;
                                    if (nameEl.value) {
                                      const current = editItem.customizationOptions?.sauces || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          sauces: [...current, { name: nameEl.value, price: Number(priceEl.value) || 0 }]
                                        }
                                      });
                                      nameEl.value = '';
                                      priceEl.value = '';
                                    }
                                  }}
                                  className="bg-rose-500 text-white p-2 rounded-xl hover:bg-rose-600 transition-colors"
                                >
                                  <Plus size={20} />
                                </button>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-black text-gray-500 mb-2 px-1">إضافة من المخزن:</p>
                              <div className="flex flex-wrap gap-2">
                                {inventoryItems.filter(inv => inv.category === 'sauces' && !editItem.customizationOptions?.sauces?.some(s => s.name === inv.name)).map(inv => (
                                  <button
                                    key={inv.id}
                                    type="button"
                                    onClick={() => {
                                      const current = editItem.customizationOptions?.sauces || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          sauces: [...current, { name: inv.name, price: inv.price || 0 }]
                                        }
                                      });
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold hover:border-rose-500 hover:text-rose-500 transition-all"
                                  >
                                    + {inv.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Extras Accordion */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setOpenAccordion(openAccordion === 'extras' ? null : 'extras')}
                        className={`w-full flex items-center justify-between p-4 transition-colors ${openAccordion === 'extras' ? 'bg-primary-main text-white' : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      >
                        <div className="flex items-center gap-3 font-black text-lg">
                          <span className="bg-white/20 p-1.5 rounded-lg">➕</span> 
                          <div>
                            <span>الإضافات المدفوعة</span>
                            <span className="block text-[10px] opacity-70 font-bold">({editItem.customizationOptions?.extras?.length || 0} إضافات)</span>
                          </div>
                        </div>
                        <span className="opacity-60">{openAccordion === 'extras' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
                      </button>
                      
                      {openAccordion === 'extras' && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(editItem.customizationOptions?.extras || []).map((e, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm group">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm">{e.name}</span>
                                    <span className="text-[10px] font-black text-primary-main">{`+${formatCurrency(e.price)}`}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = editItem.customizationOptions?.extras || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          extras: current.filter((_, i) => i !== idx)
                                        }
                                      });
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
                            <div>
                              <p className="text-xs font-black text-gray-500 mb-2 px-1">إضافة إضافة مخصصة:</p>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="اسم الإضافة" 
                                  id="new-extra-name"
                                  className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary-main"
                                />
                                <input 
                                  type="number" 
                                  placeholder="السعر" 
                                  id="new-extra-price"
                                  className="w-20 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary-main"
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const nameEl = document.getElementById('new-extra-name') as HTMLInputElement;
                                    const priceEl = document.getElementById('new-extra-price') as HTMLInputElement;
                                    if (nameEl.value) {
                                      const current = editItem.customizationOptions?.extras || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          extras: [...current, { name: nameEl.value, price: Number(priceEl.value) || 0 }]
                                        }
                                      });
                                      nameEl.value = '';
                                      priceEl.value = '';
                                    }
                                  }}
                                  className="bg-primary-main text-white p-2 rounded-xl hover:bg-primary-dark transition-colors"
                                >
                                  <Plus size={20} />
                                </button>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-black text-gray-500 mb-2 px-1">إضافة من المخزن (المواد المدفوعة):</p>
                              <div className="flex flex-wrap gap-2">
                                {inventoryItems.filter(inv => inv.price && inv.price > 0 && inv.category !== 'bread' && inv.category !== 'sauces' && !editItem.customizationOptions?.extras?.some(e => e.name === inv.name)).map(inv => (
                                  <button
                                    key={inv.id}
                                    type="button"
                                    onClick={() => {
                                      const current = editItem.customizationOptions?.extras || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          extras: [...current, { name: inv.name, price: inv.price || 0 }]
                                        }
                                      });
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold hover:border-primary-main hover:text-primary-main transition-all"
                                  >
                                    + {inv.name} ({formatCurrency(inv.price || 0)})
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Removals Accordion */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setOpenAccordion(openAccordion === 'removals' ? null : 'removals')}
                        className={`w-full flex items-center justify-between p-4 transition-colors ${openAccordion === 'removals' ? 'bg-gray-800 text-white' : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      >
                        <div className="flex items-center gap-3 font-black text-lg">
                          <span className="bg-white/20 p-1.5 rounded-lg">🚫</span> 
                          <div>
                            <span>بدون (قابل للحذف)</span>
                            <span className="block text-[10px] opacity-70 font-bold">({editItem.customizationOptions?.removals?.length || 0} مكونات)</span>
                          </div>
                        </div>
                        <span className="opacity-60">{openAccordion === 'removals' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
                      </button>
                      
                      {openAccordion === 'removals' && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <p className="text-xs text-gray-500 font-bold px-1">المكونات اللي بيقدر الزبون يطلب إزالتها (مثلاً: بدون بندورة):</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {(editItem.customizationOptions?.removals || []).map((name, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {name}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = editItem.customizationOptions?.removals || [];
                                    setEditItem({
                                      ...editItem,
                                      customizationOptions: {
                                        ...editItem.customizationOptions!,
                                        removals: current.filter((_, i) => i !== idx)
                                      }
                                    });
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
                            <div>
                              <p className="text-xs font-black text-gray-500 mb-2 px-1">إضافة مكون للحذف:</p>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="اسم المكون (مثلاً: بصل)" 
                                  id="new-removal-name"
                                  className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-gray-800"
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const nameEl = document.getElementById('new-removal-name') as HTMLInputElement;
                                    if (nameEl.value) {
                                      const current = editItem.customizationOptions?.removals || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          removals: [...current, nameEl.value]
                                        }
                                      });
                                      nameEl.value = '';
                                    }
                                  }}
                                  className="bg-gray-800 text-white p-2 rounded-xl hover:bg-black transition-colors"
                                >
                                  <Plus size={20} />
                                </button>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-black text-gray-500 mb-2 px-1">إضافة سريعة من المكونات الأساسية:</p>
                              <div className="flex flex-wrap gap-2">
                                {[...new Set([...selectedIngredients, ...inventoryItems.filter(i => i.category === 'vegetables' || i.category === 'cheese').map(i => i.name)])].filter(name => !editItem.customizationOptions?.removals?.includes(name)).slice(0, 15).map(name => (
                                  <button
                                    key={name}
                                    type="button"
                                    onClick={() => {
                                      const current = editItem.customizationOptions?.removals || [];
                                      setEditItem({
                                        ...editItem,
                                        customizationOptions: {
                                          ...editItem.customizationOptions!,
                                          removals: [...current, name]
                                        }
                                      });
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold hover:border-gray-800 transition-all"
                                  >
                                    + {name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                <div className="admin-form-group">
                  <label>صور المنتج (حتى 4 صور)</label>

                  {imagePreviews.length > 0 && (
                    <div className="admin-image-previews">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="admin-image-preview">
                          <img src={preview.url} alt={`Preview ${index + 1}`} />
                          <button
                            className="admin-image-preview__remove"
                            onClick={() => removeImage(index)}
                            type="button"
                          >
                            <XCircle size={20} />
                          </button>
                          {index === 0 && (
                            <span className="admin-image-preview__main">
                              رئيسية
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {imagePreviews.length < 4 && (
                    <div
                      className={`admin-dropzone ${isDragging ? 'admin-dropzone--active' : ''}`}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={e => e.target.files && handleFiles(e.target.files)}
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        hidden
                      />
                      <div className="admin-dropzone__content">
                        {isDragging ? (
                          <>
                            <Upload
                              size={40}
                              className="admin-dropzone__icon admin-dropzone__icon--active"
                            />
                            <p className="admin-dropzone__text">أفلت الصور هنا!</p>
                          </>
                        ) : (
                          <>
                            <ImageIcon size={40} className="admin-dropzone__icon" />
                            <p className="admin-dropzone__text">
                              اسحب الصور وأفلتها هنا
                            </p>
                            <p className="admin-dropzone__hint">
                              أو اضغط لاختيار صور — JPG, PNG, WebP
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {uploading && (
                    <div className="admin-upload-progress">
                      <div className="admin-upload-progress__bar">
                        <div
                          className="admin-upload-progress__fill"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="admin-upload-progress__text">
                        <Loader2 size={14} className="animate-spin" />
                        جاري الرفع... {uploadProgress}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-modal__footer">
                <button
                  onClick={() => !uploading && setShowModal(false)}
                  className="admin-btn admin-btn--ghost"
                  disabled={uploading}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="admin-btn admin-btn--primary"
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {uploading
                    ? 'جاري الرفع...'
                    : editItem.id
                      ? 'حفظ التعديلات'
                      : 'إضافة'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              onClick={e => e.stopPropagation()}
            >
              <div
                className="admin-modal__body"
                style={{ textAlign: 'center', padding: '2rem' }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
                <h3 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>
                  حذف الصنف؟
                </h3>
                <p style={{ color: '#9CA3AF', marginBottom: '1.5rem' }}>
                  هل أنت متأكد؟ هاد الإجراء مش ردّه
                </p>
                <div
                  style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}
                >
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="admin-btn admin-btn--ghost"
                  >
                    لا، خليه
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="admin-btn admin-btn--danger"
                  >
                    أيوا، احذف
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ManageMenuPage;
