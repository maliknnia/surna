import React from 'react';

interface UIIconProps {
  className?: string;
  size?: number;
}

// Clean monoline UI icons following the design specifications
export const HomeIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <path d="M3 12l9-9 9 9" />
    <path d="M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
  </svg>
);

export const ProfileIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21c0-4.418 2.939-8 7.5-8s7.5 3.582 7.5 8" />
  </svg>
);

export const FeedIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    <path d="M8 10h8" />
    <path d="M8 14h4" />
  </svg>
);

export const SearchIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

export const NotificationIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

export const SettingsIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

export const PerformanceIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>
);

export const CoachIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 00-16 0" />
    <path d="M12 13v8" />
    <path d="M8 17l8-8" />
  </svg>
);

export const MessageIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
);

export const ShoppingIcon: React.FC<UIIconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`icon-monoline ${className}`}>
    <path d="M6 2L3 6v14c0 1.1.9 2 2 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

// UI Icon mapping
export const UI_ICONS = {
  home: HomeIcon,
  profile: ProfileIcon,
  feed: FeedIcon,
  search: SearchIcon,
  notifications: NotificationIcon,
  settings: SettingsIcon,
  performance: PerformanceIcon,
  coach: CoachIcon,
  message: MessageIcon,
  shopping: ShoppingIcon,
} as const;

export type UIIconType = keyof typeof UI_ICONS;

interface UIIconComponentProps extends UIIconProps {
  icon: UIIconType;
  active?: boolean;
}

export const UIIcon: React.FC<UIIconComponentProps> = ({ 
  icon, 
  active = false, 
  className = "", 
  size = 24 
}) => {
  const IconComponent = UI_ICONS[icon];
  
  if (!IconComponent) {
    return <div className={`icon-24 ${className}`} />;
  }
  
  return (
    <IconComponent 
      className={`nav-icon ${active ? 'active' : ''} ${className} icon-interactive`} 
      size={size} 
    />
  );
};