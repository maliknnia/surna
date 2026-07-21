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
import TeamBulkOrderSheet from "@/components/marketplace/TeamBulkOrderSheet";
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
  MessageCircle,
  Users,
  Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveModernSources, deriveLqipPlaceholder } from "@/lib/imageSources";
import {
  EntityEmptyState,
  EntityListSkeleton,
  EntitySectionTabs,
  entityBtnClass,
  entityBtnSurface,
  entityCardStyle,
} from "@/components/entity";
import { useSmartBack } from "@/lib/navigation";
import { cn } from "@/lib/utils";

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
  const [teamBulkOpen, setTeamBulkOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: "",
    text: ""
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [detailTab, setDetailTab] = useState<"description" | "reviews" | "qa" | "specs">("description");
  const goBack = useSmartBack({ fallback: "/marketplace" });

  const inputStyle = {
    background: "var(--surna-bg-highlight)",
    border: "1px solid var(--surna-border)",
    color: "var(--surna-text)",
  } as const;

  const productId = params?.id;
  const currentUserId = (user as { id?: string } | null)?.id;

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

  const { data: managedTeams } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/teams/me/managed"],
    queryFn: async () => {
      const res = await fetch("/api/teams/me/managed", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated && !!product && productRequiresVariant(product),
  });

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

  const ownReview = reviewsData?.find((entry) => entry.user.id === currentUserId);

  useEffect(() => {
    if (!ownReview) return;
    setNewReview({
      rating: ownReview.review.rating,
      title: ownReview.review.reviewTitle,
      text: ownReview.review.reviewText,
    });
  }, [ownReview?.review.id, ownReview?.review.rating, ownReview?.review.reviewTitle, ownReview?.review.reviewText]);

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
      queryClient.invalidateQueries({ queryKey: ["marketplace-product", productId] });
      if (!ownReview) {
        setNewReview({ rating: 5, title: "", text: "" });
      }
      toast({
        title: "Review saved",
        description: "Thank you for your feedback!",
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
    return (
      <div className="min-h-screen max-w-md mx-auto" style={{ background: "var(--surna-base)" }}>
        <EntityEmptyState icon={Package} title="Product not found" actionLabel="Back to Marketplace" actionHref="/marketplace" />
      </div>
    );
  }

  if (productLoading) {
    return (
      <div className="min-h-screen max-w-md mx-auto px-4 pt-6" style={{ background: "var(--surna-base)" }}>
        <div className="aspect-square rounded-2xl mb-4 animate-pulse" style={{ background: "var(--surna-elevated)" }} />
        <EntityListSkeleton rows={5} rowHeight={72} />
      </div>
    );
  }

  if (productError) {
    return (
      <div className="min-h-screen max-w-md mx-auto" style={{ background: "var(--surna-base)" }}>
        <EntityEmptyState
          icon={Package}
          title="Couldn't load product"
          description="Check your connection and try again."
          actionLabel="Back to Marketplace"
          actionHref="/marketplace"
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen max-w-md mx-auto" style={{ background: "var(--surna-base)" }}>
        <EntityEmptyState icon={Package} title="Product not found" actionLabel="Back to Marketplace" actionHref="/marketplace" />
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
  const canTeamBulkOrder =
    isAuthenticated &&
    hasVariants &&
    (managedTeams?.length ?? 0) > 0;

  const detailTabs = [
    { id: "description", label: "Details" },
    { id: "reviews", label: `Reviews (${product.reviewCount || 0})` },
    { id: "qa", label: "Q&A" },
    { id: "specs", label: "Specs" },
  ];

  const chipBtn =
    "w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.96] transition-transform";
  const chipStyle = {
    background: "var(--surna-elevated)",
    border: "1px solid var(--surna-border)",
  } as const;

  return (
    <div
      className="min-h-screen max-w-md mx-auto relative"
      style={{ background: "var(--surna-base)", color: "var(--surna-text)" }}
    >
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14 backdrop-blur-md border-b"
        style={{
          background: "color-mix(in srgb, var(--surna-base) 92%, transparent)",
          borderColor: "var(--surna-border)",
        }}
      >
        <button type="button" onClick={goBack} className={chipBtn} style={chipStyle} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <p className="flex-1 text-[14px] font-semibold truncate" data-testid="breadcrumb-product">
          {product.name}
        </p>
        <button
          type="button"
          className={chipBtn}
          style={chipStyle}
          onClick={() => addToWishlistMutation.mutate()}
          disabled={!isAuthenticated || addToWishlistMutation.isPending}
          data-testid="wishlist-button"
          aria-label="Add to wishlist"
        >
          <Heart size={16} />
        </button>
        <button type="button" className={chipBtn} style={chipStyle} data-testid="share-button" aria-label="Share">
          <Share2 size={16} />
        </button>
      </header>

      <div className="aspect-square w-full overflow-hidden" style={{ background: "var(--surna-elevated)" }}>
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

      <div className="px-4 pt-5 pb-2 space-y-4">
        <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
          <Link href="/marketplace" className="hover:underline" data-testid="breadcrumb-marketplace">
            Marketplace
          </Link>
          <span>/</span>
          <Link
            href={`/marketplace?categories=${product.category}`}
            className="hover:underline capitalize"
            data-testid="breadcrumb-category"
          >
            {(product.category ?? "").replace(/-/g, " ")}
          </Link>
        </div>

        <div>
          <h1 className="text-[22px] font-extrabold leading-tight mb-1" data-testid="product-title">
            {product.name}
          </h1>
          {product.brand ? (
            <p className="text-[14px]" style={{ color: "var(--surna-text-secondary)" }} data-testid="product-brand">
              {product.brand}
            </p>
          ) : null}
          {product.isVerifiedSeller ? (
            <span
              className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-gold)" }}
              data-testid="verified-seller-badge"
            >
              <Shield size={12} />
              Verified Seller
            </span>
          ) : null}
        </div>

        {product.avgRating ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center" data-testid="product-rating">
              <div className="flex items-center mr-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5"
                    style={{
                      fill: i < Math.floor(product.avgRating!) ? "var(--surna-gold)" : "transparent",
                      color: i < Math.floor(product.avgRating!) ? "var(--surna-gold)" : "var(--surna-border)",
                    }}
                  />
                ))}
              </div>
              <span className="text-[14px] font-semibold">{product.avgRating.toFixed(1)}</span>
            </div>
            <span className="text-[13px]" style={{ color: "var(--surna-text-secondary)" }} data-testid="review-count">
              ({product.reviewCount} reviews)
            </span>
          </div>
        ) : null}

        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-[28px] font-extrabold" style={{ color: "var(--surna-gold)" }} data-testid="current-price">
            €{currentPrice}
          </span>
          {hasDiscount ? (
            <>
              <span className="text-[16px] line-through" style={{ color: "var(--surna-text-secondary)" }} data-testid="original-price">
                €{originalPrice}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                data-testid="discount-badge"
              >
                {(product.pricing as ProductPricing | undefined)?.discountPercentage}% OFF
              </span>
            </>
          ) : null}
        </div>

        {(product.pricing as ProductPricing | undefined)?.flashSale ? (
          <p className="text-[13px] font-semibold" style={{ color: "var(--surna-gold)" }} data-testid="flash-sale-notice">
            Flash sale — limited time
          </p>
        ) : null}

        {effectiveStock !== undefined ? (
          <div className="text-[13px]" data-testid="stock-status">
            {effectiveStock > 0 ? (
              <span style={{ color: "#22c55e" }}>
                In stock · {effectiveStock} available
                {selectedVariant ? ` · ${selectedVariant.label}` : ""}
              </span>
            ) : (
              <span style={{ color: "#ef4444" }}>
                {hasVariants && !selectedVariant ? "Select a size" : "Out of stock"}
              </span>
            )}
          </div>
        ) : null}

        {hasVariants && variants.length > 0 ? (
          <div className="space-y-2" data-testid="size-selector">
            <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--surna-text-secondary)" }}>
              {variants[0]?.variantType === "shoe" ? "Shoe size (EU)" : "Size"}
            </p>
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
                    className={cn(
                      "min-w-[2.75rem] px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors",
                      disabled && "opacity-40 cursor-not-allowed",
                    )}
                    style={{
                      background: active ? "var(--surna-gold)" : "var(--surna-bg-highlight)",
                      border: `1px solid ${active ? "var(--surna-gold)" : "var(--surna-border)"}`,
                      color: active ? "#000" : "var(--surna-text)",
                    }}
                    data-testid={`size-option-${variant.label}`}
                  >
                    {variant.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium" style={{ color: "var(--surna-text-secondary)" }}>
            Quantity
          </span>
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--surna-border)" }}>
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center active:opacity-70"
              style={{ background: "var(--surna-bg-highlight)" }}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              data-testid="quantity-decrease"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-4 min-w-[3rem] text-center text-[15px] font-semibold" data-testid="quantity-display">
              {quantity}
            </span>
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center active:opacity-70"
              style={{ background: "var(--surna-bg-highlight)" }}
              onClick={() => setQuantity(quantity + 1)}
              disabled={effectiveStock !== undefined && quantity >= effectiveStock}
              data-testid="quantity-increase"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {canTeamBulkOrder ? (
          <button
            type="button"
            className={cn(entityBtnClass, "w-full")}
            style={entityBtnSurface}
            onClick={() => setTeamBulkOpen(true)}
            data-testid="team-bulk-order-button"
          >
            <Users className="h-4 w-4" />
            Order for my team
          </button>
        ) : null}

        <TeamBulkOrderSheet
          open={teamBulkOpen}
          onClose={() => setTeamBulkOpen(false)}
          productId={productId!}
          productTitle={product.name}
        />

        {product.shop ? (
          <div className="p-4 rounded-2xl" style={entityCardStyle}>
            <div className="flex items-center gap-3">
              {product.shop.logoUrl ? (
                <img
                  src={product.shop.logoUrl}
                  alt={product.shop.name}
                  className="w-11 h-11 rounded-full object-cover"
                  data-testid="shop-logo"
                />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--surna-bg-highlight)" }}>
                  <Package size={18} style={{ color: "var(--surna-text-secondary)" }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--surna-text-secondary)" }}>
                  Sold by
                </p>
                <Link href={marketplaceShopPath(product.shop.id)}>
                  <p className="text-[14px] font-semibold truncate" data-testid="shop-name-link">
                    {product.shop.name}
                  </p>
                </Link>
              </div>
              <Link href={marketplaceShopPath(product.shop.id)}>
                <span className="text-[13px] font-semibold shrink-0" style={{ color: "var(--surna-gold)" }} data-testid="view-shop-button">
                  Shop →
                </span>
              </Link>
            </div>
            {product.seller_id ? (
              <button
                type="button"
                className={cn(entityBtnClass, "w-full mt-3")}
                style={entityBtnSurface}
                onClick={() => setLocation(`/messages?userId=${encodeURIComponent(product.seller_id!)}`)}
                data-testid="message-seller-button"
              >
                <MessageCircle className="h-4 w-4" />
                Message seller
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2.5 pb-2">
          <div className="flex items-center gap-3 text-[13px]" style={{ color: "var(--surna-text-secondary)" }}>
            <Truck className="h-4 w-4 shrink-0" style={{ color: "var(--surna-gold)" }} />
            <span>Free shipping on orders over €50</span>
          </div>
          <div className="flex items-center gap-3 text-[13px]" style={{ color: "var(--surna-text-secondary)" }}>
            <Shield className="h-4 w-4 shrink-0" style={{ color: "var(--surna-gold)" }} />
            <span>30-day return policy</span>
          </div>
        </div>
      </div>

      <div className="px-4">
        <EntitySectionTabs
          tabs={detailTabs}
          activeId={detailTab}
          onChange={(id) => setDetailTab(id as typeof detailTab)}
          stickyTop="top-14"
          testIdPrefix="tab"
        />
      </div>

      <div className="px-4 pb-36 space-y-4">
        {detailTab === "description" ? (
          <div className="p-4 rounded-2xl" style={entityCardStyle}>
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--surna-text-secondary)" }} data-testid="product-description">
              {product.description || "No description available."}
            </p>
          </div>
        ) : null}

        {detailTab === "reviews" ? (
          <div className="space-y-4">
            {isAuthenticated ? (
              <div className="p-4 rounded-2xl space-y-4" style={entityCardStyle}>
                <p className="text-[14px] font-semibold">
                  {ownReview ? "Update your review" : "Write a review"}
                </p>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <p className="text-[12px] mb-2" style={{ color: "var(--surna-text-secondary)" }}>Rating</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setNewReview((prev) => ({ ...prev, rating }))}
                          data-testid={`rating-star-${rating}`}
                        >
                          <Star
                            className="h-6 w-6"
                            style={{
                              fill: rating <= newReview.rating ? "var(--surna-gold)" : "transparent",
                              color: rating <= newReview.rating ? "var(--surna-gold)" : "var(--surna-border)",
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    id="review-title"
                    value={newReview.title}
                    onChange={(e) => setNewReview((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Review title"
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                    style={inputStyle}
                    data-testid="review-title-input"
                  />
                  <textarea
                    id="review-text"
                    value={newReview.text}
                    onChange={(e) => setNewReview((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder="Share your experience"
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none resize-none"
                    style={inputStyle}
                    data-testid="review-text-input"
                  />
                  <button
                    type="submit"
                    disabled={createReviewMutation.isPending}
                    className={cn(entityBtnClass, "w-full")}
                    style={{ ...entityBtnSurface, background: "var(--surna-gold)", color: "#000" }}
                    data-testid="submit-review-button"
                  >
                    {createReviewMutation.isPending
                      ? "Saving…"
                      : ownReview
                        ? "Update review"
                        : "Submit review"}
                  </button>
                </form>
              </div>
            ) : null}

            {reviewsLoading ? (
              <EntityListSkeleton rows={3} rowHeight={88} />
            ) : reviewsData && reviewsData.length > 0 ? (
              <div className="space-y-3" data-testid="reviews-list">
                {reviewsData.map((reviewItem: { review: { id: string; rating: number; reviewTitle: string; reviewText: string; isVerifiedPurchase: boolean; createdAt: string }; user: { id: string; firstName: string; profileImageUrl?: string } }) => {
                  const review = reviewItem.review;
                  const user = reviewItem.user;
                  return (
                    <div key={review.id} className="p-4 rounded-2xl" style={entityCardStyle}>
                      <div className="flex items-start gap-3">
                        <img
                          src={user.profileImageUrl || "/api/placeholder/48/48"}
                          alt={user.firstName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[14px] font-semibold">{user.firstName}</span>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className="h-3 w-3"
                                  style={{
                                    fill: i < review.rating ? "var(--surna-gold)" : "transparent",
                                    color: i < review.rating ? "var(--surna-gold)" : "var(--surna-border)",
                                  }}
                                />
                              ))}
                            </div>
                            {review.isVerifiedPurchase ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-text-secondary)" }}>
                                Verified
                              </span>
                            ) : null}
                          </div>
                          <h4 className="text-[14px] font-medium mb-1">{review.reviewTitle}</h4>
                          <p className="text-[13px] leading-relaxed" style={{ color: "var(--surna-text-secondary)" }}>
                            {review.reviewText}
                          </p>
                          <p className="text-[11px] mt-2" style={{ color: "var(--surna-text-secondary)" }}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EntityEmptyState icon={Star} title="No reviews yet" description="Be the first to review this product." compact />
            )}
          </div>
        ) : null}

        {detailTab === "qa" ? (
          <div className="space-y-4">
            {isAuthenticated ? (
              <div className="p-4 rounded-2xl space-y-4" style={entityCardStyle}>
                <p className="text-[14px] font-semibold">Ask a question</p>
                <form onSubmit={handleSubmitQuestion} className="space-y-3">
                  <textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ask about sizing, materials, or delivery..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none resize-none"
                    style={inputStyle}
                    data-testid="question-input"
                  />
                  <button
                    type="submit"
                    disabled={createQuestionMutation.isPending || !newQuestion.trim()}
                    className={cn(entityBtnClass, "w-full")}
                    style={{ ...entityBtnSurface, background: "var(--surna-gold)", color: "#000" }}
                    data-testid="submit-question-button"
                  >
                    Submit question
                  </button>
                </form>
              </div>
            ) : null}

            {questionsLoading ? (
              <EntityListSkeleton rows={2} rowHeight={96} />
            ) : questions && questions.length > 0 ? (
              <div className="space-y-3" data-testid="questions-list">
                {questions.map((question: Question) => (
                  <div key={question.id} className="p-4 rounded-2xl" style={entityCardStyle}>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <MessageCircle className="h-4 w-4" style={{ color: "var(--surna-gold)" }} />
                          <span className="text-[13px] font-semibold">Question</span>
                          <span className="text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
                            · {question.user.firstName}
                          </span>
                        </div>
                        <p className="text-[14px]">{question.question}</p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--surna-text-secondary)" }}>
                          {new Date(question.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {question.answers && question.answers.length > 0 ? (
                        <div className="space-y-3 pl-4 border-l-2" style={{ borderColor: "var(--surna-border)" }}>
                          {question.answers.map((answer) => (
                            <div key={answer.id}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[13px] font-semibold">{answer.user.firstName}</span>
                                {answer.isFromSeller ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-gold)" }}>
                                    Seller
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[13px]" style={{ color: "var(--surna-text-secondary)" }}>
                                {answer.answer}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: "var(--surna-text-secondary)" }}>
                                <span>{new Date(answer.createdAt).toLocaleDateString()}</span>
                                <span>{answer.helpfulVotes} found helpful</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EntityEmptyState icon={MessageCircle} title="No questions yet" description="Be the first to ask about this product." compact />
            )}
          </div>
        ) : null}

        {detailTab === "specs" ? (
          <div className="p-4 rounded-2xl space-y-4" style={entityCardStyle}>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--surna-text-secondary)" }}>
                Basic info
              </p>
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt style={{ color: "var(--surna-text-secondary)" }}>Brand</dt>
                  <dd className="font-medium">{product.brand || "N/A"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: "var(--surna-text-secondary)" }}>Category</dt>
                  <dd className="font-medium capitalize">{(product.category ?? "").replace(/-/g, " ")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: "var(--surna-text-secondary)" }}>Product ID</dt>
                  <dd className="font-medium text-right break-all">{product.id}</dd>
                </div>
              </dl>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--surna-text-secondary)" }}>
                Availability
              </p>
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt style={{ color: "var(--surna-text-secondary)" }}>Stock</dt>
                  <dd className="font-medium">{product.currentStock || 0} available</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: "var(--surna-text-secondary)" }}>Shipping</dt>
                  <dd className="font-medium">Free on orders €50+</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : null}

        {product.relatedProducts && product.relatedProducts.length > 0 ? (
          <div className="pt-2">
            <h2 className="text-[16px] font-bold mb-3" data-testid="related-products-title">
              Frequently bought together
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {product.relatedProducts.map((relatedProduct) => (
                <Link key={relatedProduct.id} href={marketplaceProductPath(relatedProduct.id)} data-testid={`related-product-${relatedProduct.id}`}>
                  <div className="rounded-2xl overflow-hidden" style={entityCardStyle}>
                    <div className="aspect-square overflow-hidden">
                      <LazyImage
                        src={relatedProduct.imageUrl || "/api/placeholder/200/200"}
                        alt={relatedProduct.name}
                        sources={deriveModernSources(relatedProduct.imageUrl)}
                        placeholder={deriveLqipPlaceholder(relatedProduct.imageUrl)}
                        wrapperClassName="block w-full h-full"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="text-[13px] font-medium truncate">{relatedProduct.name}</h3>
                      <p className="text-[15px] font-bold mt-0.5" style={{ color: "var(--surna-gold)" }}>
                        €{relatedProduct.price}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div
          className="max-w-md mx-auto pointer-events-auto px-4 pt-3 pb-5 border-t backdrop-blur-md"
          style={{
            background: "color-mix(in srgb, var(--surna-base) 94%, transparent)",
            borderColor: "var(--surna-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-[11px]" style={{ color: "var(--surna-text-secondary)" }}>Total</p>
              <p className="text-[20px] font-extrabold" style={{ color: "var(--surna-gold)" }}>
                €{(currentPrice * quantity).toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              className={cn(entityBtnClass, "shrink-0 px-4")}
              style={entityBtnSurface}
              onClick={handleAddToCart}
              disabled={effectiveStock <= 0 || addToCartMutation.isPending}
              data-testid="add-to-cart-button"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(entityBtnClass, "flex-[2]")}
              style={{ background: "var(--surna-gold)", color: "#000" }}
              disabled={effectiveStock <= 0 || addToCartMutation.isPending}
              onClick={handleBuyNow}
              data-testid="buy-now-button"
            >
              Buy now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
