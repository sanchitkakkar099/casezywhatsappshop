import { getIntegrationConfig } from "@/lib/config";
import { ExternalServiceError } from "@/lib/errors";
import type {
  ShopifyCreateOrderRequest,
  ShopifyCreateOrderResponse,
  ShopifyAddress,
} from "@/types/shopify";
import type { Checkout, Customer, Product } from "@prisma/client";

type AddressData = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  };
}

function toShopifyAddress(
  addr: AddressData,
  fullName: string,
  phone?: string
): ShopifyAddress {
  const { first, last } = splitName(fullName);
  return {
    first_name: first,
    last_name: last,
    address1: addr.line1,
    address2: addr.line2 ?? "",
    city: addr.city,
    province: addr.state,
    zip: addr.pincode,
    country: addr.country,
    phone,
  };
}

async function getShopifyConfig() {
  const storeDomain = await getIntegrationConfig("shopify", "storeDomain");
  const accessToken = await getIntegrationConfig("shopify", "accessToken");
  const apiVersion = await getIntegrationConfig("shopify", "apiVersion").catch(
    () => "2024-01"
  );
  const baseUrl = `https://${storeDomain}/admin/api/${apiVersion}`;

  return {
    storeDomain,
    accessToken,
    apiVersion,
    baseUrl,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
  };
}

/**
 * Create a paid order in Shopify from a completed checkout.
 */
export async function createShopifyOrder(
  checkout: Checkout & { customer: Customer; product: Product }
): Promise<ShopifyCreateOrderResponse> {
  if (!checkout.product.shopifyVariantId) {
    throw new ExternalServiceError(
      "Shopify",
      `Product "${checkout.product.name}" (${checkout.product.id}) has no shopifyVariantId mapped`
    );
  }

  const shopify = await getShopifyConfig();
  const { first, last } = splitName(checkout.customer.fullName);
  const shippingAddr = checkout.shippingAddress as unknown as AddressData;
  const billingAddr = checkout.billingAddress as unknown as AddressData;

  const body: ShopifyCreateOrderRequest = {
    order: {
      line_items: [
        {
          variant_id: checkout.product.shopifyVariantId,
          quantity: checkout.quantity,
          price: checkout.unitPrice.toString(),
        },
      ],
      customer: {
        first_name: first,
        last_name: last,
        email: checkout.customer.email,
        phone: checkout.customer.phone,
      },
      shipping_address: toShopifyAddress(
        shippingAddr,
        checkout.customer.fullName,
        checkout.customer.phone
      ),
      billing_address: toShopifyAddress(
        billingAddr,
        checkout.customer.fullName,
        checkout.customer.phone
      ),
      financial_status: "paid",
      tags: "whatsapp,casezy",
      note: `Source: WhatsApp | Ref: ${checkout.internalOrderReference}`,
      note_attributes: [
        {
          name: "internal_order_ref",
          value: checkout.internalOrderReference,
        },
        {
          name: "checkout_id",
          value: checkout.checkoutId,
        },
      ],
      send_receipt: false,
      send_fulfillment_receipt: false,
    },
  };

  const response = await fetch(`${shopify.baseUrl}/orders.json`, {
    method: "POST",
    headers: shopify.headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ExternalServiceError(
      "Shopify",
      `Failed to create order: ${JSON.stringify(data.errors ?? data)}`,
      data
    );
  }

  return data as ShopifyCreateOrderResponse;
}

/**
 * Get an order from Shopify by ID (for reconciliation).
 */
export async function getShopifyOrder(orderId: string) {
  const shopify = await getShopifyConfig();

  const response = await fetch(
    `${shopify.baseUrl}/orders/${orderId}.json`,
    {
      method: "GET",
      headers: shopify.headers,
    }
  );

  if (!response.ok) {
    throw new ExternalServiceError("Shopify", `Failed to get order ${orderId}`);
  }

  return response.json();
}
