import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  Store, MapPin, Star, Heart, MessageCircle, Share2, Phone, Mail, 
  Globe, Clock, ArrowLeft, Package, Users, TrendingUp, ShoppingCart,
  Instagram, Facebook, Twitter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveModernSources, deriveLqipPlaceholder } from "@/lib/imageSources";
import { useAuth } from "@/hooks/useAuth";
import { getQueryFn } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { marketplaceProductPath } from "@/lib/marketplaceApi";

interface Shop {
  id: string;
  seller_id: string;
  business_name: string;
  business_type: string;
  description: string;
  logo_url?: string;
  banner_url?: string;
  location?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  website?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  operating_hours?: {
    [key: string]: { open: string; close: string };
  };
  rating: number;
  total_sales: number;
  followers_count: number;
  products_count: number;
  is_verified: boolean;
  isFollowing?: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  // Newer marketplace endpoints expose `imageUrl`/variant URLs through the
  // serializer; legacy raw rows still surface the snake_case `image_url`.
  image_url?: string;
  imageUrl?: string;
  thumbUrl?: string;
  thumbWebpUrl?: string;
  thumbAvifUrl?: string;
  category: string;
  stock: number;
}

interface Review {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  rating: number;
  review_title: string;
  review_text: string;
  is_verified_purchase: boolean;
  created_at: string;
}

export default function ShopProfile() {
  const { shopId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("products");

  // Fetch shop data
  const { data: shop, isLoading: shopLoading } = useQuery<Shop>({
    queryKey: ['/api/marketplace/shops', shopId],
    enabled: !!shopId,
  });

  // Fetch shop products
  const { data: productsData, isLoading: productsLoading } = useQuery<{ products: Product[] }>({
    queryKey: ['/api/marketplace/shops', shopId, 'products'],
    enabled: !!shopId && activeTab === 'products',
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      return await apiRequest('POST', `/api/marketplace/shops/${shopId}/follow`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/shops', shopId] });
      toast({
        title: shop?.isFollowing ? "Unfollowed shop" : "Following shop",
        description: shop?.isFollowing 
          ? `You unfollowed ${shop.business_name}` 
          : `You're now following ${shop?.business_name}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  const handleFollow = () => {
    followMutation.mutate(shop?.isFollowing ? 'unfollow' : 'follow');
  };

  const handleMessageSeller = () => {
    // Navigate to messages with seller context
    setLocation(`/messages?userId=${shop?.seller_id}`);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Shop profile link copied to clipboard",
    });
  };

  const addToCartMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest("POST", "/api/marketplace/cart/items", { productId, qty: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/cart"] });
      toast({ title: "Added to cart", description: "Item added to your cart." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to cart.",
        variant: "destructive",
      });
    },
  });

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-64 bg-token-text/5">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="max-w-5xl mx-auto px-4 -mt-16">
          <Skeleton className="w-32 h-32 rounded-full" />
          <Skeleton className="w-64 h-8 mt-4" />
          <Skeleton className="w-full h-48 mt-6" />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="bg-token-text/5 border-token-text/10 p-8 text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-token-text-muted" />
          <h2 className="text-2xl font-bold text-token-text mb-2">Shop not found</h2>
          <Button onClick={() => setLocation('/marketplace')} className="mt-4">
            Browse Marketplace
          </Button>
        </Card>
      </div>
    );
  }

  const products = productsData?.products || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Banner Image */}
      <div className="relative h-64 bg-gradient-to-r from-token-accent via-token-accent to-token-accent/80">
        {shop.banner_url && (
          <LazyImage
            src={shop.banner_url}
            alt={`${shop.business_name} banner`}
            sources={deriveModernSources(shop.banner_url)}
            placeholder={deriveLqipPlaceholder(shop.banner_url)}
            wrapperClassName="block w-full h-full"
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/marketplace')}
          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm hover:bg-background"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 text-token-text" />
        </Button>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
            data-testid="button-share"
          >
            <Share2 className="w-5 h-5 text-token-text" />
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Shop Logo and Header */}
        <div className="relative -mt-16 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            {/* Logo */}
            <Avatar className="w-32 h-32 border-4 border-background shadow-lg ring-2 ring-token-text/20">
              <AvatarImage src={shop.logo_url} alt={shop.business_name} />
              <AvatarFallback className="bg-gradient-to-br from-token-accent to-token-accent text-foreground text-3xl">
                {shop.business_name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Shop Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-token-text" data-testid="text-shop-name">
                  {shop.business_name}
                </h1>
                {shop.is_verified && (
                  <div className="bg-token-accentender/20 text-token-accentender px-2 py-1 rounded-full text-xs font-medium">
                    Verified
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-token-text-muted mb-3">
                <div className="flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  <span className="capitalize">{shop.business_type}</span>
                </div>
                
                {shop.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{shop.location}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{shop.rating.toFixed(1)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold text-token-text">{shop.products_count}</div>
                  <div className="text-token-text-muted">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-token-text">{shop.followers_count}</div>
                  <div className="text-token-text-muted">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-token-text">{shop.total_sales}</div>
                  <div className="text-token-text-muted">Sales</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={handleFollow}
                variant={shop.isFollowing ? "outline" : "default"}
                className={shop.isFollowing 
                  ? "border-token-text/20 text-token-text hover:bg-token-text/10" 
                  : "bg-gradient-to-r from-token-accent to-token-accent text-foreground hover:opacity-90"
                }
                disabled={followMutation.isPending}
                data-testid="button-follow"
              >
                <Heart className={`w-4 h-4 mr-2 ${shop.isFollowing ? 'fill-current' : ''}`} />
                {shop.isFollowing ? 'Following' : 'Follow'}
              </Button>
              
              <Button
                onClick={handleMessageSeller}
                variant="outline"
                className="border-token-text/20 text-token-text hover:bg-token-text/10"
                data-testid="button-message"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-token-text/5 mb-6">
            <TabsTrigger value="products" data-testid="tab-products">
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="about" data-testid="tab-about">
              <Store className="w-4 h-4 mr-2" />
              About
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              <Star className="w-4 h-4 mr-2" />
              Reviews
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="bg-token-text/5 border-token-text/10 hover:bg-token-text/10 transition-all cursor-pointer group"
                    onClick={() => setLocation(marketplaceProductPath(product.id))}
                    data-testid={`card-product-${product.id}`}
                  >
                    <CardContent className="p-0">
                      {/* Product Image */}
                      <div className="relative h-48 bg-token-text/5 rounded-t-lg overflow-hidden">
                        {(() => {
                          // Shop product grid is a list surface — prefer the
                          // small `_thumb` variant from the serializer (camelCase
                          // `thumbUrl`) and fall back to the legacy snake_case
                          // `image_url` for endpoints that haven't been moved
                          // through the marketplace serializer yet.
                          const base = product.thumbUrl || product.image_url || product.imageUrl;
                          if (!base) return null;
                          const sources = product.thumbWebpUrl || product.thumbAvifUrl
                            ? { webp: product.thumbWebpUrl, avif: product.thumbAvifUrl }
                            : deriveModernSources(base);
                          return (
                            <LazyImage
                              src={base}
                              alt={product.name}
                              sources={sources}
                              placeholder={deriveLqipPlaceholder(base)}
                              wrapperClassName="block w-full h-full"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          );
                        })() || (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-16 h-16 text-token-text-muted" />
                          </div>
                        )}
                        {product.stock < 5 && (
                          <div className="absolute top-2 right-2 bg-red-500/90 text-foreground px-2 py-1 rounded text-xs font-medium">
                            Low Stock
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-token-text mb-1 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-token-text-muted mb-3 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-token-text">
                            €{product.price.toFixed(2)}
                          </span>
                          <Button 
                            size="sm"
                            className="bg-gradient-to-r from-token-accent to-token-accent text-foreground hover:opacity-90"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCartMutation.mutate(product.id);
                            }}
                            data-testid={`button-add-cart-${product.id}`}
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-token-text/5 border-token-text/10 p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-token-text-muted" />
                <p className="text-token-text text-lg mb-2">No products yet</p>
                <p className="text-token-text-muted text-sm">This shop hasn't added any products</p>
              </Card>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Description */}
              <Card className="lg:col-span-2 bg-token-text/5 border-token-text/10">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-token-text mb-4">About {shop.business_name}</h3>
                  <p className="text-token-text-muted leading-relaxed whitespace-pre-wrap">
                    {shop.description || "No description available"}
                  </p>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card className="bg-token-text/5 border-token-text/10">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-token-text mb-4">Contact</h3>
                  <div className="space-y-4">
                    {shop.email && (
                      <a 
                        href={`mailto:${shop.email}`}
                        className="flex items-center gap-3 text-token-text-muted hover:text-token-text transition-colors"
                      >
                        <Mail className="w-5 h-5 text-token-accentender" />
                        <span className="text-sm">{shop.email}</span>
                      </a>
                    )}
                    
                    {shop.phone && (
                      <a 
                        href={`tel:${shop.phone}`}
                        className="flex items-center gap-3 text-token-text-muted hover:text-token-text transition-colors"
                      >
                        <Phone className="w-5 h-5 text-token-accentender" />
                        <span className="text-sm">{shop.phone}</span>
                      </a>
                    )}
                    
                    {shop.website && (
                      <a 
                        href={shop.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-token-text-muted hover:text-token-text transition-colors"
                      >
                        <Globe className="w-5 h-5 text-token-accentender" />
                        <span className="text-sm">Website</span>
                      </a>
                    )}

                    {/* Social Links */}
                    {shop.social_links && (
                      <div className="pt-4 border-t border-token-text/10">
                        <p className="text-sm text-token-text-muted mb-3">Follow us</p>
                        <div className="flex gap-3">
                          {shop.social_links.instagram && (
                            <a 
                              href={shop.social_links.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-token-text-muted hover:text-token-accentender transition-colors"
                            >
                              <Instagram className="w-5 h-5" />
                            </a>
                          )}
                          {shop.social_links.facebook && (
                            <a 
                              href={shop.social_links.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-token-text-muted hover:text-token-accentender transition-colors"
                            >
                              <Facebook className="w-5 h-5" />
                            </a>
                          )}
                          {shop.social_links.twitter && (
                            <a 
                              href={shop.social_links.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-token-text-muted hover:text-token-accentender transition-colors"
                            >
                              <Twitter className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Operating Hours */}
            {shop.operating_hours && Object.keys(shop.operating_hours).length > 0 && (
              <Card className="mt-6 bg-token-text/5 border-token-text/10">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-token-text mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-token-accentender" />
                    Operating Hours
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(shop.operating_hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between items-center">
                        <span className="text-token-text capitalize font-medium">{day}</span>
                        <span className="text-token-text-muted text-sm">
                          {hours.open} - {hours.close}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {shopId && <ShopReviewsTab shopId={shopId} />}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      {/* eslint-disable-next-line */}
      <Navigation 
        onMessengerClick={() => setLocation('/messages')}
        onMenuClick={() => {}}
      />
    </div>
  );
}

interface ShopReviewRow {
  id: string;
  shop_id: string;
  author_id: string;
  rating: number;
  title?: string | null;
  text?: string | null;
  created_at: string;
  author_name?: string | null;
  author_username?: string | null;
  author_avatar?: string | null;
}

function ShopReviewsTab({ shopId }: { shopId: string }) {
  const { user } = useAuth() as any;
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const { data: reviews = [], isLoading } = useQuery<ShopReviewRow[]>({
    queryKey: ['/api/shops', shopId, 'reviews'],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
    enabled: !!shopId,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', `/api/shops/${shopId}/reviews`, { rating, title: title || undefined, text: text || undefined });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shops', shopId, 'reviews'] });
      setTitle(""); setText(""); setRating(5);
      toast({ title: "Review submitted" });
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/shops/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shops', shopId, 'reviews'] });
      toast({ title: "Review deleted" });
    },
  });

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      <Card className="bg-token-text/5 border-token-text/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-token-text-muted">Customer reviews</p>
            <p className="text-2xl font-bold text-token-text">
              {avg ? <>{avg} <span className="text-base font-normal text-token-text-muted">/ 5 · {reviews.length}</span></> : 'No reviews yet'}
            </p>
          </div>
          <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
        </div>
      </Card>

      {user && (
        <Card className="bg-token-text/5 border-token-text/10 p-4">
          <p className="text-sm font-semibold text-token-text mb-3">Write a review</p>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                data-testid={`shop-rating-${n}`}
                className="p-0.5"
              >
                <Star
                  className={`h-6 w-6 ${n <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-token-text-muted'}`}
                />
              </button>
            ))}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="mb-2"
            data-testid="input-shop-review-title"
          />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience…"
            className="mb-3"
            rows={3}
            data-testid="input-shop-review-text"
          />
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            data-testid="button-submit-shop-review"
          >
            {submit.isPending ? 'Submitting…' : 'Submit review'}
          </Button>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-token-text-muted text-sm">
          Be the first to leave a review.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card
              key={r.id}
              className="bg-token-text/5 border-token-text/10 p-4"
              data-testid={`shop-review-${r.id}`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={r.author_avatar || undefined} />
                  <AvatarFallback>{(r.author_name || r.author_username || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-token-text truncate">
                        {r.author_name || r.author_username || 'User'}
                      </p>
                      <p className="text-xs text-token-text-muted">
                        {format(new Date(r.created_at), 'PP')}
                      </p>
                    </div>
                    {user?.id === r.author_id && (
                      <button
                        onClick={() => { if (confirm('Delete this review?')) remove.mutate(r.id); }}
                        className="text-token-text-muted hover:text-destructive p-1"
                        data-testid={`button-delete-shop-review-${r.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 mt-1 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${n <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-token-text-muted'}`}
                      />
                    ))}
                  </div>
                  {r.title && (
                    <p className="text-sm font-semibold text-token-text">{r.title}</p>
                  )}
                  {r.text && (
                    <p className="text-sm text-token-text whitespace-pre-wrap mt-1">{r.text}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
