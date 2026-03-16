"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Order {
  id: string;
  checkoutId: string;
  internalOrderReference: string;
  quantity: number;
  totalAmount: string;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  shopifyOrderNumber: string | null;
  createdAt: string;
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
  product: {
    name: string;
  };
}

interface OrdersTableProps {
  orders: Order[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-gray-400">
        No orders found
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-[800px] w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Order
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Customer
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Product
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Amount
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Payment
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Status
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Shopify
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, i) => (
            <tr
              key={order.id}
              className={`hover-lift transition-colors hover:bg-brand-50 ${
                i < orders.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              <td className="whitespace-nowrap px-5 py-3.5 text-sm">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-semibold text-black hover:text-brand-700"
                >
                  {order.internalOrderReference}
                </Link>
                <br />
                <span className="text-[11px] text-gray-400">{order.checkoutId}</span>
              </td>
              <td className="px-5 py-3.5 text-sm">
                <div className="font-medium text-black">{order.customer.fullName}</div>
                <div className="text-[11px] text-gray-400">{order.customer.phone}</div>
              </td>
              <td className="px-5 py-3.5 text-sm text-gray-600">
                {order.product.name}
                {order.quantity > 1 && (
                  <span className="text-gray-400"> x{order.quantity}</span>
                )}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-black">
                {order.currency === "INR" ? "\u20B9" : order.currency}{" "}
                {order.totalAmount}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5">
                <StatusBadge status={order.paymentStatus} type="payment" />
              </td>
              <td className="whitespace-nowrap px-5 py-3.5">
                <StatusBadge status={order.orderStatus} type="order" />
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-400">
                {order.shopifyOrderNumber ?? "\u2014"}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-400">
                {new Date(order.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
