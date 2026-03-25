import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { errorResponse, UnauthorizedError, ValidationError } from "@/lib/errors";
import { checkoutIntakeSchema } from "@/lib/validation/checkout";
import { createCheckoutFromIntake } from "@/services/checkout.service";
import { loggerService } from "@/services/logger.service";

/**
 * Normalize ChatMint flat payload into the nested format our schema expects.
 *
 * ChatMint flows typically send address fields at the top level:
 *   { full_name, phone, email, address, house, city, state, pincode, country, ... }
 *
 * We transform these into:
 *   { full_name, phone, email, shipping_address: { line1, city, state, pincode, country } }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeIntakePayload(body: Record<string, any>): Record<string, any> {
  // If shipping_address is already a nested object, return as-is
  if (body.shipping_address && typeof body.shipping_address === "object") {
    return body;
  }

  // Build address from common flat field names ChatMint might use
  const line1 =
    body.address ||
    body.house ||
    body.house_number ||
    body.address_line1 ||
    body.line1 ||
    body.street ||
    "";

  const city = body.city || body.town || "";
  const state = body.state || body.province || "";
  const pincode = String(body.pincode || body.zip || body.postal_code || body.pin || "");
  const country = body.country || "India";

  const shipping_address = { line1, city, state, pincode, country };

  return {
    full_name: body.full_name || body.name || body.customer_name || "",
    email: body.email || body.customer_email || "",
    phone: String(body.phone || body.mobile || body.customer_phone || body.whatsapp || ""),
    product_id: body.product_id || "",
    quantity: body.quantity || 1,
    whatsapp_contact_id: body.whatsapp_contact_id || body.contact_id || "",
    shipping_address,
  };
}

/**
 * POST /api/whatsapp/checkout
 *
 * Receives customer + product data from WhatsApp automation.
 * Creates checkout, generates payment link, sends via WhatsApp.
 *
 * Auth: API key in x-api-key header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== config.whatsappIntakeApiKey) {
      throw new UnauthorizedError("Invalid API key");
    }

    const rawBody = await request.json();

    // Log inbound payload
    await loggerService.logWhatsappInbound(rawBody, rawBody.whatsapp_contact_id);

    // Normalize flat ChatMint payload into nested format if needed.
    // ChatMint flows send address as flat fields: address/house, city, state, pincode
    // at the top level rather than nested inside shipping_address.
    const normalized = normalizeIntakePayload(rawBody);
    console.log("Intake normalized payload:", JSON.stringify(normalized, null, 2));

    // Validate payload
    const parsed = checkoutIntakeSchema.safeParse(normalized);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      console.error("Checkout intake validation failed:", JSON.stringify({ rawBody: normalized, fieldErrors }, null, 2));
      throw new ValidationError(
        "Invalid checkout payload",
        fieldErrors
      );
    }

    // Process checkout
    const result = await createCheckoutFromIntake(parsed.data);

    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
