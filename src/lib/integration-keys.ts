export interface IntegrationField {
  key: string;
  label: string;
  isSecret: boolean;
  placeholder?: string;
  type?: "text" | "select";
  options?: string[];
  group?: string;
  description?: string;
}

export const INTEGRATION_KEYS: Record<string, IntegrationField[]> = {
  chatmint: [
    // API Configuration
    { key: "apiUrl", label: "API URL", isSecret: false, placeholder: "https://backend.chatmint.in/api", group: "API Configuration" },
    { key: "apiKey", label: "API Key", isSecret: true, group: "API Configuration" },
    { key: "senderNumber", label: "Sender Number", isSecret: true, placeholder: "919876543210", group: "API Configuration", description: "With country code, no + prefix" },
    // WhatsApp Templates
    { key: "tplPaymentLink", label: "Payment Link Template", isSecret: false, placeholder: "payment_link", group: "WhatsApp Templates", description: "Sent when checkout is created with payment link" },
    { key: "tplPaymentConfirmation", label: "Payment Confirmation Template", isSecret: false, placeholder: "payment_confirmation", group: "WhatsApp Templates", description: "Sent after successful payment + Shopify order" },
    { key: "tplTrackingInfo", label: "Tracking Info Template", isSecret: false, placeholder: "tracking_info", group: "WhatsApp Templates", description: "Sent when order is shipped with tracking details" },
    { key: "tplOrderDelivered", label: "Order Delivered Template", isSecret: false, placeholder: "order_delivered", group: "WhatsApp Templates", description: "Sent when order is delivered (optional)" },
    { key: "tplAbandonedCart", label: "Abandoned Cart Template", isSecret: false, placeholder: "abandoned_cart", group: "WhatsApp Templates", description: "Auto-sent when customer doesn't complete payment (1hr, 6hr, 24hr)" },
  ],
  cashfree: [
    { key: "appId", label: "App ID", isSecret: true },
    { key: "secretKey", label: "Secret Key", isSecret: true },
    { key: "webhookSecret", label: "Webhook Secret", isSecret: true },
    { key: "env", label: "Environment", isSecret: false, type: "select", options: ["sandbox", "production"] },
  ],
  shopify: [
    { key: "storeDomain", label: "Store Domain", isSecret: false, placeholder: "store.myshopify.com" },
    { key: "accessToken", label: "Access Token", isSecret: true },
    { key: "webhookSecret", label: "Webhook Secret", isSecret: true },
  ],
};

export const INTEGRATION_LABELS: Record<string, string> = {
  chatmint: "WhatsApp (ChatMint)",
  cashfree: "Cashfree Payments",
  shopify: "Shopify",
};

/** Default template names — used as fallback when not configured in DB */
export const DEFAULT_TEMPLATES: Record<string, string> = {
  tplPaymentLink: "payment_link",
  tplPaymentConfirmation: "payment_confirmation",
  tplTrackingInfo: "tracking_info",
  tplOrderDelivered: "order_delivered",
};

/** Maps integration+key to the env var name for fallback */
export const ENV_MAP: Record<string, Record<string, string>> = {
  chatmint: {
    apiUrl: "CHATMINT_API_URL",
    apiKey: "CHATMINT_API_KEY",
    senderNumber: "CHATMINT_SENDER_NUMBER",
  },
  cashfree: {
    appId: "CASHFREE_APP_ID",
    secretKey: "CASHFREE_SECRET_KEY",
    webhookSecret: "CASHFREE_WEBHOOK_SECRET",
    env: "CASHFREE_ENV",
  },
  shopify: {
    storeDomain: "SHOPIFY_STORE_DOMAIN",
    accessToken: "SHOPIFY_ACCESS_TOKEN",
    webhookSecret: "SHOPIFY_WEBHOOK_SECRET",
    apiVersion: "SHOPIFY_API_VERSION",
  },
};
