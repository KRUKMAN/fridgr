import { z } from 'npm:zod@3.25.76';

import { BaseUnit, IsoDateTime, QuantityBase, UuidV4 } from '../../helpers/validate.ts';

const InventoryLocation = z.enum(['private', 'fridge']);

const requireAtLeastOneMutableField = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((field) => field !== undefined);

export const createFridgeItemSchema = z
  .object({
    base_unit: BaseUnit,
    estimated_expiry: IsoDateTime.optional(),
    quantity_base: QuantityBase,
    source_id: UuidV4,
    source_type: z.string().trim().min(1),
    unit_display: z.string().trim().min(1),
  })
  .strict();

export const updateFridgeItemSchema = z
  .object({
    estimated_expiry: IsoDateTime.optional(),
    quantity_base: QuantityBase.optional(),
    unit_display: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine(requireAtLeastOneMutableField, {
    message: 'at least one mutable field must be provided',
  });

export const consumeFridgeItemSchema = z
  .object({
    base_unit: BaseUnit,
    create_diary_entry: z.boolean().optional(),
    quantity_base: QuantityBase,
  })
  .strict();

export const wasteFridgeItemSchema = z
  .object({
    base_unit: BaseUnit,
    quantity_base: QuantityBase,
    reason: z.string().trim().min(1).optional(),
  })
  .strict();

export const createPrivateInventoryItemSchema = z
  .object({
    base_unit: BaseUnit,
    estimated_expiry: IsoDateTime.optional(),
    household_id: UuidV4,
    quantity_base: QuantityBase,
    source_id: UuidV4,
    source_type: z.string().trim().min(1),
    storage_label: z.string().trim().min(1).optional(),
    unit_display: z.string().trim().min(1),
  })
  .strict();

export const consumePrivateInventoryItemSchema = z
  .object({
    base_unit: BaseUnit,
    create_diary_entry: z.boolean().optional(),
    household_id: UuidV4,
    quantity_base: QuantityBase,
  })
  .strict();

export const transferInventorySchema = z
  .object({
    base_unit: BaseUnit,
    household_id: UuidV4,
    quantity_base: QuantityBase,
    source_item_id: UuidV4,
    source_type: InventoryLocation,
    target_type: InventoryLocation,
  })
  .strict();
