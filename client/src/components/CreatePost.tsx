import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Video, Image, X, MapPin, AtSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MediaUploader } from "@/components/MediaUploader";
import { VideoPlayer } from "@/components/VideoPlayer";
import { flags } from "@/config/flags";
import type { User } from "@shared/schema";
import { cn } from "@/lib/utils";

const MAX_CHARACTERS = 500;

type CreatePostProps = {
  variant?: "default" | "compact";
};

export default function CreatePost({ variant = "default" }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text');
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image');
  const [location, setLocation] = useState("");
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suggested users for mentions
  const { data: suggestedUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/suggested"],
    enabled: showMentionDropdown,
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData: { 
      content: string; 
      postType: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      mediaType?: string;
      location?: string;
    }) => {
      const response = await apiRequest("POST", "/api/posts", postData);
      return response.json();
    },
    onSuccess: () => {
      setContent("");
      setImageUrl(null);
      setVideoUrl(null);
      setMediaType('text');
      setShowMediaUploader(false);
      setLocation("");
      setShowLocationInput(false);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed-keyset"] });
      toast({
        title: "Success",
        description: "Post created successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("EMAIL_NOT_VERIFIED")) {
        toast({
          title: "Verify your email",
          description: "Check your inbox to verify your email before posting.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: msg.includes("400:") ? "Invalid post — add text or a photo." : "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Detect @mentions and show dropdown
  useEffect(() => {
    const lastAtSymbol = content.lastIndexOf('@', cursorPosition);
    if (lastAtSymbol !== -1 && cursorPosition > lastAtSymbol) {
      const textAfterAt = content.substring(lastAtSymbol + 1, cursorPosition);
      // Check if there's a space after @, if so close dropdown
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setMentionSearch(textAfterAt);
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  }, [content, cursorPosition]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_CHARACTERS) {
      setContent(newValue);
      setCursorPosition(e.target.selectionStart || 0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl && !videoUrl) return;

    createPostMutation.mutate({
      content: content.trim(),
      postType: mediaType === 'video' ? 'video' : mediaType === 'image' ? 'image' : 'text',
      imageUrl: imageUrl,
      videoUrl: videoUrl,
      mediaType: mediaType,
      location: location || undefined,
    });
  };

  const handleMediaUpload = (files: Array<{ url: string; thumbnailUrl?: string; type: string }>) => {
    if (files.length === 0) return;
    
    const file = files[0];
    if (file.type.startsWith('video')) {
      setVideoUrl(file.url);
      setMediaType('video');
      setImageUrl(null);
    } else if (file.type.startsWith('image')) {
      setImageUrl(file.url);
      setMediaType('image');
      setVideoUrl(null);
    }
    setShowMediaUploader(false);
  };

  const clearMedia = () => {
    setImageUrl(null);
    setVideoUrl(null);
    setMediaType('text');
  };

  const openImageUploader = () => {
    setUploadType('image');
    setShowMediaUploader(true);
  };

  const openVideoUploader = () => {
    if (!flags.videoContent) return;
    setUploadType('video');
    setShowMediaUploader(true);
  };

  const handleMentionSelect = (selectedUser: User) => {
    const lastAtSymbol = content.lastIndexOf('@', cursorPosition);
    const beforeMention = content.substring(0, lastAtSymbol);
    const afterMention = content.substring(cursorPosition);
    const mention = `@${selectedUser.firstName || selectedUser.username || 'user'} `;
    setContent(beforeMention + mention + afterMention);
    setShowMentionDropdown(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  // Filter users based on mention search
  const filteredUsers = suggestedUsers.filter(u => 
    (u.firstName?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
     u.lastName?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
     u.username?.toLowerCase().includes(mentionSearch.toLowerCase()))
  ).slice(0, 5);

  // Render content with hashtag highlighting
  const renderHighlightedContent = () => {
    const parts = content.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return <span key={index} className="text-token-accent font-medium">{part}</span>;
      }
      return part;
    });
  };

  if (!user) return null;

  const remainingChars = MAX_CHARACTERS - content.length;
  const isNearLimit = remainingChars < 50;
  const isCompact = variant === "compact";

  return (
    <div className={isCompact ? "px-4 py-3" : "max-w-2xl mx-auto px-4 pt-6"}>
      <div className={isCompact ? "" : "bg-transparent border border-token-text/10 rounded-lg shadow-sm p-4 mb-4 transition-all duration-300"}>
        <form onSubmit={handleSubmit}>
          <div className={cn("flex items-start", isCompact ? "gap-2.5 mb-2" : "space-x-3 mb-3")}>
            <Avatar className={isCompact ? "w-9 h-9 flex-shrink-0" : "w-10 h-10 flex-shrink-0"}>
              <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
              <AvatarFallback className="bg-background border border-token-text/10 text-token-text">
                {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder={isCompact ? "Share an update, photo, or clip…" : "What's on your mind about sports today? Use @ to tag friends, # for hashtags"}
                value={content}
                onChange={handleContentChange}
                onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart || 0)}
                className={cn(
                  "flex-1 bg-background text-token-text rounded-lg px-4 text-sm resize-none focus-visible:ring-2 focus-visible:ring-token-accent transition-all duration-200",
                  isCompact ? "py-2 min-h-[44px] border border-token-text/10" : "py-2 min-h-[80px]",
                )}
                data-testid="create-post-textarea"
              />
              
              {/* Mention Dropdown */}
              {showMentionDropdown && filteredUsers.length > 0 && (
                <div 
                  className="absolute z-50 mt-1 w-full bg-background border border-token-text/20 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  data-testid="mention-dropdown"
                >
                  {filteredUsers.map((suggestedUser) => (
                    <button
                      key={suggestedUser.id}
                      type="button"
                      onClick={() => handleMentionSelect(suggestedUser)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-token-text/10 transition-colors text-left"
                      data-testid={`mention-option-${suggestedUser.id}`}
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={suggestedUser.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-background border border-token-text/10 text-token-text text-xs">
                          {suggestedUser.firstName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-token-text truncate">
                          {suggestedUser.firstName} {suggestedUser.lastName}
                        </p>
                        {suggestedUser.username && (
                          <p className="text-xs text-token-text-muted truncate">@{suggestedUser.username}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Character Counter */}
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-token-text-muted">
                  {/* Preview with hashtag highlighting */}
                  {content && (
                    <div className="hidden">
                      {renderHighlightedContent()}
                    </div>
                  )}
                </div>
                <span 
                  className={`text-xs font-medium ${
                    isNearLimit ? 'text-red-400' : 'text-token-text-muted'
                  }`}
                  data-testid="character-counter"
                >
                  {remainingChars} / {MAX_CHARACTERS}
                </span>
              </div>
            </div>
          </div>

          {/* Location Input */}
          {showLocationInput && (
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-token-accent flex-shrink-0" />
              <Input
                type="text"
                placeholder="Add location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 bg-background text-token-text border-token-text/20 focus-visible:ring-token-accent"
                data-testid="location-input"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLocationInput(false);
                  setLocation("");
                }}
                className="text-token-text-muted hover:text-token-text"
                data-testid="remove-location-button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Location Badge */}
          {location && !showLocationInput && (
            <div className="mb-3">
              <Badge 
                variant="secondary" 
                className="bg-token-accent/20 text-token-accent border-token-accent/30"
                data-testid="location-badge"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {location}
                <button
                  type="button"
                  onClick={() => setLocation("")}
                  className="ml-2 hover:text-token-text"
                  data-testid="remove-location-badge"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          )}

          {/* Media Preview with Thumbnail */}
          {(imageUrl || videoUrl) && (
            <div className="relative mb-3 rounded-lg overflow-hidden border border-token-text/10">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearMedia}
                className="absolute top-2 right-2 z-10 bg-background/90 hover:bg-background backdrop-blur-sm rounded-full p-2"
                data-testid="clear-media-button"
              >
                <X className="h-4 w-4 text-token-text" />
              </Button>
              
              {imageUrl && (
                <div className="relative">
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="w-full rounded-lg max-h-64 object-cover"
                    data-testid="image-preview"
                  />
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-token-text">
                    Image
                  </div>
                </div>
              )}
              
              {videoUrl && flags.videoContent && (
                <div data-testid="video-preview">
                  <VideoPlayer src={videoUrl} />
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-token-text">
                    Video
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Uploader */}
          {showMediaUploader && (
            <div className="mb-3">
              <MediaUploader
                accept={uploadType === 'video' ? 'video/*' : 'image/*'}
                maxFiles={1}
                onUploadComplete={handleMediaUpload}
                data-testid="media-uploader"
              />
            </div>
          )}
          
          <div className={cn("flex justify-between items-center", isCompact ? "pt-2" : "pt-3 border-t border-token-text/10")}>
            {/* Media Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openImageUploader}
                className="text-token-text-muted hover:text-token-text hover:bg-token-text/5"
                data-testid="add-image-button"
                title="Add image"
              >
                <Image className="h-5 w-5" />
              </Button>
              
              {flags.videoContent && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openVideoUploader}
                  className="text-token-text-muted hover:text-token-text hover:bg-token-text/5"
                  data-testid="add-video-button"
                  title="Add video"
                >
                  <Video className="h-5 w-5" />
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationInput(!showLocationInput)}
                className={`${showLocationInput ? 'text-token-accent' : 'text-token-text-muted'} hover:text-token-text hover:bg-token-text/5`}
                data-testid="add-location-button"
                title="Add location"
              >
                <MapPin className="h-5 w-5" />
              </Button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={createPostMutation.isPending || (!content.trim() && !imageUrl && !videoUrl) || content.length > MAX_CHARACTERS}
              className="bg-token-accent text-foreground hover:opacity-90 transition-all duration-200 transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-post-button"
            >
              {createPostMutation.isPending ? "Posting…" : isCompact ? "Post" : "Post"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
