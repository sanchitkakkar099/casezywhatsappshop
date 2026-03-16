"use client";

import { CountUp, CountUpCurrency } from "@/components/shared/Animated";

interface Metrics {
  totalCheckouts: number;
  pendingPayments: number;
  successfulPayments: number;
  failedPayments: number;
  shopifyOrdersCreated: number;
  shopifySyncFailed: number;
  shippedOrders: number;
}

interface Revenue {
  total: number;
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number };
  month: { orders: number; revenue: number };
}

interface WhatsappStats {
  sent: number;
  received: number;
}

/* ─── Revenue Cards ─── */

function RevenueSection({ revenue }: { revenue: Revenue }) {
  const cards = [
    { label: "Total Revenue", value: revenue.total, orders: null, highlight: true },
    { label: "Today", value: revenue.today.revenue, orders: revenue.today.orders },
    { label: "This Week", value: revenue.week.revenue, orders: revenue.week.orders },
    { label: "This Month", value: revenue.month.revenue, orders: revenue.month.orders },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`card p-5 animate-fade-up ${card.highlight ? "border-l-[3px] border-brand-400" : ""}`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {card.label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-black">
            <CountUpCurrency value={card.value} duration={900} />
          </p>
          {card.orders !== null && (
            <p className="mt-1 text-xs text-gray-400">
              <CountUp value={card.orders} duration={600} /> order{card.orders !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Status Cards ─── */

const statusCards = [
  {
    key: "totalCheckouts" as const,
    label: "Total Checkouts",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    accent: "bg-brand-400/10 text-brand-700",
    border: "border-brand-400",
  },
  {
    key: "pendingPayments" as const,
    label: "Pending",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    accent: "bg-amber-50 text-amber-600",
    border: "border-amber-400",
  },
  {
    key: "successfulPayments" as const,
    label: "Paid",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accent: "bg-emerald-50 text-emerald-600",
    border: "border-emerald-400",
  },
  {
    key: "failedPayments" as const,
    label: "Failed",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accent: "bg-red-50 text-red-600",
    border: "border-red-400",
  },
  {
    key: "shopifyOrdersCreated" as const,
    label: "Shopify Orders",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    accent: "bg-violet-50 text-violet-600",
    border: "border-violet-400",
  },
  {
    key: "shopifySyncFailed" as const,
    label: "Sync Failed",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    accent: "bg-orange-50 text-orange-600",
    border: "border-orange-400",
  },
  {
    key: "shippedOrders" as const,
    label: "Shipped",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M5 13l4 4L19 7" />
      </svg>
    ),
    accent: "bg-emerald-50 text-emerald-600",
    border: "border-emerald-400",
  },
];

function StatusSection({
  metrics,
  whatsapp,
}: {
  metrics: Metrics;
  whatsapp: WhatsappStats;
}) {
  const allCards = [
    ...statusCards.map((c) => ({
      key: c.key,
      label: c.label,
      value: metrics[c.key],
      icon: c.icon,
      accent: c.accent,
      border: c.border,
    })),
    {
      key: "waSent",
      label: "WA Sent",
      value: whatsapp.sent,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      accent: "bg-green-50 text-green-600",
      border: "border-green-400",
    },
    {
      key: "waReceived",
      label: "WA Received",
      value: whatsapp.received,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      accent: "bg-green-50 text-green-600",
      border: "border-green-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {allCards.map((card, i) => (
        <div
          key={card.key}
          className={`card border-l-[3px] ${card.border} p-4 animate-fade-up`}
          style={{ animationDelay: `${240 + i * 50}ms` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {card.label}
              </p>
              <p className="mt-1.5 font-display text-xl font-bold text-black">
                <CountUp value={card.value} duration={700} />
              </p>
            </div>
            <div className={`flex h-9 w-9 items-center justify-center ${card.accent}`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Export ─── */

export function DashboardMetrics({
  metrics,
  revenue,
  whatsapp,
}: {
  metrics: Metrics;
  revenue: Revenue;
  whatsapp: WhatsappStats;
}) {
  return (
    <div className="space-y-6">
      <RevenueSection revenue={revenue} />
      <StatusSection metrics={metrics} whatsapp={whatsapp} />
    </div>
  );
}
