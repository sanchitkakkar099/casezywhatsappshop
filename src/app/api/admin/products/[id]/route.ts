import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { updateProductSchema } from "@/lib/validation/product";
import { loggerService } from "@/services/logger.service";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/products/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const product = await db.product.findUnique({
      where: { id: params.id },
    });

    if (!product) throw new NotFoundError("Product", params.id);

    return Response.json({ product });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PUT /api/admin/products/:id
 *
 * Update a product.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.product.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundError("Product", params.id);

    const product = await db.product.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        imageUrl: parsed.data.imageUrl || undefined,
      },
    });

    await loggerService.logAudit({
      actor: session.user?.email ?? "admin",
      action: "product.update",
      entity: "product",
      entityId: product.id,
      details: { changes: parsed.data },
    });

    return Response.json({ product });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/admin/products/:id
 *
 * Soft-delete: sets active = false.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const existing = await db.product.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundError("Product", params.id);

    await db.product.update({
      where: { id: params.id },
      data: { active: false },
    });

    await loggerService.logAudit({
      actor: session.user?.email ?? "admin",
      action: "product.delete",
      entity: "product",
      entityId: params.id,
    });

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
