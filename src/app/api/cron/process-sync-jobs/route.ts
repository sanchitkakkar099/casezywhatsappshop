import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { processPendingSyncJobs } from "@/services/shopify-sync.service";

/**
 * GET /api/cron/process-sync-jobs
 *
 * Processes pending Shopify sync jobs that are due for retry.
 * Call this via Vercel Cron or an external cron service every 5 minutes.
 *
 * Auth: Vercel Cron sends CRON_SECRET in Authorization header.
 * For external cron, use the WHATSAPP_INTAKE_API_KEY as a shared secret.
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Accept either Vercel's CRON_SECRET or our API key
  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    authHeader === `Bearer ${config.whatsappIntakeApiKey}`;

  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processPendingSyncJobs();
    return Response.json({
      status: "ok",
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron process-sync-jobs error:", error);
    return Response.json(
      { error: "Processing failed", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
