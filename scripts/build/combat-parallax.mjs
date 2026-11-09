import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {transform} from 'esbuild';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export function inlineParallax(html, code) {
  const start='<!-- COMBAT_PARALLAX_RUNTIME_START -->', end='<!-- COMBAT_PARALLAX_RUNTIME_END -->';
  const legacy='<script src="/assets/runtime/combatParallax.js"></script>';
  const count = marker => html.split(marker).length-1;
  const block=start+'\n<script>\n'+code.replace(/<\/script/gi,'<\\/script')+'</script>\n'+end;
  if (count(start) === 1 && count(end) === 1 && html.indexOf(end) > html.indexOf(start)) {
    return html.slice(0,html.indexOf(start))+block+html.slice(html.indexOf(end)+end.length);
  }
  if (!count(start) && !count(end) && count(legacy) === 1) return html.replace(legacy,block);
  throw new Error('Parallax inline markers are missing, duplicated or out of order. Source was not changed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source=new URL('../../src/game/render/combatParallax.ts',import.meta.url);
  const target=new URL('../../public/assets/runtime/combatParallax.js',import.meta.url);
  const htmlPath=new URL('../../src/embedded/chapter3Wave.html',import.meta.url);
  const result=await transform(await readFile(source,'utf8'),{loader:'ts',format:'iife',globalName:'HobanuCombatParallax',target:'es2020',minify:true,legalComments:'none'});
  const html=await readFile(htmlPath,'utf8');
  // Validate both markers before writing either generated file.
  const next=inlineParallax(html,result.code);
  const runtime='/* Generated from src/game/render/combatParallax.ts. */\n'+result.code;
  await mkdir(new URL('.',target),{recursive:true});
  const current=await readFile(target,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(current!==runtime)await writeFile(target,runtime);
  if(next!==html)await writeFile(htmlPath,next);
}
