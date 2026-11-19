# LeanPlate data and assets

## Nutrition

Publisher: U.S. Department of Agriculture, Agricultural Research Service.

Dataset: **USDA FoodData Central — SR Legacy, April 2018**. The archive’s food records carry a FoodData Central publication date of April 1, 2019; the underlying dataset is the April 2018 SR Legacy release.

- Official download index: https://fdc.nal.usda.gov/download-datasets/
- Exact archive: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
- Downloaded: **November 9, 2026**.
- Original archive SHA-256: `b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0`.
- Source tables: `food.csv`, `food_nutrient.csv`, `sr_legacy_food.csv`.

Thirty common foods were selected by FDC ID. Their friendly names and preparation subtitles are editorial labels; `description` preserves the complete original USDA description, and `ndb` preserves the original NDB number. Each food has its own USDA record URL. The app does not invent or estimate missing nutrient values; all four required values were present in each selected record.

| LeanPlate field | USDA nutrient ID | Meaning | Unit per 100 g edible portion |
| --- | --- | --- | --- |
| calories | 1008 | Energy | kcal |
| protein | 1003 | Protein | g |
| fat | 1004 | Total lipid (fat) | g |
| carbs | 1005 | Carbohydrate, by difference | g |

The full selected records and provenance are in `data/foods.json`, `data/foods.js`, and `data/foods.csv`. These are bundled, fixed local snapshots. No API key or network lookup is needed. Raw and cooked foods are explicitly distinguished.

An ingredient contribution is `source value × edible grams / 100`. Whole-meal totals sum the unrounded contributions. Per-serving totals divide the whole meal by its serving count. Only display values are rounded (whole kcal; one decimal gram). USDA energy is retained directly and is not recomputed from macros, so it need not equal a simplified 4/4/9 calculation. Carbohydrates are total carbohydrates, not net carbohydrates.

To reproduce the extraction, download the exact archive above and run, from this folder:

```text
python tools/build-foods.py /path/to/FoodData_Central_sr_legacy_food_csv_2018-04.zip
```

This rewrites the three generated food data files in this project only. **Success:** the script reports 30 extracted foods and the archive hash above. Python 3 is needed only for rebuilding data, never for using the app.

## Photograph and brand

`assets/salmon-bowl.png` is a generated photographic illustration created for LeanPlate on November 9, 2026. It is decorative, not a measured recipe, and is bundled locally. There is no image generation or other AI functionality in the running app. The leaf mark and small interface icons are local SVG geometry, with no external icon service or font dependency.

`assets/landing/food-table.png` is a separate generated photographic illustration created for the welcome page on November 9, 2026 (2172 × 724 pixels). It depicts a salmon and quinoa bowl on a light stone table, with linen, avocado, and tomatoes. It is bundled locally and cropped responsively by CSS; no online image service, font, or script is needed. The welcome page does not change the original app photograph.

## Storage

The local storage key is `leanplate.meals.v1`. The backup format is `{ "version": 1, "meals": [...] }`, with meal IDs, names, servings, and ingredient food IDs plus gram amounts. The app validates restored records against the bundled food list before offering replacement. It never silently overwrites malformed stored data.
