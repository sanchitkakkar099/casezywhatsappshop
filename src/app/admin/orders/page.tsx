"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { Pagination } from "@/components/shared/Pagination";
import { ExportButton } from "@/components/shared/ExportButton";

const PAYMENT_STATUSES = ["", "PENDING", "SUCCESS", "FAILED", "EXPIRED", "REFUNDED"];
const ORDER_STATUSES = [
  "",
  "CHECKOUT_CREATED",
  "PAYMENT_LINK_SENT",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "SHOPIFY_ORDER_CREATED",
  "SHOPIFY_SYNC_FAILED",
  "TRACKING_ADDED",
  "SHIPPED",
  "CUSTOMER_NOTIFIED",
];

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get("page") ?? "1");
  const paymentStatus = searchParams.get("payment_status") ?? "";
  const orderStatus = searchParams.get("order_status") ?? "";
  const search = searchParams.get("search") ?? "";

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (paymentStatus) params.set("payment_status", paymentStatus);
    if (orderStatus) params.set("order_status", orderStatus);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, paymentStatus, orderStatus, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (!("page" in updates)) params.set("page", "1");
    router.push(`/admin/orders?${params}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-black">Orders</h1>
          <p className="mt-0.5 text-sm text-gray-400">{total} total orders</p>
        </div>
        <ExportButton
          filters={{
            ...(paymentStatus ? { payment_status: paymentStatus } : {}),
            ...(orderStatus ? { order_status: orderStatus } : {}),
          }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <input
          type="text"
          placeholder="Search by name, phone, order ref..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ search: (e.target as HTMLInputElement).value });
            }
          }}
          className="input-field sm:max-w-xs"
        />

        <select
          value={paymentStatus}
          onChange={(e) => updateParams({ payment_status: e.target.value })}
          className="input-field sm:w-auto"
        >
          <option value="">All Payment Status</option>
          {PAYMENT_STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={orderStatus}
          onChange={(e) => updateParams({ order_status: e.target.value })}
          className="input-field sm:w-auto"
        >
          <option value="">All Order Status</option>
          {ORDER_STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-400 text-sm">
          Loading...
        </div>
      ) : (
        <>
          <OrdersTable orders={orders} />
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
