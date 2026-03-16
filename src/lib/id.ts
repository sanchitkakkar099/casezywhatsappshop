import crypto from "crypto";

// Generates a short, URL-safe, unique ID with a prefix.
// Format: PREFIX-XXXXXXXX (8 random hex chars = ~4 billion combinations)
function generatePrefixedId(prefix: string): string {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${random}`;
}

export function generateCheckoutId(): string {
  return generatePrefixedId("CKO");
}

export function generateOrderReference(): string {
  return generatePrefixedId("ORD");
}
