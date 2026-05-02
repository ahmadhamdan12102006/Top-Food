import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, XCircle } from 'lucide-react';

export interface AdminImagePreview {
  url: string;
  file?: File;
  isExisting?: boolean;
}

interface ImageDropzoneProps {
  previews: AdminImagePreview[];
  onFilesSelected: (files: FileList | File[]) => void;
  onRemove: (index: number) => void;
  maxFiles?: number;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  title?: string;
  hint?: string;
}

const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  previews,
  onFilesSelected,
  onRemove,
  maxFiles = 1,
  multiple = false,
  accept = 'image/jpeg,image/png,image/webp',
  disabled = false,
  title = 'اسحب الصور وأفلتها هنا',
  hint = 'أو اضغط لاختيار الصور من جهازك',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounterRef.current += 1;
    if (e.dataTransfer.items?.length) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    dragCounterRef.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files?.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div className="admin-media-field">
      {previews.length > 0 && (
        <div className="admin-media-grid">
          {previews.map((preview, index) => (
            <div
              key={`${preview.url}-${index}`}
              className={`admin-media-tile ${index === 0 ? 'admin-media-tile--primary' : ''}`}
            >
              <img src={preview.url} alt={`Preview ${index + 1}`} />
              <button
                type="button"
                className="admin-media-tile__remove"
                onClick={() => onRemove(index)}
                disabled={disabled}
              >
                <XCircle size={18} />
              </button>
              {index === 0 && (
                <span className="admin-media-tile__badge">الرئيسية</span>
              )}
            </div>
          ))}
        </div>
      )}

      {previews.length < maxFiles && (
        <div
          className={`admin-media-dropzone ${isDragging ? 'admin-media-dropzone--active' : ''} ${
            disabled ? 'admin-media-dropzone--disabled' : ''
          }`}
          onClick={openPicker}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.files?.length) {
                onFilesSelected(e.target.files);
                e.currentTarget.value = '';
              }
            }}
          />

          <div className="admin-media-dropzone__icon-wrap">
            {isDragging ? <Upload size={26} /> : <ImageIcon size={26} />}
          </div>
          <p className="admin-media-dropzone__title">
            {isDragging ? 'أفلت الصور هنا الآن' : title}
          </p>
          <p className="admin-media-dropzone__hint">{hint}</p>
        </div>
      )}
    </div>
  );
};

export default ImageDropzone;
