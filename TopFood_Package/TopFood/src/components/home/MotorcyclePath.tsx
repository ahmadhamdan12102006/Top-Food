import React from 'react';
import { motion } from 'framer-motion';

interface MotorcyclePathProps {
  progress?: number;
}

const MotorcyclePath: React.FC<MotorcyclePathProps> = ({ progress = 65 }) => {
  return (
    <div className="relative h-48 w-full overflow-hidden rounded-[2.5rem] bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 shadow-inner">
      {/* Background Decorative elements */}
      <div className="absolute inset-0 opacity-20 dark:opacity-10">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-700" />
        <div className="absolute top-1/2 left-0 right-0 flex justify-between px-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-1 w-4 bg-gray-300 dark:bg-gray-700" />
          ))}
        </div>
      </div>

      <svg
        viewBox="0 0 400 150"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        {/* Animated Path line */}
        <motion.path
          d="M 0 75 Q 100 25 200 75 T 400 75"
          fill="none"
          stroke="url(#pathGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress / 100 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        
        {/* Static Path Shadow */}
        <path
          d="M 0 75 Q 100 25 200 75 T 400 75"
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-800"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="12 12"
        />

        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFA500" />
          </linearGradient>
        </defs>

        {/* Motorcycle Group */}
        <motion.g
          style={{
            offsetPath: "path('M 0 75 Q 100 25 200 75 T 400 75')",
            offsetDistance: `${progress}%`,
          }}
          className="relative"
        >
          {/* Motorcycle Body */}
          <g transform="translate(-30, -45) scale(1.2)">
             {/* Box with Logo */}
             <rect x="5" y="5" width="25" height="25" rx="4" fill="#FFD700" stroke="#000" strokeWidth="1.5" />
             <image 
                href="/icons/icon-512.png" 
                x="8" y="8" width="18" height="18" 
                preserveAspectRatio="xMidYMid meet"
             />
             
             {/* Bike Shape */}
             <path 
                d="M35 30 L55 30 L60 20 L45 10 Z" 
                fill="#000" 
                className="dark:fill-white"
             />
             <circle cx="38" cy="35" r="6" fill="#333" />
             <circle cx="58" cy="35" r="6" fill="#333" />
             
             {/* Dynamic Exhaust Smoke */}
             <motion.circle 
                cx="30" cy="35" r="2" 
                fill="#888" opacity="0.6"
                animate={{ x: -20, y: -5, scale: 2, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 0.8 }}
             />
          </g>
        </motion.g>
      </svg>

      {/* Progress Info */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6">
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-100 dark:border-white/10 px-6 py-2 rounded-2xl shadow-xl flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-black text-gray-900 dark:text-white">
            جاري التوصيل: {progress}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default MotorcyclePath;
