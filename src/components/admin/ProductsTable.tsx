"use client";

import Link from "next/link";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  currency: string;
  active: boolean;
  sku: string | null;
  imageUrl: string | null;
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
  createdAt: string;
}

export function ProductsTable({
  products,
  onRefresh,
}: {
  products: Product[];
  onRefresh?: () => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Deactivate "${name}"? This will hide it from new checkouts.`
      )
    )
      return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onRefresh ? onRefresh() : window.location.reload();
      }
    } finally {
      setDeleting(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-gray-400">
        No products found. Click &quot;Sync from Shopify&quot; to import your catalog.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-[700px] w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Product
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Price
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              SKU
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Shopify
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Status
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, i) => (
            <tr
              key={product.id}
              className={`hover-lift transition-colors hover:bg-brand-50 ${
                i < products.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  {product.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-10 w-10 object-cover bg-gray-100"
                    />
                  )}
                  <div>
                    <div className="text-sm font-medium text-black">
                      {product.name}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {product.slug}
                    </div>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-black">
                {product.currency === "INR" ? "\u20B9" : product.currency}{" "}
                {product.price}
              </td>
              <td className="px-5 py-3.5 text-sm text-gray-400">
                {product.sku ?? "\u2014"}
              </td>
              <td className="px-5 py-3.5 text-sm">
                {product.shopifyVariantId ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    Synced
                  </span>
                ) : (
                  <span className="text-amber-500">Not mapped</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                <span
                  className={`inline-flex px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    product.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {product.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-sm">
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="font-medium text-black hover:text-brand-700"
                >
                  Edit
                </Link>
                {product.active && (
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    disabled={deleting === product.id}
                    className="ml-4 font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {deleting === product.id ? "..." : "Deactivate"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
