import crypto from "crypto";

/**
 * Verify Cashfree webhook signature.
 * Cashfree sends timestamp and signature in headers.
 */
export function verifyCashfreeSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string
): boolean {
  const payload = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Verify Shopify HMAC signature.
 * Shopify sends HMAC in X-Shopify-Hmac-Sha256 header.
 */
export function verifyShopifyHmac(
  rawBody: string,
  hmac: string,
  secret: string
): boolean {
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(expectedHmac)
  );
}
