import React, { forwardRef } from "react";

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
  color?: string;
}

type SurnaIcon = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

function createSurnaIcon(
  displayName: string,
  render: (color: string) => React.ReactNode,
  options?: { strokeWidth?: number; fill?: "none" | "current" },
): SurnaIcon {
  const strokeWidth = options?.strokeWidth ?? 2;
  const Comp = forwardRef<SVGSVGElement, IconProps>(function SurnaIcon(
    { size = 24, color = "currentColor", className, style, ...rest },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={options?.fill === "current" ? color : "none"}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden={rest["aria-hidden"] ?? true}
        {...rest}
      >
        {render(color)}
      </svg>
    );
  });
  Comp.displayName = displayName;
  return Comp;
}

export const HomeIcon = createSurnaIcon("HomeIcon", () => (
  <>
    <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 0-1.5 1.5H15v-7H9v7H4.5A1.5 1.5 0 0 1 3 20V10.5z" />
  </>
));

export const MapIcon = createSurnaIcon("MapIcon", (color) => (
  <>
    <path d="M12 2C8 2 5 5.3 5 9.5C5 14.5 12 22 12 22C12 22 19 14.5 19 9.5C19 5.3 16 2 12 2Z" />
    <circle cx="12" cy="9.5" r="2.5" fill={color} stroke="none" />
    <path d="M5.5 7C5.5 7 3 7 2 9M18.5 7C18.5 7 21 7 22 9" />
  </>
));

export const CameraIcon = createSurnaIcon("CameraIcon", (color) => (
  <>
    <rect x="2" y="7" width="20" height="14" rx="4" />
    <path d="M9 7L10.5 4.5C10.8 4.2 11.2 4 11.7 4H12.3C12.8 4 13.2 4.2 13.5 4.5L15 7" />
    <circle cx="12" cy="14" r="3.5" />
    <circle cx="18" cy="10" r="1.2" fill={color} stroke="none" />
  </>
));

export const MessagesIcon = createSurnaIcon("MessagesIcon", () => (
  <>
    <path d="M21 13.5C21 17.1 17.9 20 14 20L9 22L9.5 18.5C7 17.5 5 15.7 5 13.5C5 9.9 8.1 7 12 7C15.9 7 21 9.9 21 13.5Z" />
    <path d="M3 10C3 6.7 6.5 4 11 4C11.7 4 12.4 4.1 13 4.2" />
  </>
));

export const ProfileIcon = createSurnaIcon("ProfileIcon", () => (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21C4 17.5 7.6 14.5 12 14.5C16.4 14.5 20 17.5 20 21" />
  </>
));

export const InstantJoinIcon = createSurnaIcon("InstantJoinIcon", () => (
  <>
    <circle cx="7" cy="7" r="3" />
    <circle cx="17" cy="7" r="3" />
    <path d="M3 20C3 17.2 4.8 15 7 15" />
    <path d="M21 20C21 17.2 19.2 15 17 15" />
    <path d="M10 18H14" />
    <path d="M12 15V21" />
  </>
));

export const SendIcon = forwardRef<SVGSVGElement, IconProps>(function SendIcon(
  { size = 24, color = "currentColor", className, style, ...rest },
  ref,
) {
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden={rest["aria-hidden"] ?? true}
      {...rest}
    >
      <path d="M22 2L11 13" />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        fill={color}
        fillOpacity={0.15}
        stroke={color}
      />
    </svg>
  );
});

export const LikeIcon = createSurnaIcon(
  "LikeIcon",
  () => (
    <path d="M19.5 5.5C18.5 4.4 17.1 3.8 15.6 3.8C14.1 3.8 12.8 4.5 12 5.6C11.2 4.5 9.9 3.8 8.4 3.8C6.9 3.8 5.5 4.4 4.5 5.5C3.4 6.6 2.9 8 3.1 9.5C3.5 12.5 12 20.2 12 20.2C12 20.2 20.5 12.5 20.9 9.5C21.1 8 20.6 6.6 19.5 5.5Z" />
  ),
  { strokeWidth: 2.5 },
);

export const CommentIcon = createSurnaIcon("CommentIcon", () => (
  <path d="M21 11.5C21 16.2 16.7 20 12 20C10.3 20 8.7 19.6 7.3 18.9L3 21L4 16.4C3.4 15.1 3 13.4 3 11.5C3 6.8 7.3 3 12 3C16.7 3 21 6.8 21 11.5Z" />
));

export const ProIcon = createSurnaIcon("ProIcon", () => (
  <>
    <path d="M12 12C12 12 9 8 6.5 8C4 8 2 10 2 12C2 14 4 16 6.5 16C9 16 12 12 12 12Z" />
    <path d="M12 12C12 12 15 16 17.5 16C20 16 22 14 22 12C22 10 20 8 17.5 8C15 8 12 12 12 12Z" />
  </>
));

export const PlacesIcon = createSurnaIcon("PlacesIcon", () => (
  <>
    <path d="M12 2C8.7 2 6 4.7 6 8C6 12.8 12 20 12 20C12 20 18 12.8 18 8C18 4.7 15.3 2 12 2Z" />
    <path d="M9.5 7H14.5M9.5 9.5H14.5M11 12V7" />
  </>
));

export const TeamsIcon = createSurnaIcon("TeamsIcon", () => (
  <>
    <circle cx="9" cy="7" r="3.5" />
    <circle cx="17" cy="6" r="2.5" />
    <path d="M1 21C1 17.5 4.7 15 9 15C13.3 15 17 17.5 17 21" />
    <path d="M17 11C19.2 11 22 12.5 22 15.5V21" />
  </>
));

export const ChallengeIcon = createSurnaIcon("ChallengeIcon", () => (
  <>
    <path d="M7 3H17V13C17 15.8 14.8 18 12 18C9.2 18 7 15.8 7 13V3Z" />
    <path d="M7 6.5C7 6.5 4.5 6.5 4.5 10C4.5 11.5 5.5 12.5 7 13" />
    <path d="M17 6.5C17 6.5 19.5 6.5 19.5 10C19.5 11.5 18.5 12.5 17 13" />
    <path d="M12 18V21M9 21H15" />
  </>
));

export const EventsIcon = createSurnaIcon("EventsIcon", (color) => (
  <>
    <rect x="3" y="5" width="18" height="17" rx="3.5" />
    <path d="M3 10H21" />
    <path d="M8 3V7M16 3V7" />
    <circle cx="8.5" cy="15" r="1" fill={color} stroke="none" />
    <circle cx="12" cy="15" r="1" fill={color} stroke="none" />
    <circle cx="15.5" cy="15" r="1" fill={color} stroke="none" />
    <circle cx="8.5" cy="19" r="1" fill={color} stroke="none" />
    <circle cx="12" cy="19" r="1" fill={color} stroke="none" />
  </>
));

export const CoachesIcon = createSurnaIcon("CoachesIcon", () => (
  <>
    <circle cx="10" cy="7" r="4" />
    <path d="M2 21C2 17.5 5.6 15 10 15" />
    <path d="M16 17L18.5 19.5L23 14.5" />
  </>
));

export const MarketIcon = createSurnaIcon("MarketIcon", () => (
  <>
    <path d="M4 4H6.5L8.5 14H18L20 7H8.5" />
    <circle cx="10.5" cy="18" r="1.8" />
    <circle cx="17.5" cy="18" r="1.8" />
  </>
));

export const SearchIcon = createSurnaIcon("SearchIcon", () => (
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M16.5 16.5L22 22" />
  </>
));

export const AlertsIcon = createSurnaIcon("AlertsIcon", () => (
  <>
    <path d="M12 3C8.7 3 6 5.7 6 9V15L4 18H20L18 15V9C18 5.7 15.3 3 12 3Z" />
    <path d="M10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18" />
  </>
));

export const SaveIcon = createSurnaIcon("SaveIcon", () => (
  <path d="M17 21L12 17L7 21V5C7 3.9 7.9 3 9 3H15C16.1 3 17 3.9 17 5V21Z" />
));

export const ShareIcon = createSurnaIcon("ShareIcon", () => (
  <>
    <path d="M21 3L14 10M21 3H15M21 3V9" />
    <path d="M10 5H5C3.9 5 3 5.9 3 7V19C3 20.1 3.9 21 5 21H17C18.1 21 19 20.1 19 19V14" />
  </>
));

export const SettingsIcon = createSurnaIcon("SettingsIcon", () => (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2V4M12 20V22M4.2 4.2L5.6 5.6M18.4 18.4L19.8 19.8M2 12H4M20 12H22M4.2 19.8L5.6 18.4M18.4 5.6L19.8 4.2" />
  </>
));

export const TrophyIcon = createSurnaIcon("TrophyIcon", () => (
  <>
    <path d="M7 3H17V13C17 15.8 14.8 18 12 18C9.2 18 7 15.8 7 13V3Z" />
    <path d="M7 6.5C7 6.5 4.5 6.5 4.5 10C4.5 11.5 5.5 12.5 7 13" />
    <path d="M17 6.5C17 6.5 19.5 6.5 19.5 10C19.5 11.5 18.5 12.5 17 13" />
    <path d="M12 18V21M9 21H15" />
  </>
));

export const StreakIcon = createSurnaIcon("StreakIcon", (color) => (
  <>
    <path d="M12 2C12 2 14 6 13 9C15 7 16 5 16 5C16 5 19 9 18 13C17 17 14 19 12 19C10 19 7 17 6 13C5 9 8 5 8 5C8 5 9 8 10 9C9 6 12 2 12 2Z" />
    <circle cx="12" cy="15" r="2" fill={color} stroke="none" />
  </>
));

export const CallIcon = createSurnaIcon("CallIcon", () => (
  <path d="M6.5 3H9L11 8L9 9.5C10.1 11.8 12.2 13.9 14.5 15L16 13L21 15V17.5C21 19.4 19.4 21 17.5 21C9.5 21 3 14.5 3 6.5C3 4.6 4.6 3 6.5 3Z" />
));

export const VideoCallIcon = createSurnaIcon("VideoCallIcon", () => (
  <>
    <rect x="2" y="7" width="13" height="10" rx="3" />
    <path d="M15 10.5L21 8V16L15 13.5V10.5Z" />
  </>
));

export const ReplyIcon = createSurnaIcon("ReplyIcon", () => (
  <>
    <path d="M9 14L4 9L9 4" />
    <path d="M4 9H14C17.3 9 20 11.7 20 15V20" />
  </>
));

export const CloseIcon = createSurnaIcon("CloseIcon", () => (
  <path d="M18 6L6 18M6 6L18 18" />
));

export const EditIcon = createSurnaIcon("EditIcon", () => (
  <>
    <path d="M11 4H4C3.4 4 3 4.4 3 5V20C3 20.6 3.4 21 4 21H19C19.6 21 20 20.6 20 20V13" />
    <path d="M18.5 2.5C19.3 1.7 20.7 1.7 21.5 2.5C22.3 3.3 22.3 4.7 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" />
  </>
));

export const DeleteIcon = createSurnaIcon("DeleteIcon", () => (
  <>
    <path d="M3 6H21" />
    <path d="M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6" />
    <path d="M19 6L18 20C18 20.6 17.6 21 17 21H7C6.4 21 6 20.6 6 20L5 6" />
    <path d="M10 11V17M14 11V17" />
  </>
));

export const BlockIcon = createSurnaIcon("BlockIcon", () => (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M6 18L18 6" />
  </>
));

export const QRIcon = createSurnaIcon("QRIcon", (color) => (
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="5" y="5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
    <rect x="16" y="5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
    <rect x="5" y="16" width="3" height="3" rx="0.5" fill={color} stroke="none" />
    <path d="M14 14H17V17M17 14V14.01M14 17H14.01M20 17V20H17M20 14V14.01M20 20H20.01" />
  </>
));

export const FollowIcon = createSurnaIcon("FollowIcon", () => (
  <>
    <circle cx="10" cy="7" r="4" />
    <path d="M2 21C2 17.5 5.6 15 10 15" />
    <path d="M18 14V20M15 17H21" />
  </>
));

export const MoreIcon = forwardRef<SVGSVGElement, IconProps>(function MoreIcon(
  { size = 24, color = "currentColor", className, style, ...rest },
  ref,
) {
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden={rest["aria-hidden"] ?? true}
      {...rest}
    >
      <circle cx="5" cy="12" r="1.5" fill={color} />
      <circle cx="12" cy="12" r="1.5" fill={color} />
      <circle cx="19" cy="12" r="1.5" fill={color} />
    </svg>
  );
});

export const LiveIcon = createSurnaIcon("LiveIcon", () => (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M8 8C6.8 9.2 6 10.5 6 12C6 13.5 6.8 14.8 8 16" />
    <path d="M16 8C17.2 9.2 18 10.5 18 12C18 13.5 17.2 14.8 16 16" />
    <path d="M5 5C3 7 2 9.4 2 12C2 14.6 3 17 5 19" />
    <path d="M19 5C21 7 22 9.4 22 12C22 14.6 21 17 19 19" />
  </>
));

export const VoiceIcon = createSurnaIcon("VoiceIcon", () => (
  <>
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M5 11C5 14.9 8.1 18 12 18C15.9 18 19 14.9 19 11" />
    <path d="M12 18V22M9 22H15" />
  </>
));

export const UploadIcon = createSurnaIcon("UploadIcon", () => (
  <>
    <path d="M21 15V17C21 19.2 19.2 21 17 21H7C4.8 21 3 19.2 3 17V15" />
    <path d="M12 3V15M8 7L12 3L16 7" />
  </>
));

export const PrivacyIcon = createSurnaIcon("PrivacyIcon", (color) => (
  <>
    <rect x="5" y="11" width="14" height="11" rx="3" />
    <path d="M8 11V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V11" />
    <circle cx="12" cy="16" r="1.5" fill={color} stroke="none" />
  </>
));

/** Map style — stacked layers */
export const LayersIcon = createSurnaIcon("LayersIcon", () => (
  <>
    <path d="M12 2L3 7L12 12L21 7L12 2Z" />
    <path d="M3 12L12 17L21 12" />
    <path d="M3 17L12 22L21 17" />
  </>
));

/** Map filters — horizontal sliders */
export const SlidersIcon = createSurnaIcon("SlidersIcon", (color) => (
  <>
    <path d="M4 21V14" />
    <path d="M4 10V3" />
    <path d="M12 21V12" />
    <path d="M12 8V3" />
    <path d="M20 21V16" />
    <path d="M20 12V3" />
    <circle cx="4" cy="12" r="2" fill={color} stroke="none" />
    <circle cx="12" cy="10" r="2" fill={color} stroke="none" />
    <circle cx="20" cy="14" r="2" fill={color} stroke="none" />
  </>
));

/** Recenter / my location — crosshair target */
export const LocateIcon = createSurnaIcon("LocateIcon", (color) => (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22" />
    <circle cx="12" cy="12" r="7" strokeWidth={1.5} />
  </>
));

/** Reels / film strip tab */
export const FilmStripIcon = createSurnaIcon("FilmStripIcon", () => (
  <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 8H22M2 16H22M6 4V8M6 16V20M18 4V8M18 16V20" />
  </>
));
