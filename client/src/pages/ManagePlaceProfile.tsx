import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { uploadCreateImage } from "@/lib/uploadCreateMedia";
import {
  ArrowLeft,
  Edit,
  ImagePlus,
  Plus,
  Eye,
  TrendingUp,
  Calendar,
  Star,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Place, PlaceBooking, PlaceReview, PlacePost } from "@shared/schema";

export default function ManagePlaceProfile() {
  const [, params] = useRoute("/places/:id/manage");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const placeId = params?.id;

  const [activeTab, setActiveTab] = useState("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Place>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [postData, setPostData] = useState({ content: "", postType: "update", imageUrl: "" });

  const { data: place, isLoading } = useQuery<Place>({
    queryKey: ["/api/places", placeId],
    enabled: !!placeId,
  });

  const { data: bookings = [] } = useQuery<PlaceBooking[]>({
    queryKey: ["/api/places", placeId, "bookings"],
    enabled: !!placeId && activeTab === "bookings",
  });

  const { data: reviews = [] } = useQuery<PlaceReview[]>({
    queryKey: ["/api/places", placeId, "reviews"],
    enabled: !!placeId && activeTab === "reviews",
  });

  const { data: posts = [] } = useQuery<PlacePost[]>({
    queryKey: ["/api/places", placeId, "posts"],
    enabled: !!placeId && activeTab === "posts",
  });

  const updatePlaceMutation = useMutation({
    mutationFn: async (data: Partial<Place>) => {
      const response = await apiRequest("PUT", `/api/places/${placeId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places", placeId] });
      setShowEditModal(false);
      toast({ title: "Success!", description: "Place updated successfully" });
    },
  });

  const addPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const { publicUrl } = await uploadCreateImage(file);
      const response = await apiRequest("POST", `/api/places/${placeId}/photos`, {
        imageUrl: publicUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places", placeId, "photos"] });
      setShowPhotoModal(false);
      setPhotoFile(null);
      setPhotoPreview("");
      toast({ title: "Success!", description: "Photo added successfully" });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/places/${placeId}/posts`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places", placeId, "posts"] });
      setShowPostModal(false);
      setPostData({ content: "", postType: "update", imageUrl: "" });
      toast({ title: "Success!", description: "Post created successfully" });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/places/bookings/${bookingId}`, {
        status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places", placeId, "bookings"] });
      toast({ title: "Success!", description: "Booking updated" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-token-text">Place not found</h2>
          <Button onClick={() => setLocation("/places")} className="mt-4" data-testid="button-back-to-places">
            Back to Places
          </Button>
        </div>
      </div>
    );
  }

  // Authorization check
  if (place.ownerId !== user?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-token-text">Unauthorized</h2>
          <p className="text-token-text-muted mt-2">You don't have permission to manage this place</p>
          <Button onClick={() => setLocation(`/places/${placeId}`)} className="mt-4" data-testid="button-back-to-profile">
            Back to Place Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 bg-background border-b border-surna-outline z-50">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/places/${placeId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-lg font-bold text-token-text">Manage Place</h1>
          <div className="w-24" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEditData(place);
              setShowEditModal(true);
            }}
            data-testid="button-edit-place"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Place
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowPhotoModal(true)}
            data-testid="button-add-photos"
          >
            <ImagePlus className="w-4 h-4 mr-2" />
            Add Photos
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowPostModal(true)}
            data-testid="button-create-post"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-token-text/10">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="posts" data-testid="tab-posts">Posts</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-token-text/5 border-token-text/10" data-testid="card-views">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-token-text-muted flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-token-text">{place.viewsCount || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-token-text/5 border-token-text/10" data-testid="card-followers">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-token-text-muted flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Followers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-token-text">{place.followersCount || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-token-text/5 border-token-text/10" data-testid="card-bookings">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-token-text-muted flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-token-text">{place.bookingsCount || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-token-text/5 border-token-text/10" data-testid="card-rating">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-token-text-muted flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-token-text">
                    {parseFloat(place.averageRating || "0").toFixed(1)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4 mt-4">
            {posts.length === 0 ? (
              <div className="text-center py-8 text-token-text-muted" data-testid="empty-posts">
                No posts yet. Create your first post!
              </div>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="bg-token-text/5 border-token-text/10 p-4" data-testid={`post-${post.id}`}>
                  <p className="text-token-text mb-2">{post.content}</p>
                  <div className="flex items-center gap-4 text-sm text-token-text-muted">
                    <span>{new Date(post.createdAt || "").toLocaleDateString()}</span>
                    <Badge variant="secondary">{post.postType}</Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="mt-4">
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-token-text-muted" data-testid="empty-bookings">
                No bookings yet
              </div>
            ) : (
              <div className="rounded-lg border border-token-text/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-token-text/10">
                      <TableHead className="text-token-text">Title</TableHead>
                      <TableHead className="text-token-text">Date</TableHead>
                      <TableHead className="text-token-text">Status</TableHead>
                      <TableHead className="text-token-text">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id} className="border-token-text/10" data-testid={`booking-${booking.id}`}>
                        <TableCell className="text-token-text">{booking.title}</TableCell>
                        <TableCell className="text-token-text-muted">
                          {new Date(booking.startTime).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              booking.status === "confirmed"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : booking.status === "cancelled"
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : booking.status === "completed"
                                ? "bg-primary/20 text-primary border-primary/30"
                                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            }
                            data-testid={`status-${booking.id}`}
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {booking.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updateBookingMutation.mutate({
                                      bookingId: booking.id,
                                      status: "confirmed",
                                    })
                                  }
                                  data-testid={`approve-${booking.id}`}
                                >
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updateBookingMutation.mutate({
                                      bookingId: booking.id,
                                      status: "cancelled",
                                    })
                                  }
                                  data-testid={`cancel-${booking.id}`}
                                >
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4 mt-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-token-text-muted" data-testid="empty-reviews">
                No reviews yet
              </div>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} className="bg-token-text/5 border-token-text/10 p-4" data-testid={`review-${review.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-token-text-muted">
                      {new Date(review.createdAt || "").toLocaleDateString()}
                    </span>
                  </div>
                  {review.content && (
                    <p className="text-token-text mb-2" data-testid={`review-content-${review.id}`}>{review.content}</p>
                  )}
                  <Button variant="ghost" size="sm" data-testid={`reply-${review.id}`}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Reply
                  </Button>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-background border-token-text/10 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-token-text">Edit Place</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editData.name || ""}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                value={editData.bio || ""}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                rows={3}
                data-testid="textarea-edit-bio"
              />
            </div>
            <Button
              onClick={() => updatePlaceMutation.mutate(editData)}
              disabled={updatePlaceMutation.isPending}
              className="w-full bg-gradient-to-r from-token-accent to-token-accent"
              data-testid="button-save-edit"
            >
              {updatePlaceMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Photo Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="bg-background border-token-text/10">
          <DialogHeader>
            <DialogTitle className="text-token-text">Add Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPhotoFile(file);
                  setPhotoPreview(URL.createObjectURL(file));
                }
              }}
              data-testid="input-photo-file"
            />
            {photoPreview && <img src={photoPreview} alt="Preview" className="w-full rounded-lg" />}
            <Button
              onClick={() => photoFile && addPhotoMutation.mutate(photoFile)}
              disabled={!photoFile || addPhotoMutation.isPending}
              className="w-full bg-gradient-to-r from-token-accent to-token-accent"
              data-testid="button-upload-photo"
            >
              {addPhotoMutation.isPending ? "Uploading..." : "Upload Photo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Post Modal */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="bg-background border-token-text/10">
          <DialogHeader>
            <DialogTitle className="text-token-text">Create Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="post-content">Content</Label>
              <Textarea
                id="post-content"
                value={postData.content}
                onChange={(e) => setPostData({ ...postData, content: e.target.value })}
                placeholder="What's new?"
                rows={4}
                data-testid="textarea-post-content"
              />
            </div>
            <div>
              <Label htmlFor="post-type">Type</Label>
              <Input
                id="post-type"
                value={postData.postType}
                onChange={(e) => setPostData({ ...postData, postType: e.target.value })}
                placeholder="update, event, promotion, announcement"
                data-testid="input-post-type"
              />
            </div>
            <Button
              onClick={() => createPostMutation.mutate(postData)}
              disabled={!postData.content || createPostMutation.isPending}
              className="w-full bg-gradient-to-r from-token-accent to-token-accent"
              data-testid="button-submit-post"
            >
              {createPostMutation.isPending ? "Creating..." : "Create Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
