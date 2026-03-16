"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Pagination } from "@/components/shared/Pagination";

interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  totalOrders: number;
  paidOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

const SEGMENTS = [
  { value: "", label: "All Customers" },
  { value: "paid", label: "Paid Customers" },
  { value: "unpaid", label: "Never Paid" },
  { value: "repeat", label: "Repeat Buyers" },
];

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const segment = searchParams.get("segment") ?? "";

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);
    if (segment) params.set("segment", segment);

    try {
      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      console.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, search, segment]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (!("page" in updates)) params.set("page", "1");
    router.push(`/admin/customers?${params}`);
  };

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black">Customers</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          {total} customers from WhatsApp
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ search: (e.target as HTMLInputElement).value });
            }
          }}
          className="input-field max-w-xs"
        />

        <div className="flex gap-1">
          {SEGMENTS.map((seg) => (
            <button
              key={seg.value}
              onClick={() => updateParams({ segment: seg.value })}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                segment === seg.value
                  ? "bg-black text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:text-black"
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-400 text-sm">
          Loading customers...
        </div>
      ) : customers.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-400">
          No customers found. Customers are automatically created when they
          place orders via WhatsApp.
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="min-w-[700px] w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Phone
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Orders
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Total Spent
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Last Order
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Since
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`transition-colors hover:bg-brand-50 ${
                      i < customers.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-black">
                        {c.fullName}
                      </div>
                      <div className="text-[11px] text-gray-400">{c.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {c.phone}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-semibold text-black">
                        {c.paidOrders}
                        <span className="font-normal text-gray-400">
                          /{c.totalOrders}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        paid / total
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-black">
                      {c.totalSpent > 0 ? formatCurrency(c.totalSpent) : "\u2014"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">
                      {c.lastOrderAt
                        ? new Date(c.lastOrderAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "\u2014"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
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
