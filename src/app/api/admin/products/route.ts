import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, UnauthorizedError } from "@/lib/errors";
import { createProductSchema } from "@/lib/validation/product";
import { loggerService } from "@/services/logger.service";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/products
 *
 * List products with search and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20")));
    const skip = (page - 1) * limit;
    const search = params.get("search")?.trim();
    const activeOnly = params.get("active") === "true";

    const where: Record<string, unknown> = {};
    if (activeOnly) where.active = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    return Response.json({ products, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/admin/products
 *
 * Create a new product.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl || undefined,
        price: parsed.data.price,
        currency: parsed.data.currency,
        active: parsed.data.active,
        sku: parsed.data.sku,
        shopifyProductId: parsed.data.shopifyProductId,
        shopifyVariantId: parsed.data.shopifyVariantId,
      },
    });

    await loggerService.logAudit({
      actor: session.user?.email ?? "admin",
      action: "product.create",
      entity: "product",
      entityId: product.id,
      details: { name: product.name, slug: product.slug },
    });

    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
