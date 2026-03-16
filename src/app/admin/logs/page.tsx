"use client";

import { useEffect, useState } from "react";
import { WebhookLogsTable } from "@/components/admin/WebhookLogsTable";
import { TableSkeleton } from "@/components/shared/Toast";

export default function LogsPage() {
  const [cashfreeLogs, setCashfreeLogs] = useState([]);
  const [shopifyLogs, setShopifyLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/logs/webhooks?type=all")
      .then((r) => r.json())
      .then((data) => {
        setCashfreeLogs(data.cashfree?.logs ?? []);
        setShopifyLogs(data.shopify?.logs ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black">Webhook Logs</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          View raw webhook payloads from Cashfree and Shopify
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <TableSkeleton rows={5} cols={5} />
        </div>
      ) : (
        <WebhookLogsTable
          cashfreeLogs={cashfreeLogs}
          shopifyLogs={shopifyLogs}
        />
      )}
    </div>
  );
}
