import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/story/hobanwooDialogueArtTemplate.js'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'src/story/hobanwooDialogueArtData.json'),'utf8'));
const runtime=source.replace('/* HOBANWOO_ART_DATA */ {}',JSON.stringify(data));
fs.writeFileSync(path.join(root,'src/story/hobanwooDialogueArtRuntime.js'),runtime);
for(const chapter of [2,3]){
 const filename=path.join(root,`src/embedded/chapter${chapter}Story.html`);
 let html=fs.readFileSync(filename,'utf8');
 const inline=`<!-- HOBANWOO_DIALOGUE_ART_START -->\n<script>\n${runtime}\n</script>\n<!-- HOBANWOO_DIALOGUE_ART_END -->`;
 if(html.includes('<!-- HOBANWOO_DIALOGUE_ART_START -->'))html=html.replace(/<!-- HOBANWOO_DIALOGUE_ART_START -->[\s\S]*?<!-- HOBANWOO_DIALOGUE_ART_END -->/,inline);
 else {const i=html.indexOf('<script');if(i<0)throw new Error('Story script missing');html=html.slice(0,i)+inline+'\n'+html.slice(i);}
 fs.writeFileSync(filename,html);
}
console.log('Built shared Hobanwoo dialogue artwork runtime and both embedded story copies.');
