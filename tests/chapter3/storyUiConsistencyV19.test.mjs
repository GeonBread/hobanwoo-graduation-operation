import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')+'/';
const read=x=>readFileSync(root+x,'utf8');
const boss=read('src/components/story/Chapter3BossBattle.tsx');
const host=read('src/components/story/Chapter3StoryExperience.tsx');
const ch1=read('src/components/story/chapter1StoryPlayer.css');
const ch2=read('src/embedded/chapter2Story.html');
const narrator=read('public/assets/common/story/narrator-dialogue.css');
const bossCss=read('src/components/story/chapter3BossBattle.css');

test('CH1, CH2 use stage container sizing rather than browser viewport width',()=>{
 assert.match(ch1,/\.chapter1-story-player \.story-stage \{ container-type: inline-size; \}/);
 assert.match(ch1,/min-height:clamp\(142px,18cqw,202px\)/);
 assert.match(ch1,/font-size:clamp\(18px,2\.3cqw,31px\)/);
 assert.match(ch2,/<style id="chapter2-dialogue-ch3-ratio-v19">/);
 assert.match(ch2,/html\.chapter1-output-parity \.story-stage \{ container-type:inline-size; \}/);
 assert.match(ch2,/min-height:clamp\(142px,18cqw,202px\)/);
});

test('narrator is built using actor-style speaker tag, corner brackets and left aligned copy',()=>{
 assert.match(narrator,/\.speaker-tag \{[\s\S]*?display: block !important/);
 assert.match(narrator,/\.dialogue-box::before,[\s\S]*?\.dialogue-box::after/);
 assert.match(narrator,/\.dialogue-marker \{[\s\S]*?display: inline-flex !important/);
 assert.match(narrator,/\.dialogue-text \{[\s\S]*?text-align: left !important/);
 assert.doesNotMatch(narrator,/✦  나레이션  ✦|#e7cc98|rgba\(239, 207, 143/);
});

test('all 3 story runtimes toggle a common narrator class',()=>{
 assert.match(read('src/story/chapter1/chapter1StoryRuntime.ts'),/dialogueLayer\.classList\.toggle\('is-narrator-dialogue'/);
 assert.match(ch2,/dialogueLayer\.classList\.toggle\('is-narrator-dialogue'/);
 assert.match(read('src/embedded/chapter3Story.html'),/dialogueLayer\.classList\.toggle\('is-narrator-dialogue'/);
});

test('boss ESC delegates to story host rather than toggling engine pause',()=>{
 assert.match(boss,/onStoryPauseRequest:\(\)=>void;onStoryPauseClose:\(\)=>void/);
 assert.match(boss,/if\(k==='Escape'&&!v\.repeat\)\{if\(storyPausedRef\.current\)\{callbacks\.current\.onStoryPauseClose\(\);\}else requestStoryPause\(\);return;\}/);
 assert.doesNotMatch(boss,/if\(k==='Escape'&&!v\.repeat\)\{e\.paused=!e\.paused/);
 assert.doesNotMatch(boss,/setConfirmExit|confirmExit&&|c3boss-confirm/);
 assert.doesNotMatch(boss,/GAME PAUSED/);
});

test('story host owns boss pause dialog and boss checkpoint',()=>{
 assert.match(host,/storyPaused=\{exitConfirmMode === "story"\}/);
 assert.match(host,/onStoryPauseRequest=\{\(\) => openExitConfirm\("story"\)\}/);
 assert.match(host,/if \(screen === "boss"\) saveStoryCheckpoint\(\{version:1,chapter:3,kind:"boss"/);
 assert.match(host,/<small>STORY PAUSED<\/small>/);
 assert.match(host,/if \(mode === "story" && screen !== "boss"\)/);
});

test('boss F7 tools reuse story navigation and panel classes',()=>{
 assert.match(boss,/chapter2-story-test-navigation chapter3-story-test-navigation c3boss-story-test-nav/);
 assert.match(boss,/c3boss-modal chapter2-story-test-panel/);
 assert.match(bossCss,/\.c3boss-root \.c3boss-test-dim/);
 assert.doesNotMatch(boss,/className="c3boss-tools"/);
});
