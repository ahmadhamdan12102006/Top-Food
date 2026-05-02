import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  monochrome?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 40, monochrome = true }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src="/top-logo-new.png" 
        alt="Top Food Logo" 
        className="object-contain h-auto transition-all duration-300"
        style={{ width: size }}
      />
    </div>
  );
};

export default Logo;
