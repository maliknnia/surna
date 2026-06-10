import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  Copy,
  MessageCircle,
  Share2,
  Check,
  ArrowLeft,
  Send,
  Search,
} from "lucide-react";
import { SiX, SiWhatsapp, SiFacebook, SiTelegram } from "react-icons/si";

interface ShareModalProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentPath?: string;
}

interface Conversation {
  id?: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserAvatar?: string | null;
  username?: string;
  fullName?: string;
  profileImageUrl?: string | null;
}

type View = "main" | "messages";

export function ShareModal({ postId, open, onOpenChange, contentPath }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<View>("main");
  const [search, setSearch] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deepLinkPath = contentPath || `/feed?post=${postId}`;
  const link = `${window.location.origin}${deepLinkPath.startsWith("/") ? deepLinkPath : `/${deepLinkPath}`}`;
  const shareText = "Check out this post on SURNA";

  const { data: conversations = [], isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: getQueryFn({ on401: "returnNull" }) as any,
    enabled: open && view === "messages",
  });

  const logShare = useMutation({
    mutationFn: async (shareType: string) => {
      const r = await apiRequest("POST", `/api/posts/${postId}/share`, { shareType });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (receiverId: string) => {
      const r = await apiRequest("POST", "/api/messages", {
        receiverId,
        content: `${shareText}\n${link}`,
        messageType: "text",
      });
      return r.json();
    },
    onSuccess: (_d, receiverId) => {
      setSentTo((p) => new Set(p).add(receiverId));
      logShare.mutate("message");
      toast({ title: "Sent", description: "Post shared in your conversation" });
    },
    onError: () => toast({ title: "Failed to send", variant: "destructive" }),
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      logShare.mutate("copy_link");
      toast({ title: "Link copied!" });
      setTimeout(() => {
        setCopied(false);
        onOpenChange(false);
      }, 1200);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }
    try {
      await navigator.share({ title: shareText, text: shareText, url: link });
      logShare.mutate("native");
      onOpenChange(false);
    } catch {
      // user cancelled
    }
  };

  const openSocial = (kind: "x" | "whatsapp" | "facebook" | "telegram") => {
    const u = encodeURIComponent(link);
    const t = encodeURIComponent(shareText);
    const map: Record<typeof kind, string> = {
      x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    };
    window.open(map[kind], "_blank", "noopener,noreferrer");
    logShare.mutate(kind);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setView("main");
      setSearch("");
      setSentTo(new Set());
    }
    onOpenChange(next);
  };

  const filteredConvs = conversations.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c.otherUserName || c.fullName || "").toLowerCase().includes(s) ||
      (c.username || "").toLowerCase().includes(s)
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-background border-token-text/10 max-w-sm" data-testid="share-modal">
        <DialogHeader>
          <DialogTitle className="text-token-text flex items-center gap-2">
            {view === "messages" ? (
              <>
                <button
                  onClick={() => setView("main")}
                  className="p-1 -ml-1 rounded-full hover:bg-token-text/5"
                  data-testid="back-to-share-main"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Send to…
              </>
            ) : (
              <>
                <Share2 className="h-5 w-5" />
                Share Post
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {view === "main" && (
          <div className="space-y-1 py-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-token-text hover:bg-token-text/5 h-12"
              onClick={() => setView("messages")}
              data-testid="share-send-message"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-token-accent/15 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-token-accent" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Send via Message</div>
                  <div className="text-xs text-token-text-muted">Pick a conversation</div>
                </div>
              </div>
            </Button>

            <div className="grid grid-cols-4 gap-2 py-2">
              <SocialIcon label="X" onClick={() => openSocial("x")} testId="share-x">
                <SiX className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon label="WhatsApp" onClick={() => openSocial("whatsapp")} testId="share-whatsapp">
                <SiWhatsapp className="h-5 w-5 text-[#25D366]" />
              </SocialIcon>
              <SocialIcon label="Facebook" onClick={() => openSocial("facebook")} testId="share-facebook">
                <SiFacebook className="h-5 w-5 text-[#1877F2]" />
              </SocialIcon>
              <SocialIcon label="Telegram" onClick={() => openSocial("telegram")} testId="share-telegram">
                <SiTelegram className="h-5 w-5 text-[#26A5E4]" />
              </SocialIcon>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start text-token-text hover:bg-token-text/5 h-12"
              onClick={handleCopyLink}
              data-testid="copy-link-button"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-token-text/10 flex items-center justify-center">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </div>
                <div className="text-left">
                  <div className="font-medium">{copied ? "Link copied!" : "Copy link"}</div>
                  <div className="text-xs text-token-text-muted truncate max-w-[180px]">{link}</div>
                </div>
              </div>
            </Button>

            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button
                variant="ghost"
                className="w-full justify-start text-token-text hover:bg-token-text/5 h-12"
                onClick={handleNativeShare}
                data-testid="share-native"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-token-text/10 flex items-center justify-center">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">More…</div>
                    <div className="text-xs text-token-text-muted">Use device share sheet</div>
                  </div>
                </div>
              </Button>
            )}
          </div>
        )}

        {view === "messages" && (
          <div className="py-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-token-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="w-full pl-9 pr-3 h-10 rounded-full bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-token-accent"
                data-testid="share-search-conversations"
              />
            </div>

            <div className="max-h-72 overflow-y-auto -mx-2">
              {convLoading ? (
                <div className="space-y-2 px-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="text-center py-6 text-token-text-muted text-sm">
                  No conversations found
                </div>
              ) : (
                filteredConvs.map((c) => {
                  const id = c.otherUserId;
                  const name = c.otherUserName || c.fullName || c.username || "User";
                  const avatar = c.otherUserAvatar || c.profileImageUrl || undefined;
                  const sent = sentTo.has(id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-3 px-2 py-2 hover:bg-token-text/5 rounded-lg"
                      data-testid={`share-conv-${id}`}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={avatar} />
                        <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{name}</div>
                        {c.username && (
                          <div className="text-xs text-token-text-muted truncate">@{c.username}</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={sent ? "outline" : "default"}
                        disabled={sent || sendMessage.isPending}
                        onClick={() => sendMessage.mutate(id)}
                        className="gap-1"
                        data-testid={`button-share-send-${id}`}
                      >
                        {sent ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Sent
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" /> Send
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SocialIcon({
  label,
  onClick,
  children,
  testId,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-token-text/5 transition"
      data-testid={testId}
    >
      <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
        {children}
      </div>
      <span className="text-[10px] text-token-text-muted">{label}</span>
    </button>
  );
}
