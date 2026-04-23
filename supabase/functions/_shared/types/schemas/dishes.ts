import { z } from 'npm:zod@3.25.76';

import { BaseUnit, QuantityBase, UuidV4 } from '../../helpers/validate.ts';

const DishIngredientSchema = z
  .object({
    base_unit: BaseUnit,
    quantity_used_base: QuantityBase,
    source_item_id: UuidV4,
    source_type: z.string().trim().min(1),
  })
  .strict();

const ServeSplitPortionSchema = z
  .object({
    percentage: z.number().positive().max(100).optional(),
    quantity_base: QuantityBase.optional(),
    user_id: UuidV4,
  })
  .strict()
  .refine(
    (portion) => portion.percentage !== undefined || portion.quantity_base !== undefined,
    {
      message: 'percentage or quantity_base is required',
    },
  );

export const createDishSchema = z
  .object({
    ingredients: z.array(DishIngredientSchema).min(1),
    name: z.string().trim().min(1),
    output_scope: z.enum(['private', 'fridge']),
    recipe_template_id: UuidV4.optional(),
  })
  .strict();

export const serveSplitDishSchema = z
  .object({
    portions: z.array(ServeSplitPortionSchema).min(1),
  })
  .strict();
