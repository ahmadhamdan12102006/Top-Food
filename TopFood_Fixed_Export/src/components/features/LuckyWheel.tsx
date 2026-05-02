import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { Gift, RotateCw, CheckCircle2 } from 'lucide-react';
import { getMenuItems } from '../../services/menuService';
import type { MenuItem } from '../../types';
import Button from '../common/Button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LuckyWheel: React.FC = () => {
  const navigate = useNavigate();
  const controls = useAnimation();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const allItems = await getMenuItems();
        // Pick 8 random items for the wheel
        const shuffled = [...allItems].sort(() => 0.5 - Math.random());
        setItems(shuffled.slice(0, 8));
      } catch (error) {
        console.error('Failed to fetch items for wheel:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const spin = async () => {
    if (isSpinning || items.length === 0) return;

    setIsSpinning(true);
    setResult(null);

    const randomDegrees = 1800 + Math.floor(Math.random() * 360);
    
    await controls.start({
      rotate: randomDegrees,
      transition: { duration: 4, ease: "easeOut" }
    });

    const finalRotation = randomDegrees % 360;
    const sectionSize = 360 / items.length;
    const winningIndex = Math.floor((360 - (finalRotation % 360)) / sectionSize) % items.length;
    
    setResult(items[winningIndex]);
    setIsSpinning(false);
    toast.success(`مبروك! ربحت ${items[winningIndex].name}`, { icon: '🎁' });
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-primary-main/20 via-white to-primary-main/10 p-8 dark:from-primary-dark/20 dark:via-surface-dark dark:to-surface-dark border border-primary-main/20">
      <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
        
        <div className="max-w-md text-center lg:text-right">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-main/20 px-4 py-2 text-primary-dark">
            <Gift size={20} />
            <span className="font-bold">عجلة الحظ اليومية</span>
          </div>
          <h2 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
            شو بدك <span className="text-primary-dark">تتعشى</span> اليوم؟
          </h2>
          <p className="mb-8 text-lg font-bold text-gray-500 dark:text-gray-400">
            جرب حظك وخلي توب فود يختارلك وجبة عشوائية من المنيو بلمسة واحدة!
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
            <Button 
              onClick={spin} 
              disabled={isSpinning}
              className="h-16 px-10 text-xl font-black shadow-2xl shadow-primary-main/30"
            >
              <RotateCw className={`ml-2 ${isSpinning ? 'animate-spin' : ''}`} />
              {isSpinning ? 'جاري السحب...' : 'لف العجلة'}
            </Button>
            
            {result && (
              <Button 
                variant="ghost"
                onClick={() => navigate(`/menu/${result.id}`)}
                className="h-16 px-10 text-xl font-black"
              >
                اطلبها الآن
              </Button>
            )}
          </div>
        </div>

        <div className="relative flex h-[350px] w-[350px] items-center justify-center sm:h-[450px] sm:w-[450px]">
          {/* Pointer */}
          <div className="absolute -top-2 z-20 text-primary-dark">
            <div className="h-10 w-1 bg-primary-main" />
            <div className="h-0 w-0 border-l-[15px] border-r-[15px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary-main" />
          </div>

          <motion.div 
            animate={controls}
            className="relative h-full w-full rounded-full border-[12px] border-white bg-white shadow-2xl dark:border-surface-dark dark:bg-surface-dark"
            style={{ rotate: 0 }}
          >
            {items.map((item, index) => {
              const rotate = (360 / items.length) * index;
              return (
                <div 
                  key={item.id}
                  className="absolute inset-0 flex items-start justify-center"
                  style={{ transform: `rotate(${rotate}deg)` }}
                >
                  <div 
                    className="mt-4 flex flex-col items-center gap-2"
                    style={{ transform: `rotate(${360 / items.length / 2}deg)` }}
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md dark:border-gray-800">
                      <img src={item.images?.[0] || '/favicon.svg'} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="max-w-[80px] text-center text-[10px] font-black leading-tight sm:text-xs">
                      {item.name}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Center Hub */}
            <div className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-main text-black shadow-xl">
              <img src="/favicon.svg" alt="Top Food" className="h-12 w-12" />
            </div>
          </motion.div>
          
          {/* Decorative Rings */}
          <div className="absolute inset-0 -m-4 rounded-full border-2 border-primary-main/20" />
          <div className="absolute inset-0 -m-8 rounded-full border border-primary-main/10" />
        </div>
      </div>
      
      {/* Result Overlay */}
      <AnimatePresence>
        {result && !isSpinning && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mt-12 flex flex-col items-center justify-center gap-6 rounded-[2rem] bg-white/80 p-8 backdrop-blur-md dark:bg-surface-dark/80 border-2 border-primary-main"
          >
            <CheckCircle2 size={48} className="text-primary-dark" />
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2">وجبتك المحظوظة هي:</h3>
              <p className="text-4xl font-black text-primary-dark">{result.name}</p>
            </div>
            <img src={result.images?.[0]} alt="" className="h-32 w-48 rounded-2xl object-cover shadow-xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LuckyWheel;
