import { db } from "@/lib/db";

/**
 * Centralized logging service for all integration events.
 * Each method writes to its respective log table.
 */
export const loggerService = {
  async logWhatsappInbound(payload: unknown, source?: string) {
    return db.whatsappInboundLog.create({
      data: {
        payload: payload as object,
        source,
      },
    });
  },

  async logWhatsappOutbound(params: {
    recipient: string;
    messageType: string;
    payload: unknown;
    status?: string;
    error?: string;
    checkoutId?: string;
  }) {
    return db.whatsappOutboundLog.create({
      data: {
        recipient: params.recipient,
        messageType: params.messageType,
        payload: params.payload as object,
        status: params.status,
        error: params.error,
        checkoutId: params.checkoutId,
      },
    });
  },

  async logCashfreeWebhook(params: {
    eventType: string;
    cashfreeOrderId?: string;
    payload: unknown;
    signatureValid: boolean;
    processed?: boolean;
    idempotencyKey?: string;
  }) {
    return db.cashfreeWebhookLog.create({
      data: {
        eventType: params.eventType,
        cashfreeOrderId: params.cashfreeOrderId,
        payload: params.payload as object,
        signatureValid: params.signatureValid,
        processed: params.processed ?? false,
        idempotencyKey: params.idempotencyKey,
      },
    });
  },

  async logShopifyWebhook(params: {
    topic: string;
    shopifyOrderId?: string;
    payload: unknown;
    hmacValid: boolean;
    processed?: boolean;
    idempotencyKey?: string;
  }) {
    return db.shopifyWebhookLog.create({
      data: {
        topic: params.topic,
        shopifyOrderId: params.shopifyOrderId,
        payload: params.payload as object,
        hmacValid: params.hmacValid,
        processed: params.processed ?? false,
        idempotencyKey: params.idempotencyKey,
      },
    });
  },

  async logShopifySync(params: {
    checkoutId: string;
    action: string;
    success: boolean;
    shopifyOrderId?: string;
    request?: unknown;
    response?: unknown;
    error?: string;
  }) {
    return db.shopifySyncLog.create({
      data: {
        checkoutId: params.checkoutId,
        action: params.action,
        success: params.success,
        shopifyOrderId: params.shopifyOrderId,
        request: params.request as object | undefined,
        response: params.response as object | undefined,
        error: params.error,
      },
    });
  },

  async logAudit(params: {
    actor: string;
    action: string;
    entity: string;
    entityId: string;
    details?: unknown;
  }) {
    return db.auditLog.create({
      data: {
        actor: params.actor,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details as object | undefined,
      },
    });
  },
};
