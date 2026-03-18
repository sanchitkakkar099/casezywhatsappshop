import { getIntegrationConfig } from "@/lib/config";
import { ExternalServiceError } from "@/lib/errors";

async function getCashfreeConfig() {
  const appId = await getIntegrationConfig("cashfree", "appId");
  const secretKey = await getIntegrationConfig("cashfree", "secretKey");
  const env = await getIntegrationConfig("cashfree", "env").catch(() => "sandbox");
  const baseUrl =
    env === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

  return {
    appId,
    secretKey,
    env,
    baseUrl,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": "2023-08-01",
    },
  };
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  order_status: string;
  payment_session_id: string;
  order_amount: number;
  order_currency: string;
  payment_url: string;
}

/**
 * Create a Cashfree PG order and return the payment URL.
 * Uses the Orders API (/pg/orders) instead of Payment Links API.
 */
export async function createPaymentLink(params: {
  linkId: string;
  amount: number;
  currency: string;
  purpose: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
}): Promise<{ cf_link_id: string; link_url: string; link_id: string }> {
  const cf = await getCashfreeConfig();

  // Clean phone: remove +91 prefix, keep 10 digits
  const cleanPhone = params.customerPhone.replace(/^\+?91/, "").replace(/\D/g, "").slice(-10);

  const body = {
    order_id: params.linkId,
    order_amount: params.amount,
    order_currency: params.currency,
    order_note: params.purpose,
    customer_details: {
      customer_id: `cust_${cleanPhone}`,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: cleanPhone,
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
    },
    order_tags: {
      internal_ref: params.linkId,
      source: "whatsapp",
    },
  };

  const response = await fetch(`${cf.baseUrl}/orders`, {
    method: "POST",
    headers: cf.headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ExternalServiceError(
      "Cashfree",
      `Failed to create payment order: ${data.message ?? JSON.stringify(data)}`,
      data
    );
  }

  // Build the payment URL from the payment session ID
  const paymentUrl = cf.env === "production"
    ? `https://payments.cashfree.com/order/#${data.payment_session_id}`
    : `https://sandbox.cashfree.com/pg/orders/pay/${data.payment_session_id}`;

  return {
    cf_link_id: data.cf_order_id,
    link_url: paymentUrl,
    link_id: data.order_id,
  };
}

/**
 * Fetch the status of an existing Cashfree order.
 */
export async function getPaymentLinkStatus(orderId: string) {
  const cf = await getCashfreeConfig();

  const response = await fetch(`${cf.baseUrl}/orders/${orderId}`, {
    method: "GET",
    headers: cf.headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ExternalServiceError(
      "Cashfree",
      `Failed to fetch order status: ${data.message ?? JSON.stringify(data)}`,
      data
    );
  }

  return data;
}
