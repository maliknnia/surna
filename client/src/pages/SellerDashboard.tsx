import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchSellerOrders,
  fetchSellerProducts,
  fetchSellerShopDashboard,
  marketplaceProductPath,
} from "@/lib/marketplaceApi";
import { ROUTES } from "@/navigation";

export default function SellerDashboard() {
  const queryClient = useQueryClient();

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["seller-products"],
    queryFn: () => fetchSellerProducts(100),
  });

  const { data: shopDash } = useQuery({
    queryKey: ["/api/marketplace/seller/shop"],
    queryFn: fetchSellerShopDashboard,
    retry: false,
  });

  const { data: ordersData } = useQuery({
    queryKey: ["seller-orders"],
    queryFn: fetchSellerOrders,
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/marketplace/seller/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/seller/shop"] });
    },
  });

  const myListings = productsData?.items ?? [];
  const activeListings =
    shopDash?.stats?.activeProducts ?? myListings.filter((p) => p.stock > 0).length;
  const orders = ordersData?.orders ?? [];
  const pendingFromOrders = orders.filter((o) => String(o.status) === "pending").length;
  const completedFromOrders = orders.filter((o) => String(o.status) === "delivered").length;
  const pendingOrders = shopDash?.stats?.pendingOrders ?? pendingFromOrders;
  const completedSales = shopDash?.stats?.completedOrders ?? completedFromOrders;
  const totalEarnings = orders
    .filter((o) => String(o.status) === "delivered")
    .reduce((sum, o) => sum + Number(o.total_amount ?? o.total ?? 0), 0);

  return (
    <main className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <div className="flex gap-2">
          <Link href={ROUTES.createMarketplaceListing}>
            <Button>Add listing</Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline">Marketplace</Button>
          </Link>
          <Link href="/messages">
            <Button variant="outline">Buyer messages</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Active Listings" value={activeListings} />
        <StatCard title="Pending Orders" value={pendingOrders} />
        <StatCard title="Completed Sales" value={completedSales} />
        <StatCard title="Total Earnings" value={`€${totalEarnings.toFixed(2)}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orders.slice(0, 10).map((order) => (
            <div key={String(order.id)} className="rounded-md border border-border p-2">
              <div className="flex items-center justify-between text-sm">
                <span>Order {String(order.id).slice(0, 8)}</span>
                <Badge variant="outline">{String(order.status)}</Badge>
              </div>
              <div className="text-xs text-token-text-secondary mt-1">
                pending → confirmed → dispatched → delivered
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {["confirmed", "dispatched", "delivered"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateOrderStatus.mutate({ id: String(order.id), status: s })}
                    className="px-2 py-1 text-xs rounded border border-border"
                  >
                    Mark {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <p className="text-sm text-token-text-secondary">No seller orders yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Your Listings</CardTitle>
          <Link href={ROUTES.createMarketplaceListing}>
            <Button size="sm">Add listing</Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {productsLoading ? (
            <p className="text-sm text-token-text-secondary">Loading listings…</p>
          ) : myListings.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-token-text-secondary">No listings yet.</p>
              <Link href={ROUTES.createMarketplaceListing}>
                <Button size="sm">Create your first listing</Button>
              </Link>
            </div>
          ) : (
            myListings.slice(0, 12).map((item) => (
              <Link key={item.id} href={marketplaceProductPath(item.id)}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 rounded-md border border-border p-2 text-sm text-left hover:bg-muted/50 transition-colors"
                >
                  {item.imageUrl || item.thumbUrl ? (
                    <img
                      src={item.thumbUrl ?? item.imageUrl}
                      alt=""
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted shrink-0" />
                  )}
                  <span className="truncate font-medium flex-1">{item.title}</span>
                  <span className="shrink-0 ml-2">€{Number(item.price || 0).toFixed(2)}</span>
                </button>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-token-text-secondary">{title}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
