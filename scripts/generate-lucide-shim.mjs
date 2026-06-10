import fs from "fs";
import path from "path";

const root = path.resolve("client/src");
const names = new Set();

function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(f)) {
      const t = fs.readFileSync(p, "utf8");
      const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
      let m;
      while ((m = re.exec(t))) {
        m[1].split(",").forEach((s) => {
          s = s.trim();
          if (!s || s.startsWith("type ")) return;
          const as = s.match(/^(.+?)\s+as\s+(\w+)$/);
          const n = as ? as[1].trim() : s;
          if (n !== "LucideIcon") names.add(n);
        });
      }
    }
  }
}

walk(root);

const MAP = {
  Activity: "pulse",
  AlertCircle: "warning-circle",
  ArrowLeft: "arrow-left",
  ArrowRight: "arrow-right",
  ArrowUp: "arrow-up",
  Award: "medal",
  BarChart3: "chart-bar",
  Bell: "bell",
  BellOff: "bell-slash",
  Bookmark: "bookmark-simple",
  Book: "book",
  Brain: "brain",
  Briefcase: "briefcase",
  Building2: "buildings",
  Calendar: "calendar",
  CalendarDays: "calendar-dots",
  Camera: "camera",
  Check: "check",
  CheckCircle: "check-circle",
  CheckCircle2: "check-circle",
  CheckCheck: "checks",
  ChevronDown: "caret-down",
  ChevronLeft: "caret-left",
  ChevronRight: "caret-right",
  ChevronUp: "caret-up",
  ChevronsLeft: "caret-double-left",
  ChevronsRight: "caret-double-right",
  Circle: "circle",
  ClipboardCheck: "clipboard-text",
  Clock: "clock",
  Command: "command",
  Copy: "copy",
  CreditCard: "credit-card",
  Crown: "crown",
  DollarSign: "currency-dollar",
  Dot: "dot-outline",
  Download: "download",
  Dumbbell: "barbell",
  Edit2: "pencil-simple",
  Eye: "eye",
  FileText: "file-text",
  Filter: "funnel",
  Flag: "flag",
  Flame: "fire",
  Footprints: "footprints",
  Gift: "gift",
  Globe: "globe",
  GraduationCap: "graduation-cap",
  GripVertical: "dots-six-vertical",
  Hammer: "hammer",
  Hash: "hash",
  Heart: "heart",
  HeartOff: "heart-break",
  HelpCircle: "question",
  Home: "house",
  Image: "image",
  ImagePlus: "image-square",
  Inbox: "tray",
  Info: "info",
  Key: "key",
  LayoutDashboard: "squares-four",
  LifeBuoy: "lifebuoy",
  Loader2: "circle-notch",
  Lock: "lock-key",
  Mail: "envelope",
  Map: "map-trifold",
  MapPin: "map-pin",
  Medal: "medal",
  Megaphone: "megaphone",
  Menu: "list",
  MessageCircle: "chat-circle",
  MessageSquare: "chat-teardrop-text",
  MessageSquarePlus: "chat-teardrop-dots",
  Minus: "minus",
  Monitor: "monitor",
  MoreHorizontal: "dots-three",
  MoreVertical: "dots-three-vertical",
  Navigation: "navigation-arrow",
  Package: "package",
  PanelLeft: "sidebar",
  Pause: "pause",
  Phone: "phone",
  Play: "play",
  PlayCircle: "play-circle",
  Plus: "plus",
  PlusCircle: "plus-circle",
  QrCode: "qr-code",
  Radio: "broadcast",
  RefreshCw: "arrow-clockwise",
  Reply: "arrow-bend-up-left",
  Rss: "rss",
  ScrollText: "scroll",
  Search: "magnifying-glass",
  Send: "paper-plane-right",
  Settings: "gear",
  Share2: "share-fat",
  Shield: "shield",
  Shirt: "t-shirt",
  ShoppingBag: "shopping-bag",
  ShoppingCart: "shopping-cart-simple",
  SlidersHorizontal: "sliders-horizontal",
  Smartphone: "device-mobile",
  Sparkles: "sparkle",
  Star: "star",
  Store: "store",
  Swords: "sword",
  Target: "target",
  Ticket: "ticket",
  Trash2: "trash",
  TrendingUp: "trend-up",
  Trophy: "trophy",
  Upload: "upload",
  User: "user",
  UserCheck: "user-check",
  UserMinus: "user-minus",
  UserPlus: "user-plus",
  Users: "users",
  Video: "video-camera",
  X: "x",
  XCircle: "x-circle",
  Zap: "lightning",
};

function kebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/(\d+)/g, "-$1")
    .toLowerCase();
}

const sorted = [...names].sort();
const missing = sorted.filter((n) => !MAP[n]);
console.log("Icons:", sorted.length, "Missing explicit map:", missing.length);
if (missing.length) console.log(missing.join(", "));

const out = `/**
 * Lucide → Phosphor compatibility layer (SURNA Design System).
 * All \`import { … } from "lucide-react"\` resolve here via Vite/TS alias.
 */
import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { cn } from "@/lib/utils";

export interface LucideProps extends Omit<HTMLAttributes<HTMLElement>, "color"> {
  size?: number | string;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
  color?: string;
  fill?: string;
}

function kebabLucideName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/(\\d+)/g, "-$1")
    .toLowerCase();
}

export type LucideIcon = ForwardRefExoticComponent<
  LucideProps & RefAttributes<HTMLElement>
>;

const PHOSPHOR_MAP: Record<string, string> = ${JSON.stringify(
  Object.fromEntries(sorted.map((n) => [n, MAP[n] ?? kebab(n)])),
  null,
  2,
)};

function createLucideIcon(lucideName: string): LucideIcon {
  const phosphor = PHOSPHOR_MAP[lucideName] ?? kebabLucideName(lucideName);
  const spin = lucideName === "Loader2";
  const Comp = forwardRef<HTMLElement, LucideProps>(function LucideIconCompat(
    {
      size = 24,
      className,
      color,
      fill,
      style,
      strokeWidth: _sw,
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
          filled ? "ph-fill" : "ph-bold",
          \`ph-\${phosphor}\`,
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

${sorted.map((n) => `export const ${n} = createLucideIcon(${JSON.stringify(n)});`).join("\n")}
`;

fs.writeFileSync(path.resolve("client/src/lib/lucide-react.tsx"), out);
console.log("Wrote client/src/lib/lucide-react.tsx");
