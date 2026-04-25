import { assertEquals } from 'jsr:@std/assert@1.0.19';

import { createPersonalFoodSchema } from './catalog.ts';
import { createFridgeItemSchema } from './inventory.ts';

const id = '11111111-1111-4111-8111-111111111111';

Deno.test('Wave 3 personal food schema uses flat API contract fields', () => {
  const parsed = createPersonalFoodSchema.safeParse({
    brand: 'Fridgr Test',
    carbs_mg_per_base: 2000,
    category: 'test',
    fat_mg_per_base: 3000,
    kcal_per_base: 120,
    linked_global_id: id,
    name: 'Contract Yogurt',
    protein_mg_per_base: 10000,
    serving_base_unit: 'g',
  });

  assertEquals(parsed.success, true);
});

Deno.test('Wave 3 personal food schema rejects stale nested nutrition payloads', () => {
  const parsed = createPersonalFoodSchema.safeParse({
    name: 'Legacy Yogurt',
    nutrition: {
      kcal: 120,
    },
  });

  assertEquals(parsed.success, false);
});

Deno.test('Wave 3 fridge schema accepts date-only expiry', () => {
  const parsed = createFridgeItemSchema.safeParse({
    base_unit: 'mass_mg',
    estimated_expiry: '2026-04-30',
    quantity_base: 1000,
    source_id: id,
    source_type: 'global',
    unit_display: '1 g',
  });

  assertEquals(parsed.success, true);
});

Deno.test('Wave 3 fridge schema rejects personal source type', () => {
  const parsed = createFridgeItemSchema.safeParse({
    base_unit: 'mass_mg',
    estimated_expiry: '2026-04-30',
    quantity_base: 1000,
    source_id: id,
    source_type: 'personal',
    unit_display: '1 g',
  });

  assertEquals(parsed.success, false);
});

Deno.test('Wave 3 fridge schema rejects datetime expiry', () => {
  const parsed = createFridgeItemSchema.safeParse({
    base_unit: 'mass_mg',
    estimated_expiry: '2026-04-30T12:00:00.000Z',
    quantity_base: 1000,
    source_id: id,
    source_type: 'global',
    unit_display: '1 g',
  });

  assertEquals(parsed.success, false);
});
