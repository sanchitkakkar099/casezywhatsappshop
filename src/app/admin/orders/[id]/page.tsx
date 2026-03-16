"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { OrderDetail } from "@/components/admin/OrderDetail";

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
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading order...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error ?? "Failed to load order"}
        </div>
        <Link href="/admin/orders" className="text-green-600 hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/orders"
          className="text-sm text-green-600 hover:underline"
        >
          &larr; Back to Orders
        </Link>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <OrderDetail order={data.order as any} logs={data.logs as any} />
    </div>
  );
}
