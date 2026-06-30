import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Package, Plus, ShoppingBag, Store, AlertTriangle, ArrowUpRight } from "lucide-react";
import { PageShell, Card, Button, Tag, StatCard, EmptyState, ContextBar } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMarketplaceProducts,
  marketplaceProductPath,
  marketplaceShopPath,
} from "@/lib/marketplaceApi";

export default function ProShopInventoryModule() {
  const { entityName, activeShop, shopStats, withQuery } = useProWorkspaceContext();
  const { user } = useAuth();
  const userId = (user as { id?: string } | null)?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["seller-products", userId],
    queryFn: () => fetchMarketplaceProducts({ limit: 100 }),
    enabled: !!userId,
  });

  const products = useMemo(
    () => (data?.items ?? []).filter((p) => p.seller_id === userId),
    [data?.items, userId],
  );

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 3);
  const outOfStock = products.filter((p) => p.stock <= 0);

  return (
    <PageShell
      title="Products"
      subtitle={`${entityName} · marketplace listings & stock`}
      actions={
        <>
          <Button variant="secondary" href="/seller/dashboard" leadingIcon={<ShoppingBag size={14} />}>
            Orders
          </Button>
          {activeShop ? (
            <Button variant="secondary" href={marketplaceShopPath(activeShop.id)} leadingIcon={<Store size={14} />}>
              Storefront
            </Button>
          ) : null}
          <Button variant="primary" href="/marketplace" leadingIcon={<Plus size={14} />}>
            Add listing
          </Button>
        </>
      }
    >
      <ContextBar
        context={<>Manage product stock, pricing, and visibility from your seller dashboard — surfaced here in Shop Pro.</>}
        actions={[
          { key: "orders", label: "Fulfill orders", icon: <ShoppingBag size={12} />, href: "/seller/dashboard" },
          { key: "home", label: "Shop home", icon: <Store size={12} />, href: withQuery("/pro/shop") },
        ]}
      />

      {isLoading ? (
        <Card><div className="animate-pulse" style={{ height: 120, borderRadius: 8, background: "var(--pro-surface-2)" }} /></Card>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package size={18} />}
          title="No products yet"
          description="List gear, merch, or equipment on the marketplace to start selling."
          action={<Button variant="primary" href="/seller/dashboard">Open seller dashboard</Button>}
        />
      ) : (
        <>
          <div className="pro-grid pro-grid-4" style={{ gap: 12, marginBottom: 16 }}>
            <StatCard label="Active listings" value={shopStats?.activeProducts ?? products.filter((p) => p.stock > 0).length} icon={<Package size={12} />} />
            <StatCard label="Total SKUs" value={shopStats?.totalProducts ?? products.length} icon={<Store size={12} />} />
            <StatCard label="Low stock" value={lowStock.length} icon={<AlertTriangle size={12} />} />
            <StatCard label="Out of stock" value={outOfStock.length} icon={<Package size={12} />} />
          </div>

          <Card padded={false}>
            <div style={{ overflowX: "auto" }}>
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.title ?? p.name}</div>
                        <div className="pro-text-muted" style={{ fontSize: 11 }}>{p.category ?? "Marketplace"}</div>
                      </td>
                      <td>€{Number(p.price ?? 0).toFixed(2)}</td>
                      <td>
                        {p.stock <= 0 ? (
                          <Tag tone="danger">Out</Tag>
                        ) : p.stock <= 3 ? (
                          <Tag tone="active">{p.stock} left</Tag>
                        ) : (
                          <span style={{ fontWeight: 700 }}>{p.stock}</span>
                        )}
                      </td>
                      <td>
                        <Link href={marketplaceProductPath(p.id)}>
                          <Button variant="ghost" size="sm" leadingIcon={<ArrowUpRight size={12} />}>View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </PageShell>
  );
}
