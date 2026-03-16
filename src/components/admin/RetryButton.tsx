"use client";

import { useState } from "react";
import { friendlyError, FRIENDLY_STATUS } from "@/lib/friendly-errors";
import { Toast, Spinner } from "@/components/shared/Toast";

export function RetryButton({ checkoutId }: { checkoutId: string }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleRetry = async () => {
    setLoading(true);
    setToast(null);

    try {
      const response = await fetch(
        `/api/admin/orders/${checkoutId}/retry-shopify-sync`,
        { method: "POST" }
      );

      const data = await response.json();

      if (response.ok) {
        const status = data.order?.orderStatus;
        setToast({
          type: "success",
          message:
            FRIENDLY_STATUS[status] ??
            "Order synced successfully to Shopify!",
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setToast({
          type: "error",
          message: friendlyError(data.error),
        });
      }
    } catch (err) {
      setToast({ type: "error", message: friendlyError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      <button
        onClick={handleRetry}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner />
            Retrying...
          </span>
        ) : (
          "Retry Shopify Sync"
        )}
      </button>
    </div>
  );
}
