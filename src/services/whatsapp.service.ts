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
 * Get ChatMint API config, preferring DB settings with env fallback.
 */
async function getChatMintConfig() {
  let apiUrl: string;
  let apiKey: string;
  let senderNumber: string;

  try {
    apiUrl = await getIntegrationConfig("chatmint", "apiUrl");
  } catch {
    apiUrl = process.env.CHATMINT_API_URL ?? "https://backend.chatmint.in/api";
  }

  try {
    apiKey = await getIntegrationConfig("chatmint", "apiKey");
  } catch {
    apiKey = process.env.CHATMINT_API_KEY ?? "";
  }

  try {
    senderNumber = await getIntegrationConfig("chatmint", "senderNumber");
  } catch {
    senderNumber = process.env.CHATMINT_SENDER_NUMBER ?? "";
  }

  return { apiUrl, apiKey, senderNumber };
}

/**
 * Send a template message via ChatMint API.
 */
async function sendChatMintMessage(
  phone: string,
  templateName: string,
  templateParams: string[],
  checkoutId?: string
): Promise<SendResult> {
  const chatmint = await getChatMintConfig();

  const payload = {
    sender: chatmint.senderNumber,
    recipient: phone,
    template_name: templateName,
    template_params: templateParams,
  };

  try {
    const response = await fetch(`${chatmint.apiUrl}/send-template`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chatmint.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    const result: SendResult = {
      success: response.ok,
      messageId: data.message_id ?? data.id,
      error: response.ok ? undefined : (data.message ?? data.error ?? "Unknown error"),
    };

    await loggerService.logWhatsappOutbound({
      recipient: phone,
      messageType: templateName,
      payload: { request: payload, response: data },
      status: result.success ? "sent" : "failed",
      error: result.error,
      checkoutId,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network error";

    await loggerService.logWhatsappOutbound({
      recipient: phone,
      messageType: templateName,
      payload: { request: payload, error: errorMessage },
      status: "failed",
      error: errorMessage,
      checkoutId,
    });

    return { success: false, error: errorMessage };
  }
}

export const whatsappService: WhatsAppService & {
  sendPaymentLink: WhatsAppService["sendPaymentLink"] & { checkoutId?: string };
} = {
  async sendPaymentLink({ phone, customerName, productName, linkUrl, amount }) {
    const templateName = await getTemplateName("tplPaymentLink");
    return sendChatMintMessage(
      phone,
      templateName,
      [customerName, productName, amount, linkUrl]
    );
  },

  async sendPaymentConfirmation({ phone, customerName, orderRef, amount }) {
    const templateName = await getTemplateName("tplPaymentConfirmation");
    return sendChatMintMessage(
      phone,
      templateName,
      [customerName, amount, orderRef]
    );
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
    return sendChatMintMessage(
      phone,
      templateName,
      [customerName, orderRef, courierName, trackingNumber, trackingUrl]
    );
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
  const chatmint = await getChatMintConfig();
  const templateName = await getTemplateName("tplPaymentLink");

  const payload = {
    sender: chatmint.senderNumber,
    recipient: phone,
    template_name: templateName,
    template_params: [customerName, productName, amount, linkUrl],
  };

  try {
    const response = await fetch(`${chatmint.apiUrl}/send-template`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chatmint.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const success = response.ok;

    await loggerService.logWhatsappOutbound({
      recipient: phone,
      messageType: templateName,
      payload: { request: payload, response: data },
      status: success ? "sent" : "failed",
      error: success ? undefined : (data.message ?? "Unknown error"),
      checkoutId,
    });

    return {
      success,
      messageId: data.message_id ?? data.id,
      error: success ? undefined : (data.message ?? "Unknown error"),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network error";
    await loggerService.logWhatsappOutbound({
      recipient: phone,
      messageType: templateName,
      payload: { request: payload, error: errorMessage },
      status: "failed",
      error: errorMessage,
      checkoutId,
    });
    return { success: false, error: errorMessage };
  }
}
