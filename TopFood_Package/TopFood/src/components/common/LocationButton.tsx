import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocateFixed, Loader2, Navigation, Check } from 'lucide-react';

interface LocationButtonProps {
  onClick: () => void;
  loading: boolean;
  hasLocation: boolean;
  className?: string;
  label?: string;
}

const LocationButton: React.FC<LocationButtonProps> = ({
  onClick,
  loading,
  hasLocation,
  className = '',
  label = 'تحديد موقعي الحالي'
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex w-full items-center gap-4 rounded-[2rem] border-2 px-6 py-5 transition-all duration-300 ${
        hasLocation
          ? 'border-green-500 bg-green-50 text-green-700 shadow-xl shadow-green-500/10'
          : 'border-gray-100 bg-white hover:border-primary-main hover:shadow-2xl hover:shadow-primary-main/10 dark:bg-surface-dark dark:border-gray-800 dark:hover:border-primary-main'
      } ${loading ? 'cursor-wait opacity-80' : ''} ${className}`}
    >
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] transition-all duration-500 ${
        hasLocation 
          ? 'bg-green-500 text-white rotate-[360deg]' 
          : 'bg-primary-main/10 text-primary-dark group-hover:bg-primary-main group-hover:text-black'
      }`}>
        {loading ? (
          <Loader2 size={26} className="animate-spin" />
        ) : hasLocation ? (
          <Check size={26} strokeWidth={3} />
        ) : (
          <Navigation size={26} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        )}
      </div>
      
      <div className="flex flex-col items-start text-right">
        <span className="text-lg font-black leading-tight">
          {loading ? 'جاري التحديد...' : hasLocation ? 'الموقع جاهز' : label}
        </span>
        <span className={`mt-1 text-xs font-bold uppercase tracking-wider transition-colors ${
          hasLocation ? 'text-green-600/70' : 'text-gray-400 dark:text-gray-500 group-hover:text-primary-dark'
        }`}>
          {hasLocation ? 'تم تأكيد إحداثيات GPS' : 'دقة عالية عبر الأقمار الصناعية'}
        </span>
      </div>

      <AnimatePresence>
        {hasLocation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-2 -left-2 bg-green-500 text-white p-2 rounded-full shadow-lg z-10 border-4 border-white dark:border-surface-dark"
          >
            <LocateFixed size={16} strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default LocationButton;

// Note: I will use framer-motion in the actual file, but for now I'll just write the code.
