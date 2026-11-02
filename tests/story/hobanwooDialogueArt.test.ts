import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import {chapter1StoryDocument as part1} from '../../src/story/chapter1/chapter1StoryPart1Document';
import {chapter1StoryDocument as part2} from '../../src/story/chapter1/chapter1StoryPart2Document';
const root=new URL('../../',import.meta.url);
const read=(path:string)=>fs.readFileSync(new URL(path,root),'utf8');
const data=JSON.parse(read('src/story/hobanwooDialogueArtData.json'));
const runtime=read('src/story/hobanwooDialogueArtRuntime.js');
function environment(){return vm.createContext({window:{location:{search:''}},document:{documentElement:{classList:{add(){}}}},URLSearchParams,console});}
function artEnvironment(){const context=environment();vm.runInContext(runtime,context);return {context,api:(context.window as any).HobanwooDialogueArt};}
function segments(chapter:number,part=0){
 const context=environment();
 if(chapter===1){
  const document=part===1?part1:part2;for(const source of document.bootstrapScripts)vm.runInContext(source,context);
  const marker="  const storyStage = document.getElementById('storyStage');";assert.ok(document.runtimeScript.includes(marker));
  vm.runInContext(document.runtimeScript.slice(0,document.runtimeScript.indexOf(marker))+'\nwindow.__segments=storySegments;})();',context);
  return (context.window as any).__segments;
 }
 const html=read(`src/embedded/chapter${chapter}Story.html`);
 const source=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('window.STORY_DATA ='))!;
 const parsed=ts.createSourceFile('story.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const assignment=parsed.statements.find(statement=>ts.isExpressionStatement(statement)&&statement.getText(parsed).startsWith('window.STORY_DATA ='))!;
 vm.runInContext(source.slice(0,assignment.end),context);return (context.window as any).STORY_DATA.segments;
}
for(const [chapter,part,expected] of [[1,1,87],[1,2,78],[2,0,152],[3,0,129]]){
 test(`chapter ${chapter} part ${part} matches all ${expected} supplied lines while preserving text, actor sides and other characters`,()=>{
  const original=segments(chapter,part),before=JSON.parse(JSON.stringify(original)),{api}=artEnvironment();
  const report=api.prepare(original,chapter,part);assert.equal(report.matched.length,expected);assert.equal(report.missing.length,0);
  for(const [segment,entries] of Object.entries(original) as [string,any[]][]){
   assert.equal(entries.length,before[segment].length);
   entries.forEach((item,index)=>{
    const previous=before[segment][index],current=JSON.parse(JSON.stringify(item));
    for(const side of ['left','right']){
     const field=chapter===1?`${side}ActorImage`:`${side}Image`;
     if(previous[side]==='hobanwoo'){if(field in previous)current[field]=previous[field];else delete current[field];}
    }
    assert.deepEqual(current,previous);
   });
  }
 });
}
test('deleted dialogue is skipped instead of reinserted or shifting later assignments',()=>{
 const all=segments(2),entries=all.chapter2_full,removed=entries.findIndex((item:any)=>item.speaker==='hobanwoo');
 const text=entries[removed].text;entries.splice(removed,1);const length=entries.length,{api}=artEnvironment();
 const report=api.prepare(all,2);assert.equal(entries.length,length);assert.equal(report.missing.length,1);assert.equal(report.missing[0].text,text);assert.equal(report.matched.length,151);
 const next=entries.slice(removed).find((item:any)=>item.speaker==='hobanwoo');assert.match(next.rightImage,/hobanwoo_pose_/);
});
test('an intentionally hidden speaker receives no actor side or forced image',()=>{
 const rule=data.rules['3'][0],hidden={speaker:'hobanwoo',text:rule.text,left:null,right:null};
 const all={chapter3_full:[{type:'section-marker',title:rule.section},hidden]},{api}=artEnvironment();api.prepare(all,3);
 assert.deepEqual(hidden,{speaker:'hobanwoo',text:rule.text,left:null,right:null});
});
test('identical short replies in different scenes retain their distinct mapped artworks',()=>{
 const rows=data.rules['3'];let pair:any[]=[];
 for(const a of rows){const b=rows.find((b:any)=>b.text===a.text&&b.section!==a.section&&b.art!==a.art);if(b){pair=[a,b];break;}}
 assert.equal(pair.length,2);const all:any={chapter3_full:[]}, {api}=artEnvironment(),items:any[]=[];
 for(const row of pair){all.chapter3_full.push({type:'section-marker',title:row.section});for(let i=0;i<row.occurrence;i++){const item={speaker:'hobanwoo',text:row.text,right:'hobanwoo'};all.chapter3_full.push(item);if(i===row.occurrence-1)items.push(item);}}
 api.prepare(all,3);pair.forEach((row,i)=>assert.ok(items[i].rightImage.endsWith(data.art[row.art].file)));
});
test('PNG assets are byte-identical to the supplied English-name originals and portrait/sobbing poses are absent from dialogue assignments',()=>{
 for(const art of Object.values(data.art) as any[]){
  const bytes=fs.readFileSync(new URL('public/assets/common/characters/hobanwoo/'+art.file,root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),art.sha256);assert.equal(bytes[25],6);
 }
 for(const row of Object.values(data.rules).flat() as any[])assert.ok(!['P05','P14','P25'].includes(row.art));
});
test('all 24 full-body poses preserve bitmap proportions, visible height, foot baseline and horizontal centering',()=>{
 const {context,api}=artEnvironment();(context.window as any).getComputedStyle=()=>({height:'356px'});
 const host={clientHeight:614,clientWidth:340};
 for(const art of Object.values(data.art) as any[]){
  if(art.portrait)continue;const values=new Map<string,string>();
  const image={isConnected:true,parentElement:host,style:{getPropertyValue:(k:string)=>values.get(k)||'',getPropertyPriority:()=>'',setProperty:(k:string,v:string)=>values.set(k,v),removeProperty:(k:string)=>values.delete(k)},dataset:{},classList:{add(){},remove(){}}};
  api.layout(image,'/assets/common/characters/hobanwoo/'+art.file);
  const width=parseFloat(values.get('width')!),height=parseFloat(values.get('height')!),bottom=parseFloat(values.get('bottom')!),left=host.clientWidth/2-Number(values.get('left')!.match(/- ([\d.]+)px/)![1]);
  const scale=height/art.height,box=art.bounds;
  assert.ok(Math.abs(width/height-art.width/art.height)<1e-6);
  assert.ok(Math.abs((box[3]-box[1])*scale-356)<.001);
  assert.ok(Math.abs(-bottom-height+box[3]*scale)<.001);
  assert.ok(Math.abs(left+art.anchorX*scale-host.clientWidth/2)<.001);
 }
});
test('both embedded copies contain the exact shared runtime and need no external artwork script request',()=>{
 for(const chapter of [2,3]){
  const html=read(`src/embedded/chapter${chapter}Story.html`),inline=html.match(/<!-- HOBANWOO_DIALOGUE_ART_START -->\n<script>\n([\s\S]*?)\n<\/script>\n<!-- HOBANWOO_DIALOGUE_ART_END -->/)![1];
  assert.equal(inline,runtime);assert.doesNotMatch(html,/<script src=["'][^"']*hobanwooDialogueArt/);
 }
});
