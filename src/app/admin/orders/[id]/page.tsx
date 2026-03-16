"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { OrderDetail } from "@/components/admin/OrderDetail";
import { DetailSkeleton } from "@/components/shared/Toast";

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<{ order: unknown; logs: unknown } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Order not found");
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="border-l-4 border-red-500 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">Could not load order</p>
          <p className="mt-0.5 text-sm text-red-600">{error ?? "Failed to load order"}</p>
        </div>
        <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">
          &larr; Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/orders"
          className="text-sm text-brand-600 hover:underline"
        >
          &larr; Back to Orders
        </Link>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <OrderDetail order={data.order as any} logs={data.logs as any} />
    </div>
  );
}
