import { config } from "@/lib/config";
import { ExternalServiceError } from "@/lib/errors";
import type {
  CashfreeCreateLinkRequest,
  CashfreeCreateLinkResponse,
  CashfreeLinkStatusResponse,
} from "@/types/cashfree";

const headers = () => ({
  "Content-Type": "application/json",
  "x-client-id": config.cashfree.appId,
  "x-client-secret": config.cashfree.secretKey,
  "x-api-version": "2023-08-01",
});

/**
 * Create a dynamic Cashfree payment link for a checkout.
 */
export async function createPaymentLink(params: {
  linkId: string; // internal_order_reference (e.g., ORD-A3F8K2)
  amount: number;
  currency: string;
  purpose: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
}): Promise<CashfreeCreateLinkResponse> {
  // Link expires in 24 hours
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const body: CashfreeCreateLinkRequest = {
    link_id: params.linkId,
    link_amount: params.amount,
    link_currency: params.currency,
    link_purpose: params.purpose,
    link_expiry_time: expiryTime,
    customer_details: {
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    link_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
    },
    link_notify: {
      send_sms: false,
      send_email: false,
    },
    link_notes: {
      internal_ref: params.linkId,
    },
  };

  const response = await fetch(`${config.cashfree.baseUrl}/links`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ExternalServiceError(
      "Cashfree",
      `Failed to create payment link: ${data.message ?? JSON.stringify(data)}`,
      data
    );
  }

  return data as CashfreeCreateLinkResponse;
}

/**
 * Fetch the status of an existing payment link.
 * Useful for reconciliation / checking expired links.
 */
export async function getPaymentLinkStatus(
  linkId: string
): Promise<CashfreeLinkStatusResponse> {
  const response = await fetch(`${config.cashfree.baseUrl}/links/${linkId}`, {
    method: "GET",
    headers: headers(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ExternalServiceError(
      "Cashfree",
      `Failed to fetch link status: ${data.message ?? JSON.stringify(data)}`,
      data
    );
  }

  return data as CashfreeLinkStatusResponse;
}
