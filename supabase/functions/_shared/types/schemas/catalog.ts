import { z } from 'npm:zod@3.25.76';

import { UuidV4 } from '../../helpers/validate.ts';

const NutritionFieldsSchema = z
  .object({
    carbs_mg: z.number().int().nonnegative().optional(),
    fat_mg: z.number().int().nonnegative().optional(),
    kcal: z.number().nonnegative().optional(),
    protein_mg: z.number().int().nonnegative().optional(),
  })
  .strict();

export const searchFoodsSchema = z
  .object({
    barcode: z.string().trim().min(1).optional(),
    household_id: UuidV4.optional(),
    query: z.string().trim().min(1).optional(),
    scope: z.enum(['global', 'personal', 'household', 'all']).optional(),
  })
  .strict()
  .refine((value) => value.query !== undefined || value.barcode !== undefined, {
    message: 'query or barcode is required',
  });

export const createPersonalFoodSchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    linked_global_id: UuidV4.optional(),
    name: z.string().trim().min(1),
    nutrition: NutritionFieldsSchema.optional(),
  })
  .strict();

export const createFoodVariationSchema = z
  .object({
    canonical_food_id: UuidV4.optional(),
    household_id: UuidV4.optional(),
    name: z.string().trim().min(1),
    nutrition: NutritionFieldsSchema.optional(),
    scope: z.enum(['personal', 'household']),
    source_context: z.string().trim().min(1).optional(),
  })
  .strict();

export const updateFoodVariationSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    nutrition: NutritionFieldsSchema.optional(),
    status: z.enum(['unresolved', 'confirmed', 'promoted']).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'at least one mutable field must be provided',
  });
