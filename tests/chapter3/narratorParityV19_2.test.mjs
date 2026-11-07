import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {strict as assert} from 'node:assert';
import test from 'node:test';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=(name)=>readFileSync(resolve(root,name),'utf8');
const cssUrl='/assets/common/story/narrator-dialogue.css';
const canon='public/assets/common/story/narrator-dialogue.css';
function headOf(s){ const h=s.match(/<head(?:\s[^>]*)?>([\s\S]*?)<\/head>/i);assert.ok(h,'HTML HEAD missing');return h[1]; }
const linkPattern=/<link\s+[^>]*rel="stylesheet"[^>]*href="\/assets\/common\/story\/narrator-dialogue\.css"[^>]*\/?\s*>/g;
test('CH1 index HEAD loads canonical CH3 narrator style',()=>{
  const html=read('index.html');assert.match(headOf(html),linkPattern);
  assert.equal((html.match(linkPattern)||[]).length,1,'exactly one CH1 narrator CSS link');
});
test('CH2 loads canonical CH3 narrator style in HEAD before the story starts',()=>{
  const html=read('src/embedded/chapter2Story.html');assert.match(headOf(html),linkPattern);
  assert.equal((html.match(linkPattern)||[]).length,1,'exactly one CH2 narrator CSS link');
});
test('CH3 is still connected to the SAME CSS without any clone or override',()=>{
  const html=read('src/embedded/chapter3Story.html');assert.match(html,linkPattern);
  assert.ok(existsSync(resolve(root,canon)));
  const css=read(canon);
  for(const sel of ['.dialogue-layer.is-narrator-dialogue .dialogue-box', '.dialogue-layer.is-narrator-dialogue .speaker-tag', '.dialogue-layer.is-narrator-dialogue .dialogue-copy', '.dialogue-layer.is-narrator-dialogue .dialogue-text', '.dialogue-layer.is-narrator-dialogue .continue-indicator']){
    assert.ok(css.includes(sel),`missing CH3 narrator style ${sel}`);
  }
});
test('all three story runtimes mark narrator lines identically',()=>{
  for(const p of ['src/story/chapter1/chapter1StoryRuntime.ts','src/embedded/chapter2Story.html','src/embedded/chapter3Story.html']){
    assert.ok(read(p).includes("dialogueLayer.classList.toggle('is-narrator-dialogue'"),p);
  }
});
test('CH1,CH2 narrator skin does not hijack other actor dialogue styles',()=>{
  const css=read(canon);
  const selectors=css.match(/html \.dialogue-layer\.is-narrator-dialogue/g)||[];
  assert.ok(selectors.length>=12,`expected canonical narrator-only selectors, found ${selectors.length}`);
  assert.ok(!css.includes('html .dialogue-layer .speaker-tag {'), 'unexpected global speaker override');
});
