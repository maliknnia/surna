import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { normalizeCartPayload } from "@/lib/marketplaceApi";
import SurnaLogo from "@/components/SurnaLogo";
import { useAuth } from "@/hooks/useAuth";

interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    imageUrl?: string;
  };
}

interface CartData {
  cartId: string;
  items: CartItem[];
}

export default function Cart() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Fetch cart items
  const { data: cartData, isLoading } = useQuery<CartData>({
    queryKey: ["/api/marketplace/cart"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/marketplace/cart", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load cart");
      const raw = await res.json();
      return normalizeCartPayload(raw) as CartData;
    },
  });

  // Update cart item quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) =>
      apiRequest("POST", "/api/marketplace/cart/items", { productId, qty }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/cart'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cart",
        variant: "destructive"
      });
    }
  });

  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest("POST", "/api/marketplace/cart/items", { productId, qty: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/cart'] });
      toast({
        title: "Removed from cart",
        description: "Item removed successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive"
      });
    }
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              Please log in to view your shopping cart
            </p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = cartData?.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax
  const shipping = subtotal > 50 ? 0 : 9.99;
  const total = subtotal + tax + shipping;

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
          <h1 className="text-lg font-bold">Shopping Cart</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-24 h-24" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Add some products to get started!
            </p>
            <Link href="/marketplace">
              <Button>Browse Marketplace</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold mb-4">
                Cart Items ({items.length})
              </h2>

              {items.map((item) => (
                <Card key={item.id} data-testid={`cart-item-${item.product_id}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link href={`/marketplace/product/${item.product_id}`}>
                        <img
                          src={item.product.imageUrl || "/api/placeholder/96/96"}
                          alt={item.product.name}
                          className="w-24 h-24 object-cover rounded border border-border"
                        />
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1">
                        <Link href={`/marketplace/product/${item.product_id}`}>
                          <h3 className="font-medium mb-1 hover:text-token-text transition-colors">
                            {item.product.name}
                          </h3>
                        </Link>
                        <p className="text-lg font-bold text-token-text mb-3">
                          €{item.product.price.toFixed(2)}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateQuantityMutation.mutate({
                                  productId: item.product_id,
                                  qty: item.quantity - 1
                                })
                              }
                              disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                              data-testid={`decrease-qty-${item.product_id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-12 text-center" data-testid={`quantity-${item.product_id}`}>
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateQuantityMutation.mutate({
                                  productId: item.product_id,
                                  qty: item.quantity + 1
                                })
                              }
                              disabled={
                                item.quantity >= item.product.stock ||
                                updateQuantityMutation.isPending
                              }
                              data-testid={`increase-qty-${item.product_id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCartMutation.mutate(item.product_id)}
                            disabled={removeFromCartMutation.isPending}
                            data-testid={`remove-${item.product_id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>

                        {item.product.stock < 5 && (
                          <p className="text-xs text-orange-500 mt-2">
                            Only {item.product.stock} left in stock
                          </p>
                        )}
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Item Total</p>
                        <p className="text-lg font-bold" data-testid={`item-total-${item.product_id}`}>
                          €{(item.product.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span data-testid="subtotal">€{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (8%)</span>
                      <span data-testid="tax">€{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span data-testid="shipping">
                        {shipping === 0 ? "FREE" : `€${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    {subtotal < 50 && shipping > 0 && (
                      <p className="text-xs text-token-text">
                        Add €{(50 - subtotal).toFixed(2)} more for free shipping!
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-token-text" data-testid="total">
                      €{total.toFixed(2)}
                    </span>
                  </div>

                  <Link href="/marketplace/checkout">
                    <Button className="w-full" size="lg" data-testid="checkout-button">
                      Proceed to Checkout
                    </Button>
                  </Link>

                  <Link href="/marketplace">
                    <Button variant="outline" className="w-full" data-testid="continue-shopping">
                      Continue Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
