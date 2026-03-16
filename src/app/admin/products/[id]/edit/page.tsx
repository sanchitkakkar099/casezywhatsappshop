"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((data) => setProduct(data.product))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
        Loading product...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
        Product not found. It may have been removed.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black">Edit Product</h1>
        <p className="mt-0.5 text-sm text-gray-400">{product.name as string}</p>
      </div>
      <ProductForm
        mode="edit"
        initialData={{
          id: product.id as string,
          name: (product.name as string) ?? "",
          slug: (product.slug as string) ?? "",
          description: (product.description as string) ?? "",
          imageUrl: (product.imageUrl as string) ?? "",
          price: Number(product.price) || 0,
          currency: (product.currency as string) ?? "INR",
          active: (product.active as boolean) ?? true,
          sku: (product.sku as string) ?? "",
          shopifyProductId: (product.shopifyProductId as string) ?? "",
          shopifyVariantId: (product.shopifyVariantId as string) ?? "",
        }}
      />
    </div>
  );
}
