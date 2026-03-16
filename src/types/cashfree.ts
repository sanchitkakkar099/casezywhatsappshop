// Cashfree Payment Links API types

export interface CashfreeCreateLinkRequest {
  link_id: string;
  link_amount: number;
  link_currency: string;
  link_purpose: string;
  link_expiry_time: string; // ISO 8601
  customer_details: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  link_meta?: {
    return_url?: string;
    notify_url?: string;
    upi_intent?: boolean;
  };
  link_notify?: {
    send_sms?: boolean;
    send_email?: boolean;
  };
  link_notes?: Record<string, string>;
}

export interface CashfreeCreateLinkResponse {
  cf_link_id: number;
  link_id: string;
  link_url: string;
  link_status: string;
  link_expiry_time: string;
}

export interface CashfreeLinkStatusResponse {
  cf_link_id: number;
  link_id: string;
  link_status: string;
  link_amount: number;
  link_currency: string;
  link_url: string;
}

// Webhook event payload from Cashfree
export interface CashfreeWebhookEvent {
  data: {
    order: {
      order_id: string;
      order_amount: number;
      order_currency: string;
      order_tags?: Record<string, string>;
    };
    payment: {
      cf_payment_id: number;
      payment_status: string;
      payment_amount: number;
      payment_currency: string;
      payment_message: string;
      payment_time: string;
      payment_method?: {
        [key: string]: unknown;
      };
    };
    customer_details?: {
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      customer_id?: string;
    };
    payment_gateway_details?: {
      gateway_name: string;
      gateway_order_id: string;
      gateway_payment_id: string;
    };
    error_details?: {
      error_code: string;
      error_description: string;
      error_reason: string;
      error_source: string;
    };
  };
  event_time: string;
  type: string; // e.g., "PAYMENT_SUCCESS_WEBHOOK", "PAYMENT_FAILED_WEBHOOK"
}
