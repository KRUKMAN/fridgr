import { z } from 'npm:zod@3.25.76';

import { BaseUnit, QuantityBase, UuidV4 } from '../../helpers/validate.ts';

const RecipeIngredientSchema = z
  .object({
    base_unit: BaseUnit,
    food_id: UuidV4,
    quantity_base: QuantityBase,
    source_scope: z.string().trim().min(1),
  })
  .strict();

export const listRecipesSchema = z
  .object({
    household_id: UuidV4.optional(),
    scope: z.enum(['personal', 'household']).optional(),
  })
  .strict();

export const createRecipeSchema = z
  .object({
    created_from_dish_batch_id: UuidV4.optional(),
    household_id: UuidV4.optional(),
    ingredients: z.array(RecipeIngredientSchema).min(1),
    name: z.string().trim().min(1),
    owner_scope: z.enum(['personal', 'household']),
  })
  .strict();

export const updateRecipeSchema = z
  .object({
    ingredients: z.array(RecipeIngredientSchema).min(1).optional(),
    name: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.ingredients !== undefined, {
    message: 'name or ingredients is required',
  });
