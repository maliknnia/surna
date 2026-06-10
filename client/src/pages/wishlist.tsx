import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Heart, ShoppingCart, Trash2, ArrowLeft, HeartOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SurnaLogo from "@/components/SurnaLogo";
import { useAuth } from "@/hooks/useAuth";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveModernSources, deriveLqipPlaceholder } from "@/lib/imageSources";
import { normalizeWishlistItems } from "@/lib/marketplaceApi";

interface WishlistItem {
  product_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    imageUrl?: string;
    // Variant URLs from the marketplace serializer; tiles prefer `thumbUrl`.
    thumbUrl?: string;
    thumbWebpUrl?: string;
    thumbAvifUrl?: string;
  };
}

export default function Wishlist() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Fetch wishlist items
  const { data: wishlistData, isLoading } = useQuery<{ items: WishlistItem[] }>({
    queryKey: ["/api/marketplace/wishlist"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/marketplace/wishlist", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load wishlist");
      const raw = await res.json();
      return { items: normalizeWishlistItems(raw.items || []) as WishlistItem[] };
    },
  });

  // Remove from wishlist mutation
  const removeFromWishlistMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest("DELETE", `/api/marketplace/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/wishlist"] });
      toast({
        title: "Removed from wishlist",
        description: "Item removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest("POST", "/api/marketplace/cart/items", { productId, qty: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/cart"] });
      toast({
        title: "Added to cart",
        description: "Product added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">Please log in to view your wishlist</p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = wishlistData?.items || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 bg-background border-b border-border z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/marketplace">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 rounded-full hover:bg-muted/40 border border-border"
                data-testid="back-button"
              >
                <ArrowLeft className="w-4 h-4 text-token-text" />
              </Button>
            </Link>
            <SurnaLogo className="h-8 w-auto" showText={true} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">My Wishlist</h1>
            {items.length > 0 && (
              <Badge variant="secondary">{items.length}</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <HeartOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">
              Save products you love for later!
            </p>
            <Link href="/marketplace">
              <Button>Browse Marketplace</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <Card
                key={item.product_id}
                className="hover:shadow-lg transition-shadow"
                data-testid={`wishlist-item-${item.product_id}`}
              >
                <Link href={`/marketplace/product/${item.product_id}`}>
                  <div className="aspect-square bg-muted/40 overflow-hidden relative">
                    {(() => {
                      // Wishlist tiles are a grid surface — request the small
                      // `_thumb` variant from the marketplace serializer when
                      // present, falling back to the raw `imageUrl`.
                      const product = item.product;
                      const base = product.thumbUrl || product.imageUrl;
                      const sources = product.thumbWebpUrl || product.thumbAvifUrl
                        ? { webp: product.thumbWebpUrl, avif: product.thumbAvifUrl }
                        : deriveModernSources(base);
                      return (
                        <LazyImage
                          src={base || "/api/placeholder/300/300"}
                          alt={item.product.name}
                          sources={sources}
                          placeholder={deriveLqipPlaceholder(base)}
                          wrapperClassName="block w-full h-full"
                          className="w-full h-full object-cover"
                        />
                      );
                    })()}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        removeFromWishlistMutation.mutate(item.product_id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-full hover:bg-red-600 transition-colors"
                      data-testid={`remove-${item.product_id}`}
                    >
                      <Trash2 className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link href={`/marketplace/product/${item.product_id}`}>
                    <h3 className="font-medium text-sm mb-1 truncate hover:text-token-text transition-colors">
                      {item.product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-token-text">
                      €{item.product.price.toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {item.product.stock} left
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => addToCartMutation.mutate(item.product_id)}
                    disabled={item.product.stock <= 0 || addToCartMutation.isPending}
                    data-testid={`add-to-cart-${item.product_id}`}
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    {item.product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
