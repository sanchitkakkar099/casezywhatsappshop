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
 * Get ChatMint API config.
 * - apiKey = ChatMint API Key
 * - senderNumber = Meta Phone Number ID
 * - apiUrl = ChatMint API base URL
 */
async function getChatMintConfig() {
  let apiUrl: string;
  let apiKey: string;
  let phoneNumberId: string;

  try {
    apiUrl = await getIntegrationConfig("chatmint", "apiUrl");
  } catch {
    apiUrl =
      process.env.CHATMINT_API_URL ??
      "https://app.chatmint.in/api/v2/whatsapp-business";
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
 * Send a template message via ChatMint API.
 *
 * ChatMint uses a flat format:
 * {
 *   to, phoneNoId, type: "template",
 *   name, language, bodyParams: [...]
 * }
 *
 * Auth: Authorization: Api-Key {key}
 */
async function sendChatMintMessage(
  phone: string,
  templateName: string,
  templateParams: string[],
  checkoutId?: string
): Promise<SendResult> {
  const chatmint = await getChatMintConfig();

  // Clean phone: ensure format like 919876543210 (no + prefix)
  let cleanPhone = phone.replace(/^\+/, "").replace(/\D/g, "");
  // Prepend India country code if 10-digit number (no country code)
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  const payload = {
    to: cleanPhone,
    phoneNoId: chatmint.phoneNumberId,
    type: "template",
    name: templateName,
    language: "en",
    bodyParams: templateParams,
  };

  // ChatMint endpoint: POST {baseUrl}/messages
  const url = chatmint.apiUrl.endsWith("/messages")
    ? chatmint.apiUrl
    : `${chatmint.apiUrl}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${chatmint.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    const success = response.ok && !!data.id;
    const messageId = data.id;
    const errorMsg = success
      ? undefined
      : data.message ?? data.error ?? JSON.stringify(data);

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

/**
 * Send a plain text message via ChatMint API (for non-template messages).
 */
async function sendTextMessage(
  phone: string,
  text: string,
  checkoutId?: string
): Promise<SendResult> {
  const chatmint = await getChatMintConfig();
  let cleanPhone = phone.replace(/^\+/, "").replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  const payload = {
    to: cleanPhone,
    phoneNoId: chatmint.phoneNumberId,
    type: "text",
    text,
  };

  const url = chatmint.apiUrl.endsWith("/messages")
    ? chatmint.apiUrl
    : `${chatmint.apiUrl}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${chatmint.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const success = response.ok && !!data.id;

    await loggerService.logWhatsappOutbound({
      recipient: cleanPhone,
      messageType: "text",
      payload: { request: payload, response: data },
      status: success ? "sent" : "failed",
      error: success ? undefined : data.message,
      checkoutId,
    });

    return {
      success,
      messageId: data.id,
      error: success ? undefined : data.message,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error";
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

export { sendTextMessage };
