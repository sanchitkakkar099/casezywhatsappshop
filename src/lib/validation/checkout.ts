import { z } from "zod";

const addressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(4, "Valid pincode is required"),
  country: z.string().min(1, "Country is required").default("India"),
});

export const checkoutIntakeSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  // email is optional — WhatsApp flows often don't collect it
  email: z.string().email("Valid email is required").optional().default(""),
  phone: z
    .string()
    .min(10, "Valid phone number is required")
    .max(15)
    .regex(/^\+?\d{10,15}$/, "Phone must be a valid number"),
  shipping_address: addressSchema,
  // billing_address defaults to shipping_address if not provided
  billing_address: addressSchema.optional(),
  product_id: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().min(1).max(10).default(1),
  whatsapp_contact_id: z.string().optional(),
});

export type CheckoutIntakeInput = z.infer<typeof checkoutIntakeSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
