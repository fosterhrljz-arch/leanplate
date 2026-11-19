(function (root) {
  'use strict';
  const fields = ['calories', 'protein', 'fat', 'carbs'];
  function validAmount(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0.1 && value <= 10000; }
  function validateMeal(meal, foods) {
    if (!meal || typeof meal.id !== 'string' || !/^[\w-]{1,80}$/.test(meal.id)) throw new Error('Invalid meal ID.');
    if (typeof meal.name !== 'string' || !meal.name.trim() || meal.name.length > 80) throw new Error('Enter a meal name (up to 80 characters).');
    if (!Number.isInteger(meal.servings) || meal.servings < 1 || meal.servings > 100) throw new Error('Servings must be a whole number from 1 to 100.');
    if (!Array.isArray(meal.ingredients) || !meal.ingredients.length || meal.ingredients.length > foods.length) throw new Error('Add at least one ingredient.');
    const seen = new Set();
    for (const item of meal.ingredients) {
      if (!item || !foods.some(f => f.id === item.foodId) || seen.has(item.foodId)) throw new Error('Invalid or duplicate ingredient.');
      if (!validAmount(item.grams)) throw new Error('Each amount must be between 0.1 and 10,000 grams.');
      seen.add(item.foodId);
    }
    return { id: meal.id, name: meal.name.trim(), servings: meal.servings,
      ingredients: meal.ingredients.map(i => ({ foodId: i.foodId, grams: i.grams })) };
  }
  function validateData(data, foods) {
    if (!data || data.version !== 1 || !Array.isArray(data.meals) || data.meals.length > 1000) throw new Error('This is not a supported LeanPlate backup.');
    const meals = data.meals.map(m => validateMeal(m, foods));
    if (new Set(meals.map(m => m.id)).size !== meals.length) throw new Error('Duplicate meal IDs.');
    return { version: 1, meals };
  }
  function totals(ingredients, foods, servings = 1) {
    if (!Number.isFinite(servings) || servings <= 0) throw new Error('Invalid servings.');
    const sum = Object.fromEntries(fields.map(f => [f, 0]));
    for (const i of ingredients) {
      const food = foods.find(f => f.id === i.foodId);
      if (!food || !validAmount(i.grams)) throw new Error('Invalid ingredient amount.');
      for (const field of fields) sum[field] += food[field] * i.grams / 100 / servings;
    }
    return sum;
  }
  const core = { fields, validAmount, validateMeal, validateData, totals };
  if (typeof module !== 'undefined') module.exports = core;
  else root.LeanPlateCore = core;
})(typeof window !== 'undefined' ? window : globalThis);
