import React from 'react';

const MenuSkeleton: React.FC = () => {
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-300 dark:bg-gray-700 w-full" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6" />
        <div className="flex justify-between items-center pt-4">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
};

export default MenuSkeleton;
