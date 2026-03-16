import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getIntegrationConfig } from "@/lib/config";
import { errorResponse, UnauthorizedError } from "@/lib/errors";
import { loggerService } from "@/services/logger.service";

export const dynamic = 'force-dynamic';

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  images: Array<{ src: string }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string | null;
  }>;
  status: string;
}

/**
 * POST /api/admin/products/sync-shopify
 *
 * Fetches all products from Shopify and upserts them locally.
 * Each Shopify variant becomes a separate local product.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    // Get Shopify config from DB
    const storeDomain = await getIntegrationConfig("shopify", "storeDomain");
    const accessToken = await getIntegrationConfig("shopify", "accessToken");
    const apiVersion = await getIntegrationConfig("shopify", "apiVersion").catch(() => "2024-01");
    const shopifyBaseUrl = `https://${storeDomain}/admin/api/${apiVersion}`;

    // Fetch all products from Shopify (paginated)
    const allProducts: ShopifyProduct[] = [];
    let pageInfo: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const fetchUrl: string = pageInfo
        ? `${shopifyBaseUrl}/products.json?limit=250&page_info=${pageInfo}`
        : `${shopifyBaseUrl}/products.json?limit=250&status=active`;

      const response: Response = await fetch(fetchUrl, {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      });

      if (!response.ok) {
        const err: string = await response.text();
        return Response.json(
          { error: `Shopify API error: ${response.status} — ${err}` },
          { status: 502 }
        );
      }

      const data = await response.json();
      allProducts.push(...(data.products ?? []));

      // Check for next page via Link header
      const linkHeader: string | null = response.headers.get("link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match: RegExpMatchArray | null = linkHeader.match(/page_info=([^>&]*)/);
        pageInfo = match ? match[1] : null;
        hasMore = !!pageInfo;
      } else {
        hasMore = false;
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const shopifyProduct of allProducts) {
      const imageUrl = shopifyProduct.images?.[0]?.src ?? null;

      for (const variant of shopifyProduct.variants) {
        const shopifyProductId = String(shopifyProduct.id);
        const shopifyVariantId = String(variant.id);

        // Build a unique slug from product handle + variant title
        const slug =
          shopifyProduct.variants.length === 1
            ? shopifyProduct.handle
            : `${shopifyProduct.handle}-${variant.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`;

        // Product name includes variant if multiple variants
        const name =
          shopifyProduct.variants.length === 1
            ? shopifyProduct.title
            : `${shopifyProduct.title} — ${variant.title}`;

        try {
          // Try to find existing product by Shopify variant ID
          const existing = await db.product.findFirst({
            where: { shopifyVariantId },
          });

          if (existing) {
            // Update existing product
            await db.product.update({
              where: { id: existing.id },
              data: {
                name,
                slug: existing.slug, // Keep existing slug to avoid breaking references
                description: shopifyProduct.body_html
                  ? stripHtml(shopifyProduct.body_html)
                  : existing.description,
                imageUrl: imageUrl ?? existing.imageUrl,
                price: parseFloat(variant.price),
                sku: variant.sku ?? existing.sku,
                shopifyProductId,
                active: shopifyProduct.status === "active",
              },
            });
            updated++;
          } else {
            // Check if slug already exists
            const slugExists = await db.product.findUnique({
              where: { slug },
            });

            const finalSlug = slugExists
              ? `${slug}-${shopifyVariantId}`
              : slug;

            // Create new product
            await db.product.create({
              data: {
                name,
                slug: finalSlug,
                description: shopifyProduct.body_html
                  ? stripHtml(shopifyProduct.body_html)
                  : null,
                imageUrl,
                price: parseFloat(variant.price),
                currency: "INR",
                active: shopifyProduct.status === "active",
                sku: variant.sku,
                shopifyProductId,
                shopifyVariantId,
              },
            });
            created++;
          }
        } catch (error) {
          console.error(
            `Failed to sync variant ${shopifyVariantId}:`,
            error
          );
          skipped++;
        }
      }
    }

    await loggerService.logAudit({
      actor: session.user?.email ?? "admin",
      action: "products.shopify_sync",
      entity: "product",
      entityId: "bulk",
      details: {
        shopifyProductCount: allProducts.length,
        created,
        updated,
        skipped,
      },
    });

    return Response.json({
      success: true,
      shopifyProducts: allProducts.length,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Strip HTML tags from Shopify product descriptions */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
