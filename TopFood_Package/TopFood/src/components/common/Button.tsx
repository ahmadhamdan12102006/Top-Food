import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseStyles = 'px-4 py-2 rounded-md font-bold transition-colors duration-200';
  const variants = {
    primary: 'bg-primary-main hover:bg-primary-dark text-black',
    secondary: 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700',
    danger: 'bg-status-error text-white hover:bg-opacity-80',
    ghost: 'bg-transparent text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900',
    outline: 'bg-transparent border border-gray-200 dark:border-gray-800 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
