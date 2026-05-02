import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MenuItem } from '../../types';
import Button from '../common/Button';

interface DailyWheelProps {
  items: MenuItem[];
}

const DailyWheel: React.FC<DailyWheelProps> = ({ items }) => {
  const navigate = useNavigate();
  const [dailyItems, setDailyItems] = useState<MenuItem[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    // Use current date as seed for deterministic daily random items
    const today = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < today.length; i++) {
      seed += today.charCodeAt(i);
    }

    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const shuffled = [...items].sort(() => seededRandom() - 0.5);
    setDailyItems(shuffled.slice(0, 6));
  }, [items]);

  const handleSpin = () => {
    if (isSpinning || dailyItems.length === 0) return;
    
    setIsSpinning(true);
    setSelectedIndex(null);

    // Simulate spin duration
    setTimeout(() => {
      const winner = Math.floor(Math.random() * dailyItems.length);
      setSelectedIndex(winner);
      setIsSpinning(false);
    }, 2000);
  };

  if (dailyItems.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-[3rem] bg-[#111112] border border-white/5 p-8 sm:p-12">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-main/10 blur-[100px]" />
      
      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-right">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-main/10 border border-secondary-main/20 text-secondary-main text-sm font-black mb-6">
            <Sparkles size={16} />
            <span>عجلة الحظ اليومية</span>
          </div>
          
          <h3 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
            محتار شو توكل؟ <br />
            <span className="text-primary-main">خلّي الحظ يختارلك!</span>
          </h3>
          
          <p className="text-white/60 text-lg mb-10 max-w-md">
            جرب حظك اليوم مع وجباتنا العشوائية المختارة بعناية. اضغط على الزر وشوف شو رح يطلعلك!
          </p>

          <Button 
            onClick={handleSpin}
            disabled={isSpinning}
            className="h-16 px-12 rounded-2xl text-xl font-black shadow-2xl shadow-primary-main/20 group"
          >
            <RotateCw className={`ml-3 transition-transform duration-1000 ${isSpinning ? 'animate-spin' : 'group-hover:rotate-180'}`} size={24} />
            {isSpinning ? 'جاري السحب...' : 'إسحب وجبتك'}
          </Button>
        </div>

        <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
          {/* Circular Wheel Visual */}
          <div className="absolute inset-0 rounded-full border-8 border-white/5 shadow-2xl" />
          
          <div className="relative w-full h-full">
            {dailyItems.map((item, index) => {
              const angle = (index * 360) / dailyItems.length;
              const isSelected = selectedIndex === index;
              
              return (
                <motion.div
                  key={item.id}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 sm:w-32"
                  animate={{
                    rotate: isSpinning ? [0, 360 * 5] : 0,
                    scale: isSelected ? 1.2 : 1,
                    opacity: selectedIndex !== null && !isSelected ? 0.3 : 1,
                  }}
                  transition={{
                    rotate: isSpinning ? { duration: 2, ease: "easeInOut" } : { duration: 0 },
                    scale: { type: "spring", stiffness: 300 }
                  }}
                  style={{
                    transformOrigin: "center center",
                    transform: `rotate(${angle}deg) translateY(-120px) rotate(-${angle}deg)`,
                  }}
                >
                  <div 
                    className={`p-2 rounded-2xl bg-surface-dark border transition-all ${
                      isSelected ? 'border-primary-main shadow-lg shadow-primary-main/40 scale-110' : 'border-white/5'
                    }`}
                  >
                    <img 
                      src={item.images[0]} 
                      alt={item.name} 
                      className="w-full aspect-square object-cover rounded-xl mb-2"
                    />
                    <p className="text-[10px] font-black text-white text-center truncate">{item.name}</p>
                  </div>
                </motion.div>
              );
            })}
            
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-primary-main rounded-full shadow-2xl flex items-center justify-center z-20">
              <Trophy className="text-black" size={24} />
            </div>
          </div>
          
          {/* Winner Notification */}
          <AnimatePresence>
            {selectedIndex !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-full p-6 text-center"
              >
                <Trophy className="text-secondary-main mb-4" size={48} />
                <h4 className="text-2xl font-black text-white mb-1">وجبة حظك اليوم هي:</h4>
                <p className="text-xl font-bold text-primary-main mb-6">{dailyItems[selectedIndex].name}</p>
                <Button
                  onClick={() => navigate(`/menu/${dailyItems[selectedIndex].id}`)}
                  className="rounded-xl font-black"
                >
                  اطلبها الآن
                </Button>
                <button 
                  onClick={() => setSelectedIndex(null)}
                  className="mt-4 text-white/40 text-sm font-bold hover:text-white transition"
                >
                  إغلاق
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default DailyWheel;
