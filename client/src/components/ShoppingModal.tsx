import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { X, Shirt, Dumbbell, Footprints, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@shared/schema";
import { ROUTES } from "@/navigation/routes";
import { marketplaceProductPath } from "@/lib/marketplaceApi";

interface ShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShoppingModal({ isOpen, onClose }: ShoppingModalProps) {
  const [, setLocation] = useLocation();
  const { data: featuredProducts } = useQuery<Product[]>({
    queryKey: ["/api/products/featured"],
    enabled: isOpen,
  });

  const categories = [
    { name: "Apparel", icon: Shirt },
    { name: "Equipment", icon: Dumbbell },
    { name: "Footwear", icon: Footprints },
    { name: "Accessories", icon: Zap },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background bg-opacity-60 z-50" onClick={onClose}>
      <div 
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-transparent border border-border transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 ">
          <h2 className="font-medium text-sm text-token-text">Sports Marketplace</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                setLocation(ROUTES.marketplace);
              }}
            >
              Browse all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-background"
            >
              <X className="h-4 w-4 text-token-text" />
            </Button>
          </div>
        </div>
        
        {/* Shopping Categories */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.name}
                  type="button"
                  className="p-4 bg-transparent border border-border rounded-lg text-center hover:bg-background cursor-pointer transition-colors"
                  onClick={() => {
                    onClose();
                    setLocation(ROUTES.marketplace);
                  }}
                >
                  <IconComponent className="h-6 w-6 text-token-text mb-2 mx-auto" />
                  <p className="text-xs font-medium text-token-text">{category.name}</p>
                </button>
              );
            })}
          </div>

          {/* Featured Products */}
          <h3 className="font-medium text-xs text-token-text mb-3">Featured Products</h3>
          <div className="space-y-3">
            {featuredProducts && featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    setLocation(marketplaceProductPath(String(product.id)));
                  }}
                  className="flex items-center space-x-3 p-3 bg-transparent border border-border rounded-lg w-full text-left hover:bg-background transition-colors"
                >
                  <div className="w-12 h-12 bg-background rounded object-cover flex items-center justify-center">
                    <Shirt className="h-6 w-6 text-token-text-muted" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-token-text">{product.name}</p>
                    <p className="text-xs text-token-text-muted">€{product.price}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="h-3 w-3 fill-token-text text-token-text" />
                      <span className="text-xs text-token-text">
                        4.8 (124)
                      </span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-token-text text-sm">No featured products available</p>
                <p className="text-token-text text-xs mt-1">Check back later for new items!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
