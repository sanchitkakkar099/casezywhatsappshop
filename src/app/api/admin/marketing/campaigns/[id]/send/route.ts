import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { getIntegrationConfig } from "@/lib/config";
import { DEFAULT_TEMPLATES } from "@/lib/integration-keys";
import { loggerService } from "@/services/logger.service";
import { errorResponse, UnauthorizedError, NotFoundError } from "@/lib/errors";

/**
 * POST /api/admin/marketing/campaigns/[id]/send
 *
 * Send all pending messages in a campaign.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const campaign = await db.marketingCampaign.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          where: { status: "pending" },
          include: { customer: true },
        },
      },
    });

    if (!campaign) throw new NotFoundError("Campaign", params.id);

    if (campaign.status === "COMPLETED") {
      return Response.json(
        { error: "This campaign has already been sent." },
        { status: 400 }
      );
    }

    // Mark campaign as sending
    await db.marketingCampaign.update({
      where: { id: params.id },
      data: { status: "SENDING", startedAt: new Date() },
    });

    // Get ChatMint config
    let apiUrl: string, apiKey: string, senderNumber: string;
    try {
      apiUrl = await getIntegrationConfig("chatmint", "apiUrl");
    } catch {
      apiUrl = config.chatmint.apiUrl;
    }
    try {
      apiKey = await getIntegrationConfig("chatmint", "apiKey");
    } catch {
      apiKey = config.chatmint.apiKey;
    }
    try {
      senderNumber = await getIntegrationConfig("chatmint", "senderNumber");
    } catch {
      senderNumber = config.chatmint.senderNumber;
    }

    let sentCount = 0;
    let failedCount = 0;

    // Send messages (in batches to avoid rate limits)
    for (const msg of campaign.messages) {
      try {
        const payload = {
          sender: senderNumber,
          recipient: msg.phone,
          template_name: campaign.templateName,
          template_params: [msg.customer.fullName],
        };

        const response = await fetch(`${apiUrl}/send-template`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
          await db.campaignMessage.update({
            where: { id: msg.id },
            data: {
              status: "sent",
              messageId: data.message_id ?? data.id,
              sentAt: new Date(),
            },
          });
          sentCount++;
        } else {
          await db.campaignMessage.update({
            where: { id: msg.id },
            data: {
              status: "failed",
              error: data.message ?? data.error ?? "Send failed",
            },
          });
          failedCount++;
        }

        // Log to outbound
        await loggerService.logWhatsappOutbound({
          recipient: msg.phone,
          messageType: `campaign:${campaign.templateName}`,
          payload: { request: payload, response: data },
          status: response.ok ? "sent" : "failed",
          error: response.ok ? undefined : (data.message ?? "Failed"),
        });

        // Small delay to avoid rate limits (100ms between messages)
        await new Promise((r) => setTimeout(r, 100));
      } catch (error) {
        await db.campaignMessage.update({
          where: { id: msg.id },
          data: {
            status: "failed",
            error: error instanceof Error ? error.message : "Network error",
          },
        });
        failedCount++;
      }
    }

    // Mark campaign complete
    await db.marketingCampaign.update({
      where: { id: params.id },
      data: {
        status: failedCount === campaign.messages.length ? "FAILED" : "COMPLETED",
        sentCount: campaign.sentCount + sentCount,
        failedCount: campaign.failedCount + failedCount,
        completedAt: new Date(),
      },
    });

    await loggerService.logAudit({
      actor: session.user?.email ?? "admin",
      action: "campaign.send",
      entity: "MarketingCampaign",
      entityId: params.id,
      details: { sentCount, failedCount, templateName: campaign.templateName },
    });

    return Response.json({ success: true, sentCount, failedCount });
  } catch (error) {
    return errorResponse(error);
  }
}
