import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Star, 
  Heart,
  Store,
  TrendingUp,
  Package,
  ArrowLeft,
  MoreVertical,
  Users,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SurnaLogo from "@/components/SurnaLogo";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveModernSources, deriveLqipPlaceholder } from "@/lib/imageSources";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMarketplaceProducts,
  fetchMarketplaceShops,
  marketplaceProductPath,
  marketplaceShopPath,
  type MarketplaceListProduct,
} from "@/lib/marketplaceApi";
import { GlowCard } from "@/components/ui/GlowCard";
import { HomePortraitCard } from "@/features/home/components/HomeCardSurface";

type Product = MarketplaceListProduct;

import type { MarketplaceShopListItem } from "@/lib/marketplaceApi";

type Shop = MarketplaceShopListItem;

const categories = [
  { id: "all", name: "All Categories", icon: "🏪" },
  { id: "gaa-gear", name: "GAA Gear", icon: "🏑" },
  { id: "football-boots", name: "Football Boots", icon: "👟" },
  { id: "rugby-equipment", name: "Rugby Equipment", icon: "🏉" },
  { id: "cricket-kit", name: "Cricket Kit", icon: "🏏" },
  { id: "cycling-gear", name: "Cycling Gear", icon: "🚴" },
  { id: "running-shoes", name: "Running Shoes", icon: "🏃" },
  { id: "gym-equipment", name: "Gym Equipment", icon: "🏋️" },
  { id: "general-sports", name: "General Sports", icon: "🎽" },
];

export default function Marketplace() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"products" | "shops">("products");
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Additional filters
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(1000);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxDistance, setMaxDistance] = useState<number>(50); // km
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [conditionFilter, setConditionFilter] = useState<"all" | "new" | "used">("all");

  // Fetch products
  const { data: productsData, isLoading: productsLoading, isError: productsError } = useQuery({
    queryKey: ["marketplace-products", searchQuery],
    queryFn: () => fetchMarketplaceProducts({ q: searchQuery, limit: 40 }),
    enabled: viewMode === "products",
  });

  const { data: shopsData, isLoading: shopsLoading, isError: shopsError } = useQuery({
    queryKey: ["marketplace-shops", searchQuery],
    queryFn: () => fetchMarketplaceShops({ q: searchQuery, limit: 20 }),
    enabled: viewMode === "shops",
  });

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: (productId: string) => 
      apiRequest("POST", "/api/marketplace/wishlist", { productId }),
    onSuccess: () => {
      toast({
        title: "Added to Wishlist",
        description: "Product added to your wishlist successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to wishlist. Please log in.",
        variant: "destructive"
      });
    }
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: (productId: string) => 
      apiRequest("POST", "/api/marketplace/cart/items", { productId, qty: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/cart'] });
      toast({
        title: "Added to Cart",
        description: "Product added to your cart successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to cart. Please log in.",
        variant: "destructive"
      });
    }
  });

  // Hide/show header on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHeaderVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Filter and sort products
  const filteredProducts = productsData?.items
    ? productsData.items
        .filter(product => {
          // Category filter - use actual category field from backend
          if (selectedCategory !== "all") {
            // Check if product has category field and it matches
            const selectedCategoryName = categories.find((c) => c.id === selectedCategory)?.name.toLowerCase() || selectedCategory.toLowerCase();
            if (product.category && product.category.toLowerCase() === selectedCategoryName) {
              // Exact match on category field
            } else if (
              // Fallback: check if category keyword is in title/description
              product.title.toLowerCase().includes(selectedCategoryName) ||
              product.description?.toLowerCase().includes(selectedCategoryName)
            ) {
              // Keyword match
            } else {
              return false; // No match
            }
          }
          
          // Price range filter
          if (product.price < priceMin || product.price > priceMax) {
            return false;
          }
          
          // Rating filter - now functional with avgRating from backend
          if (minRating > 0 && (product.avgRating || 0) < minRating) {
            return false;
          }
          if (conditionFilter !== "all") {
            const productCondition = ((product as any).condition || "").toLowerCase();
            if (productCondition && productCondition !== conditionFilter) return false;
          }
          
          // Location filter - TODO: needs shop location coordinates from backend
          // This would require calculating distance between user location and shop
          // For now, this filter is not active (always passes when maxDistance = 50)
          // if (maxDistance < 50 && product.shop?.distance && product.shop.distance > maxDistance) {
          //   return false;
          // }
          
          return true;
        })
        .sort((a, b) => {
          switch (sortBy) {
            case "price-low":
              return a.price - b.price;
            case "price-high":
              return b.price - a.price;
            case "rating":
              return (b.avgRating || 0) - (a.avgRating || 0);
            case "newest":
            default:
              return 0; // Keep original order from backend
          }
        })
    : [];
  
  const activeFiltersCount = 
    (selectedCategory !== "all" ? 1 : 0) +
    (priceMin > 0 || priceMax < 1000 ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (maxDistance < 50 ? 1 : 0) +
    (conditionFilter !== "all" ? 1 : 0);

  const isDark = document.documentElement.classList.contains("dark");
  const pageBg = isDark ? "#000000" : "#ffffff";
  const headerBgColor = isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)";
  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textSecondary = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const borderCol = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const chipActiveBg = isDark ? "#ffffff" : "#111111";
  const chipActiveText = isDark ? "#000000" : "#ffffff";
  const chipBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const chipText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";

  return (
    <div className="min-h-screen pb-24" style={{ background: pageBg, color: textPrimary }}>
      <div className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: headerBgColor, borderBottom: `1px solid ${borderCol}` }}>
        <div className="px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? window.history.back() : setLocation("/"))}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform"
              style={{ background: inputBg }}
            >
              <ArrowLeft size={18} style={{ color: textPrimary }} />
            </button>
            <h1 className="text-[18px] font-bold flex-1" style={{ color: textPrimary }}>Marketplace</h1>
            <div className="flex items-center gap-2">
              <Link href="/marketplace/cart">
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: inputBg }}
                >
                  <ShoppingCart size={16} style={{ color: textPrimary }} />
                </button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: inputBg }}
                  >
                    <MoreVertical size={16} style={{ color: textPrimary }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <Link href="/marketplace/cart">
                    <DropdownMenuItem>
                      <Package className="w-4 h-4 mr-2" />
                      My Cart
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/wishlist">
                    <DropdownMenuItem>
                      <Store className="w-4 h-4 mr-2" />
                      Wishlist
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <Link href="/analytics/marketplace">
                    <DropdownMenuItem>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Sales Analytics
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textSecondary }} />
            <input
              type="text"
              placeholder="Search products, shops, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-lg border-none text-[13px] focus:outline-none"
              style={{ background: inputBg, color: textPrimary }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <span style={{ color: textSecondary, fontSize: 14 }}>✕</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all active:scale-95"
              style={{
                background: selectedCategory === cat.id ? chipActiveBg : chipBg,
                color: selectedCategory === cat.id ? chipActiveText : chipText,
              }}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => setViewMode("products")}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
            style={{
              background: viewMode === "products" ? chipActiveBg : chipBg,
              color: viewMode === "products" ? chipActiveText : chipText,
            }}
          >
            Products
          </button>
          <button
            onClick={() => setViewMode("shops")}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
            style={{
              background: viewMode === "shops" ? chipActiveBg : chipBg,
              color: viewMode === "shops" ? chipActiveText : chipText,
            }}
          >
            Shops
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowFiltersModal(true)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1"
            style={{ background: chipBg, color: chipText }}
          >
            <Filter size={11} />
            Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </button>
          {["newest", "price-low", "price-high", "rating"].map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all"
              style={{
                background: sortBy === s ? chipActiveBg : "transparent",
                color: sortBy === s ? chipActiveText : chipText,
              }}
            >
              {s === "newest" ? "New" : s === "price-low" ? "Low €" : s === "price-high" ? "High €" : "Top"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {viewMode === "products" && (
          <>
            {productsLoading ? (
              <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[142px] h-[190px] rounded-xl animate-pulse shrink-0"
                    style={{ background: chipBg }}
                  />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 pt-1">
                {filteredProducts.map((product) => (
                  <GlowCard
                    key={product.id}
                    glowColor="purple"
                    intensity="subtle"
                    bare
                    customSize
                    className="p-[3px]"
                  >
                    <HomePortraitCard
                      imageUrl={product.thumbUrl || product.imageUrl}
                      title={product.title}
                      meta={[
                        `€${product.price.toFixed(2)}`,
                        product.avgRating && product.avgRating > 0
                          ? `★ ${product.avgRating.toFixed(1)}`
                          : null,
                        product.shop?.name,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      cardKind="marketplace"
                      cta="Shop"
                      onClick={() => setLocation(marketplaceProductPath(product.id))}
                    />
                  </GlowCard>
                ))}
              </div>
            ) : productsError ? (
              <div className="text-center py-20">
                <Package size={36} className="mx-auto mb-3" style={{ color: textSecondary }} />
                <h3 className="text-[15px] font-semibold mb-1" style={{ color: textPrimary }}>Couldn&apos;t load products</h3>
                <p className="text-[13px] mb-4" style={{ color: textSecondary }}>Check your connection and try again.</p>
              </div>
            ) : (
              <div className="text-center py-20">
                <Package size={36} className="mx-auto mb-3" style={{ color: textSecondary }} />
                <h3 className="text-[15px] font-semibold mb-1" style={{ color: textPrimary }}>No products found</h3>
                <p className="text-[13px] mb-4" style={{ color: textSecondary }}>Try adjusting your search or filters</p>
                <button
                  className="px-5 py-2 rounded-full text-[13px] font-bold active:scale-95"
                  style={{ background: chipActiveBg, color: chipActiveText }}
                  onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </>
        )}

        {viewMode === "shops" && (
          <>
            {shopsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse" style={{ background: chipBg }}>
                    <div className="w-14 h-14 rounded-xl" style={{ background: inputBg }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 rounded w-2/3" style={{ background: inputBg }} />
                      <div className="h-3 rounded w-1/2" style={{ background: inputBg }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : shopsData?.shops && shopsData.shops.length > 0 ? (
              <div className="space-y-2">
                {shopsData.shops.map((shop) => (
                  <Link key={shop.id} href={marketplaceShopPath(shop.id)}>
                    <div
                      className="flex items-center gap-3 p-3 rounded-2xl transition-colors"
                      style={{ background: chipBg }}
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: inputBg }}>
                        {shop.shop_logo_url ? (
                          <LazyImage
                            src={shop.shop_logo_url}
                            alt={shop.shop_name}
                            sources={deriveModernSources(shop.shop_logo_url)}
                            placeholder={deriveLqipPlaceholder(shop.shop_logo_url)}
                            wrapperClassName="block w-full h-full"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Store size={20} style={{ color: textSecondary }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-semibold truncate" style={{ color: textPrimary }}>{shop.shop_name}</h3>
                        <p className="text-[12px] line-clamp-1" style={{ color: textSecondary }}>{shop.shop_description || "No description"}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Users size={10} style={{ color: textSecondary }} />
                          <span className="text-[11px]" style={{ color: textSecondary }}>{shop.follower_count || 0} followers</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : shopsError ? (
              <div className="text-center py-20">
                <Store size={36} className="mx-auto mb-3" style={{ color: textSecondary }} />
                <h3 className="text-[15px] font-semibold mb-1" style={{ color: textPrimary }}>Couldn&apos;t load shops</h3>
                <p className="text-[13px]" style={{ color: textSecondary }}>Check your connection and try again.</p>
              </div>
            ) : (
              <div className="text-center py-20">
                <Store size={36} className="mx-auto mb-3" style={{ color: textSecondary }} />
                <h3 className="text-[15px] font-semibold mb-1" style={{ color: textPrimary }}>No shops found</h3>
                <p className="text-[13px]" style={{ color: textSecondary }}>Try adjusting your search</p>
              </div>
            )}
          </>
        )}
      </div>

      {showFiltersModal && (
        <div
          className="fixed inset-0 z-[80] flex items-end"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowFiltersModal(false)}
        >
          <div
            className="w-full rounded-t-3xl p-4 max-h-[78vh] overflow-y-auto"
            style={{ background: pageBg, borderTop: `1px solid ${borderCol}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: chipBg }} />
            <h3 className="text-[16px] font-bold mb-4" style={{ color: textPrimary }}>Filters</h3>

            <div className="space-y-5">
              <div>
                <Label className="text-[12px] font-semibold" style={{ color: textSecondary }}>Sport Category</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((cat) => (
                    <button
                      key={`modal-${cat.id}`}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{
                        background: selectedCategory === cat.id ? chipActiveBg : chipBg,
                        color: selectedCategory === cat.id ? chipActiveText : chipText,
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-[12px] font-semibold" style={{ color: textSecondary }}>
                  Price Range (€{priceMin} - €{priceMax})
                </Label>
                <div className="mt-2 px-1">
                  <Slider
                    value={[priceMin, priceMax]}
                    min={0}
                    max={1000}
                    step={10}
                    onValueChange={([min, max]) => {
                      setPriceMin(min);
                      setPriceMax(max);
                    }}
                  />
                </div>
              </div>

              <div>
                <Label className="text-[12px] font-semibold" style={{ color: textSecondary }}>Condition</Label>
                <div className="flex gap-2 mt-2">
                  {(["all", "new", "used"] as const).map((cond) => (
                    <button
                      key={cond}
                      onClick={() => setConditionFilter(cond)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold capitalize"
                      style={{
                        background: conditionFilter === cond ? chipActiveBg : chipBg,
                        color: conditionFilter === cond ? chipActiveText : chipText,
                      }}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-[12px] font-semibold" style={{ color: textSecondary }}>
                  Max Distance ({maxDistance} km)
                </Label>
                <div className="mt-2 px-1">
                  <Slider value={[maxDistance]} min={1} max={50} step={1} onValueChange={([v]) => setMaxDistance(v)} />
                </div>
              </div>

              <div>
                <Label className="text-[12px] font-semibold" style={{ color: textSecondary }}>
                  Seller Rating ({minRating.toFixed(1)}+)
                </Label>
                <div className="mt-2 px-1">
                  <Slider value={[minRating]} min={0} max={5} step={0.5} onValueChange={([v]) => setMinRating(v)} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                className="flex-1 py-2.5 rounded-full text-[13px] font-semibold"
                style={{ background: chipBg, color: chipText }}
                onClick={() => {
                  setSelectedCategory("all");
                  setPriceMin(0);
                  setPriceMax(1000);
                  setConditionFilter("all");
                  setMaxDistance(50);
                  setMinRating(0);
                }}
              >
                Reset
              </button>
              <button
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold"
                style={{ background: chipActiveBg, color: chipActiveText }}
                onClick={() => setShowFiltersModal(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
