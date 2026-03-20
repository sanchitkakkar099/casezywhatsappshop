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

/**
 * Create a Cashfree Payment Link and return the shareable URL.
 * Uses the Payment Links API (/pg/links).
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
    link_id: params.linkId,
    link_amount: params.amount,
    link_currency: params.currency,
    link_purpose: params.purpose,
    customer_details: {
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: cleanPhone,
    },
    link_notify: {
      send_sms: false,
      send_email: false,
    },
    link_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
    },
    link_notes: {
      internal_ref: params.linkId,
      source: "whatsapp",
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

  return {
    cf_link_id: data.cf_link_id,
    link_url: data.link_url,
    link_id: data.link_id,
  };
}

/**
 * Fetch the status of an existing Cashfree payment link.
 */
export async function getPaymentLinkStatus(linkId: string) {
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

  return data;
}
