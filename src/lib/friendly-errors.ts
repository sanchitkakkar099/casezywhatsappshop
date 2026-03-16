/**
 * Maps technical error messages to simple, admin-friendly messages.
 * The admin is not technically sound — messages should explain
 * what happened and what to do next, in plain language.
 */

const ERROR_PATTERNS: [RegExp | string, string][] = [
  // Network / connectivity
  ["Network error", "Could not connect to the server. Please check your internet connection and try again."],
  ["Failed to fetch", "Could not connect to the server. Please check your internet connection and try again."],
  ["fetch failed", "Could not connect to the server. Please check your internet connection and try again."],

  // Auth
  ["Unauthorized", "Your session has expired. Please log in again."],
  ["Invalid email or password", "The email or password you entered is incorrect. Please try again."],
  [/HTTP 401/i, "Your session has expired. Please log in again."],
  [/HTTP 403/i, "You don't have permission to do this."],

  // Shopify
  [/shopify.*error/i, "Could not connect to Shopify. Please check your Shopify credentials in Settings."],
  [/shopifyVariantId/i, "This product is not linked to Shopify. Please sync products from Shopify first."],
  [/Shopify API error/i, "Shopify is not responding. Please check your Shopify credentials in Settings and try again."],
  [/Failed to create order/i, "Could not create the order in Shopify. Please check your Shopify settings and try again."],

  // Cashfree
  [/cashfree.*error/i, "Could not connect to Cashfree. Please check your Cashfree credentials in Settings."],
  [/payment link/i, "Could not create the payment link. Please check your Cashfree settings."],

  // ChatMint / WhatsApp
  [/chatmint.*error/i, "Could not send WhatsApp message. Please check your ChatMint credentials in Settings."],
  [/template/i, "WhatsApp message template issue. Please check your template names in Settings → WhatsApp Templates."],

  // Database
  [/database/i, "Database connection issue. Please contact support."],
  [/prisma/i, "Database connection issue. Please contact support."],
  [/ECONNREFUSED/i, "Could not connect to the database. Please make sure it is running."],

  // Validation
  [/Validation failed/i, "Some fields are missing or incorrect. Please check the form and try again."],
  [/not found/i, "The item you're looking for was not found. It may have been removed."],
  [/not active/i, "This product is currently inactive. Please activate it first."],
  [/already exists/i, "This item already exists. Please use a different name or identifier."],

  // Product sync
  [/sync.*fail/i, "Product sync failed. Please check your Shopify credentials in Settings."],

  // Generic server errors
  [/HTTP 500/i, "Something went wrong on our end. Please try again in a moment."],
  [/HTTP 502/i, "An external service is not responding. Please try again in a moment."],
  [/HTTP 503/i, "The service is temporarily unavailable. Please try again in a moment."],
  [/Internal server error/i, "Something went wrong. Please try again or contact support."],
];

/**
 * Convert a technical error message to a friendly, admin-readable message.
 */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "Something went wrong";

  for (const [pattern, friendly] of ERROR_PATTERNS) {
    if (typeof pattern === "string") {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        return friendly;
      }
    } else if (pattern.test(message)) {
      return friendly;
    }
  }

  // Default fallback — keep it simple
  return "Something went wrong. Please try again or contact support.";
}

/**
 * Convert API error response to friendly message.
 * Checks for server-provided friendlyMessage first.
 */
export async function friendlyApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    // Prefer server-provided friendly message
    if (data.friendlyMessage) return data.friendlyMessage;
    return friendlyError(data.error ?? data.message ?? `HTTP ${response.status}`);
  } catch {
    return friendlyError(`HTTP ${response.status}`);
  }
}

/**
 * Friendly labels for order/sync statuses.
 */
export const FRIENDLY_STATUS: Record<string, string> = {
  // Payment
  PENDING: "Waiting for payment",
  SUCCESS: "Payment received",
  FAILED: "Payment failed",
  EXPIRED: "Payment link expired",
  REFUNDED: "Refunded",

  // Order
  CHECKOUT_CREATED: "Order created",
  PAYMENT_LINK_SENT: "Payment link sent to customer",
  PAYMENT_PENDING: "Waiting for payment",
  PAYMENT_SUCCESS: "Payment confirmed",
  PAYMENT_FAILED: "Payment failed",
  SHOPIFY_ORDER_CREATED: "Shopify order created",
  SHOPIFY_SYNC_FAILED: "Shopify sync failed — click Retry",
  FULFILLMENT_PENDING: "Waiting for shipment",
  TRACKING_ADDED: "Tracking added",
  SHIPPED: "Shipped",
  CUSTOMER_NOTIFIED: "Customer notified",

  // Sync job
  PROCESSING: "Processing...",
  COMPLETED: "Done",
};

/**
 * Get a friendly label for a sync job error.
 */
export function friendlySyncError(error: string | null): string {
  if (!error) return "No errors";

  if (error.includes("shopifyVariantId")) {
    return "Product not linked to Shopify — sync products first";
  }
  if (error.includes("429") || error.includes("rate limit")) {
    return "Shopify rate limit — will retry automatically";
  }
  if (error.includes("401") || error.includes("403")) {
    return "Shopify access denied — check credentials in Settings";
  }
  if (error.includes("404")) {
    return "Product not found in Shopify — check product mapping";
  }
  if (error.includes("timeout") || error.includes("ETIMEDOUT")) {
    return "Shopify took too long to respond — will retry";
  }

  return "Sync error — click Retry to try again";
}
