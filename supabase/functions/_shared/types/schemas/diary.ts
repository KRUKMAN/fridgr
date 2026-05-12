import { z } from 'npm:zod@3.25.76';

import { BaseUnit, IsoDateTime, QuantityBase, UuidV4 } from '../../helpers/validate.ts';

export const createDiaryEntrySchema = z
  .object({
    base_unit: BaseUnit,
    carbs_mg: z.number().int().nonnegative(),
    confidence: z.number().min(0).max(1).optional(),
    fat_mg: z.number().int().nonnegative(),
    food_name: z.string().trim().min(1),
    household_id: UuidV4,
    is_quick_estimate: z.boolean().optional(),
    kcal: z.number().nonnegative(),
    logged_at: IsoDateTime,
    protein_mg: z.number().int().nonnegative(),
    quantity_base: QuantityBase,
    source_id: UuidV4.optional(),
    source_scope: z.string().trim().min(1),
  })
  .strict();

export const diaryEntriesQuerySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    household_id: UuidV4.optional(),
  })
  .strict();

export const correctDiaryEntrySchema = z
  .object({
    reason: z.string().trim().min(1).optional(),
    replacement: z
      .object({
        base_unit: BaseUnit,
        carbs_mg: z.number().int().nonnegative(),
        confidence: z.number().min(0).max(1).optional(),
        fat_mg: z.number().int().nonnegative(),
        food_name: z.string().trim().min(1),
        is_quick_estimate: z.boolean().optional(),
        kcal: z.number().nonnegative(),
        logged_at: IsoDateTime.optional(),
        protein_mg: z.number().int().nonnegative(),
        quantity_base: QuantityBase,
        source_id: UuidV4.optional(),
        source_scope: z.string().trim().min(1).optional(),
      })
      .strict(),
  })
  .strict();

export const diarySummaryQuerySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    household_id: UuidV4.optional(),
  })
  .strict();
