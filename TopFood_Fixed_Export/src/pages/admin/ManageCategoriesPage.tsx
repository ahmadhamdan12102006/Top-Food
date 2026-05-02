import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Category } from '../../types';
import {
  createCategory,
  deleteCategory,
  getCategories,
  reorderCategories,
  updateCategory,
} from '../../services/menuService';
import ImageDropzone, {
  type AdminImagePreview,
} from '../../components/admin/ImageDropzone';
import {
  createPreviewURL,
  uploadProductImage,
  validateImageFile,
} from '../../services/imageUploadService';

type FormState = {
  name: string;
  image: string;
  isActive: boolean;
};

const initialForm: FormState = {
  name: '',
  image: '',
  isActive: true,
};

const ManageCategoriesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<AdminImagePreview[]>([]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [categories]
  );

  const clearLocalPreviewUrls = () => {
    imagePreviews.forEach((preview) => {
      if (preview.file) {
        URL.revokeObjectURL(preview.url);
      }
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل الأقسام');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        if (preview.file) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [imagePreviews]);

  const resetForm = () => {
    clearLocalPreviewUrls();
    setForm(initialForm);
    setImagePreviews([]);
    setEditingCategoryId(null);
  };

  const handleImageFiles = (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'ملف الصورة غير صالح');
      return;
    }

    clearLocalPreviewUrls();
    setImagePreviews([
      {
        url: createPreviewURL(file),
        file,
      },
    ]);
    setForm((prev) => ({ ...prev, image: '' }));
  };

  const handleRemoveImage = () => {
    clearLocalPreviewUrls();
    setImagePreviews([]);
    setForm((prev) => ({ ...prev, image: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('اسم القسم مطلوب');
      return;
    }

    setSaving(true);

    try {
      let imageUrl = form.image.trim();

      if (imagePreviews[0]?.file) {
        imageUrl = await uploadProductImage(imagePreviews[0].file);
      } else if (imagePreviews[0]?.url) {
        imageUrl = imagePreviews[0].url;
      } else {
        imageUrl = '';
      }

      if (editingCategoryId) {
        await updateCategory(editingCategoryId, {
          name: form.name.trim(),
          image: imageUrl,
          isActive: form.isActive,
        });

        toast.success('تم تحديث القسم');
      } else {
        await createCategory({
          name: form.name.trim(),
          image: imageUrl,
          isActive: form.isActive,
          order: sortedCategories.length + 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        toast.success('تمت إضافة القسم');
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (category: Category) => {
    clearLocalPreviewUrls();
    setEditingCategoryId(category.id);
    setForm({
      name: category.name || '',
      image: category.image || '',
      isActive: category.isActive !== false,
    });
    setImagePreviews(
      category.image
        ? [
            {
              url: category.image,
              isExisting: true,
            },
          ]
        : []
    );

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (categoryId: string) => {
    const ok = window.confirm('هل تريد حذف هذا القسم؟');
    if (!ok) return;

    try {
      await deleteCategory(categoryId);
      toast.success('تم حذف القسم');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('فشل حذف القسم');
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await updateCategory(category.id, {
        isActive: !(category.isActive !== false),
      });

      toast.success(
        category.isActive !== false ? 'تم إخفاء القسم' : 'تم إظهار القسم'
      );

      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('فشل تحديث حالة القسم');
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const updated = [...sortedCategories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= updated.length) return;

    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];

    try {
      setCategories(updated);
      await reorderCategories(updated);
      toast.success('تم تحديث الترتيب');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('فشل تحديث الترتيب');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1 className="admin-page__title">إدارة الأقسام</h1>
          <p className="admin-page__subtitle">
            إضافة وتعديل وترتيب الأقسام مع صور مباشرة من الجهاز.
          </p>
        </div>
      </div>

      <div className="admin-categories-shell">
        <div className="admin-card admin-categories-form">
          <div className="admin-categories-form__header">
            <h2 className="admin-card__title">
              {editingCategoryId ? 'تعديل قسم' : 'إضافة قسم'}
            </h2>

            {editingCategoryId && (
              <button
                type="button"
                onClick={resetForm}
                className="admin-icon-btn"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="admin-categories-form__body">
            <div className="admin-form-group">
              <label>اسم القسم</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="admin-input"
                  placeholder=""
              />
            </div>

            <div className="admin-form-group">
              <label>صورة القسم</label>
              <ImageDropzone
                previews={imagePreviews}
                onFilesSelected={handleImageFiles}
                onRemove={handleRemoveImage}
                maxFiles={1}
                disabled={saving}
                title="اسحب صورة القسم أو اضغط للاختيار"
                hint="صورة واحدة احترافية تظهر في التطبيق"
              />
            </div>

            <label className="admin-visibility-toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
              <span>القسم ظاهر في التطبيق</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="admin-btn admin-btn--primary admin-btn--wide"
            >
              <Plus size={18} />
              {saving
                ? 'جاري الحفظ...'
                : editingCategoryId
                  ? 'حفظ التعديلات'
                  : 'إضافة القسم'}
            </button>
          </form>
        </div>

        <div className="admin-card">
          <h2 className="admin-card__title">الأقسام الحالية</h2>

          {loading ? (
            <div className="admin-loading">
              <div className="admin-loading__spinner" />
              <p>جاري تحميل الأقسام...</p>
            </div>
          ) : sortedCategories.length > 0 ? (
            <div className="admin-categories-list-grid">
              {sortedCategories.map((category, index) => (
                <div key={category.id} className="admin-category-card">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="admin-category-card__image"
                    />
                  ) : (
                    <div className="admin-category-placeholder">
                      <span>{category.name.charAt(0) || 'C'}</span>
                    </div>
                  )}

                  <div className="admin-category-card__body">
                    <div className="admin-category-card__top">
                      <div>
                        <h3 className="admin-category-card__name">{category.name}</h3>
                        <p className="admin-category-card__meta">
                          الترتيب: {category.order || index + 1}
                        </p>
                      </div>
                      <span
                        className={`admin-badge ${
                          category.isActive !== false
                            ? 'admin-badge--success'
                            : 'admin-badge--muted'
                        }`}
                      >
                        {category.isActive !== false ? 'ظاهر' : 'مخفي'}
                      </span>
                    </div>

                    <div className="admin-category-card__actions">
                      <button
                        onClick={() => moveCategory(index, 'up')}
                        disabled={index === 0}
                        className="admin-icon-btn"
                        title="تحريك للأعلى"
                      >
                        <ArrowUp size={18} />
                      </button>

                      <button
                        onClick={() => moveCategory(index, 'down')}
                        disabled={index === sortedCategories.length - 1}
                        className="admin-icon-btn"
                        title="تحريك للأسفل"
                      >
                        <ArrowDown size={18} />
                      </button>

                      <button
                        onClick={() => handleToggleActive(category)}
                        className="admin-icon-btn"
                        title={category.isActive !== false ? 'إخفاء القسم' : 'إظهار القسم'}
                      >
                        {category.isActive !== false ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>

                      <button
                        onClick={() => startEdit(category)}
                        className="admin-icon-btn admin-icon-btn--edit"
                        title="تعديل"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(category.id)}
                        className="admin-icon-btn admin-icon-btn--delete"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <p>لا يوجد أقسام حتى الآن</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageCategoriesPage;
