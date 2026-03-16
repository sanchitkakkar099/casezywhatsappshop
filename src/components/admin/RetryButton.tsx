"use client";

import { useState } from "react";
import { friendlyError, FRIENDLY_STATUS } from "@/lib/friendly-errors";

export function RetryButton({ checkoutId }: { checkoutId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRetry = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/admin/orders/${checkoutId}/retry-shopify-sync`,
        { method: "POST" }
      );

      const data = await response.json();

      if (response.ok) {
        const status = data.order?.orderStatus;
        setResult({
          success: true,
          message:
            FRIENDLY_STATUS[status] ??
            "Order synced successfully to Shopify!",
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult({
          success: false,
          message: friendlyError(data.error),
        });
      }
    } catch (err) {
      setResult({ success: false, message: friendlyError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleRetry}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Retrying...
          </span>
        ) : (
          "Retry Shopify Sync"
        )}
      </button>
      {result && (
        <div
          className={`mt-3 border-l-4 px-4 py-2.5 text-sm ${
            result.success
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-red-500 bg-red-50 text-red-700"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
