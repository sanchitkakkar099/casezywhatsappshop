// Re-export Prisma enums for use in non-Prisma contexts (e.g., UI components)
export { PaymentStatus, OrderStatus, SyncJobStatus } from "@prisma/client";

// Human-readable labels for admin UI
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  SUCCESS: "Success",
  FAILED: "Failed",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  CHECKOUT_CREATED: "Checkout Created",
  PAYMENT_LINK_SENT: "Payment Link Sent",
  PAYMENT_PENDING: "Payment Pending",
  PAYMENT_SUCCESS: "Payment Success",
  PAYMENT_FAILED: "Payment Failed",
  SHOPIFY_ORDER_CREATED: "Shopify Order Created",
  SHOPIFY_SYNC_FAILED: "Shopify Sync Failed",
  FULFILLMENT_PENDING: "Fulfillment Pending",
  TRACKING_ADDED: "Tracking Added",
  SHIPPED: "Shipped",
  CUSTOMER_NOTIFIED: "Customer Notified",
};

// Color mappings for status badges
export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SUCCESS: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-800",
  REFUNDED: "bg-purple-100 text-purple-800",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  CHECKOUT_CREATED: "bg-gray-100 text-gray-800",
  PAYMENT_LINK_SENT: "bg-blue-100 text-blue-800",
  PAYMENT_PENDING: "bg-yellow-100 text-yellow-800",
  PAYMENT_SUCCESS: "bg-green-100 text-green-800",
  PAYMENT_FAILED: "bg-red-100 text-red-800",
  SHOPIFY_ORDER_CREATED: "bg-green-100 text-green-800",
  SHOPIFY_SYNC_FAILED: "bg-red-100 text-red-800",
  FULFILLMENT_PENDING: "bg-orange-100 text-orange-800",
  TRACKING_ADDED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  CUSTOMER_NOTIFIED: "bg-green-100 text-green-800",
};
