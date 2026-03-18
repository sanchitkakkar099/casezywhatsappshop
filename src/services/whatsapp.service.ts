import { getIntegrationConfig } from "@/lib/config";
import { DEFAULT_TEMPLATES } from "@/lib/integration-keys";
import { loggerService } from "./logger.service";
import type { SendResult, WhatsAppService } from "@/types/whatsapp";

/**
 * Get a WhatsApp template name from DB settings, falling back to defaults.
 */
async function getTemplateName(templateKey: string): Promise<string> {
  try {
    return await getIntegrationConfig("chatmint", templateKey);
  } catch {
    return DEFAULT_TEMPLATES[templateKey] ?? templateKey;
  }
}

/**
 * Get ChatMint / Meta Cloud API config.
 * - apiKey = Meta WhatsApp Access Token
 * - senderNumber = Meta Phone Number ID (not the phone number itself)
 * - apiUrl = Meta Graph API base URL
 */
async function getChatMintConfig() {
  let apiUrl: string;
  let apiKey: string;
  let phoneNumberId: string;

  try {
    apiUrl = await getIntegrationConfig("chatmint", "apiUrl");
  } catch {
    apiUrl = process.env.CHATMINT_API_URL ?? "https://graph.facebook.com/v21.0";
  }

  try {
    apiKey = await getIntegrationConfig("chatmint", "apiKey");
  } catch {
    apiKey = process.env.CHATMINT_API_KEY ?? "";
  }

  try {
    phoneNumberId = await getIntegrationConfig("chatmint", "senderNumber");
  } catch {
    phoneNumberId = process.env.CHATMINT_SENDER_NUMBER ?? "";
  }

  return { apiUrl, apiKey, phoneNumberId };
}

/**
 * Send a template message via Meta WhatsApp Cloud API.
 */
async function sendChatMintMessage(
  phone: string,
  templateName: string,
  templateParams: string[],
  checkoutId?: string
): Promise<SendResult> {
  const chatmint = await getChatMintConfig();

  // Clean phone: ensure format like 919876543210 (no + prefix)
  const cleanPhone = phone.replace(/^\+/, "").replace(/\D/g, "");

  // Build Meta Cloud API payload
  const payload = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: templateParams.map((text) => ({
            type: "text",
            text,
          })),
        },
      ],
    },
  };

  // Meta Cloud API endpoint: POST /{phone_number_id}/messages
  const url = `${chatmint.apiUrl}/${chatmint.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chatmint.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    const success = response.ok;
    const messageId = data.messages?.[0]?.id ?? data.message_id ?? data.id;
    const errorMsg = success
      ? undefined
      : data.error?.message ?? data.message ?? JSON.stringify(data);

    const result: SendResult = {
      success,
      messageId,
      error: errorMsg,
    };

    await loggerService.logWhatsappOutbound({
      recipient: cleanPhone,
      messageType: templateName,
      payload: { request: payload, response: data },
      status: result.success ? "sent" : "failed",
      error: result.error,
      checkoutId,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error";

    await loggerService.logWhatsappOutbound({
      recipient: cleanPhone,
      messageType: templateName,
      payload: { request: payload, error: errorMessage },
      status: "failed",
      error: errorMessage,
      checkoutId,
    });

    return { success: false, error: errorMessage };
  }
}

export const whatsappService: WhatsAppService = {
  async sendPaymentLink({ phone, customerName, productName, linkUrl, amount }) {
    const templateName = await getTemplateName("tplPaymentLink");
    return sendChatMintMessage(phone, templateName, [
      customerName,
      productName,
      amount,
      linkUrl,
    ]);
  },

  async sendPaymentConfirmation({ phone, customerName, orderRef, amount }) {
    const templateName = await getTemplateName("tplPaymentConfirmation");
    return sendChatMintMessage(phone, templateName, [
      customerName,
      amount,
      orderRef,
    ]);
  },

  async sendTrackingInfo({
    phone,
    customerName,
    orderRef,
    trackingNumber,
    courierName,
    trackingUrl,
  }) {
    const templateName = await getTemplateName("tplTrackingInfo");
    return sendChatMintMessage(phone, templateName, [
      customerName,
      orderRef,
      courierName,
      trackingNumber,
      trackingUrl,
    ]);
  },
};

/**
 * Wrapper that includes checkoutId for logging context.
 */
export async function sendPaymentLinkMessage(
  phone: string,
  customerName: string,
  productName: string,
  linkUrl: string,
  amount: string,
  checkoutId: string
): Promise<SendResult> {
  const templateName = await getTemplateName("tplPaymentLink");
  return sendChatMintMessage(
    phone,
    templateName,
    [customerName, productName, amount, linkUrl],
    checkoutId
  );
}
