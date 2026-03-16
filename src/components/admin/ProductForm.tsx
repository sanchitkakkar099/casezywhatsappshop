"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyError } from "@/lib/friendly-errors";
import { Toast, Spinner } from "@/components/shared/Toast";

interface ProductFormProps {
  initialData?: {
    id?: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    price: number;
    currency: string;
    active: boolean;
    sku: string;
    shopifyProductId: string;
    shopifyVariantId: string;
  };
  mode: "create" | "edit";
}

const defaultData = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  price: 0,
  currency: "INR",
  active: true,
  sku: "",
  shopifyProductId: "",
  shopifyVariantId: "",
};

export function ProductForm({ initialData, mode }: ProductFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialData ?? defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const generateSlug = () => {
    const slug = form.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setForm((prev) => ({ ...prev, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url =
        mode === "create"
          ? "/api/admin/products"
          : `/api/admin/products/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(friendlyError(data.error));
        return;
      }

      setToast({
        type: "success",
        message: mode === "create"
          ? `Product "${form.name}" created successfully!`
          : `Product "${form.name}" updated successfully!`,
      });

      setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="border-l-4 border-red-500 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-800">Could not save product</p>
            <p className="mt-0.5 text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Product Name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={() => !form.slug && generateSlug()}
              required
              className="input-field mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Slug
            </label>
            <div className="mt-1 flex">
              <input
                type="text"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                required
                className="input-field flex-1"
              />
              <button
                type="button"
                onClick={generateSlug}
                className="border-2 border-l-0 border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Generate
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="input-field mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Price
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
              className="input-field mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              SKU
            </label>
            <input
              type="text"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="input-field mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Image URL
            </label>
            <input
              type="url"
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              className="input-field mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Shopify Product ID
            </label>
            <input
              type="text"
              name="shopifyProductId"
              value={form.shopifyProductId}
              onChange={handleChange}
              placeholder="Auto-filled by Shopify sync"
              className="input-field mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Shopify Variant ID
            </label>
            <input
              type="text"
              name="shopifyVariantId"
              value={form.shopifyVariantId}
              onChange={handleChange}
              placeholder="Auto-filled by Shopify sync"
              className="input-field mt-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
              className="h-4 w-4 border-gray-300 text-brand-500 focus:ring-brand-400"
            />
            <label className="text-sm font-medium text-gray-700">Active</label>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Saving...
              </span>
            ) : mode === "create" ? (
              "Create Product"
            ) : (
              "Update Product"
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
