import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import {
  fetchMarketplaceProduct,
  marketplaceProductPath,
  marketplaceShopPath,
  normalizeProductReviews,
  normalizeProductQuestions,
  productRequiresVariant,
} from "@/lib/marketplaceApi";
import type { ProductVariant } from "@shared/marketplaceVariants";
import { 
  Star, 
  Heart, 
  ShoppingCart, 
  Truck, 
  Shield, 
  ArrowLeft, 
  Plus, 
  Minus,
  Share2,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveModernSources, deriveLqipPlaceholder } from "@/lib/imageSources";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ProductPricing {
  originalPrice: number;
  discountedPrice: number;
  hasDiscount: boolean;
  discountPercentage?: number;
  flashSale?: boolean;
  bulkDiscount?: {
    quantity: number;
    price: number;
  }[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand?: string;
  imageUrl?: string;
  // Variant URLs attached by the marketplace serializer (server derives
  // `_thumb`/`_medium` siblings from the worker URL pattern). Detail page
  // prefers `mediumUrl`; cards prefer `thumbUrl`.
  thumbUrl?: string;
  mediumUrl?: string;
  thumbWebpUrl?: string;
  mediumWebpUrl?: string;
  thumbAvifUrl?: string;
  mediumAvifUrl?: string;
  avgRating?: number;
  reviewCount?: number;
  currentStock?: number;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  isVerifiedSeller?: boolean;
  pricing?: ProductPricing;
  relatedProducts?: Product[];
  shop?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  seller_id?: string;
}

interface Review {
  id: string;
  rating: number;
  reviewTitle: string;
  reviewText: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    profileImageUrl?: string;
  };
}

interface Question {
  id: string;
  question: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
  };
  answers?: Array<{
    id: string;
    answer: string;
    isFromSeller: boolean;
    helpfulVotes: number;
    createdAt: string;
    user: {
      id: string;
      firstName: string;
    };
  }>;
}

export default function ProductDetail() {
  const [, paramsMarketplace] = useRoute("/marketplace/product/:id");
  const [, paramsLegacy] = useRoute("/product/:id");
  const params = paramsMarketplace ?? paramsLegacy;
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: "",
    text: ""
  });
  const [newQuestion, setNewQuestion] = useState("");

  const productId = params?.id;

  // Get product details with dynamic pricing
  const { data: product, isLoading: productLoading, isError: productError } = useQuery({
    queryKey: ["marketplace-product", productId],
    queryFn: () => fetchMarketplaceProduct(productId!),
    enabled: !!productId,
    retry: 1,
  });

  useEffect(() => {
    if (!product) return;
    const variants = product.variants ?? [];
    if (!productRequiresVariant(product)) {
      setSelectedVariantId(null);
      return;
    }
    setSelectedVariantId((current) => {
      if (current && variants.some((v) => v.id === current)) return current;
      return variants.find((v) => v.stock > 0)?.id ?? variants[0]?.id ?? null;
    });
    setQuantity(1);
  }, [product?.id, product?.hasVariants]);

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["marketplace-product-reviews", productId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/products/${productId}/reviews?limit=10`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load reviews");
      const data = await res.json();
      return normalizeProductReviews(data.reviews || []);
    },
    enabled: !!productId,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["marketplace-product-questions", productId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/products/${productId}/questions?limit=10`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load questions");
      const data = await res.json();
      return normalizeProductQuestions(data.questions || []);
    },
    enabled: !!productId,
  });

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/marketplace/wishlist", { productId }),
    onSuccess: () => {
      toast({
        title: "Added to Wishlist",
        description: "Product has been added to your wishlist.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add product to wishlist.",
        variant: "destructive"
      });
    }
  });

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: (reviewData: any) => 
      apiRequest("POST", `/api/marketplace/products/${productId}/reviews`, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-product-reviews", productId] });
      setNewReview({ rating: 5, title: "", text: "" });
      toast({
        title: "Review Submitted",
        description: "Thank you for your review!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit review.",
        variant: "destructive"
      });
    }
  });

  // Create question mutation
  const createQuestionMutation = useMutation({
    mutationFn: (question: string) => 
      apiRequest("POST", `/api/marketplace/products/${productId}/questions`, { question }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-product-questions", productId] });
      setNewQuestion("");
      toast({
        title: "Question Submitted",
        description: "Your question has been posted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit question.",
        variant: "destructive"
      });
    }
  });

  const addToCartMutation = useMutation({
    mutationFn: (payload: { productId: string; qty: number; variantId?: string }) =>
      apiRequest("POST", "/api/marketplace/cart/items", payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/cart"] });
      toast({
        title: "Added to Cart",
        description: `${variables.qty} item(s) added to your cart.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not add to cart",
        description: err.message.includes("400")
          ? "Select a size before adding to cart."
          : "Failed to add to cart. Please log in.",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your cart.",
        variant: "destructive",
      });
      return;
    }
    if (product && productRequiresVariant(product) && !selectedVariantId) {
      toast({
        title: "Select a size",
        description: "Choose your size before adding to cart.",
        variant: "destructive",
      });
      return;
    }
    addToCartMutation.mutate({
      productId: productId!,
      qty: quantity,
      variantId: selectedVariantId ?? undefined,
    });
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to checkout.",
        variant: "destructive",
      });
      return;
    }
    if (product && productRequiresVariant(product) && !selectedVariantId) {
      toast({
        title: "Select a size",
        description: "Choose your size before checkout.",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiRequest("POST", "/api/marketplace/cart/items", {
        productId,
        qty: quantity,
        variantId: selectedVariantId ?? undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/cart"] });
      setLocation("/marketplace/checkout");
    } catch {
      toast({
        title: "Error",
        description: "Could not start checkout. Try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to submit a review.",
        variant: "destructive"
      });
      return;
    }
    createReviewMutation.mutate({
      rating: newReview.rating,
      reviewTitle: newReview.title,
      reviewText: newReview.text
    });
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to ask a question.",
        variant: "destructive"
      });
      return;
    }
    if (newQuestion.trim()) {
      createQuestionMutation.mutate(newQuestion);
    }
  };

  if (!productId) {
    return <div>Product not found</div>;
  }

  if (productLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (productError) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Couldn&apos;t load product</h1>
        <p className="text-muted-foreground mb-6">Check your connection and try again.</p>
        <Link href="/marketplace">
          <Button>Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Link href="/marketplace">
          <Button>Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  // Product detail is a large surface — prefer the worker's `_medium` (1024w)
  // variant when present so the hero crops sharply, falling back to the
  // original `imageUrl` for legacy products without resize variants.
  const heroImage = product.mediumUrl || product.imageUrl || '/api/placeholder/600/600';
  const images = [heroImage];
  const heroModernSources = product.mediumWebpUrl || product.mediumAvifUrl
    ? { webp: product.mediumWebpUrl, avif: product.mediumAvifUrl }
    : deriveModernSources(heroImage);

  const variants = product.variants ?? [];
  const hasVariants = productRequiresVariant(product);
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  const effectiveStock = hasVariants ? (selectedVariant?.stock ?? 0) : (product.currentStock ?? 0);
  const variantPrice =
    selectedVariant?.priceCents != null ? selectedVariant.priceCents / 100 : null;
  const currentPrice = Number(
    variantPrice ??
      (product.pricing as ProductPricing | undefined)?.discountedPrice ??
      product.price,
  );
  const originalPrice = Number(
    (product.pricing as ProductPricing | undefined)?.originalPrice ?? product.price,
  );
  const hasDiscount = Boolean((product.pricing as ProductPricing | undefined)?.hasDiscount);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/marketplace" className="hover:underline" data-testid="breadcrumb-marketplace">
          Marketplace
        </Link>
        <span>/</span>
        <Link href={`/marketplace?categories=${product.category}`} className="hover:underline" data-testid="breadcrumb-category">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-foreground" data-testid="breadcrumb-product">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-transparent border border-border rounded-lg overflow-hidden">
            <LazyImage
              src={images[selectedImage]}
              alt={product.name}
              sources={selectedImage === 0 ? heroModernSources : deriveModernSources(images[selectedImage])}
              placeholder={deriveLqipPlaceholder(images[selectedImage])}
              wrapperClassName="block w-full h-full"
              className="w-full h-full object-cover"
              data-testid="product-main-image"
            />
          </div>
          
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden  ${
                    selectedImage === index ? '' : ''
                  }`}
                  data-testid={`product-thumbnail-${index}`}
                >
                  <LazyImage
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    sources={deriveModernSources(image)}
                    placeholder={deriveLqipPlaceholder(image)}
                    wrapperClassName="block w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2" data-testid="product-title">{product.name}</h1>
                <p className="text-lg text-muted-foreground" data-testid="product-brand">{product.brand}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addToWishlistMutation.mutate()}
                  disabled={!isAuthenticated || addToWishlistMutation.isPending}
                  data-testid="wishlist-button"
                >
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" data-testid="share-button">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {product.isVerifiedSeller && (
              <Badge variant="secondary" className="mt-2" data-testid="verified-seller-badge">
                <Shield className="h-3 w-3 mr-1" />
                Verified Seller
              </Badge>
            )}
          </div>

          {/* Rating */}
          {product.avgRating && (
            <div className="flex items-center gap-4">
              <div className="flex items-center" data-testid="product-rating">
                <div className="flex items-center mr-2">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${
                        i < Math.floor(product.avgRating!) 
                          ? 'fill-token-text text-token-text' 
                          : 'text-token-text-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium">{product.avgRating.toFixed(1)}</span>
              </div>
              <span className="text-muted-foreground" data-testid="review-count">
                ({product.reviewCount} reviews)
              </span>
            </div>
          )}

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-bold text-token-text" data-testid="current-price">
                €{currentPrice}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xl text-muted-foreground line-through" data-testid="original-price">
                    €{originalPrice}
                  </span>
                  <Badge variant="destructive" data-testid="discount-badge">
                    {(product.pricing as ProductPricing | undefined)?.discountPercentage}% OFF
                  </Badge>
                </>
              )}
            </div>
            
            {(product.pricing as ProductPricing | undefined)?.flashSale && (
              <div className="text-sm text-token-text font-medium" data-testid="flash-sale-notice">
                🔥 Flash Sale - Limited Time Only!
              </div>
            )}
          </div>

          {/* Stock Status */}
          {effectiveStock !== undefined && (
            <div data-testid="stock-status">
              {effectiveStock > 0 ? (
                <div className="text-token-text">
                  <span className="font-medium">In Stock</span>
                  <span className="text-sm ml-2">({effectiveStock} available{selectedVariant ? ` · ${selectedVariant.label}` : ""})</span>
                </div>
              ) : (
                <div className="text-token-text font-medium">
                  {hasVariants && !selectedVariant ? "Select a size" : "Out of Stock"}
                </div>
              )}
            </div>
          )}

          {hasVariants && variants.length > 0 ? (
            <div className="space-y-2" data-testid="size-selector">
              <Label>
                {variants[0]?.variantType === "shoe" ? "Shoe size (EU)" : "Size"}
              </Label>
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => {
                  const active = selectedVariantId === variant.id;
                  const disabled = variant.stock <= 0;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(1);
                      }}
                      className={`min-w-[2.75rem] px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : disabled
                            ? "border-border text-muted-foreground opacity-40 cursor-not-allowed"
                            : "border-border hover:border-primary"
                      }`}
                      data-testid={`size-option-${variant.label}`}
                    >
                      {variant.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Quantity Selector */}
          <div className="flex items-center gap-4">
            <Label htmlFor="quantity">Quantity:</Label>
            <div className="flex items-center rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                data-testid="quantity-decrease"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="px-4 py-2 min-w-[3rem] text-center" data-testid="quantity-display">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
                disabled={effectiveStock !== undefined && quantity >= effectiveStock}
                data-testid="quantity-increase"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="flex gap-4">
            <Button 
              size="lg" 
              className="flex-1"
              onClick={handleAddToCart}
              disabled={effectiveStock <= 0 || addToCartMutation.isPending}
              data-testid="add-to-cart-button"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 w-full"
              disabled={effectiveStock <= 0 || addToCartMutation.isPending}
              onClick={handleBuyNow}
              data-testid="buy-now-button"
            >
              Buy Now
            </Button>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              if (product.seller_id) {
                setLocation(`/messages?userId=${encodeURIComponent(product.seller_id)}`);
              }
            }}
            disabled={!product.seller_id}
            data-testid="message-seller-below-cart-button"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Message Seller
          </Button>

          {/* Shop & Seller Actions */}
          {product.shop && (
            <Card className="bg-muted/40 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {product.shop.logoUrl && (
                      <img
                        src={product.shop.logoUrl}
                        alt={product.shop.name}
                        className="w-12 h-12 rounded-full object-cover"
                        data-testid="shop-logo"
                      />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Sold by</p>
                      <Link href={marketplaceShopPath(product.shop.id)}>
                        <p className="font-medium hover:text-token-text transition-colors" data-testid="shop-name-link">
                          {product.shop.name}
                        </p>
                      </Link>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/marketplace/shop/${product.shop.id}`}>
                      <Button variant="outline" size="sm" data-testid="view-shop-button">
                        View Shop
                      </Button>
                    </Link>
                    <Link href={`/messages?userId=${product.seller_id}`}>
                      <Button variant="outline" size="sm" data-testid="message-seller-button">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message Seller
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery & Features */}
          <div className="space-y-3 pt-4 ">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="h-4 w-4 text-token-text" />
              <span>Free shipping on orders over €50</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-token-text" />
              <span>30-day return policy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Tabs */}
      <Tabs defaultValue="description" className="mb-12">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="description" data-testid="tab-description">Description</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">
            Reviews ({product.reviewCount || 0})
          </TabsTrigger>
          <TabsTrigger value="qa" data-testid="tab-qa">Q&A</TabsTrigger>
          <TabsTrigger value="specifications" data-testid="tab-specifications">Specifications</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="prose max-w-none" data-testid="product-description">
                {product.description || "No description available."}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <div className="space-y-6">
            {/* Write Review */}
            {isAuthenticated && (
              <Card>
                <CardHeader>
                  <CardTitle>Write a Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <Label>Rating</Label>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setNewReview(prev => ({ ...prev, rating }))}
                            data-testid={`rating-star-${rating}`}
                          >
                            <Star 
                              className={`h-6 w-6 ${
                                rating <= newReview.rating 
                                  ? 'fill-token-text text-token-text' 
                                  : 'text-token-text-muted'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="review-title">Title</Label>
                      <Input
                        id="review-title"
                        value={newReview.title}
                        onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Summarize your review in a few words"
                        data-testid="review-title-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="review-text">Review</Label>
                      <Textarea
                        id="review-text"
                        value={newReview.text}
                        onChange={(e) => setNewReview(prev => ({ ...prev, text: e.target.value }))}
                        placeholder="Tell others about your experience with this product"
                        rows={4}
                        data-testid="review-text-input"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={createReviewMutation.isPending}
                      data-testid="submit-review-button"
                    >
                      Submit Review
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Reviews List */}
            {reviewsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : reviewsData && reviewsData.length > 0 ? (
              <div className="space-y-4" data-testid="reviews-list">
                {reviewsData.map((reviewItem: any) => {
                  const review = reviewItem.review;
                  const user = reviewItem.user;
                  return (
                    <Card key={review.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <img
                            src={user.profileImageUrl || '/api/placeholder/48/48'}
                            alt={user.firstName}
                            className="w-12 h-12 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <span className="font-medium">{user.firstName}</span>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-3 w-3 ${
                                      i < review.rating 
                                        ? 'fill-token-text text-token-text' 
                                        : 'text-token-text-muted'
                                    }`}
                                  />
                                ))}
                              </div>
                              {review.isVerifiedPurchase && (
                                <Badge variant="secondary" className="text-xs">
                                  Verified Purchase
                                </Badge>
                              )}
                            </div>
                            
                            <h4 className="font-medium mb-2">{review.reviewTitle}</h4>
                            <p className="text-muted-foreground text-sm">{review.reviewText}</p>
                            
                            <div className="text-xs text-muted-foreground mt-2">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="qa" className="mt-6">
          <div className="space-y-6">
            {/* Ask Question */}
            {isAuthenticated && (
              <Card>
                <CardHeader>
                  <CardTitle>Ask a Question</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitQuestion} className="space-y-4">
                    <Textarea
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Ask about product details, specifications, or usage..."
                      rows={3}
                      data-testid="question-input"
                    />
                    <Button 
                      type="submit" 
                      disabled={createQuestionMutation.isPending || !newQuestion.trim()}
                      data-testid="submit-question-button"
                    >
                      Submit Question
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Questions List */}
            {questionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : questions && questions.length > 0 ? (
              <div className="space-y-4" data-testid="questions-list">
                {questions.map((question: Question) => (
                  <Card key={question.id}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MessageCircle className="h-4 w-4 text-token-text" />
                            <span className="font-medium">Question</span>
                            <span className="text-sm text-muted-foreground">
                              by {question.user.firstName}
                            </span>
                          </div>
                          <p className="text-sm">{question.question}</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(question.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {question.answers && question.answers.length > 0 && (
                          <div className="space-y-3 pl-6  /20">
                            {question.answers.map((answer) => (
                              <div key={answer.id}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-sm">
                                    {answer.user.firstName}
                                  </span>
                                  {answer.isFromSeller && (
                                    <Badge variant="secondary" className="text-xs">
                                      Seller
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{answer.answer}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(answer.createdAt).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {answer.helpfulVotes} found this helpful
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No questions yet. Be the first to ask!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="specifications" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Basic Information</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Brand:</dt>
                        <dd>{product.brand || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Category:</dt>
                        <dd>{product.category}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Product ID:</dt>
                        <dd>{product.id}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Availability</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Stock:</dt>
                        <dd>{product.currentStock || 0} available</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Shipping:</dt>
                        <dd>Free on orders €50+</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Related Products */}
      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6" data-testid="related-products-title">
            Frequently Bought Together
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {product.relatedProducts.map((relatedProduct) => (
              <Link key={relatedProduct.id} href={marketplaceProductPath(relatedProduct.id)}>
                <Card className="hover:shadow-lg transition-shadow" data-testid={`related-product-${relatedProduct.id}`}>
                  <div className="aspect-square bg-transparent border border-border overflow-hidden">
                    <LazyImage
                      src={relatedProduct.imageUrl || '/api/placeholder/200/200'}
                      alt={relatedProduct.name}
                      sources={deriveModernSources(relatedProduct.imageUrl)}
                      placeholder={deriveLqipPlaceholder(relatedProduct.imageUrl)}
                      wrapperClassName="block w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-sm truncate">{relatedProduct.name}</h3>
                    <p className="text-lg font-bold text-token-text mt-1">€{relatedProduct.price}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Back to Marketplace */}
      <div className="mt-12 text-center">
        <Link href="/marketplace">
          <Button variant="outline" data-testid="back-to-marketplace">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
        </Link>
      </div>
    </div>
  );
}