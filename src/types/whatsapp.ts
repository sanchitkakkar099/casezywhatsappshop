// WhatsApp messaging types (ChatMint abstraction)

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppService {
  sendPaymentLink(params: {
    phone: string;
    customerName: string;
    productName: string;
    linkUrl: string;
    amount: string;
  }): Promise<SendResult>;

  sendPaymentConfirmation(params: {
    phone: string;
    customerName: string;
    orderRef: string;
    amount: string;
  }): Promise<SendResult>;

  sendTrackingInfo(params: {
    phone: string;
    customerName: string;
    orderRef: string;
    trackingNumber: string;
    courierName: string;
    trackingUrl: string;
  }): Promise<SendResult>;
}
