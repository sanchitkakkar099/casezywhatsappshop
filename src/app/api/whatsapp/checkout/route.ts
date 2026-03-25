import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { errorResponse, UnauthorizedError, ValidationError } from "@/lib/errors";
import { checkoutIntakeSchema } from "@/lib/validation/checkout";
import { createCheckoutFromIntake } from "@/services/checkout.service";
import { loggerService } from "@/services/logger.service";

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

    // Validate payload
    const parsed = checkoutIntakeSchema.safeParse(rawBody);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      console.error("Checkout intake validation failed:", JSON.stringify({ rawBody, fieldErrors }, null, 2));
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
