import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreateMediaSection,
  type CreateMediaValue,
} from "@/components/create/CreateMediaSection";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  createMarketplaceProduct,
  createMarketplaceShop,
  fetchMyMarketplaceShop,
  marketplaceProductPath,
} from "@/lib/marketplaceApi";
import { ROUTES } from "@/navigation";

export default function CreateMarketplaceListing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: existingShop, isLoading: shopLoading } = useQuery({
    queryKey: ["my-marketplace-shop"],
    queryFn: fetchMyMarketplaceShop,
  });

  const [coverMedia, setCoverMedia] = useState<CreateMediaValue>(null);
  const [shopName, setShopName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!existingShop && !shopName.trim()) {
        throw new Error("Add a shop name before your first listing.");
      }
      if (!existingShop) {
        await createMarketplaceShop({
          businessName: shopName.trim(),
          email: user?.email ?? undefined,
        });
      }
      const priceCents = Math.round(parseFloat(price) * 100);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        throw new Error("Enter a valid price.");
      }
      const stockNum = parseInt(stock, 10);
      if (!Number.isFinite(stockNum) || stockNum < 0) {
        throw new Error("Enter a valid stock count.");
      }
      return createMarketplaceProduct({
        title: title.trim(),
        description: description.trim() || undefined,
        priceCents,
        stock: stockNum,
        imageUrl: coverMedia?.publicUrl ?? null,
      });
    },
    onSuccess: (product) => {
      toast({ title: "Listing published", description: "Your product is live on the marketplace." });
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      void queryClient.invalidateQueries({ queryKey: ["my-marketplace-shop"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/marketplace/seller/shop"] });
      const id = String(product.id ?? "");
      setLocation(id ? marketplaceProductPath(id) : ROUTES.marketplace);
    },
    onError: (err: Error) => {
      toast({
        title: "Could not publish listing",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    title.trim().length > 0 &&
    price.trim().length > 0 &&
    stock.trim().length > 0 &&
    (existingShop || shopName.trim().length > 0);

  return (
    <main className="min-h-screen bg-background p-4 pb-16 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/seller/dashboard">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">New listing</h1>
          <p className="text-sm text-muted-foreground">Sell gear on the SURNA marketplace</p>
        </div>
      </div>

      <CreateMediaSection
        cover={coverMedia}
        onCoverChange={setCoverMedia}
        coverLabel="Product photo"
        coverHint="Shows on marketplace cards and your product page."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Product details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!shopLoading && !existingShop ? (
            <div className="space-y-1.5">
              <Label htmlFor="shop-name">Shop name</Label>
              <Input
                id="shop-name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Aisha's Swim Shop"
              />
              <p className="text-xs text-muted-foreground">Required for your first listing.</p>
            </div>
          ) : existingShop ? (
            <p className="text-sm text-muted-foreground">
              Selling as{" "}
              <span className="font-medium text-foreground">
                {String(existingShop.business_name ?? existingShop.shop_name ?? "Your shop")}
              </span>
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pro swim goggles — mirrored"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Condition, sizing, what's included…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="29.99"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!canSubmit || mutation.isPending || shopLoading}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Publishing…" : "Publish listing"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
