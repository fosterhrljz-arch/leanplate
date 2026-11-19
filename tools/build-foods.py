"""Extract the curated records from the unmodified USDA SR Legacy CSV archive.
Usage: python tools/build-foods.py /path/to/FoodData_Central_sr_legacy_food_csv_2018-04.zip
No network requests; Python standard library only.
"""
import csv, hashlib, io, json, pathlib, sys, zipfile

SELECTION = [
 (171477, 'Chicken breast', 'Roasted, skinless', 'Protein'),
 (169704, 'Brown rice', 'Long-grain, cooked', 'Grains'),
 (170379, 'Broccoli', 'Raw', 'Vegetables'),
 (171705, 'Avocado', 'Raw, all commercial varieties', 'Fruit'),
 (170894, 'Greek yogurt', 'Plain, nonfat', 'Dairy & eggs'),
 (175168, 'Salmon', 'Atlantic, farmed, cooked with dry heat', 'Protein'),
 (168917, 'Quinoa', 'Cooked', 'Grains'),
 (173904, 'Oats', 'Regular or quick, dry, not fortified', 'Grains'),
 (173905, 'Oatmeal', 'Cooked with water, no salt', 'Grains'),
 (173424, 'Egg', 'Whole, hard-boiled', 'Dairy & eggs'),
 (171711, 'Blueberries', 'Raw', 'Fruit'),
 (173944, 'Banana', 'Raw', 'Fruit'),
 (172421, 'Lentils', 'Boiled, no salt', 'Protein'),
 (167762, 'Strawberries', 'Raw', 'Fruit'),
 (168409, 'Cucumber', 'Raw, with peel', 'Vegetables'),
 (168462, 'Spinach', 'Raw', 'Vegetables'),
 (168483, 'Sweet potato', 'Baked, flesh only, no salt', 'Vegetables'),
 (168878, 'White rice', 'Long-grain, enriched, cooked', 'Grains'),
 (170393, 'Carrot', 'Raw', 'Vegetables'),
 (170457, 'Tomato', 'Red, ripe, raw', 'Vegetables'),
 (170567, 'Almonds', 'Unroasted', 'Fats & nuts'),
 (171267, 'Milk', '2% fat, with vitamins A and D', 'Dairy & eggs'),
 (171413, 'Olive oil', 'Salad or cooking', 'Fats & nuts'),
 (171688, 'Apple', 'Raw, with skin', 'Fruit'),
 (172470, 'Peanut butter', 'Smooth, no salt', 'Fats & nuts'),
 (172475, 'Tofu', 'Firm, raw, calcium-set', 'Protein'),
 (172688, 'Whole-wheat bread', 'Commercially prepared', 'Grains'),
 (173414, 'Cheddar cheese', 'Regular', 'Dairy & eggs'),
 (173735, 'Black beans', 'Boiled, no salt', 'Protein'),
 (173757, 'Chickpeas', 'Boiled, no salt', 'Protein'),
]

root = pathlib.Path(__file__).resolve().parents[1]
archive = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(archive) as z:
 def rows(name):
  path = next(p for p in z.namelist() if p.endswith('/' + name))
  return csv.DictReader(io.TextIOWrapper(z.open(path), encoding='utf-8-sig'))
 foods = {int(r['fdc_id']): r for r in rows('food.csv')}
 ndb = {int(r['fdc_id']): r['NDB_number'] for r in rows('sr_legacy_food.csv')}
 needed = {r[0] for r in SELECTION}
 values = {fid: {} for fid in needed}
 mapping = {'1008': 'calories', '1003': 'protein', '1004': 'fat', '1005': 'carbs'}
 for row in rows('food_nutrient.csv'):
  fid = int(row['fdc_id'])
  if fid in needed and row['nutrient_id'] in mapping:
   values[fid][mapping[row['nutrient_id']]] = float(row['amount'])
 result = []
 for fid, name, state, category in SELECTION:
  assert set(values[fid]) == set(mapping.values()), f'Missing nutrients: {fid}'
  result.append(dict(id=str(fid), name=name, state=state, category=category,
   description=foods[fid]['description'], ndb=ndb[fid],
   url=f'https://fdc.nal.usda.gov/food-details/{fid}/nutrients', **values[fid]))

meta = dict(dataset='USDA FoodData Central — SR Legacy, April 2018',
 retrieved='2026-11-09', basis='100 grams of edible portion, in the stated preparation state',
 archiveUrl='https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
 archiveSHA256=hashlib.sha256(archive.read_bytes()).hexdigest(),
 nutrientIds=mapping, foods=result)
(root/'data/foods.json').write_text(json.dumps(meta, indent=2)+'\n', encoding='utf-8')
(root/'data/foods.js').write_text('/* Extracted from USDA SR Legacy; see SOURCES.md. */\nwindow.LEANPLATE_DATA = '+json.dumps(meta, indent=2)+';\n', encoding='utf-8')
with (root/'data/foods.csv').open('w',newline='',encoding='utf-8') as f:
 writer=csv.DictWriter(f,fieldnames=list(result[0])); writer.writeheader(); writer.writerows(result)
print(f'Extracted {len(result)} foods. Archive SHA256: {meta["archiveSHA256"]}')
