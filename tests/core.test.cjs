const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/core.js');
const {foods} = require('../data/foods.json');
const meal = () => ({id:'test-meal',name:'Lunch',servings:2,ingredients:[{foodId:'171477',grams:150},{foodId:'169704',grams:200}]});
test('USDA chicken and brown rice: proportional totals, no premature rounding', () => {
  const t = C.totals(meal().ingredients,foods);
  assert.equal(t.calories,493.5);
  assert.ok(Math.abs(t.protein - (31.02*1.5+2.74*2))<1e-9);
  const per = C.totals(meal().ingredients,foods,2);
  C.fields.forEach(k => assert.equal(per[k],t[k]/2));
});
test('Amounts reject empty, negative, nonfinite and excessive quantities', () => {
  for (const value of [null,undefined,'100','',NaN,Infinity,-10,0,0.01,10001]) assert.equal(C.validAmount(value),false);
  for (const value of [0.1,0.25,100,10000]) assert.equal(C.validAmount(value),true);
});
test('Meal validation rejects unknown/duplicate foods, invalid servings and empty names', () => {
  for (const change of [{servings:0},{servings:1.5},{servings:101},{name:'  '},{ingredients:[]},{ingredients:[{foodId:'missing',grams:100}]},{ingredients:[{foodId:'171477',grams:100},{foodId:'171477',grams:50}]}]) assert.throws(()=>C.validateMeal({...meal(),...change},foods));
  assert.equal(C.validateMeal({...meal(),name:'  Lunch  '},foods).name,'Lunch');
});
test('Backup validation rejects malformed versions and duplicate meal IDs', () => {
  for (const data of [null,{}, {version:2,meals:[]},{version:1,meals:[meal(),meal()]}]) assert.throws(()=>C.validateData(data,foods));
  assert.deepEqual(C.validateData({version:1,meals:[meal()]},foods),{version:1,meals:[meal()]});
});
test('Every bundled food has provenance and all four finite nutrition values', () => {
  assert.equal(foods.length,30);assert.equal(new Set(foods.map(f=>f.id)).size,30);
  for (const f of foods) {
    assert.ok(f.description && f.state && f.ndb && f.url.includes(f.id));
    C.fields.forEach(k=>assert.ok(Number.isFinite(f[k]) && f[k]>=0));
  }
});
