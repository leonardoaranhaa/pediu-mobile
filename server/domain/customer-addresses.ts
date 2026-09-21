import { z } from "zod";

export const customerAddressInput = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(2).max(160),
  street: z.string().trim().min(2).max(180),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(120).optional(),
  neighborhood: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  postalCode: z.string().trim().max(12).optional(),
  reference: z.string().trim().max(180).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});

export type CustomerAddressInput = z.infer<typeof customerAddressInput>;

export function assertAddressOwner(addressUserId: number, authenticatedUserId: number) {
  if (addressUserId !== authenticatedUserId) throw new Error("Forbidden");
}
