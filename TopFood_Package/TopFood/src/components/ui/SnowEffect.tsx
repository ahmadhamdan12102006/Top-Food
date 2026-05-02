import React from 'react';

const flakes = [
  { left: '4%', delay: '0s', duration: '13s', size: 4, opacity: 0.45 },
  { left: '11%', delay: '1.2s', duration: '16s', size: 5, opacity: 0.32 },
  { left: '18%', delay: '3.4s', duration: '14s', size: 6, opacity: 0.42 },
  { left: '27%', delay: '2.1s', duration: '18s', size: 4, opacity: 0.24 },
  { left: '34%', delay: '4.8s', duration: '15s', size: 5, opacity: 0.35 },
  { left: '43%', delay: '0.8s', duration: '17s', size: 6, opacity: 0.26 },
  { left: '52%', delay: '3.1s', duration: '14s', size: 5, opacity: 0.33 },
  { left: '61%', delay: '5.4s', duration: '19s', size: 4, opacity: 0.28 },
  { left: '69%', delay: '1.7s', duration: '16s', size: 6, opacity: 0.31 },
  { left: '77%', delay: '2.8s', duration: '15s', size: 5, opacity: 0.25 },
  { left: '85%', delay: '4.2s', duration: '18s', size: 4, opacity: 0.3 },
  { left: '93%', delay: '0.6s', duration: '17s', size: 5, opacity: 0.22 },
];

const SnowEffect: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="snow-layer">
        {flakes.map((flake, index) => (
          <span
            key={index}
            className="snow-flake"
            style={{
              left: flake.left,
              animationDelay: flake.delay,
              animationDuration: flake.duration,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: flake.opacity,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SnowEffect;