"use client";

import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black">Create Product</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          Add a new product to your WhatsApp catalog
        </p>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
