import { cn } from "@/lib/utils";
import type { IconProps as SurnaIconProps } from "@/components/icons/SurnaIcons";
import {
  HomeIcon as SurnaHome,
  SearchIcon as SurnaSearch,
  TeamsIcon as SurnaTeams,
  ProfileIcon as SurnaProfile,
  MessagesIcon as SurnaMessages,
  AlertsIcon as SurnaAlerts,
  MapIcon as SurnaMap,
  PlacesIcon as SurnaPlaces,
  EventsIcon as SurnaEvents,
  CameraIcon as SurnaCamera,
  SettingsIcon as SurnaSettings,
  LikeIcon as SurnaLike,
  TrophyIcon as SurnaTrophy,
  ProIcon as SurnaPro,
  StreakIcon as SurnaStreak,
  SendIcon as SurnaSend,
  SaveIcon as SurnaSave,
  ShareIcon as SurnaShare,
  CloseIcon as SurnaClose,
  EditIcon as SurnaEdit,
  DeleteIcon as SurnaDelete,
  FollowIcon as SurnaFollow,
  PrivacyIcon as SurnaPrivacy,
  VoiceIcon as SurnaVoice,
  MarketIcon as SurnaMarket,
  InstantJoinIcon as SurnaInstantJoin,
} from "@/components/icons/SurnaIcons";
import type { ComponentType } from "react";

export type IconName =
  | "house"
  | "magnifying-glass"
  | "plus"
  | "plus-circle"
  | "users"
  | "user"
  | "user-circle"
  | "chat-circle"
  | "bell"
  | "shopping-bag"
  | "dots-three-vertical"
  | "map-pin"
  | "calendar"
  | "ticket"
  | "buildings"
  | "envelope"
  | "phone"
  | "pencil"
  | "camera"
  | "gear"
  | "shield"
  | "globe"
  | "heart"
  | "trophy"
  | "star"
  | "target"
  | "clock"
  | "check"
  | "x"
  | "caret-left"
  | "caret-right"
  | "caret-down"
  | "bookmark-simple"
  | "share-fat"
  | "paper-plane-right"
  | "play"
  | "pause"
  | "skip-forward"
  | "skip-back"
  | "microphone"
  | "image"
  | "smiley"
  | "paperclip"
  | "arrow-counter-clockwise"
  | "eye"
  | "eye-slash"
  | "lock-key"
  | "lock-key-open"
  | "trash"
  | "chart-bar"
  | "medal"
  | "crown"
  | "fire"
  | "lightning"
  | "gift"
  | "sliders-horizontal"
  | "navigation-arrow"
  | "user-plus"
  | "funnel"
  | "arrow-left"
  | "moon"
  | "sun";

export type IconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

interface IconProps {
  name: IconName;
  size?: "sm" | "md" | "lg" | "xl";
  weight?: IconWeight;
  className?: string;
  color?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}

const sizePx = {
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
} as const;

const sizeClasses = {
  sm: "text-[20px]",
  md: "text-[24px]",
  lg: "text-[32px]",
  xl: "text-[40px]",
} as const;

const weightClass: Record<IconWeight, string> = {
  thin: "ph-thin",
  light: "ph-light",
  regular: "ph",
  bold: "ph-bold",
  fill: "ph-fill",
  duotone: "ph-duotone",
};

/** Phosphor name → SURNA custom SVG (bottom nav & shell) */
const SURNA_BY_NAME: Partial<Record<IconName, ComponentType<SurnaIconProps>>> = {
  house: SurnaHome,
  "magnifying-glass": SurnaSearch,
  users: SurnaTeams,
  user: SurnaProfile,
  "user-circle": SurnaProfile,
  "chat-circle": SurnaMessages,
  bell: SurnaAlerts,
  "map-pin": SurnaMap,
  buildings: SurnaPlaces,
  calendar: SurnaEvents,
  ticket: SurnaEvents,
  camera: SurnaCamera,
  gear: SurnaSettings,
  heart: SurnaLike,
  trophy: SurnaTrophy,
  crown: SurnaPro,
  fire: SurnaStreak,
  lightning: SurnaInstantJoin,
  "bookmark-simple": SurnaSave,
  "share-fat": SurnaShare,
  "paper-plane-right": SurnaSend,
  "shopping-bag": SurnaMarket,
  x: SurnaClose,
  pencil: SurnaEdit,
  trash: SurnaDelete,
  "user-plus": SurnaFollow,
  "lock-key": SurnaPrivacy,
  microphone: SurnaVoice,
};

export function Icon({
  name,
  size = "md",
  weight = "regular",
  className,
  color,
  "aria-hidden": ariaHidden = true,
  "aria-label": ariaLabel,
}: IconProps) {
  const Surna = SURNA_BY_NAME[name];
  const px = sizePx[size];

  if (Surna) {
    return (
      <Surna
        size={px}
        color={color ?? "currentColor"}
        className={cn("inline-block shrink-0 leading-none", className)}
        aria-hidden={ariaHidden}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <i
      className={cn(weightClass[weight], `ph-${name}`, sizeClasses[size], "leading-none", className)}
      style={color ? { color } : undefined}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
    />
  );
}

type IconSubset = Omit<IconProps, "name">;

export const HomeIcon = (props: IconSubset) => <Icon name="house" {...props} />;
export const SearchIcon = (props: IconSubset) => <Icon name="magnifying-glass" {...props} />;
export const CreateIcon = (props: IconSubset) => <Icon name="plus-circle" {...props} />;
export const TeamsIcon = (props: IconSubset) => <Icon name="users" {...props} />;
export const ProfileIcon = (props: IconSubset) => <Icon name="user" {...props} />;
export const ChatIcon = (props: IconSubset) => <Icon name="chat-circle" {...props} />;
export const BellIcon = (props: IconSubset) => <Icon name="bell" {...props} />;
export const ShopIcon = (props: IconSubset) => <Icon name="shopping-bag" {...props} />;
