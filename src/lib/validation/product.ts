import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens"),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  price: z.number().positive("Price must be positive"),
  currency: z.string().default("INR"),
  active: z.boolean().default(true),
  sku: z.string().optional(),
  shopifyProductId: z.string().optional(),
  shopifyVariantId: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
