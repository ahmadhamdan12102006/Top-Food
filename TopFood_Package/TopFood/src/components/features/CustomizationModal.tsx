import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface CustomizationOption {
  name: string;
  price: number;
  isAvailable?: boolean;
  image?: string;
}

interface CustomizationModalProps {
  title: string;
  icon: React.ReactNode;
  options: CustomizationOption[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  selectionMode: 'single' | 'multiple';
  isOpen: boolean;
  onClose: () => void;
}

const CustomizationModal: React.FC<CustomizationModalProps> = ({
  title,
  icon,
  options,
  selected,
  onSelectionChange,
  selectionMode,
  isOpen,
  onClose,
}) => {
  const handleToggle = (optionName: string) => {
    if (selectionMode === 'single') {
      onSelectionChange([optionName]);
    } else {
      if (selected.includes(optionName)) {
        onSelectionChange(selected.filter((s) => s !== optionName));
      } else {
        onSelectionChange([...selected, optionName]);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-[#141418] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141418]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-main/15 flex items-center justify-center text-primary-dark">
                  {icon}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{title}</h3>
                  <p className="text-xs text-gray-400">
                    {selectionMode === 'single' ? 'اختر خياراً واحداً' : `${selected.length} مختار`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Options */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {options.map((option) => {
                const isSelected = selected.includes(option.name);
                const isUnavailable = option.isAvailable === false;

                return (
                  <button
                    key={option.name}
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => handleToggle(option.name)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all duration-200 ${
                      isUnavailable
                        ? 'opacity-40 cursor-not-allowed border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'
                        : isSelected
                          ? 'border-primary-main bg-primary-main/5 shadow-md shadow-primary-main/10 scale-[1.01]'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 hover:border-primary-main/30 hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    {/* Image/Emoji */}
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center overflow-hidden border border-gray-50 dark:border-gray-800">
                      {option.image ? (
                        <img src={option.image} alt={option.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-primary-main">{option.name.charAt(0)}</span>
                      )}
                    </div>

                    {/* Name + Status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black text-gray-900 dark:text-white leading-tight">{option.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {isUnavailable
                          ? 'غير متوفر حالياً'
                          : isSelected
                            ? '✓ تم الاختيار'
                            : 'اضغط للاختيار'}
                      </p>
                    </div>

                    {/* Price + Check */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                        isUnavailable
                          ? 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                          : isSelected
                            ? 'bg-primary-main text-black'
                            : 'bg-white dark:bg-gray-800 text-primary-dark shadow-sm'
                      }`}>
                        {isUnavailable
                          ? 'نفذ'
                          : option.price > 0
                            ? `+${option.price}₪`
                            : 'مجاني'}
                      </span>
                      
                      {isSelected && !isUnavailable && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-7 h-7 rounded-full bg-primary-main flex items-center justify-center"
                        >
                          <Check size={16} className="text-black" />
                        </motion.div>
                      )}
                    </div>
                  </button>
                );
              })}

              {options.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">
                  لا توجد خيارات متاحة
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 p-4 pt-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141418]">
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-primary-main text-black font-black text-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary-main/20"
              >
                تأكيد ({selected.length})
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomizationModal;
