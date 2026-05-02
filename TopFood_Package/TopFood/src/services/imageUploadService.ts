import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { storage } from './firebase';

const RESIZE_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 60000;
const INLINE_FALLBACK_MAX_BYTES = 140 * 1024;

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const resizeImage = (
  file: File,
  maxWidth = 1600,
  quality = 0.88
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      try {
        if (!ctx) {
          cleanup();
          reject(new Error('تعذر تجهيز الصورة للرفع'));
          return;
        }

        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            cleanup();

            if (blob) {
              resolve(blob);
              return;
            }

            reject(new Error('تعذر ضغط الصورة قبل الرفع'));
          },
          'image/webp',
          quality
        );
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error('فشل تجهيز الصورة'));
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('فشل قراءة ملف الصورة'));
    };

    img.src = objectUrl;
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('تعذر قراءة الصورة المضغوطة'));
      }
    };
    reader.onerror = () => reject(new Error('تعذر تحويل الصورة إلى صيغة قابلة للحفظ'));
    reader.readAsDataURL(blob);
  });

const createInlineFallbackImage = async (file: File): Promise<string> => {
  const presets = [
    { maxWidth: 720, quality: 0.72 },
    { maxWidth: 640, quality: 0.64 },
    { maxWidth: 520, quality: 0.58 },
    { maxWidth: 420, quality: 0.5 },
  ];

  let bestBlob: Blob | null = null;

  for (const preset of presets) {
    const blob = await resizeImage(file, preset.maxWidth, preset.quality);
    bestBlob = blob;

    if (blob.size <= INLINE_FALLBACK_MAX_BYTES) {
      return blobToDataUrl(blob);
    }
  }

  if (!bestBlob) {
    bestBlob = await resizeImage(file, 360, 0.45);
  }

  return blobToDataUrl(bestBlob);
};

const uploadBlobWithProgress = (
  filePath: string,
  blob: Blob,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });

    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('استغرق رفع الصورة وقتًا أطول من المتوقع'));
    }, UPLOAD_TIMEOUT_MS);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (!snapshot.totalBytes) {
          onProgress?.(15);
          return;
        }

        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(Math.max(15, percent));
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      async () => {
        try {
          clearTimeout(timeoutId);
          onProgress?.(95);
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.(100);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

export const getImageUploadErrorMessage = (error: unknown) => {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  switch (code) {
    case 'storage/unauthorized':
      return 'لا توجد صلاحية للرفع إلى Firebase Storage';
    case 'storage/canceled':
      return 'تم إلغاء رفع الصورة';
    case 'storage/retry-limit-exceeded':
      return 'انتهت مهلة الرفع. تحقق من الاتصال وحاول مرة أخرى';
    case 'storage/unknown':
      return 'حدث خطأ غير متوقع أثناء رفع الصورة';
    default:
      return error instanceof Error
        ? error.message
        : 'تعذر رفع الصورة في الوقت الحالي';
  }
};

export const uploadProductImage = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  try {
    onProgress?.(5);

    let uploadBlob: Blob = file;
    let contentType = file.type || 'image/jpeg';
    let extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    try {
      const resizedBlob = await withTimeout(
        resizeImage(file),
        RESIZE_TIMEOUT_MS,
        'استغرق تجهيز الصورة وقتًا أطول من المتوقع'
      );

      uploadBlob = resizedBlob;
      contentType = 'image/webp';
      extension = 'webp';
      onProgress?.(12);
    } catch (resizeError) {
      console.warn('Falling back to original image upload:', resizeError);
      onProgress?.(12);
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_').replace(/\.[^.]+$/, '');
    const filePath = `products/${timestamp}_${safeName}.${extension}`;

    try {
      return await uploadBlobWithProgress(
        filePath,
        uploadBlob,
        contentType,
        onProgress
      );
    } catch (storageError) {
      console.warn(
        'Falling back to inline image storage because Firebase Storage upload failed:',
        storageError
      );
      onProgress?.(85);
      const inlineImage = await createInlineFallbackImage(file);
      onProgress?.(100);
      return inlineImage;
    }
  } catch (error) {
    console.error('Image upload failed:', error);
    throw new Error(getImageUploadErrorMessage(error));
  }
};

export const uploadDriverImage = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  try {
    onProgress?.(5);
    const blob = await resizeImage(file, 800, 0.85); // Drivers don't need huge images
    const timestamp = Date.now();
    const filePath = `drivers/${timestamp}_profile.webp`;
    
    return await uploadBlobWithProgress(filePath, blob, 'image/webp', onProgress);
  } catch (error) {
    console.error('Driver image upload failed:', error);
    // Fallback to inline if storage fails
    const inline = await createInlineFallbackImage(file);
    return inline;
  }
};

export const uploadMultipleImages = async (
  files: File[],
  onProgress?: (percent: number) => void
): Promise<string[]> => {
  const urls: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const url = await uploadProductImage(files[i], (progress) => {
      const overall = ((i + progress / 100) / total) * 100;
      onProgress?.(Math.round(overall));
    });
    urls.push(url);
  }

  onProgress?.(100);
  return urls;
};

export const createPreviewURL = (file: File): string => {
  return URL.createObjectURL(file);
};

export const validateImageFile = (
  file: File
): { valid: boolean; error?: string } => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  const maxSize = 10 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'حجم الصورة كبير جدًا. الحد الأقصى 10MB',
    };
  }

  return { valid: true };
};
