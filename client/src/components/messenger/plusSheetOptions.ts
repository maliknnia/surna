import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Calendar,
  FileText,
  Image as ImageIcon,
  MapPin,
  Target,
  Trophy,
  UserPlus,
} from "lucide-react";

export type PlusSheetOption = {
  icon: LucideIcon;
  label: string;
  action: string;
};

/** Actions backed by real send/navigation flows — shown in the + sheet. */
export const DM_PLUS_OPTIONS: PlusSheetOption[] = [
  { icon: ImageIcon, label: "Media", action: "media" },
];

export const GROUP_PLUS_OPTIONS: PlusSheetOption[] = [
  { icon: ImageIcon, label: "Media", action: "media" },
  { icon: UserPlus, label: "Add People", action: "people" },
  { icon: Calendar, label: "Plan Event", action: "event" },
  { icon: MapPin, label: "Map", action: "location" },
];

/** Hidden until rich-message API ships (polls, voice, calls, etc.). */
export const MESSENGER_PLUS_COMING_SOON: PlusSheetOption[] = [
  { icon: BarChart2, label: "Create Poll", action: "poll" },
  { icon: MapPin, label: "Share Location", action: "location" },
  { icon: Trophy, label: "Challenge", action: "challenge" },
  { icon: FileText, label: "Shared Notes", action: "notes" },
  { icon: Target, label: "Create Match", action: "match" },
];
