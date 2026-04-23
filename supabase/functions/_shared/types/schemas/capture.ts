import { z } from 'npm:zod@3.25.76';

import { BaseUnit, IsoDateTime, QuantityBase, UuidV4 } from '../../helpers/validate.ts';

const CaptureItemSchema = z
  .object({
    action: z.string().trim().min(1),
    base_unit: BaseUnit.optional(),
    destination: z.enum(['private', 'fridge', 'diary']).optional(),
    quantity_base: QuantityBase.optional(),
    resolved_food_id: UuidV4.optional(),
    source_type: z.string().trim().min(1).optional(),
  })
  .strict();

export const captureReceiptSchema = z
  .object({
    household_id: UuidV4,
    raw_text: z.string().trim().min(1).optional(),
    receipt_image_url: z.string().url().optional(),
    store_name: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => value.raw_text !== undefined || value.receipt_image_url !== undefined, {
    message: 'receipt_image_url or raw_text is required',
  });

export const confirmCaptureSchema = z
  .object({
    capture_type: z.enum(['barcode', 'receipt', 'voice']),
    household_id: UuidV4,
    items: z.array(CaptureItemSchema).min(1),
  })
  .strict();

export const captureVoiceSchema = z
  .object({
    household_id: UuidV4,
    locale: z.string().trim().min(1).optional(),
    logged_at: IsoDateTime.optional(),
    transcript: z.string().trim().min(1),
  })
  .strict();
