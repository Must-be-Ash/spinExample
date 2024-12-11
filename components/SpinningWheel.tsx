import React, { useEffect, useRef } from 'react';

interface SpinningWheelProps {
  entries: string[];
  rotation: number;
  onSpinComplete: () => void;
}

const SpinningWheel: React.FC<SpinningWheelProps> = ({ entries, rotation, onSpinComplete }) => {
  const wheelRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const wheel = wheelRef.current;
    if (wheel) {
      requestAnimationFrame(() => {
        wheel.style.transition = 'transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)';
        wheel.style.transform = `rotate(${rotation}deg)`;
      });
    }
  }, [rotation]);

  useEffect(() => {
    const wheel = wheelRef.current;
    if (wheel) {
      const handleTransitionEnd = () => {
        onSpinComplete();
      };
      wheel.addEventListener('transitionend', handleTransitionEnd);
      return () => {
        wheel.removeEventListener('transitionend', handleTransitionEnd);
      };
    }
  }, [onSpinComplete]);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'
  ];

  const radius = 150;
  const centerX = 150;
  const centerY = 150;

  return (
    <div className="relative w-[300px] h-[300px]">
      {/* Static pointer triangle */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 transform -translate-y-2">
        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-black" />
      </div>

      <svg width="300" height="300" viewBox="0 0 300 300" className="transform">
        <g ref={wheelRef} style={{ transformOrigin: 'center' }}>
          {entries.map((entry, index) => {
            const angle = (360 / entries.length) * index;
            const angleInRadians = (angle * Math.PI) / 180;
            const nextAngleInRadians = ((angle + 360 / entries.length) * Math.PI) / 180;
            
            // Calculate text position
            const textAngle = angle + (360 / entries.length / 2);
            const textRadius = radius * 0.65; // Position text at 65% of radius
            const textX = centerX + textRadius * Math.cos((textAngle - 90) * Math.PI / 180);
            const textY = centerY + textRadius * Math.sin((textAngle - 90) * Math.PI / 180);

            return (
              <g key={index}>
                {/* Wheel segment */}
                <path
                  d={`
                    M ${centerX} ${centerY}
                    L ${centerX + radius * Math.cos(angleInRadians)} ${centerY + radius * Math.sin(angleInRadians)}
                    A ${radius} ${radius} 0 0 1 ${centerX + radius * Math.cos(nextAngleInRadians)} ${centerY + radius * Math.sin(nextAngleInRadians)}
                    Z
                  `}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                />
                {/* Text */}
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                >
                  {entry}
                </text>
              </g>
            );
          })}
        </g>

        {/* Center circle */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r="15" 
          fill="black" 
          stroke="white" 
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

export default SpinningWheel;

