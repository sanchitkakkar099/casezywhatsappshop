"use client";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { RetryButton } from "./RetryButton";
import { FRIENDLY_STATUS, friendlySyncError } from "@/lib/friendly-errors";

interface OrderDetailProps {
  order: {
    id: string;
    checkoutId: string;
    internalOrderReference: string;
    quantity: number;
    unitPrice: string;
    totalAmount: string;
    currency: string;
    paymentStatus: string;
    orderStatus: string;
    cashfreeOrderId: string | null;
    cashfreePaymentLinkUrl: string | null;
    cashfreePaymentId: string | null;
    shopifyOrderId: string | null;
    shopifyOrderNumber: string | null;
    trackingNumber: string | null;
    courierName: string | null;
    trackingUrl: string | null;
    paidAt: string | null;
    createdAt: string;
    updatedAt: string;
    shippingAddress: Record<string, string>;
    billingAddress: Record<string, string>;
    customer: {
      fullName: string;
      email: string;
      phone: string;
    };
    product: {
      name: string;
      sku: string | null;
    };
    syncJobs: {
      id: string;
      status: string;
      attempts: number;
      lastError: string | null;
      createdAt: string;
    }[];
  };
  logs: {
    cashfree: { id: string; eventType: string; createdAt: string; signatureValid: boolean }[];
    shopifySync: { id: string; action: string; success: boolean; error: string | null; createdAt: string }[];
    whatsapp: { id: string; messageType: string; status: string | null; createdAt: string }[];
  };
}

function AddressBlock({
  label,
  address,
}: {
  label: string;
  address: Record<string, string>;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </h4>
      <p className="mt-1 text-sm text-gray-700">
        {address.line1}
        {address.line2 && <>, {address.line2}</>}
        <br />
        {address.city}, {address.state} {address.pincode}
        <br />
        {address.country}
      </p>
    </div>
  );
}

/* Friendly log labels */
const LOG_LABELS: Record<string, string> = {
  // Cashfree events
  PAYMENT_SUCCESS_WEBHOOK: "Payment received",
  PAYMENT_FAILED_WEBHOOK: "Payment failed",
  // WhatsApp messages
  payment_link: "Payment link sent",
  payment_confirmation: "Payment confirmation sent",
  tracking_info: "Tracking info sent",
  order_delivered: "Delivery notification sent",
  // Shopify sync
  create_order: "Shopify order creation",
};

function friendlyLogDetail(type: string, detail: string, ok: boolean): string {
  const label = LOG_LABELS[detail] ?? detail;
  if (type === "Shopify" && !ok) {
    return `${label} — failed, will retry`;
  }
  return label;
}

export function OrderDetail({ order, logs }: OrderDetailProps) {
  const canRetry =
    order.orderStatus === "SHOPIFY_SYNC_FAILED" ||
    (order.paymentStatus === "SUCCESS" && !order.shopifyOrderId);

  // Show a warning banner for failed states
  const showWarning =
    order.orderStatus === "SHOPIFY_SYNC_FAILED" ||
    order.paymentStatus === "FAILED";

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      {showWarning && (
        <div className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                {order.orderStatus === "SHOPIFY_SYNC_FAILED"
                  ? "This order could not be synced to Shopify"
                  : "Payment was not successful for this order"}
              </p>
              <p className="mt-0.5 text-xs text-amber-600">
                {order.orderStatus === "SHOPIFY_SYNC_FAILED"
                  ? "The payment was received but the Shopify order could not be created. Use the Retry button below to try again."
                  : "The customer has not completed payment. You can share the payment link again if needed."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-black">
            {order.internalOrderReference}
          </h2>
          <p className="text-sm text-gray-400">
            Created{" "}
            {new Date(order.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={order.paymentStatus} type="payment" />
          <StatusBadge status={order.orderStatus} type="order" />
        </div>
      </div>

      {/* Status summary */}
      <div className="card border-l-[3px] border-brand-400 p-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-black">Current status:</span>{" "}
          {FRIENDLY_STATUS[order.orderStatus] ?? order.orderStatus}
        </p>
      </div>

      {/* Main info grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Customer */}
        <div className="card p-5">
          <h3 className="font-display text-sm font-semibold text-black">Customer</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Name</dt>
              <dd className="font-medium text-black">{order.customer.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Email</dt>
              <dd>{order.customer.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Phone</dt>
              <dd>{order.customer.phone}</dd>
            </div>
          </dl>
        </div>

        {/* Product */}
        <div className="card p-5">
          <h3 className="font-display text-sm font-semibold text-black">Product</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Product</dt>
              <dd className="font-medium text-black">{order.product.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">SKU</dt>
              <dd>{order.product.sku ?? "\u2014"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Qty</dt>
              <dd>{order.quantity}</dd>
            </div>
            <div className="flex justify-between font-semibold text-black">
              <dt>Total</dt>
              <dd>\u20B9{order.totalAmount}</dd>
            </div>
          </dl>
        </div>

        {/* Addresses */}
        <div className="card p-5">
          <h3 className="mb-3 font-display text-sm font-semibold text-black">
            Addresses
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <AddressBlock label="Shipping" address={order.shippingAddress} />
            <AddressBlock label="Billing" address={order.billingAddress} />
          </div>
        </div>

        {/* Payment & Shopify */}
        <div className="card p-5">
          <h3 className="font-display text-sm font-semibold text-black">
            Integration Details
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Payment ID</dt>
              <dd>{order.cashfreePaymentId ?? "\u2014"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Paid at</dt>
              <dd>
                {order.paidAt
                  ? new Date(order.paidAt).toLocaleString("en-IN")
                  : "\u2014"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Shopify Order</dt>
              <dd className="font-medium">
                {order.shopifyOrderNumber ?? "\u2014"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Tracking</dt>
              <dd>
                {order.trackingNumber ? (
                  <>
                    {order.courierName}: {order.trackingNumber}
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 font-medium text-brand-700 hover:underline"
                      >
                        Track
                      </a>
                    )}
                  </>
                ) : (
                  "\u2014"
                )}
              </dd>
            </div>
          </dl>

          {canRetry && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <RetryButton checkoutId={order.id} />
            </div>
          )}
        </div>
      </div>

      {/* Sync Jobs — simplified for non-technical admin */}
      {order.syncJobs.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-4 font-display text-sm font-semibold text-black">
            Shopify Sync History
          </h3>
          <div className="space-y-2">
            {order.syncJobs.map((job) => (
              <div
                key={job.id}
                className={`flex items-center justify-between border-l-[3px] px-4 py-2.5 ${
                  job.status === "COMPLETED"
                    ? "border-emerald-400 bg-emerald-50"
                    : job.status === "FAILED"
                    ? "border-red-400 bg-red-50"
                    : "border-amber-400 bg-amber-50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-black">
                    {job.status === "COMPLETED"
                      ? "Synced to Shopify successfully"
                      : job.status === "FAILED"
                      ? "Sync failed"
                      : "Sync in progress..."}
                  </p>
                  <p className="text-xs text-gray-500">
                    {friendlySyncError(job.lastError)}
                    {job.attempts > 1 && ` (tried ${job.attempts} times)`}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(job.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log — simplified */}
      <div className="card p-5">
        <h3 className="mb-4 font-display text-sm font-semibold text-black">
          Activity Timeline
        </h3>
        <div className="space-y-2">
          {[
            ...logs.cashfree.map((l) => ({
              time: l.createdAt,
              type: "Payment",
              detail: l.eventType,
              ok: l.signatureValid,
              icon: "\u20B9",
            })),
            ...logs.shopifySync.map((l) => ({
              time: l.createdAt,
              type: "Shopify",
              detail: l.action,
              ok: l.success,
              icon: "\uD83D\uDCE6",
            })),
            ...logs.whatsapp.map((l) => ({
              time: l.createdAt,
              type: "WhatsApp",
              detail: l.messageType,
              ok: l.status === "sent",
              icon: "\uD83D\uDCAC",
            })),
          ]
            .sort(
              (a, b) =>
                new Date(b.time).getTime() - new Date(a.time).getTime()
            )
            .map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center text-xs ${
                    entry.ok
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {entry.ok ? "\u2713" : "\u2717"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black">
                    {friendlyLogDetail(entry.type, entry.detail, entry.ok)}
                  </p>
                  <p className="text-[11px] text-gray-400">{entry.type}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-gray-400">
                  {new Date(entry.time).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          {logs.cashfree.length === 0 &&
            logs.shopifySync.length === 0 &&
            logs.whatsapp.length === 0 && (
              <p className="text-sm text-gray-400">
                No activity yet. Events will appear here as the order
                progresses.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
