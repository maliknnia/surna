import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fetchFlaggedContent, type FlaggedContentItem } from "@/lib/adminApi";
import { Trash2, Flag, AlertCircle, FileText, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminContentPage() {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<FlaggedContentItem | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState("");

  const { data: flaggedItems = [], isLoading } = useQuery({
    queryKey: ["admin-flagged-content"],
    queryFn: fetchFlaggedContent,
  });

  const flaggedPosts = flaggedItems.filter((item) => item.contentType === "post");
  const flaggedComments = flaggedItems.filter((item) => item.contentType === "comment");

  const reviewMutation = useMutation({
    mutationFn: async ({
      flaggedContentId,
      reason,
    }: {
      flaggedContentId: string;
      reason: string;
    }) => {
      return apiRequest("POST", "/api/admin/review-content", {
        flaggedContentId,
        actionTaken: "content_removed",
        reviewNotes: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-content"] });
      toast({ title: "Content reviewed successfully" });
      setRemoveDialogOpen(false);
      setRemoveReason("");
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to review content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRemove = (item: FlaggedContentItem) => {
    setSelectedItem(item);
    setRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    if (!selectedItem || !removeReason.trim()) {
      toast({
        title: "Invalid input",
        description: "Please provide a removal reason",
        variant: "destructive",
      });
      return;
    }
    reviewMutation.mutate({
      flaggedContentId: selectedItem.id,
      reason: removeReason,
    });
  };

  const renderFlaggedItem = (item: FlaggedContentItem) => {
    const reviewed = item.status === "reviewed";
    const summary = item.description || item.reason || `Flagged ${item.contentType} ${item.contentId}`;
    return (
      <div
        key={item.id}
        className="rounded-lg border border-border bg-muted/40 p-4"
        data-testid={`flagged-${item.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Flag className="h-4 w-4 text-yellow-500" />
              <Badge variant="destructive" className="bg-yellow-500/20 text-yellow-400">
                {item.reason}
              </Badge>
              {reviewed && (
                <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                  Reviewed
                </Badge>
              )}
            </div>
            <p className="text-[#f3efe8] line-clamp-3">{summary}</p>
            <p className="text-xs text-[#f3efe8]/60 mt-2">
              {item.reportedUserName ? `Reported: ${item.reportedUserName} · ` : ""}
              {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </div>
          {!reviewed && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRemove(item)}
              className="border-red-500/30 hover:bg-red-500/10"
              data-testid={`button-remove-${item.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f3efe8]">Content Moderation</h1>
          <p className="text-[#f3efe8]/60 mt-1">
            Review and moderate flagged posts and comments
          </p>
        </div>

        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList className="bg-[#2a0a2a] border border-border">
            <TabsTrigger value="posts" className="data-[state=active]:bg-purple-500/20">
              <FileText className="h-4 w-4 mr-2" />
              Flagged Posts
            </TabsTrigger>
            <TabsTrigger value="comments" className="data-[state=active]:bg-purple-500/20">
              <MessageSquare className="h-4 w-4 mr-2" />
              Flagged Comments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <Card className="bg-[#2a0a2a] border-border">
              <CardHeader>
                <CardTitle className="text-[#f3efe8]">Flagged Posts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full bg-muted/40" />
                    ))}
                  </div>
                ) : flaggedPosts.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">{flaggedPosts.map(renderFlaggedItem)}</div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-[#f3efe8]/60">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-[#f3efe8]/30" />
                    <p>No flagged posts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card className="bg-[#2a0a2a] border-border">
              <CardHeader>
                <CardTitle className="text-[#f3efe8]">Flagged Comments</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full bg-muted/40" />
                    ))}
                  </div>
                ) : flaggedComments.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">{flaggedComments.map(renderFlaggedItem)}</div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-[#f3efe8]/60">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-[#f3efe8]/30" />
                    <p>No flagged comments</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Remove Dialog */}
        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogContent className="bg-[#2a0a2a] border-border">
            <DialogHeader>
              <DialogTitle className="text-[#f3efe8]">Remove Content</DialogTitle>
              <DialogDescription className="text-[#f3efe8]/60">
                Provide a reason for removing this {selectedItem?.contentType}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 border border-border">
                <p className="text-sm text-[#f3efe8] line-clamp-3">
                  {selectedItem?.description || selectedItem?.reason}
                </p>
              </div>
              <Textarea
                placeholder="Enter removal reason (minimum 10 characters)..."
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                className="bg-[#1a001a] border-border text-[#f3efe8]"
                rows={4}
                data-testid="input-remove-reason"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRemoveDialogOpen(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmRemove}
                disabled={reviewMutation.isPending || !removeReason.trim()}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-remove"
              >
                {reviewMutation.isPending ? "Removing..." : "Remove Content"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
