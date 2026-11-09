import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

/** Inline classic scripts in place: no additional network request, module scope or boot reorder. */
export function renderEffectSources(html, readSource) {
  const names = new Set();
  const next = html.replace(/\/\* CH3_EFFECT_SOURCE:([a-z-]+):START \*\/[\s\S]*?\/\* CH3_EFFECT_SOURCE:\1:END \*\//g, (_, name) => {
    if (names.has(name)) throw new Error(`Duplicate effect source: ${name}`);
    names.add(name);
    const code = readSource(name);
    if (/<\/script/i.test(code) || code.includes('CH3_EFFECT_SOURCE:')) throw new Error(`Unsafe inline source: ${name}`);
    return `/* CH3_EFFECT_SOURCE:${name}:START */${code}/* CH3_EFFECT_SOURCE:${name}:END */`;
  });
  if (names.size !== 13) throw new Error(`Expected 13 effect blocks, found ${names.size}`);
  return next;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const htmlFile = new URL('../../src/embedded/chapter3Story.html', import.meta.url);
  const html = fs.readFileSync(htmlFile, 'utf8');
  const next = renderEffectSources(html, name => fs.readFileSync(new URL(`../../src/story/chapter3/effects/${name}.js`, import.meta.url), 'utf8'));
  if (process.argv.includes('--check')) {
    if (next !== html) throw new Error('Chapter 3 effects are stale. Run npm run generate:story.');
  } else if (next !== html) fs.writeFileSync(htmlFile, next);
}
