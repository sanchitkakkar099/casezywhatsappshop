"use client";

import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/types/enums";

interface StatusBadgeProps {
  status: string;
  type: "payment" | "order";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const labels = type === "payment" ? PAYMENT_STATUS_LABELS : ORDER_STATUS_LABELS;
  const colors = type === "payment" ? PAYMENT_STATUS_COLORS : ORDER_STATUS_COLORS;

  const label = labels[status] ?? status;
  const color = colors[status] ?? "bg-gray-100 text-gray-800";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${color}`}
    >
      {label}
    </span>
  );
}
