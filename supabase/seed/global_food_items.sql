-- Developer-only seed data for public.global_food_items.
-- Run this only against a local/dev database after the catalog tables exist.
-- Intentionally do not wire this into shared or staging seed automation.
-- Idempotence relies on a WHERE NOT EXISTS check because canonical_name is
-- not unique in the current schema.

DO $$
BEGIN
  IF to_regclass('public.global_food_items') IS NULL THEN
    RAISE EXCEPTION 'public.global_food_items must exist before running this seed';
  END IF;
END
$$;

WITH seed_rows (
  canonical_name,
  brand,
  barcode,
  category,
  nutrition_basis,
  density_mg_per_ml,
  kcal_per_100_unit,
  protein_mg_per_100_unit,
  carbs_mg_per_100_unit,
  fat_mg_per_100_unit,
  fiber_mg_per_100_unit,
  default_serving_g,
  default_shelf_life_days,
  source_type,
  quality_score
) AS (
  VALUES
    ('Apple', NULL, NULL, 'produce', 'per_100g', NULL, 52, 300, 14000, 200, 2400, 182, 30, 'curated', 0.8),
    ('Banana', NULL, NULL, 'produce', 'per_100g', NULL, 89, 1100, 23000, 300, 2600, 118, 7, 'curated', 0.8),
    ('Orange', NULL, NULL, 'produce', 'per_100g', NULL, 47, 900, 12000, 100, 2400, 140, 21, 'curated', 0.8),
    ('Strawberry', NULL, NULL, 'produce', 'per_100g', NULL, 32, 700, 7700, 300, 2000, 80, 5, 'curated', 0.8),
    ('Blueberry', NULL, NULL, 'produce', 'per_100g', NULL, 57, 700, 14500, 300, 2400, 80, 7, 'curated', 0.8),
    ('Tomato', NULL, NULL, 'produce', 'per_100g', NULL, 18, 900, 3900, 200, 1200, 123, 7, 'curated', 0.8),
    ('Cucumber', NULL, NULL, 'produce', 'per_100g', NULL, 15, 700, 3600, 100, 500, 100, 7, 'curated', 0.8),
    ('Carrot', NULL, NULL, 'produce', 'per_100g', NULL, 41, 900, 10000, 200, 2800, 61, 21, 'curated', 0.8),
    ('Onion', NULL, NULL, 'produce', 'per_100g', NULL, 40, 1100, 9300, 100, 1700, 110, 30, 'curated', 0.8),
    ('Potato', NULL, NULL, 'produce', 'per_100g', NULL, 77, 2000, 17000, 100, 2200, 150, 30, 'curated', 0.8),
    ('Spinach', NULL, NULL, 'produce', 'per_100g', NULL, 23, 2900, 3600, 400, 2200, 30, 5, 'curated', 0.8),
    ('Broccoli', NULL, NULL, 'produce', 'per_100g', NULL, 34, 2800, 7000, 400, 2600, 91, 7, 'curated', 0.8),

    ('Chicken Egg', NULL, NULL, 'dairy_and_eggs', 'per_100g', NULL, 143, 12600, 700, 9500, NULL, 50, 21, 'curated', 0.8),
    ('Butter, Salted', NULL, NULL, 'dairy_and_eggs', 'per_100g', NULL, 717, 900, 100, 81000, NULL, 10, 90, 'curated', 0.8),
    ('Greek Yogurt, Plain 2%', NULL, NULL, 'dairy_and_eggs', 'per_100g', NULL, 73, 10000, 3600, 2000, NULL, 170, 21, 'curated', 0.8),
    ('Kefir, Plain 2%', NULL, NULL, 'dairy_and_eggs', 'per_100g', NULL, 51, 3400, 4700, 2000, NULL, 250, 14, 'curated', 0.8),
    ('Twarog, Semi-Fat', NULL, NULL, 'dairy_and_eggs', 'per_100g', NULL, 133, 19000, 3300, 6500, NULL, 100, 10, 'curated', 0.8),
    ('Cheddar Cheese', NULL, NULL, 'dairy_and_eggs', 'per_100g', NULL, 403, 25000, 1300, 33000, NULL, 30, 45, 'curated', 0.8),
    ('Mozzarella', NULL, NULL, 'dairy_and_eggs', 'per_100g', NULL, 280, 22000, 3000, 17000, NULL, 30, 14, 'curated', 0.8),
    ('Sour Cream 18%', NULL, NULL, 'dairy_and_eggs', 'per_100g', NULL, 193, 2400, 4500, 18000, NULL, 30, 21, 'curated', 0.8),
    ('Skyr Natural', 'Danone', '5901234567947', 'dairy_and_eggs', 'per_100g', NULL, 63, 11000, 4000, 200, NULL, 150, 21, 'curated', 0.8),
    ('Cottage Cheese, Plain', 'Piatnica', '5901234567978', 'dairy_and_eggs', 'per_100g', NULL, 97, 11000, 3000, 5000, NULL, 150, 10, 'curated', 0.8),

    ('Chicken Breast, Raw', NULL, NULL, 'meat_and_seafood', 'per_100g', NULL, 120, 22500, 0, 2600, NULL, 120, 3, 'curated', 0.8),
    ('Ground Beef 10% Fat, Raw', NULL, NULL, 'meat_and_seafood', 'per_100g', NULL, 176, 20000, 0, 10000, NULL, 125, 3, 'curated', 0.8),
    ('Salmon Fillet, Raw', NULL, NULL, 'meat_and_seafood', 'per_100g', NULL, 208, 20000, 0, 13000, NULL, 120, 2, 'curated', 0.8),
    ('Tuna in Water, Drained', NULL, NULL, 'meat_and_seafood', 'per_100g', NULL, 116, 26000, 0, 800, NULL, 100, 365, 'curated', 0.8),
    ('Tofu, Firm', NULL, NULL, 'meat_and_seafood', 'per_100g', NULL, 144, 17000, 3000, 9000, 1000, 100, 21, 'curated', 0.8),
    ('Turkey Breast Slices', NULL, NULL, 'meat_and_seafood', 'per_100g', NULL, 104, 17000, 2000, 2000, NULL, 50, 10, 'curated', 0.8),
    ('Pork Loin, Raw', NULL, NULL, 'meat_and_seafood', 'per_100g', NULL, 143, 21000, 0, 5000, NULL, 120, 3, 'curated', 0.8),
    ('Shrimp, Raw', NULL, NULL, 'meat_and_seafood', 'per_100g', NULL, 99, 24000, 200, 300, NULL, 100, 2, 'curated', 0.8),

    ('White Rice, Dry', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 365, 7100, 80000, 700, 1300, 75, 365, 'curated', 0.8),
    ('Brown Rice, Dry', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 370, 7800, 77000, 2900, 3500, 75, 365, 'curated', 0.8),
    ('Spaghetti, Dry', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 353, 12000, 71000, 1500, 3000, 80, 365, 'curated', 0.8),
    ('Rolled Oats, Dry', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 389, 16900, 66300, 6900, 10600, 50, 365, 'curated', 0.8),
    ('Wheat Bread', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 265, 9000, 49000, 3200, 2700, 40, 5, 'curated', 0.8),
    ('Whole Wheat Bread', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 247, 13000, 41000, 4200, 6800, 40, 5, 'curated', 0.8),
    ('All-Purpose Flour', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 364, 10300, 76000, 1000, 2700, 30, 365, 'curated', 0.8),
    ('Tortilla Wrap, Wheat', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 310, 8500, 51000, 8000, 3500, 60, 14, 'curated', 0.8),
    ('Buckwheat Groats, Dry', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 343, 13300, 71000, 3400, 10000, 75, 365, 'curated', 0.8),
    ('Quinoa, Dry', NULL, NULL, 'grains_and_bakery', 'per_100g', NULL, 368, 14100, 64200, 6100, 7000, 75, 365, 'curated', 0.8),
    ('Spaghetti No. 4', 'Lubella', '5901234567954', 'grains_and_bakery', 'per_100g', NULL, 356, 12000, 72000, 1500, 3500, 80, 365, 'curated', 0.8),

    ('Olive Oil', NULL, NULL, 'pantry', 'per_100g', NULL, 884, 0, 0, 100000, NULL, 10, 365, 'curated', 0.8),
    ('Canola Oil', NULL, NULL, 'pantry', 'per_100g', NULL, 884, 0, 0, 100000, NULL, 10, 365, 'curated', 0.8),
    ('White Sugar', NULL, NULL, 'pantry', 'per_100g', NULL, 387, 0, 100000, 0, NULL, 5, 730, 'curated', 0.8),
    ('Honey', NULL, NULL, 'pantry', 'per_100g', NULL, 304, 300, 82400, 0, NULL, 15, 365, 'curated', 0.8),
    ('Peanut Butter, Smooth', NULL, NULL, 'pantry', 'per_100g', NULL, 588, 25000, 20000, 50000, 6000, 16, 180, 'curated', 0.8),
    ('Chickpeas, Canned Drained', NULL, NULL, 'pantry', 'per_100g', NULL, 164, 8900, 27400, 2600, 7600, 120, 365, 'curated', 0.8),
    ('Black Beans, Canned Drained', NULL, NULL, 'pantry', 'per_100g', NULL, 132, 8900, 23700, 500, 8700, 120, 365, 'curated', 0.8),
    ('Tomato Passata', NULL, NULL, 'pantry', 'per_100g', NULL, 29, 1400, 4800, 200, 1500, 125, 180, 'curated', 0.8),
    ('Hazelnut Spread', 'Ferrero', '5901234567992', 'pantry', 'per_100g', NULL, 539, 6100, 57100, 30800, 4000, 15, 365, 'curated', 0.8),

    ('Tomato Ketchup', 'Heinz', '5901234567893', 'condiments_and_sauces', 'per_100g', NULL, 112, 1300, 25700, 200, 300, 15, 90, 'curated', 0.8),
    ('Mayonnaise, Classic', NULL, NULL, 'condiments_and_sauces', 'per_100g', NULL, 680, 1000, 1000, 75000, NULL, 15, 180, 'curated', 0.8),
    ('Dijon Mustard', NULL, NULL, 'condiments_and_sauces', 'per_100g', NULL, 66, 4300, 5800, 3600, 3300, 10, 180, 'curated', 0.8),
    ('Soy Sauce', NULL, NULL, 'condiments_and_sauces', 'per_100ml', 1180, 53, 8000, 4800, 100, NULL, NULL, 365, 'curated', 0.8),
    ('Pesto, Basil', NULL, NULL, 'condiments_and_sauces', 'per_100g', NULL, 460, 4000, 7000, 45000, 3000, 20, 120, 'curated', 0.8),
    ('Sriracha Chili Sauce', NULL, NULL, 'condiments_and_sauces', 'per_100g', NULL, 93, 1000, 19000, 900, 800, 15, 365, 'curated', 0.8),

    ('Salted Potato Chips', 'Lays', '5901234567909', 'snacks_and_sweets', 'per_100g', NULL, 536, 6700, 53000, 35000, 4800, 30, 180, 'curated', 0.8),
    ('Original Potato Crisps', 'Pringles', '5901234567916', 'snacks_and_sweets', 'per_100g', NULL, 536, 4100, 52000, 34000, 3000, 30, 240, 'curated', 0.8),
    ('Milk Chocolate Bar', NULL, NULL, 'snacks_and_sweets', 'per_100g', NULL, 535, 7800, 59000, 30000, 3500, 25, 365, 'curated', 0.8),
    ('Salted Peanuts, Roasted', NULL, NULL, 'snacks_and_sweets', 'per_100g', NULL, 585, 24000, 21000, 50000, 8500, 30, 180, 'curated', 0.8),
    ('Popcorn, Salted Ready-to-Eat', NULL, NULL, 'snacks_and_sweets', 'per_100g', NULL, 500, 9000, 57000, 28000, 10000, 30, 180, 'curated', 0.8),
    ('Protein Bar, Chocolate', NULL, NULL, 'snacks_and_sweets', 'per_100g', NULL, 380, 30000, 35000, 12000, 8000, 60, 365, 'curated', 0.8),
    ('Dark Chocolate 70%', NULL, NULL, 'snacks_and_sweets', 'per_100g', NULL, 598, 7800, 46000, 43000, 11000, 20, 365, 'curated', 0.8),
    ('Classic Wafer Bar', 'Prince Polo', '5901234567985', 'snacks_and_sweets', 'per_100g', NULL, 516, 6000, 63000, 27000, 2800, 35, 240, 'curated', 0.8),

    ('Coca-Cola Original Taste', 'Coca-Cola', '5901234567923', 'beverages', 'per_100ml', 1040, 42, 0, 10600, 0, NULL, NULL, 365, 'curated', 0.8),
    ('Orange Juice, Not From Concentrate', NULL, NULL, 'beverages', 'per_100ml', 1045, 45, 700, 10400, 200, 200, NULL, 30, 'curated', 0.8),
    ('Apple Juice', NULL, NULL, 'beverages', 'per_100ml', 1045, 46, 100, 11200, 100, 200, NULL, 30, 'curated', 0.8),
    ('Carrot Apple Banana Drink', 'Kubus', '5901234567930', 'beverages', 'per_100ml', 1060, 43, 300, 10300, 100, 200, NULL, 180, 'curated', 0.8),
    ('Oat Drink, Unsweetened', NULL, NULL, 'beverages', 'per_100ml', 1030, 45, 1000, 6700, 1500, 800, NULL, 180, 'curated', 0.8),
    ('Apple Mint Drink', 'Tymbark', '5901234567961', 'beverages', 'per_100ml', 1040, 40, 0, 9900, 0, NULL, NULL, 180, 'curated', 0.8),

    ('Frozen Peas', NULL, NULL, 'frozen_and_convenience', 'per_100g', NULL, 81, 5400, 14500, 400, 5500, 100, 365, 'curated', 0.8),
    ('Frozen Mixed Vegetables', NULL, NULL, 'frozen_and_convenience', 'per_100g', NULL, 65, 2500, 10000, 500, 4000, 150, 365, 'curated', 0.8),
    ('Pierogi Ruskie, Frozen', NULL, NULL, 'frozen_and_convenience', 'per_100g', NULL, 220, 7000, 30000, 7000, 2000, 150, 180, 'curated', 0.8),
    ('French Fries, Oven Frozen', NULL, NULL, 'frozen_and_convenience', 'per_100g', NULL, 150, 2500, 23000, 4500, 2800, 120, 180, 'curated', 0.8),
    ('Pizza Margherita, Frozen', NULL, NULL, 'frozen_and_convenience', 'per_100g', NULL, 250, 11000, 30000, 9000, 2400, 140, 180, 'curated', 0.8),
    ('Fish Fingers, Frozen', NULL, NULL, 'frozen_and_convenience', 'per_100g', NULL, 230, 12000, 20000, 12000, 1000, 100, 180, 'curated', 0.8)
)
INSERT INTO public.global_food_items (
  canonical_name,
  brand,
  barcode,
  category,
  nutrition_basis,
  density_mg_per_ml,
  kcal_per_100_unit,
  protein_mg_per_100_unit,
  carbs_mg_per_100_unit,
  fat_mg_per_100_unit,
  fiber_mg_per_100_unit,
  default_serving_g,
  default_shelf_life_days,
  source_type,
  quality_score
)
SELECT
  seed_rows.canonical_name,
  seed_rows.brand,
  seed_rows.barcode,
  seed_rows.category,
  seed_rows.nutrition_basis,
  seed_rows.density_mg_per_ml,
  seed_rows.kcal_per_100_unit,
  seed_rows.protein_mg_per_100_unit,
  seed_rows.carbs_mg_per_100_unit,
  seed_rows.fat_mg_per_100_unit,
  seed_rows.fiber_mg_per_100_unit,
  seed_rows.default_serving_g,
  seed_rows.default_shelf_life_days,
  seed_rows.source_type,
  seed_rows.quality_score
FROM seed_rows
WHERE NOT EXISTS (
  SELECT 1
  FROM public.global_food_items existing
  WHERE existing.canonical_name = seed_rows.canonical_name
    AND COALESCE(existing.brand, '') = COALESCE(seed_rows.brand, '')
    AND COALESCE(existing.barcode, '') = COALESCE(seed_rows.barcode, '')
);
