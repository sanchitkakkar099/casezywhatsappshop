import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, UnauthorizedError } from "@/lib/errors";

/**
 * GET /api/admin/marketing/campaigns
 *
 * List all marketing campaigns.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") ?? "1"));
    const limit = 20;
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      db.marketingCampaign.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.marketingCampaign.count(),
    ]);

    return Response.json({
      campaigns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/admin/marketing/campaigns
 *
 * Create a new marketing campaign.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const body = await request.json();
    const { name, templateName, audience, customerIds } = body as {
      name: string;
      templateName: string;
      audience: string;
      customerIds?: string[];
    };

    if (!name || !templateName) {
      return Response.json(
        { error: "Campaign name and template are required." },
        { status: 400 }
      );
    }

    // Get target customers based on audience
    let customers;
    if (customerIds && customerIds.length > 0) {
      // Custom selection
      customers = await db.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, phone: true },
      });
    } else {
      const where: Record<string, unknown> = {};
      if (audience === "paid") {
        where.checkouts = { some: { paymentStatus: "SUCCESS" } };
      } else if (audience === "unpaid") {
        where.checkouts = {
          some: {},
          every: { paymentStatus: { not: "SUCCESS" } },
        };
      } else if (audience === "repeat") {
        // Will filter after fetch
        where.checkouts = { some: { paymentStatus: "SUCCESS" } };
      }
      // "all" = no filter

      customers = await db.customer.findMany({
        where,
        select: {
          id: true,
          phone: true,
          _count: { select: { checkouts: { where: { paymentStatus: "SUCCESS" } } } },
        },
      });

      if (audience === "repeat") {
        customers = customers.filter(
          (c: { _count: { checkouts: number } }) => c._count.checkouts >= 2
        );
      }
    }

    // Create campaign
    const campaign = await db.marketingCampaign.create({
      data: {
        name,
        templateName,
        audience: customerIds ? "custom" : audience,
        totalRecipients: customers.length,
        createdBy: session.user?.email ?? "admin",
        messages: {
          create: customers.map((c: { id: string; phone: string }) => ({
            customerId: c.id,
            phone: c.phone,
            status: "pending",
          })),
        },
      },
    });

    return Response.json({ campaign, recipients: customers.length }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
