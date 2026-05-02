import React, { useState } from 'react';
import { Loader2, Star, X } from 'lucide-react';
import Button from '../common/Button';

interface ReviewFormProps {
  onClose: () => void;
  onSubmit: (payload: { rating: number; comment: string }) => Promise<void>;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) return;

    setSubmitting(true);
    try {
      await onSubmit({
        rating,
        comment: comment.trim(),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl dark:bg-surface-dark">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black">أضف تقييمك</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              شاركنا رأيك المختصر عن هذا المنتج.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200 dark:bg-black dark:hover:bg-gray-900"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="mb-3 font-bold">التقييم</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={
                      value <= (hoveredRating || rating)
                        ? 'fill-primary-main text-primary-main'
                        : 'text-gray-300'
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block font-bold">تعليقك</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder=""
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:border-primary-main dark:border-gray-700 dark:bg-black"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 rounded-2xl py-3"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={submitting || rating < 1}
              className="flex-1 rounded-2xl py-3"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  جاري الإرسال...
                </span>
              ) : (
                'إرسال التقييم'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
