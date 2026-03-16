"use client";

import { useState } from "react";

interface LogEntry {
  id: string;
  eventType?: string;
  topic?: string;
  cashfreeOrderId?: string | null;
  shopifyOrderId?: string | null;
  signatureValid?: boolean;
  hmacValid?: boolean;
  processed: boolean;
  createdAt: string;
  payload: unknown;
}

interface WebhookLogsTableProps {
  cashfreeLogs: LogEntry[];
  shopifyLogs: LogEntry[];
}

export function WebhookLogsTable({
  cashfreeLogs,
  shopifyLogs,
}: WebhookLogsTableProps) {
  const [activeTab, setActiveTab] = useState<"cashfree" | "shopify">("cashfree");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const logs = activeTab === "cashfree" ? cashfreeLogs : shopifyLogs;

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab("cashfree")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            activeTab === "cashfree"
              ? "bg-white text-gray-900 shadow"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Cashfree ({cashfreeLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("shopify")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            activeTab === "shopify"
              ? "bg-white text-gray-900 shadow"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Shopify ({shopifyLogs.length})
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No webhook logs yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Signature
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Processed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Payload
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {logs.map((log) => (
                <>
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">
                      {log.eventType ?? log.topic ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.cashfreeOrderId ?? log.shopifyOrderId ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          (log.signatureValid ?? log.hmacValid)
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {(log.signatureValid ?? log.hmacValid) ? "Valid" : "Invalid"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.processed ? "Yes" : "No"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === log.id ? null : log.id)
                        }
                        className="text-sm text-green-600 hover:text-green-800"
                      >
                        {expandedId === log.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-payload`}>
                      <td colSpan={6} className="bg-gray-50 px-4 py-3">
                        <pre className="max-h-64 overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
