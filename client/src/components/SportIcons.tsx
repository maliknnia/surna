import React from 'react';

interface SportIconProps {
  className?: string;
  size?: number;
}

// Clean monoline sports icons following the design specifications
export const FootballIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <ellipse cx="12" cy="12" rx="8" ry="5" />
    <path d="M8.5 10.5L15.5 13.5" />
    <path d="M8.5 13.5L15.5 10.5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

export const BasketballIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <circle cx="12" cy="12" r="8" />
    <path d="M4 12h16" />
    <path d="M12 4v16" />
    <path d="M6.34 6.34c3.53-3.53 9.28-3.53 12.81 0" />
    <path d="M6.34 17.66c3.53 3.53 9.28 3.53 12.81 0" />
  </svg>
);

export const VolleyballIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4c-2.5 2.5-2.5 6.5 0 8s6.5 2.5 8 0" />
    <path d="M12 20c2.5-2.5 2.5-6.5 0-8s-6.5-2.5-8 0" />
    <path d="M4 12c2.5-2.5 6.5-2.5 8 0s2.5 6.5 0 8" />
  </svg>
);

export const TennisIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <ellipse cx="8" cy="12" rx="6" ry="8" transform="rotate(-45 8 12)" />
    <path d="M10 10l8 8" />
    <path d="M6 14l8 8" />
    <circle cx="19" cy="5" r="2" />
  </svg>
);

export const WeightliftingIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <rect x="3" y="11" width="2" height="2" />
    <rect x="19" y="11" width="2" height="2" />
    <rect x="5" y="10" width="2" height="4" />
    <rect x="17" y="10" width="2" height="4" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <rect x="9" y="11.5" width="6" height="1" />
  </svg>
);

export const RunningIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <circle cx="8" cy="4" r="2" />
    <path d="M10 6v4l-2 2v8" />
    <path d="M8 12l4-2 2 4" />
    <path d="M14 14l2 2" />
    <path d="M6 20h4" />
    <path d="M16 16l2-1" />
  </svg>
);

export const BoxingIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <ellipse cx="6" cy="10" rx="4" ry="6" />
    <ellipse cx="18" cy="10" rx="4" ry="6" />
    <path d="M10 8c1-2 2-2 4 0" />
    <path d="M10 12c1-1 2-1 4 0" />
  </svg>
);

export const GymnasticsIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <circle cx="12" cy="4" r="2" />
    <path d="M12 6c-2 0-4 2-4 4v2" />
    <path d="M12 6c2 0 4 2 4 4v2" />
    <path d="M8 12l-2 6" />
    <path d="M16 12l2 6" />
    <path d="M8 12h8" />
    <circle cx="6" cy="18" r="1" />
    <circle cx="18" cy="18" r="1" />
  </svg>
);

export const SwimmingIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <circle cx="8" cy="6" r="2" />
    <path d="M10 8c2 0 3 1 3 3l-1 4" />
    <path d="M7 11l-1 4" />
    <path d="M12 15l2-2" />
    <path d="M3 20c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0 2-1 3 0 2 1 3 0" />
    <path d="M3 16c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0 2-1 3 0 2 1 3 0" />
  </svg>
);

export const SoccerIcon: React.FC<SportIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-sport ${className}`}>
    <circle cx="12" cy="12" r="8" />
    <polygon points="12,8 9.5,10 10.5,13.5 13.5,13.5 14.5,10" />
    <path d="M12 8L8.5 5.5" />
    <path d="M9.5 10L5.5 8.5" />
    <path d="M10.5 13.5L8.5 18.5" />
    <path d="M13.5 13.5L15.5 18.5" />
    <path d="M14.5 10L18.5 8.5" />
    <path d="M12 8L15.5 5.5" />
  </svg>
);

// Sport icon mapping
export const SPORT_ICONS = {
  football: FootballIcon,
  basketball: BasketballIcon,
  volleyball: VolleyballIcon,
  tennis: TennisIcon,
  weightlifting: WeightliftingIcon,
  running: RunningIcon,
  boxing: BoxingIcon,
  gymnastics: GymnasticsIcon,
  swimming: SwimmingIcon,
  soccer: SoccerIcon,
} as const;

export type SportType = keyof typeof SPORT_ICONS;

interface SportIconComponentProps extends SportIconProps {
  sport: SportType;
  selected?: boolean;
}

export const SportIcon: React.FC<SportIconComponentProps> = ({ 
  sport, 
  selected = false, 
  className = "", 
  size = 24 
}) => {
  const IconComponent = SPORT_ICONS[sport];
  
  if (!IconComponent) {
    return <div className={`icon-24 ${className}`} />;
  }
  
  return (
    <IconComponent 
      className={`${className} ${selected ? 'selected' : ''} icon-interactive`} 
      size={size} 
    />
  );
};

// Mobile Hero Icons - matching the design exactly
interface MobileIconProps {
  className?: string;
  size?: number;
}

const MobileBaseIcon = ({ children, className = "", size = 32 }: { children: React.ReactNode } & MobileIconProps) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={1.8} 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

export const FeedIcon = (props: MobileIconProps) => (
  <MobileBaseIcon {...props}>
    <path d="M21 12a7 7 0 0 1-7 7H7l-4 3 1-5A7 7 0 1 1 21 12Z" />
  </MobileBaseIcon>
);

export const SportsIcon = (props: MobileIconProps) => (
  <MobileBaseIcon {...props}>
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
    <path d="M3 21a9 9 0 0 1 18 0" />
  </MobileBaseIcon>
);

export const PerformaIcon = (props: MobileIconProps) => (
  <MobileBaseIcon {...props}>
    <path d="M4 15h4M4 11h8M4 7h12" />
  </MobileBaseIcon>
);

export const MobileSoccerIcon = (props: MobileIconProps) => (
  <MobileBaseIcon {...props}>
    <circle cx={12} cy={12} r={9} />
    <path d="M9 7l3 2 3-2m0 0l2 3-1 3m-4-6L8 10l1 3m-1 3l3 2 3-2m-6 0l-3-2-2-3m11 5l3-2 2-3" />
  </MobileBaseIcon>
);

export const MobileBasketballIcon = (props: MobileIconProps) => (
  <MobileBaseIcon {...props}>
    <circle cx={12} cy={12} r={9} />
    <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9M12 3c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9" />
  </MobileBaseIcon>
);

export const MobileBoxingIcon = (props: MobileIconProps) => (
  <MobileBaseIcon {...props}>
    <path d="M7 14c-1.7-2.5-.2-6 2.8-6h3.4c3 0 4.5 3.5 2.8 6l-1.6 2.4a4 4 0 0 1-3.3 1.6H9.8A4 4 0 0 1 7 14Z" />
  </MobileBaseIcon>
);

export const SwimIcon = (props: MobileIconProps) => (
  <MobileBaseIcon {...props}>
    <path d="M6 9l3-2 2 2 2-1 3 2" />
    <path d="M3 17c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0" />
  </MobileBaseIcon>
);

export const MobileTennisIcon = (props: MobileIconProps) => (
  <MobileBaseIcon {...props}>
    <path d="M16 8a6 6 0 1 1-8 8 6 6 0 0 1 8-8Z" />
    <path d="M20 4l-4 4" />
  </MobileBaseIcon>
);

export const CyclingIcon = (props: MobileIconProps) => (
  <MobileBaseIcon {...props}>
    <circle cx={6} cy={17} r={3} />
    <circle cx={18} cy={17} r={3} />
    <path d="M6 17l5-9h4l-3 5h4" />
  </MobileBaseIcon>
);