import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import { motion } from 'framer-motion';
import { X, Check, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import Button from './Button';

interface ImageCropperModalProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onClose: () => void;
  aspect?: number;
  circularCrop?: boolean;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  image,
  onCropComplete,
  onClose,
  aspect = 1,
  circularCrop = true,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState(aspect);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
      }, 'image/jpeg');
    });
  };

  const handleSave = async () => {
    if (croppedAreaPixels) {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
    >
      <div className="relative flex h-full max-h-[800px] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white dark:bg-surface-dark">
        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
          <h2 className="text-xl font-black">تعديل الصورة</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative flex-1 bg-gray-900">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={circularCrop ? 'round' : 'rect'}
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
          />
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">أبعاد الصورة</p>
            <div className="flex gap-2">
              {[
                { label: '1:1', value: 1 },
                { label: '4:3', value: 4 / 3 },
                { label: '16:9', value: 16 / 9 },
              ].map((ratio) => (
                <button
                  key={ratio.label}
                  onClick={() => setAspectRatio(ratio.value)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-black transition-all ${
                    aspectRatio === ratio.value
                      ? 'bg-primary-main text-black shadow-lg shadow-primary-main/20'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ZoomOut size={18} className="text-gray-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
            />
            <ZoomIn size={18} className="text-gray-400" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setZoom(1);
                setCrop({ x: 0, y: 0 });
              }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 transition hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              title="إعادة ضبط"
            >
              <RotateCcw size={20} />
            </button>
            
            <Button
              onClick={handleSave}
              className="h-12 flex-1 rounded-xl font-black"
            >
              <Check size={20} className="ml-2" />
              تأكيد وقص الصورة
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ImageCropperModal;
