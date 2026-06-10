interface CircularProgressProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function CircularProgress({ 
  progress, 
  size = 220, 
  strokeWidth = 14, 
  className = "" 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference * progress;
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${strokeDasharray}, ${circumference}`}
          fill="none"
          className="transition-all duration-500"
        />
      </svg>
    </div>
  );
}