"use client";

import { useEffect, useState } from "react";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { DashboardSkeleton, PageTransition } from "@/components/shared/Animated";

interface DashboardData {
  metrics: {
    totalCheckouts: number;
    pendingPayments: number;
    successfulPayments: number;
    failedPayments: number;
    shopifyOrdersCreated: number;
    shopifySyncFailed: number;
    shippedOrders: number;
  };
  revenue: {
    total: number;
    today: { orders: number; revenue: number };
    week: { orders: number; revenue: number };
    month: { orders: number; revenue: number };
  };
  whatsapp: {
    sent: number;
    received: number;
  };
  recentCheckouts: Array<{
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
    customer: { fullName: string; phone: string; email: string };
    product: { name: string };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="animate-fade-up border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load dashboard data. Make sure the database is running and seeded.
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-xl font-bold text-black">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            WhatsApp commerce overview
          </p>
        </div>

        <DashboardMetrics
          metrics={data.metrics}
          revenue={data.revenue}
          whatsapp={data.whatsapp}
        />

        <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-gray-500">
              Recent Orders
            </h2>
          </div>
          <OrdersTable orders={data.recentCheckouts} />
        </div>
      </div>
    </PageTransition>
  );
}
