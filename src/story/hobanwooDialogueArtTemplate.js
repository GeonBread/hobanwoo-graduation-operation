/* Per-dialogue artwork and transparent-canvas placement. Original PNG bytes stay untouched. */
(() => {
  'use strict';
  const data = /* HOBANWOO_ART_DATA */ {};
  const root = '/assets/common/characters/hobanwoo/';
  const fullBodies = new Map(Object.entries(data.art).filter(([, art]) => !art.portrait).map(([id, art]) => [art.file, {id, ...art}]));
  const assignments = new WeakMap();
  const carried = new WeakMap();
  const layouts = new WeakMap();
  const contexts = new Map();
  const sectionName = value => String(value || '').replace(/^장면\s*\d+\.\s*/, '').trim();
  const isLine = item => item && item.speaker && !item.effectOnly && (!item.type || item.type === 'dialogue');
  const keyOf = (section, text, occurrence) => JSON.stringify([sectionName(section), text, occurrence]);

  function contextFor(chapter, part) {
    const key = chapter === 1 ? `1:${part}` : String(chapter);
    if (contexts.has(key)) return contexts.get(key);
    const rows = data.rules[key] || [], groups = new Map(), unique = new Map();
    for (const row of rows) {
      if (!groups.has(row.segment)) groups.set(row.segment, new Map());
      groups.get(row.segment).set(keyOf(row.section, row.text, row.occurrence), row);
      const previous = unique.get(row.text);
      if (!previous) unique.set(row.text, row);
      else if (previous.art !== row.art) unique.set(row.text, {ambiguous: true});
    }
    const result = {rows, groups, unique}; contexts.set(key, result); return result;
  }

  function assign(item, row, chapter) {
    assignments.set(item, row.id);
    const path = root + data.art[row.art].file;
    for (const side of ['left', 'right']) {
      if (item[side] !== 'hobanwoo') continue;
      item[chapter === 1 ? `${side}ActorImage` : `${side}Image`] = path;
    }
  }

  function prepare(segments, chapter, part = 0) {
    const context = contextFor(chapter, part), matched = new Set(), hidden = new Set();
    // Match the named scene and exact text, counting only repetitions of that same text.
    for (const [segment, rules] of context.groups) {
      const counts = new Map(); let section = '';
      for (const item of segments[segment] || []) {
        if (item.type === 'section-marker') section = item.title || '';
        if (!isLine(item) || item.speaker !== 'hobanwoo') continue;
        const scene = chapter === 1 ? '' : sectionName(section);
        const signature = JSON.stringify([scene, item.text]);
        const occurrence = (counts.get(signature) || 0) + 1; counts.set(signature, occurrence);
        const row = rules.get(keyOf(scene, item.text, occurrence));
        if (!row) continue;
        assign(item, row, chapter); matched.add(row.id);
        if (item.left !== 'hobanwoo' && item.right !== 'hobanwoo') hidden.add(row.id);
      }
    }
    // Continuous/selected chapter-1 sequences reuse entries. A new copy can only
    // inherit an unambiguous exact sentence; short ambiguous replies keep their scene mapping.
    if (chapter === 1) for (const entries of Object.values(segments)) {
      if (!Array.isArray(entries)) continue;
      for (const item of entries) {
        if (!isLine(item) || item.speaker !== 'hobanwoo' || assignments.has(item)) continue;
        const row = context.unique.get(item.text);
        if (row && !row.ambiguous) assign(item, row, chapter);
      }
    }
    // Keep Hobanwoo's most recent assigned pose while another character speaks.
    // Actor sides and the speaking character's own image fields are never changed.
    for (const entries of Object.values(segments)) {
      if (!Array.isArray(entries)) continue;
      let last = null;
      for (const item of entries) {
        if (item.type === 'section-marker') last = null;
        if (!isLine(item)) continue;
        if (item.speaker === 'hobanwoo') {
          const side = item.right === 'hobanwoo' ? 'right' : item.left === 'hobanwoo' ? 'left' : null;
          const image = side && item[chapter === 1 ? `${side}ActorImage` : `${side}Image`];
          last = image && fullBodies.has(image.split('/').pop()) ? image : null;
        } else if (last) for (const side of ['left', 'right']) {
          if (item[side] !== 'hobanwoo') continue;
          const field = chapter === 1 ? `${side}ActorImage` : `${side}Image`;
          const previous = carried.get(item);
          if (!item[field] || previous?.field === field && item[field] === previous.path) {
            item[field] = last; carried.set(item, {field, path:last});
          }
        }
      }
    }
    return {matched:[...matched], hidden:[...hidden], missing:context.rows.filter(row => !matched.has(row.id)).map(row => ({id:row.id, text:row.text, segment:row.segment}))};
  }

  const properties = ['left','right','top','bottom','width','height','max-width','max-height','translate'];
  function updateLayout(image, state) {
    if (!image.isConnected) {state.observer?.disconnect();return;}
    if (!state.host.clientHeight) return;
    const art = state.art, box = art.bounds;
    const target = state.host.clientHeight * state.ratio, scale = target / (box[3] - box[1]);
    const values = {
      left:`calc(50% - ${((art.anchorX ?? (box[0]+box[2])/2)*scale).toFixed(4)}px)`, right:'auto', top:'auto',
      bottom:`${(-(art.height-box[3])*scale).toFixed(4)}px`,
      width:`${(art.width*scale).toFixed(4)}px`, height:`${(art.height*scale).toFixed(4)}px`,
      'max-width':'none','max-height':'none',translate:'0 0'
    };
    for (const [property,value] of Object.entries(values)) image.style.setProperty(property,value,'important');
  }

  function layout(image, source) {
    const art = fullBodies.get(String(source || '').split('/').pop().split('?')[0]);
    let state = layouts.get(image);
    if (!art) {
      if (state) {
        state.observer?.disconnect();
        for (const [name,value,priority] of state.original) value ? image.style.setProperty(name,value,priority) : image.style.removeProperty(name);
        image.classList.remove('hobanwoo-dialogue-art');delete image.dataset.hobanwooArt;layouts.delete(image);
      }
      return;
    }
    if (!state) {
      const host = image.parentElement, reference = parseFloat(window.getComputedStyle(image).height);
      const ratio = reference > 0 && host.clientHeight > 0 ? reference / host.clientHeight : .58;
      state = {host,ratio,art,original:properties.map(name=>[name,image.style.getPropertyValue(name),image.style.getPropertyPriority(name)])};
      layouts.set(image,state);
      if (typeof window.ResizeObserver === 'function') {
        state.observer = new window.ResizeObserver(()=>updateLayout(image,state));state.observer.observe(host);
      }
    }
    state.art = art;image.classList.add('hobanwoo-dialogue-art');image.dataset.hobanwooArt=art.id;updateLayout(image,state);
  }

  // Warm the existing image cache without gating story startup on a new network dependency.
  if (typeof window.Image === 'function') for (const art of fullBodies.values()) {
    const image = new window.Image();image.src = root + art.file;image.decode?.().catch(()=>{});
  }
  window.HobanwooDialogueArt = {prepare,layout,assignment:item=>assignments.get(item) || null};
})();
