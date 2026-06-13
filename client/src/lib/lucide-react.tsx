/**
 * Lucide compatibility layer (SURNA Design System).
 * All `import { … } from "lucide-react"` resolve here via Vite/TS alias.
 * Mapped icons use custom SURNA SVGs; others fall back to Phosphor.
 */
import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { cn } from "@/lib/utils";
import type { IconProps as SurnaIconProps } from "@/components/icons/SurnaIcons";

type SurnaIconComponent = ForwardRefExoticComponent<
  SurnaIconProps & RefAttributes<SVGSVGElement>
>;
import {
  MapIcon as SurnaMap,
  CameraIcon as SurnaCamera,
  MessagesIcon as SurnaMessages,
  ProfileIcon as SurnaProfile,
  InstantJoinIcon as SurnaInstantJoin,
  SendIcon as SurnaSend,
  LikeIcon as SurnaLike,
  CommentIcon as SurnaComment,
  ProIcon as SurnaPro,
  PlacesIcon as SurnaPlaces,
  TeamsIcon as SurnaTeams,
  ChallengeIcon as SurnaChallenge,
  EventsIcon as SurnaEvents,
  CoachesIcon as SurnaCoaches,
  MarketIcon as SurnaMarket,
  SearchIcon as SurnaSearch,
  AlertsIcon as SurnaAlerts,
  SaveIcon as SurnaSave,
  ShareIcon as SurnaShare,
  SettingsIcon as SurnaSettings,
  TrophyIcon as SurnaTrophy,
  StreakIcon as SurnaStreak,
  CallIcon as SurnaCall,
  VideoCallIcon as SurnaVideoCall,
  ReplyIcon as SurnaReply,
  CloseIcon as SurnaClose,
  EditIcon as SurnaEdit,
  DeleteIcon as SurnaDelete,
  BlockIcon as SurnaBlock,
  QRIcon as SurnaQR,
  FollowIcon as SurnaFollow,
  MoreIcon as SurnaMore,
  LiveIcon as SurnaLive,
  VoiceIcon as SurnaVoice,
  UploadIcon as SurnaUpload,
  PrivacyIcon as SurnaPrivacy,
} from "@/components/icons/SurnaIcons";

/** Lucide export name → SURNA custom SVG component */
const SURNA_ICON_MAP: Record<string, SurnaIconComponent> = {
  Map: SurnaMap,
  MapPin: SurnaPlaces,
  Camera: SurnaCamera,
  MessageCircle: SurnaMessages,
  MessageSquare: SurnaComment,
  User: SurnaProfile,
  Users: SurnaTeams,
  Send: SurnaSend,
  Heart: SurnaLike,
  Crown: SurnaPro,
  Sparkles: SurnaPro,
  Bell: SurnaAlerts,
  Bookmark: SurnaSave,
  Search: SurnaSearch,
  Settings: SurnaSettings,
  Share2: SurnaShare,
  ShoppingCart: SurnaMarket,
  Trophy: SurnaTrophy,
  Swords: SurnaChallenge,
  Calendar: SurnaEvents,
  GraduationCap: SurnaCoaches,
  Phone: SurnaCall,
  Video: SurnaVideoCall,
  Reply: SurnaReply,
  X: SurnaClose,
  Trash2: SurnaDelete,
  Ban: SurnaBlock,
  QrCode: SurnaQR,
  UserPlus: SurnaFollow,
  MoreHorizontal: SurnaMore,
  MoreVertical: SurnaMore,
  Radio: SurnaLive,
  Mic: SurnaVoice,
  Upload: SurnaUpload,
  Lock: SurnaPrivacy,
  Flame: SurnaStreak,
  Edit: SurnaEdit,
  Edit2: SurnaEdit,
  Pencil: SurnaEdit,
  Save: SurnaSave,
  Building2: SurnaPlaces,
  Store: SurnaPlaces,
  Zap: SurnaInstantJoin,
};

function wrapSurnaAsLucide(SurnaComponent: SurnaIconComponent, lucideName: string): LucideIcon {
  const Comp = forwardRef<SVGSVGElement, LucideProps>(function SurnaLucideIcon(
    { size = 24, className, color, style, strokeWidth: _sw, fill, ...rest },
    ref,
  ) {
    const px =
      typeof size === "number" ? size : Number.parseInt(String(size), 10) || 24;
    const strokeColor =
      color ?? (fill && fill !== "none" && fill !== "transparent" ? fill : "currentColor");
    return (
      <SurnaComponent
        ref={ref}
        size={px}
        color={strokeColor}
        className={cn("inline-block shrink-0", className)}
        style={style as CSSProperties}
        aria-hidden={rest["aria-hidden"] ?? true}
        aria-label={rest["aria-label"]}
      />
    );
  });
  Comp.displayName = lucideName;
  return Comp as LucideIcon;
}

export interface LucideProps extends Omit<HTMLAttributes<HTMLElement>, "color"> {
  size?: number | string;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
  color?: string;
  /** Lucide filled icons — maps to Phosphor fill weight */
  fill?: string;
}

function kebabLucideName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/(\d+)/g, "-$1")
    .toLowerCase();
}

export type LucideIcon = ForwardRefExoticComponent<
  LucideProps & RefAttributes<HTMLElement>
>;

const PHOSPHOR_MAP: Record<string, string> = {
  "Activity": "pulse",
  "AlertCircle": "warning-circle",
  "AlertTriangle": "alert-triangle",
  "ArrowDownCircle": "arrow-down-circle",
  "ArrowDownLeft": "arrow-down-left",
  "ArrowDownToLine": "arrow-down-to-line",
  "ArrowLeft": "arrow-left",
  "ArrowRight": "arrow-right",
  "ArrowUp": "arrow-up",
  "ArrowUpCircle": "arrow-up-circle",
  "ArrowUpRight": "arrow-up-right",
  "BadgeCheck": "seal-check",
  "AtSign": "at-sign",
  "Award": "medal",
  "Ban": "ban",
  "BarChart": "bar-chart",
  "BarChart2": "bar-chart-2",
  "BarChart3": "chart-bar",
  "Bell": "bell",
  "BellOff": "bell-slash",
  "BellRing": "bell-ring",
  "Book": "book",
  "BookOpen": "book-open",
  "Bookmark": "bookmark-simple",
  "Box": "box",
  "Brain": "brain",
  "Briefcase": "briefcase",
  "Building2": "buildings",
  "Calendar": "calendar",
  "CalendarCheck": "calendar-check",
  "CalendarDays": "calendar-dots",
  "CalendarIcon": "calendar-icon",
  "CalendarPlus": "calendar-plus",
  "CalendarRange": "calendar-range",
  "Camera": "camera",
  "Car": "car",
  "Check": "check",
  "CheckCheck": "checks",
  "CheckCircle": "check-circle",
  "CheckCircle2": "check-circle",
  "ChevronDown": "caret-down",
  "ChevronLeft": "caret-left",
  "ChevronRight": "caret-right",
  "ChevronUp": "caret-up",
  "ChevronsLeft": "caret-double-left",
  "ChevronsRight": "caret-double-right",
  "Circle": "circle",
  "ClipboardCheck": "clipboard-text",
  "ClipboardList": "clipboard-list",
  "Clock": "clock",
  "Clock4": "clock-4",
  "Cloud": "cloud",
  "CloudOff": "cloud-off",
  "Command": "command",
  "Compass": "compass",
  "Copy": "copy",
  "CreditCard": "credit-card",
  "Crown": "crown",
  "Database": "database",
  "DollarSign": "currency-dollar",
  "Euro": "currency-eur",
  "Dot": "dot-outline",
  "Download": "download",
  "Dumbbell": "barbell",
  "Edit": "edit",
  "Edit2": "pencil-simple",
  "Eye": "eye",
  "EyeOff": "eye-off",
  "Facebook": "facebook",
  "FileText": "file-text",
  "Filter": "funnel",
  "Flag": "flag",
  "Flame": "fire",
  "Footprints": "footprints",
  "Gamepad2": "gamepad-2",
  "Gauge": "gauge",
  "Gift": "gift",
  "Globe": "globe",
  "GraduationCap": "graduation-cap",
  "GripVertical": "dots-six-vertical",
  "Hammer": "hammer",
  "Handshake": "handshake",
  "Hash": "hash",
  "Heart": "heart",
  "HeartOff": "heart-break",
  "HeartPulse": "heart-pulse",
  "HelpCircle": "question",
  "Home": "house",
  "Image": "image",
  "ImagePlus": "image-square",
  "Inbox": "tray",
  "Info": "info",
  "Instagram": "instagram",
  "Key": "key",
  "Keyboard": "keyboard",
  "Layers": "layers",
  "LayoutDashboard": "squares-four",
  "LayoutGrid": "layout-grid",
  "LifeBuoy": "lifebuoy",
  "Lightbulb": "lightbulb",
  "Link2": "link-2",
  "List": "list",
  "ListChecks": "list-checks",
  "Loader2": "circle-notch",
  "Lock": "lock-key",
  "LogOut": "log-out",
  "Mail": "envelope",
  "Map": "map-trifold",
  "MapPin": "map-pin",
  "Maximize": "maximize",
  "Medal": "medal",
  "Megaphone": "megaphone",
  "Menu": "list",
  "MessageCircle": "chat-circle",
  "MessageSquare": "chat-teardrop-text",
  "MessageSquarePlus": "chat-teardrop-dots",
  "Mic": "mic",
  "Minimize": "minimize",
  "Minus": "minus",
  "Monitor": "monitor",
  "Moon": "moon",
  "MoreHorizontal": "dots-three",
  "MoreVertical": "dots-three-vertical",
  "MousePointer": "mouse-pointer",
  "Music": "music",
  "Navigation": "navigation-arrow",
  "Package": "package",
  "PanelLeft": "sidebar",
  "Pause": "pause",
  "Pencil": "pencil",
  "Phone": "phone",
  "Play": "play",
  "PlayCircle": "play-circle",
  "Plug": "plug",
  "Plus": "plus",
  "PlusCircle": "plus-circle",
  "Power": "power",
  "QrCode": "qr-code",
  "Radio": "broadcast",
  "RefreshCw": "arrow-clockwise",
  "Repeat": "repeat",
  "Reply": "arrow-bend-up-left",
  "Rocket": "rocket",
  "RotateCcw": "rotate-ccw",
  "Rss": "rss",
  "Save": "save",
  "ScrollText": "scroll",
  "Search": "magnifying-glass",
  "Send": "paper-plane-right",
  "Settings": "gear",
  "Share2": "share-fat",
  "Shield": "shield",
  "ShieldAlert": "shield-alert",
  "ShieldCheck": "shield-check",
  "Shirt": "t-shirt",
  "ShoppingBag": "shopping-bag",
  "ShoppingCart": "shopping-cart-simple",
  "SlidersHorizontal": "sliders-horizontal",
  "Smartphone": "device-mobile",
  "Smile": "smile",
  "Sparkles": "sparkle",
  "Star": "star",
  "Store": "store",
  "Sun": "sun",
  "Swords": "sword",
  "Tag": "tag",
  "Target": "target",
  "ThumbsUp": "thumbs-up",
  "Ticket": "ticket",
  "Trash2": "trash",
  "TrendingDown": "trending-down",
  "TrendingUp": "trend-up",
  "Trophy": "trophy",
  "Truck": "truck",
  "Twitter": "twitter",
  "Type": "type",
  "Upload": "upload",
  "User": "user",
  "UserCheck": "user-check",
  "UserCog": "user-cog",
  "UserMinus": "user-minus",
  "UserPlus": "user-plus",
  "UserX": "user-x",
  "Users": "users",
  "Video": "video-camera",
  "Volume2": "volume-2",
  "VolumeX": "volume-x",
  "Wallet": "wallet",
  "Wifi": "wifi",
  "WifiOff": "wifi-off",
  "Workflow": "workflow",
  "Wrench": "wrench",
  "X": "x",
  "XCircle": "x-circle",
  "Zap": "lightning",
  "ZapOff": "lightning-slash",
  "SwitchCamera": "camera-rotate",
  "Film": "film-strip",
  "Undo2": "arrow-counter-clockwise"
};

/** Map Lucide strokeWidth to Phosphor weight (app default: regular). */
function phosphorWeight(strokeWidth: number | undefined, filled: boolean): string {
  if (filled) return "ph-fill";
  if (strokeWidth == null) return "ph";
  if (strokeWidth <= 1.25) return "ph-thin";
  if (strokeWidth <= 1.5) return "ph-light";
  if (strokeWidth <= 2) return "ph";
  if (strokeWidth <= 2.5) return "ph-bold";
  return "ph-bold";
}

function createLucideIcon(lucideName: string): LucideIcon {
  const surna = SURNA_ICON_MAP[lucideName];
  if (surna) {
    return wrapSurnaAsLucide(surna, lucideName);
  }

  const phosphor = PHOSPHOR_MAP[lucideName] ?? kebabLucideName(lucideName);
  const spin = lucideName === "Loader2";
  const Comp = forwardRef<HTMLElement, LucideProps>(function LucideIconCompat(
    {
      size = 24,
      className,
      color,
      fill,
      style,
      strokeWidth,
      absoluteStrokeWidth: _a,
      children: _ch,
      ...rest
    },
    ref,
  ) {
    const px =
      typeof size === "number" ? size : Number.parseInt(String(size), 10) || 24;
    const filled = Boolean(fill && fill !== "none" && fill !== "transparent");
    const iconColor = color ?? (filled ? fill : undefined);
    return (
      <i
        ref={ref}
        className={cn(
          phosphorWeight(strokeWidth, filled),
          `ph-${phosphor}`,
          "inline-flex items-center justify-center leading-none shrink-0 not-italic",
          spin && "animate-spin",
          className,
        )}
        style={
          {
            fontSize: px,
            width: px,
            height: px,
            color: iconColor,
            ...(style as CSSProperties),
          } as CSSProperties
        }
        aria-hidden={rest["aria-hidden"] ?? true}
        {...rest}
      />
    );
  });
  Comp.displayName = lucideName;
  return Comp;
}

export const Activity = createLucideIcon("Activity");
export const AlertCircle = createLucideIcon("AlertCircle");
export const AlertTriangle = createLucideIcon("AlertTriangle");
export const ArrowDownCircle = createLucideIcon("ArrowDownCircle");
export const ArrowDownLeft = createLucideIcon("ArrowDownLeft");
export const ArrowDownToLine = createLucideIcon("ArrowDownToLine");
export const ArrowLeft = createLucideIcon("ArrowLeft");
export const ArrowRight = createLucideIcon("ArrowRight");
export const ArrowUp = createLucideIcon("ArrowUp");
export const ArrowUpCircle = createLucideIcon("ArrowUpCircle");
export const ArrowUpRight = createLucideIcon("ArrowUpRight");
export const AtSign = createLucideIcon("AtSign");
export const Award = createLucideIcon("Award");
export const BadgeCheck = createLucideIcon("BadgeCheck");
export const Ban = createLucideIcon("Ban");
export const BarChart = createLucideIcon("BarChart");
export const BarChart2 = createLucideIcon("BarChart2");
export const BarChart3 = createLucideIcon("BarChart3");
export const Bell = createLucideIcon("Bell");
export const BellOff = createLucideIcon("BellOff");
export const BellRing = createLucideIcon("BellRing");
export const Book = createLucideIcon("Book");
export const BookOpen = createLucideIcon("BookOpen");
export const Bookmark = createLucideIcon("Bookmark");
export const Box = createLucideIcon("Box");
export const Brain = createLucideIcon("Brain");
export const Briefcase = createLucideIcon("Briefcase");
export const Building2 = createLucideIcon("Building2");
export const Calendar = createLucideIcon("Calendar");
export const CalendarCheck = createLucideIcon("CalendarCheck");
export const CalendarDays = createLucideIcon("CalendarDays");
export const CalendarIcon = createLucideIcon("CalendarIcon");
export const CalendarPlus = createLucideIcon("CalendarPlus");
export const CalendarRange = createLucideIcon("CalendarRange");
export const Camera = createLucideIcon("Camera");
export const Car = createLucideIcon("Car");
export const Check = createLucideIcon("Check");
export const CheckCheck = createLucideIcon("CheckCheck");
export const CheckCircle = createLucideIcon("CheckCircle");
export const CheckCircle2 = createLucideIcon("CheckCircle2");
export const ChevronDown = createLucideIcon("ChevronDown");
export const ChevronLeft = createLucideIcon("ChevronLeft");
export const ChevronRight = createLucideIcon("ChevronRight");
export const ChevronUp = createLucideIcon("ChevronUp");
export const ChevronsLeft = createLucideIcon("ChevronsLeft");
export const ChevronsRight = createLucideIcon("ChevronsRight");
export const Circle = createLucideIcon("Circle");
export const ClipboardCheck = createLucideIcon("ClipboardCheck");
export const ClipboardList = createLucideIcon("ClipboardList");
export const Clock = createLucideIcon("Clock");
export const Clock4 = createLucideIcon("Clock4");
export const Cloud = createLucideIcon("Cloud");
export const CloudOff = createLucideIcon("CloudOff");
export const Command = createLucideIcon("Command");
export const Compass = createLucideIcon("Compass");
export const Copy = createLucideIcon("Copy");
export const CreditCard = createLucideIcon("CreditCard");
export const Crown = createLucideIcon("Crown");
export const Database = createLucideIcon("Database");
export const DollarSign = createLucideIcon("DollarSign");
export const Dot = createLucideIcon("Dot");
export const Euro = createLucideIcon("Euro");
export const Download = createLucideIcon("Download");
export const Dumbbell = createLucideIcon("Dumbbell");
export const Edit = createLucideIcon("Edit");
export const Edit2 = createLucideIcon("Edit2");
export const Eye = createLucideIcon("Eye");
export const EyeOff = createLucideIcon("EyeOff");
export const Facebook = createLucideIcon("Facebook");
export const FileText = createLucideIcon("FileText");
export const Filter = createLucideIcon("Filter");
export const Flag = createLucideIcon("Flag");
export const Flame = createLucideIcon("Flame");
export const Footprints = createLucideIcon("Footprints");
export const Gamepad2 = createLucideIcon("Gamepad2");
export const Gauge = createLucideIcon("Gauge");
export const Gift = createLucideIcon("Gift");
export const Globe = createLucideIcon("Globe");
export const GraduationCap = createLucideIcon("GraduationCap");
export const GripVertical = createLucideIcon("GripVertical");
export const Hammer = createLucideIcon("Hammer");
export const Handshake = createLucideIcon("Handshake");
export const Hash = createLucideIcon("Hash");
export const Heart = createLucideIcon("Heart");
export const HeartOff = createLucideIcon("HeartOff");
export const HeartPulse = createLucideIcon("HeartPulse");
export const HelpCircle = createLucideIcon("HelpCircle");
export const Home = createLucideIcon("Home");
export const Image = createLucideIcon("Image");
export const ImagePlus = createLucideIcon("ImagePlus");
export const Inbox = createLucideIcon("Inbox");
export const Info = createLucideIcon("Info");
export const Instagram = createLucideIcon("Instagram");
export const Key = createLucideIcon("Key");
export const Keyboard = createLucideIcon("Keyboard");
export const Layers = createLucideIcon("Layers");
export const LayoutDashboard = createLucideIcon("LayoutDashboard");
export const LayoutGrid = createLucideIcon("LayoutGrid");
export const LifeBuoy = createLucideIcon("LifeBuoy");
export const Lightbulb = createLucideIcon("Lightbulb");
export const Link2 = createLucideIcon("Link2");
export const List = createLucideIcon("List");
export const ListChecks = createLucideIcon("ListChecks");
export const Loader2 = createLucideIcon("Loader2");
export const Lock = createLucideIcon("Lock");
export const LogOut = createLucideIcon("LogOut");
export const Mail = createLucideIcon("Mail");
export const Map = createLucideIcon("Map");
export const MapPin = createLucideIcon("MapPin");
export const Maximize = createLucideIcon("Maximize");
export const Medal = createLucideIcon("Medal");
export const Megaphone = createLucideIcon("Megaphone");
export const Menu = createLucideIcon("Menu");
export const MessageCircle = createLucideIcon("MessageCircle");
export const MessageSquare = createLucideIcon("MessageSquare");
export const MessageSquarePlus = createLucideIcon("MessageSquarePlus");
export const Mic = createLucideIcon("Mic");
export const Minimize = createLucideIcon("Minimize");
export const Minus = createLucideIcon("Minus");
export const Monitor = createLucideIcon("Monitor");
export const Moon = createLucideIcon("Moon");
export const MoreHorizontal = createLucideIcon("MoreHorizontal");
export const MoreVertical = createLucideIcon("MoreVertical");
export const MousePointer = createLucideIcon("MousePointer");
export const Music = createLucideIcon("Music");
export const Navigation = createLucideIcon("Navigation");
export const Package = createLucideIcon("Package");
export const PanelLeft = createLucideIcon("PanelLeft");
export const Pause = createLucideIcon("Pause");
export const Pencil = createLucideIcon("Pencil");
export const Phone = createLucideIcon("Phone");
export const Play = createLucideIcon("Play");
export const PlayCircle = createLucideIcon("PlayCircle");
export const Plug = createLucideIcon("Plug");
export const Plus = createLucideIcon("Plus");
export const PlusCircle = createLucideIcon("PlusCircle");
export const Power = createLucideIcon("Power");
export const QrCode = createLucideIcon("QrCode");
export const Radio = createLucideIcon("Radio");
export const RefreshCw = createLucideIcon("RefreshCw");
export const Repeat = createLucideIcon("Repeat");
export const Reply = createLucideIcon("Reply");
export const Rocket = createLucideIcon("Rocket");
export const RotateCcw = createLucideIcon("RotateCcw");
export const Rss = createLucideIcon("Rss");
export const Save = createLucideIcon("Save");
export const ScrollText = createLucideIcon("ScrollText");
export const Search = createLucideIcon("Search");
export const Send = createLucideIcon("Send");
export const Settings = createLucideIcon("Settings");
export const Share2 = createLucideIcon("Share2");
export const Shield = createLucideIcon("Shield");
export const ShieldAlert = createLucideIcon("ShieldAlert");
export const ShieldCheck = createLucideIcon("ShieldCheck");
export const Shirt = createLucideIcon("Shirt");
export const ShoppingBag = createLucideIcon("ShoppingBag");
export const ShoppingCart = createLucideIcon("ShoppingCart");
export const SlidersHorizontal = createLucideIcon("SlidersHorizontal");
export const Smartphone = createLucideIcon("Smartphone");
export const Smile = createLucideIcon("Smile");
export const Sparkles = createLucideIcon("Sparkles");
export const Star = createLucideIcon("Star");
export const Store = createLucideIcon("Store");
export const Sun = createLucideIcon("Sun");
export const Swords = createLucideIcon("Swords");
export const Tag = createLucideIcon("Tag");
export const Target = createLucideIcon("Target");
export const ThumbsUp = createLucideIcon("ThumbsUp");
export const Ticket = createLucideIcon("Ticket");
export const Trash2 = createLucideIcon("Trash2");
export const TrendingDown = createLucideIcon("TrendingDown");
export const TrendingUp = createLucideIcon("TrendingUp");
export const Trophy = createLucideIcon("Trophy");
export const Truck = createLucideIcon("Truck");
export const Twitter = createLucideIcon("Twitter");
export const Type = createLucideIcon("Type");
export const Upload = createLucideIcon("Upload");
export const User = createLucideIcon("User");
export const UserCheck = createLucideIcon("UserCheck");
export const UserCog = createLucideIcon("UserCog");
export const UserMinus = createLucideIcon("UserMinus");
export const UserPlus = createLucideIcon("UserPlus");
export const UserX = createLucideIcon("UserX");
export const Users = createLucideIcon("Users");
export const Video = createLucideIcon("Video");
export const Volume2 = createLucideIcon("Volume2");
export const VolumeX = createLucideIcon("VolumeX");
export const Wallet = createLucideIcon("Wallet");
export const Wifi = createLucideIcon("Wifi");
export const WifiOff = createLucideIcon("WifiOff");
export const Workflow = createLucideIcon("Workflow");
export const Wrench = createLucideIcon("Wrench");
export const X = createLucideIcon("X");
export const XCircle = createLucideIcon("XCircle");
export const Zap = createLucideIcon("Zap");
export const ZapOff = createLucideIcon("ZapOff");
export const SwitchCamera = createLucideIcon("SwitchCamera");
export const Film = createLucideIcon("Film");
export const Undo2 = createLucideIcon("Undo2");
