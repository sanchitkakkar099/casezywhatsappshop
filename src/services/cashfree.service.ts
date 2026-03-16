import { getIntegrationConfig } from "@/lib/config";
import { ExternalServiceError } from "@/lib/errors";
import type {
  CashfreeCreateLinkRequest,
  CashfreeCreateLinkResponse,
  CashfreeLinkStatusResponse,
} from "@/types/cashfree";

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

/**
 * Create a dynamic Cashfree payment link for a checkout.
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
}): Promise<CashfreeCreateLinkResponse> {
  const cf = await getCashfreeConfig();

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

  const response = await fetch(`${cf.baseUrl}/links`, {
    method: "POST",
    headers: cf.headers,
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
 */
export async function getPaymentLinkStatus(
  linkId: string
): Promise<CashfreeLinkStatusResponse> {
  const cf = await getCashfreeConfig();

  const response = await fetch(`${cf.baseUrl}/links/${linkId}`, {
    method: "GET",
    headers: cf.headers,
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
