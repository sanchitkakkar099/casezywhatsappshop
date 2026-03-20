// Shopify Admin REST API types (subset we need)

export interface ShopifyAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface ShopifyLineItem {
  variant_id: string;
  quantity: number;
  price: string;
}

export interface ShopifyCreateOrderRequest {
  order: {
    line_items: ShopifyLineItem[];
    customer:
      | { id: number }
      | {
          first_name: string;
          last_name: string;
          email: string;
          phone?: string;
        };
    email?: string;
    phone?: string;
    shipping_address: ShopifyAddress;
    billing_address: ShopifyAddress;
    financial_status: "paid";
    tags: string;
    note: string;
    note_attributes: { name: string; value: string }[];
    send_receipt: boolean;
    send_fulfillment_receipt: boolean;
  };
}

export interface ShopifyCreateOrderResponse {
  order: {
    id: number;
    order_number: number;
    name: string;
    created_at: string;
    financial_status: string;
    fulfillment_status: string | null;
    tags: string;
  };
}

// Shopify fulfillment webhook payload
export interface ShopifyFulfillmentWebhook {
  id: number;
  order_id: number;
  status: string;
  tracking_company: string | null;
  tracking_number: string | null;
  tracking_numbers: string[];
  tracking_url: string | null;
  tracking_urls: string[];
  created_at: string;
  updated_at: string;
  line_items: {
    id: number;
    variant_id: number;
    title: string;
    quantity: number;
  }[];
}
