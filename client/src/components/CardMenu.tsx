import { MoreVertical, Bookmark, Bell, Share2, Flag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface CardMenuProps {
  onSave?: () => void;
  onRemind?: () => void;
  onShare?: () => void;
  onReport?: () => void;
  className?: string;
  /** Row layout inside playlist cards (not absolute top-right). */
  inline?: boolean;
}

export default function CardMenu({
  onSave,
  onRemind,
  onShare,
  onReport,
  className = "",
  inline = false,
}: CardMenuProps) {
  const { toast } = useToast();

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) { onSave(); return; }
    toast({ title: "Saved", description: "Added to your saved items" });
  };

  const handleRemind = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemind) { onRemind(); return; }
    toast({ title: "Reminder set", description: "We'll remind you about this" });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) { onShare(); return; }
    if (navigator.share) {
      navigator.share({ title: "SURNA", url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied", description: "Link copied to clipboard" });
    }
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReport) { onReport(); return; }
    toast({ title: "Reported", description: "Thanks for letting us know" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`card-menu-btn ${inline ? "card-menu-btn--inline" : ""} ${className}`.trim()}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background border-border min-w-[160px]">
        <DropdownMenuItem onClick={handleSave} className="cursor-pointer gap-2">
          <Bookmark size={15} />
          Save
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRemind} className="cursor-pointer gap-2">
          <Bell size={15} />
          Remind me
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare} className="cursor-pointer gap-2">
          <Share2 size={15} />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleReport} className="cursor-pointer gap-2 text-red-400">
          <Flag size={15} />
          Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
