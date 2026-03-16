"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { Pagination } from "@/components/shared/Pagination";

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const page = parseInt(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (syncResult) {
      const t = setTimeout(() => setSyncResult(null), 5000);
      return () => clearTimeout(t);
    }
  }, [syncResult]);

  const handleSync = async () => {
    if (!confirm("Sync all products from your Shopify store? This will create new products and update existing ones.")) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/admin/products/sync-shopify", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }

      setSyncResult({
        type: "success",
        message: `Synced ${data.shopifyProducts} Shopify products — ${data.created} created, ${data.updated} updated${data.skipped > 0 ? `, ${data.skipped} skipped` : ""}`,
      });
      fetchProducts();
    } catch (err) {
      setSyncResult({
        type: "error",
        message: err instanceof Error ? err.message : "Sync failed",
      });
    } finally {
      setSyncing(false);
    }
  };

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (!("page" in updates)) params.set("page", "1");
    router.push(`/admin/products?${params}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-black">Products</h1>
          <p className="mt-0.5 text-sm text-gray-400">{total} products</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary"
          >
            {syncing ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync from Shopify
              </span>
            )}
          </button>
          <Link href="/admin/products/new" className="btn-primary">
            + Add Product
          </Link>
        </div>
      </div>

      {/* Sync result toast */}
      {syncResult && (
        <div
          className={`animate-slide-in-right border-l-4 px-4 py-3 text-sm ${
            syncResult.type === "success"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-red-500 bg-red-50 text-red-700"
          }`}
        >
          {syncResult.message}
        </div>
      )}

      <div>
        <input
          type="text"
          placeholder="Search products..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({
                search: (e.target as HTMLInputElement).value,
              });
            }
          }}
          className="input-field max-w-xs"
        />
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-400 text-sm">
          Loading...
        </div>
      ) : (
        <>
          <ProductsTable products={products} onRefresh={fetchProducts} />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => updateParams({ page: String(p) })}
          />
        </>
      )}
    </div>
  );
}
