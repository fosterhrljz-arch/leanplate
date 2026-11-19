(() => {
  'use strict';
  const foods = window.LEANPLATE_DATA.foods;
  const C = window.LeanPlateCore;
  const KEY = 'leanplate.meals.v1';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (n, d = 1) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const categories = ['All foods', 'Protein', 'Grains', 'Vegetables', 'Fruit', 'Dairy & eggs', 'Fats & nuts'];
  const paths = {
    foods: '<path d="M12 7c-5-5-10 0-8 6s4 9 8 6c4 3 6 0 8-6s-3-11-8-6ZM12 7c0-3 2-5 4-5M12 6 10 3"/>',
    bowl: '<path d="M3 8h18c0 8-4 12-9 12S3 16 3 8ZM8 22h8"/>',
    book: '<path d="M12 5v16M3 4c4-1 7-1 9 1 2-2 5-2 9-1v16c-4-1-7-1-9 1-2-2-5-2-9-1Z"/>',
    search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    grain: '<path d="M4 12h16c0 6-3 9-8 9s-8-3-8-9ZM7 9c0-2 2-3 5-3s5 1 5 3M10 3v1M15 2v1M5 6l1 1"/>',
    protein: '<path d="M9 15c-5-4-2-11 4-12 5-1 10 3 8 8-1 4-5 6-9 5l-5 5c-1 2-4 0-3-2-3 0-3-4 0-4l2 1Z"/>',
    veg: '<path d="M9 21 8 14c-6 1-7-6-3-8 0-4 6-5 8-2 5-2 9 2 7 5 3 4-1 7-5 5l-1 7ZM11 12l1 9M8 10l3 3M15 10l-3 3"/>',
    nut: '<path d="M6 17C2 8 10 3 19 3c1 10-2 18-10 18-2 0-3-1-3-4ZM7 19 16 7"/>',
    egg: '<path d="M20 14c0 5-3 8-8 8s-8-3-8-8S9 2 12 2s8 7 8 12Z"/>',
    avocado: '<path d="M19 3c4 3-1 8-2 13-2 7-13 7-14 1C1 10 11 10 14 5c2-2 3-3 5-2Z"/><ellipse cx="9.5" cy="15" rx="3" ry="3.5"/>',
    yogurt: '<path d="M3 11h18c-1 7-4 10-9 10s-8-3-9-10ZM4 9c3-3 11-3 15 0M14 10l5-7c1-2 3-1 2 1l-4 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>'
  };
  function icon(name) { return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.bowl}</svg>`; }
  function categoryIcon(f) { return f.id === '171705' ? 'avocado' : f.id === '170894' ? 'yogurt' : ({Protein:'protein',Grains:'grain',Vegetables:'veg',Fruit:'foods','Dairy & eggs':'egg','Fats & nuts':'nut'})[f.category]; }
  let state = { version: 1, meals: [] }, storedRaw = null, storageProblem = '', route = '', query = '', category = 'All foods';
  let draft = null, editorBaseline = '', detailFood = null, toastTimer, confirmAction = null;
  function load() {
    try {
      storedRaw = localStorage.getItem(KEY);
      state = storedRaw ? C.validateData(JSON.parse(storedRaw), foods) : {version:1, meals:[]};
      storageProblem = '';
    } catch (err) {
      storageProblem = 'Local meals could not be read. Existing data has been left untouched. Use Sources to export the stored data before restoring a backup.';
      state = {version:1, meals:[]};
    }
  }
  function commit(next, allowRecovery = false) {
    if (storageProblem && !allowRecovery) throw new Error('Local storage is unavailable or unreadable. Your changes have not been saved.');
    try {
      const current = localStorage.getItem(KEY);
      if (current !== storedRaw) throw new Error('Meals changed in another tab. Close this editor and reload before saving.');
      const validated = C.validateData(next, foods);
      const raw = JSON.stringify(validated);
      localStorage.setItem(KEY, raw);
      storedRaw = raw; state = validated; storageProblem = '';
    } catch (e) {
      if (e.message.includes('another tab')) throw e;
      throw new Error('Could not save locally. Storage may be full or blocked. Your previous meals are unchanged.');
    }
  }
  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200); }
  function macroGrid(t) { return `<div class="macro-grid">${C.fields.map(k => `<div class="macro"><span>${k === 'calories' ? 'Calories' : k[0].toUpperCase()+k.slice(1)}</span><strong>${fmt(t[k],k === 'calories' ? 0 : 1)}<small>${k === 'calories' ? 'kcal' : 'g'}</small></strong></div>`).join('')}</div>`; }
  function matched(text, cat = 'All foods') {
    const terms = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return foods.filter(f => (cat === 'All foods' || f.category === cat) && terms.every(t => `${f.name} ${f.state} ${f.description} ${f.category}`.toLowerCase().includes(t)));
  }
  function render() {
    route = ['foods','meals','sources'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'foods';
    $('#navigation').innerHTML = [['foods','Foods','foods'],['meals','My meals','bowl'],['sources','Sources','book']].map(([id,label,i]) => `<a href="#${id}" ${route === id ? 'aria-current="page"' : ''}>${icon(i)}<span>${label}</span></a>`).join('');
    const notice = storageProblem ? `<div class="notice" role="alert">${esc(storageProblem)}</div>` : '';
    $('#main').innerHTML = notice + ({foods:foodsView, meals:mealsView, sources:sourcesView}[route])();
    if (route === 'foods') renderFoods();
    document.title = `${{foods:'Foods',meals:'My meals',sources:'Sources'}[route]} · LeanPlate`;
  }
  function foodsView() {
    return `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><h1 id="hero-title">Good food.<br>Made simple.</h1><p>Know your ingredients. Make meals your own.</p><button class="btn primary" data-action="create">Create a meal</button></div><img src="assets/salmon-bowl.png" alt="A bowl of salmon, avocado, quinoa, cucumber and tomatoes" width="1536" height="1024"></section>
      <section aria-labelledby="foods-title"><div class="section-top"><h2 id="foods-title">Explore foods</h2><span class="muted">Nutrition per 100 g</span></div>
      <div class="search-wrap">${icon('search')}<input type="search" id="food-search" aria-label="Search foods or ingredients" placeholder="Search foods or ingredients" value="${esc(query)}" autocomplete="off"></div>
      <div class="filters" aria-label="Food categories">${categories.map(c => `<button class="filter" data-action="filter" data-category="${esc(c)}" aria-pressed="${c === category}">${esc(c)}</button>`).join('')}</div>
      <div id="food-results"></div><div class="table-foot"><span id="result-count" aria-live="polite"></span><a href="#sources">USDA data & sources</a></div></section>`;
  }
  function renderFoods() {
    const result = matched(query, category);
    $('#result-count').textContent = `${result.length} of ${foods.length} foods · amounts refer to edible portions`;
    $('#food-results').innerHTML = result.length ? `<table class="food-table"><caption class="sr-only">Nutrition per 100 grams. Select a food for details, or add it to a new meal.</caption><thead><tr><th scope="col">Food</th><th scope="col">Calories <span class="sr-only">in kilocalories</span></th><th scope="col">Protein</th><th scope="col">Fat</th><th scope="col">Carbs</th><th scope="col"><span class="sr-only">Add</span></th></tr></thead><tbody>${result.map(f => `<tr><td><button class="food-button" data-action="detail" data-id="${f.id}" aria-label="View ${esc(f.name)} details"><span class="food-icon">${icon(categoryIcon(f))}</span><span><span class="food-name">${esc(f.name)}</span><span class="food-state">${esc(f.state)}</span></span></button></td>${C.fields.map(k => `<td data-label="${k === 'calories' ? 'Calories (kcal)' : k[0].toUpperCase()+k.slice(1)}">${fmt(f[k],k === 'calories' ? 0 : 1)}${k !== 'calories' ? ' g' : ''}</td>`).join('')}<td><button class="icon-button" data-action="create" data-id="${f.id}" aria-label="Create a meal with ${esc(f.name)}"><span class="plus-ring">${icon('plus')}</span></button></td></tr>`).join('')}</tbody></table>` : `<div class="empty"><h3>No foods found</h3><p>Try another ingredient or choose a different category.</p><button class="btn secondary" data-action="reset-search">Clear search & filters</button></div>`;
  }
  function mealsView() {
    return `<header class="page-header"><div><h1>My meals</h1><p>A little collection of meals, made by you.</p></div><button class="btn primary" data-action="create">${icon('plus')} Create a meal</button></header>${state.meals.length ? `<div class="meal-list">${state.meals.map(m => {
      const t = C.totals(m.ingredients, foods, m.servings);
      return `<article class="meal-card"><div><h2>${esc(m.name)}</h2><p>${m.ingredients.map(i => `${esc(foods.find(f => f.id === i.foodId).name)} (${fmt(i.grams,Number.isInteger(i.grams)?0:1)} g)`).join(' · ')}</p><p>${m.servings} ${m.servings === 1 ? 'serving' : 'servings'} · nutrition below is per serving</p></div><div class="meal-actions"><button class="btn secondary" data-action="edit" data-id="${m.id}" aria-label="Edit ${esc(m.name)}">Edit meal</button><button class="icon-button" data-action="delete" data-id="${m.id}" aria-label="Delete ${esc(m.name)}">${icon('trash')}</button></div>${macroGrid(t)}</article>`;
    }).join('')}</div><p class="meal-foot">Saved in this browser on this device. Back up your meals in <a href="#sources">Sources</a>.</p>` : `<div class="empty">${icon('bowl')}<h2>Your first meal starts here.</h2><p>Choose a few ingredients, adjust their amounts, and save something you’ll make again.</p><button class="btn secondary" data-action="create">Create your first meal ${icon('arrow')}</button></div>`}`;
  }
  function sourcesView() {
    return `<header class="page-header"><div><h1>A little clarity.</h1><p>Where the numbers come from, and where your meals stay.</p></div></header>
      <section class="source-section"><h2>Real food. Clear sources.</h2><p>The ${foods.length} foods in LeanPlate are extracted from <strong>USDA FoodData Central, SR Legacy (April 2018)</strong>. Each record keeps its original calories, protein, total fat, and carbohydrate values. This is a fixed reference dataset, downloaded on November 9, 2026; it does not update online.</p><p>All values are per <strong>100 grams of edible food</strong> in the stated preparation state. Weigh cooked foods after cooking and raw foods before cooking. Bones, peels you do not eat, and cooking water are not included. Add cooking oil as its own ingredient.</p><p>Portions scale proportionally. Meal totals use unrounded source values; displayed calories are rounded to whole kcal and macros to one decimal. USDA calories may differ from a simple 4/4/9 calculation. Foods and brands vary, so these are estimates.</p><div class="actions"><a class="btn outline" href="https://fdc.nal.usda.gov/download-datasets/" target="_blank" rel="noopener noreferrer">USDA download page ↗</a><a class="btn secondary" href="data/foods.csv" download>Download food data (CSV)</a></div><p class="small">External USDA links need internet. All source IDs, descriptions, and nutrition data are available here offline.</p><details><summary>View all ${foods.length} source records</summary><ul class="source-list">${foods.map(f => `<li><strong>${esc(f.name)} · ${esc(f.state)}</strong>${esc(f.description)}<br>FDC ${f.id} · NDB ${f.ndb}<br>${f.calories} kcal · Protein ${f.protein} g · Fat ${f.fat} g · Carbs ${f.carbs} g / 100 g<br><a href="${f.url}" target="_blank" rel="noopener noreferrer">Open USDA record ↗</a></li>`).join('')}</ul></details></section>
      <section class="source-section"><h2>Only on your device.</h2><p>Your meals are saved in this browser’s local storage. There are no accounts, trackers, cloud services, or network requests. The app, image, and food database are included in this folder and work offline from the first launch.</p><p>Use the same browser and keep the app in the same folder. Moving it, clearing browser data, or using a private window can make saved meals unavailable. Export a backup before making those changes.</p><div class="actions"><button class="btn outline" data-action="export">Export meals</button><button class="btn secondary" data-action="import">Restore a backup</button>${storageProblem ? '<button class="btn outline" data-action="export-raw">Export stored data for recovery</button>' : ''}</div></section>
      <section class="source-section"><h2>Made to stay simple.</h2><p>LeanPlate helps you understand ingredients and keep your own meals. The decorative food image was generated for this project; it does not represent a measured recipe or portion. There are no AI features in the app.</p><p class="small">LeanPlate 1.0 · All app files and the photograph are bundled locally.</p></section>`;
  }
  function openEditor(meal = null, foodId = null, grams = 100) {
    draft = meal ? structuredClone(meal) : {id: crypto.randomUUID ? crypto.randomUUID() : 'meal-'+Date.now()+'-'+Math.random().toString(36).slice(2),name:'',servings:1,ingredients:foodId ? [{foodId,grams}] : []};
    editorBaseline = JSON.stringify(draft);
    $('#editor').innerHTML = `<div class="dialog-head"><div><h2 id="editor-title">${meal ? 'Edit meal' : 'Create a meal'}</h2><p>A few ingredients. Your own proportions.</p></div><button class="icon-button" data-action="close-editor" aria-label="Close meal editor">${icon('close')}</button></div><form id="meal-form"><div class="editor-layout"><div class="editor-content"><div class="name-fields"><label><span class="field-label">Meal name</span><input class="field" id="meal-name" placeholder="e.g. My favorite lunch" maxlength="80" required value="${esc(draft.name)}"></label><label><span class="field-label">Servings</span><input class="field" id="servings" type="number" min="1" max="100" step="1" required value="${draft.servings}"></label></div><label class="field-label" for="ingredient-search">Add ingredients</label><div class="search-wrap">${icon('search')}<input type="search" id="ingredient-search" placeholder="Search the food library" autocomplete="off"></div><div id="picker" class="picker" aria-label="Available ingredients"></div><div class="ingredients-head"><h3>Your ingredients</h3><span class="muted small">Amount in grams</span></div><div id="ingredients"></div></div><aside class="summary-panel"><h3>Whole meal</h3><div id="meal-totals" aria-live="polite"></div><p>Amounts use the food’s stated preparation state.</p><div id="per-serving" class="per-serving"></div></aside></div><div class="dialog-foot"><div id="editor-error" class="error" role="alert"></div><p>Saved only on this device</p><div class="actions"><button class="btn secondary" type="button" data-action="close-editor">Cancel</button><button class="btn primary" type="submit" id="save-meal">Save meal</button></div></div></form>`;
    // Buttons inside the editor form perform UI actions, never accidental submission.
    $('#editor').querySelectorAll('button[data-action]').forEach(b => b.type = 'button');
    renderPicker(); renderIngredients(); updateTotals();
    $('#editor').showModal(); $('#meal-name').focus();
  }
  function renderPicker() {
    const matches = matched($('#ingredient-search').value);
    $('#picker').innerHTML = matches.length ? matches.map(f => {
      const included = draft.ingredients.some(i => i.foodId === f.id);
      return `<div class="picker-row"><span><span class="food-name">${esc(f.name)}</span><span class="food-state">${esc(f.state)}</span></span><button type="button" class="icon-button" data-action="add" data-id="${f.id}" aria-label="${included ? 'Already added' : 'Add'} ${esc(f.name)}" ${included ? 'disabled' : ''}>${icon(included ? 'check' : 'plus')}</button></div>`;
    }).join('') : '<p class="picker-empty">No ingredients found. Try another search.</p>';
  }
  function renderIngredients() {
    $('#ingredients').innerHTML = draft.ingredients.length ? draft.ingredients.map(i => {
      const f = foods.find(f => f.id === i.foodId);
      return `<div class="ingredient"><span><span class="food-name">${esc(f.name)}</span><span class="food-state">${esc(f.state)}</span></span><label class="amount"><span class="sr-only">${esc(f.name)} amount in grams</span><input class="field gram-input" data-id="${f.id}" type="number" min="0.1" max="10000" step="any" required value="${i.grams ?? ''}"><span aria-hidden="true">g</span></label><button type="button" class="icon-button" data-action="remove" data-id="${f.id}" aria-label="Remove ${esc(f.name)}">${icon('close')}</button></div>`;
    }).join('') : '<p class="muted small">Add an ingredient above to start building your meal.</p>';
  }
  function updateTotals() {
    const valid = draft.ingredients.every(i => C.validAmount(i.grams)) && Number.isInteger(draft.servings) && draft.servings >= 1 && draft.servings <= 100;
    $('#save-meal').disabled = !valid || !draft.ingredients.length;
    if (!valid) {
      $('#meal-totals').innerHTML = '<p class="error">Enter valid ingredient amounts and servings to see totals.</p>';
      $('#per-serving').textContent = '';
      return;
    }
    const total = C.totals(draft.ingredients, foods);
    $('#meal-totals').innerHTML = macroGrid(total);
    const per = C.totals(draft.ingredients, foods, draft.servings);
    $('#per-serving').innerHTML = `<strong>Per serving</strong> · ${draft.servings} ${draft.servings === 1 ? 'serving' : 'servings'}<br>${fmt(per.calories,0)} kcal · ${fmt(per.protein)} g protein<br>${fmt(per.fat)} g fat · ${fmt(per.carbs)} g carbs`;
  }
  function ask(title, message, label, action, dangerous = false) {
    confirmAction = action;
    $('#confirm').innerHTML = `<div class="dialog-head"><h2 id="confirm-title">${esc(title)}</h2></div><div class="detail-body"><p>${esc(message)}</p><div id="confirm-error" class="error" role="alert"></div></div><div class="dialog-foot"><div class="actions"><button class="btn secondary" data-action="cancel-confirm">Keep as is</button><button class="btn ${dangerous ? 'danger' : 'primary'}" data-action="accept-confirm">${esc(label)}</button></div></div>`;
    $('#confirm').showModal();
  }
  function closeEditor() {
    if (JSON.stringify(draft) !== editorBaseline) ask('Discard these changes?', 'Your unsaved edits will be discarded. Any previously saved meal will stay unchanged.', 'Discard changes', () => { $('#editor').close(); draft = null; }, true);
    else { $('#editor').close(); draft = null; }
  }
  function openDetail(id) {
    detailFood = foods.find(f => f.id === id);
    const f = detailFood;
    $('#detail').innerHTML = `<div class="dialog-head"><div><h2 id="detail-title">${esc(f.name)}</h2><p>${esc(f.state)}</p></div><button class="icon-button" data-action="close-detail" aria-label="Close food details">${icon('close')}</button></div><div class="detail-body"><label class="field-label" for="detail-grams">Explore an amount</label><div class="amount"><input class="field" type="number" id="detail-grams" min="0.1" max="10000" step="any" value="100" required><span aria-hidden="true">g</span></div><div id="detail-totals" aria-live="polite">${macroGrid(f)}</div><p>Nutrition for the edible portion in the preparation state shown above.</p><div class="detail-source"><span class="small muted">USDA SR Legacy · FDC ${f.id} · NDB ${f.ndb}<br>${esc(f.description)}</span><br><a href="${f.url}" target="_blank" rel="noopener noreferrer">View USDA source (online) ↗</a></div></div><div class="dialog-foot"><div class="actions"><button class="btn primary" id="detail-create" data-action="detail-create">Create a meal with this</button></div></div>`;
    $('#detail').showModal();
  }
  function download(data, name) {
    const a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
    a.download = name; document.body.append(a); a.click(); a.remove();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]'); if (!b) return;
    const id = b.dataset.id;
    switch (b.dataset.action) {
      case 'create': openEditor(null,id); break;
      case 'edit': openEditor(state.meals.find(m => m.id === id)); break;
      case 'filter': category = b.dataset.category; document.querySelectorAll('.filter').forEach(x => x.setAttribute('aria-pressed', x.dataset.category === category)); renderFoods(); break;
      case 'reset-search': query = ''; category = 'All foods'; render(); $('#food-search').focus(); break;
      case 'detail': openDetail(id); break;
      case 'close-detail': $('#detail').close(); break;
      case 'detail-create': { const grams = Number($('#detail-grams').value); if (!C.validAmount(grams)) return; const fid = detailFood.id; $('#detail').close(); openEditor(null,fid,grams); break; }
      case 'close-editor': closeEditor(); break;
      case 'add': if (!draft.ingredients.some(i => i.foodId === id)) draft.ingredients.push({foodId:id,grams:100}); renderPicker(); renderIngredients(); updateTotals(); $('#ingredients').querySelector(`[data-id="${id}"]`).focus(); break;
      case 'remove': draft.ingredients = draft.ingredients.filter(i => i.foodId !== id); renderPicker(); renderIngredients(); updateTotals(); $('#ingredient-search').focus(); break;
      case 'delete': { const meal = state.meals.find(m => m.id === id); ask('Delete this meal?', `“${meal.name}” will be removed from this browser. Export a backup first if you want to keep a copy.`, 'Delete meal', () => { commit({version:1,meals:state.meals.filter(m => m.id !== id)}); render(); toast('Meal deleted.'); }, true); break; }
      case 'cancel-confirm': $('#confirm').close(); confirmAction = null; break;
      case 'accept-confirm': try { confirmAction(); $('#confirm').close(); confirmAction = null; } catch (e) { $('#confirm-error').textContent = e.message; } break;
      case 'export': if (storageProblem) { toast('Use Export stored data for recovery instead.'); break; } download(JSON.stringify(state,null,2), 'leanplate-meals.json'); toast('Meal backup exported.'); break;
      case 'export-raw': try { download(localStorage.getItem(KEY) || '{}','leanplate-recovery.json'); } catch { toast('This browser is blocking access to local storage.'); } break;
      case 'import': $('#backup-file').click(); break;
    }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'food-search') { query = el.value; renderFoods(); }
    if (el.id === 'ingredient-search') renderPicker();
    if (el.id === 'meal-name') draft.name = el.value;
    if (el.id === 'servings') { draft.servings = el.value === '' ? null : Number(el.value); updateTotals(); }
    if (el.classList.contains('gram-input')) { draft.ingredients.find(i => i.foodId === el.dataset.id).grams = el.value === '' ? null : Number(el.value); updateTotals(); }
    if (el.id === 'detail-grams') {
      const grams = Number(el.value), valid = C.validAmount(grams);
      $('#detail-create').disabled = !valid;
      $('#detail-totals').innerHTML = valid ? macroGrid(C.totals([{foodId:detailFood.id,grams}],foods)) : '<p class="error">Enter an amount from 0.1 to 10,000 g.</p>';
    }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'meal-form') return;
    e.preventDefault();
    try {
      const meal = C.validateMeal(draft, foods);
      const exists = state.meals.some(m => m.id === meal.id);
      const meals = exists ? state.meals.map(m => m.id === meal.id ? meal : m) : [...state.meals,meal];
      commit({version:1,meals}); $('#editor').close(); draft = null;
      if (location.hash === '#meals') render(); else location.hash = '#meals';
      toast(exists ? 'Meal updated on this device.' : 'Meal saved on this device.');
    } catch (err) { $('#editor-error').textContent = err.message; }
  });
  $('#editor').addEventListener('cancel', e => { e.preventDefault(); closeEditor(); });
  $('#backup-file').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    try {
      if (file.size > 2*1024*1024) throw new Error('Choose a LeanPlate backup smaller than 2 MB.');
      const incoming = C.validateData(JSON.parse(await file.text()),foods);
      ask('Restore this backup?', `This replaces the meals currently in this browser with ${incoming.meals.length} saved meals. Export your current meals first if you want to keep them.`, 'Restore meals', () => { commit(incoming,true); render(); toast('Meal backup restored.'); });
    } catch (err) { toast(err instanceof SyntaxError ? 'This file is not valid JSON. Your meals are unchanged.' : err.message); }
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0,0); $('#main').focus({preventScroll:true}); });
  window.addEventListener('storage', e => {
    if (e.key !== KEY && e.key !== null) return;
    if ($('#editor').open || $('#confirm').open) { toast('Meals changed in another tab. Reload before saving.'); return; }
    load(); render();
  });
  window.addEventListener('beforeunload', e => { if (draft && JSON.stringify(draft) !== editorBaseline) { e.preventDefault(); e.returnValue = ''; } });
  load(); render();
})();
