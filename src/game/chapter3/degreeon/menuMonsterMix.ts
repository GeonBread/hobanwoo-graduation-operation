/** Mixed Chapter 1/2/3 roster for the second false-main-menu encounter.
 * CH3's original enemy AI remains in the originalChapter3 adapter; CH1/2
 * silhouettes use their existing project sprite URLs and a compact arena AI.
 */
import {CHAPTER1_ENEMY_CATALOG} from '../../chapter1/chapter1WaveCatalog';
import type {Vec,Shot} from './core';
import {clamp,distance,PLAYER_HIT_RADIUS} from './core';
import type {Engine} from './engine';
export type MenuMonsterSpec={chapter:1|2|3;type:string;name:string;sprite:string;color:string};
const chapter2Types:ReadonlyArray<[string,string,string,string]>=[
 ['ghost','시험지 유령','ghost_exam.png','#c9f5ff'],
 ['pointer','레이저 포인터','laser_pointer.png','#4ec9ff'],
 ['submarine','잠수형 몬스터','', '#54d5ff'],
 ['anxiety','불안 코어','anxiety_core.png','#9c67ff'],
 ['noreply','무응답체','no_reply.png','#72de82'],
 ['format','포맷 오류','format_error.png','#ff514d'],
 ['energy','에너지 흡수체','energy_absorber.png','#a76cff'],
 ['reference','참고문헌 벌레','reference_bug.png','#54d5ff'],
 ['highlighter','형광펜','highlighter.png','#b8ea4b'],
 ['countdown','마감 카운트다운','countdown_bot.png','#ffc83f'],
 ['compressor','보고서 압축기','page_compressor.png','#ffd23f'],
 ['drone','2장 공격 드론','', '#ffab48']
];
const chapter3Types:ReadonlyArray<[string,string,string]>=[
 ['drone','졸업 검수 아이','inspection_eye.png'],['laser','졸업 심사 포인터 드론','review_pointer.png'],
 ['snake','졸업 서류 판넬','document_panel.png'],['boomer','결재 파일 캐리어','file_carrier.png'],
 ['charger','학점 압박 드릴','credit_drill.png'],['splitter','수정안 큐브','revision_cube.png'],
 ['tractor','졸업요건 견인기','requirement_tow.png'],['mine','수정 마감 폭탄','deadline_bomb.png'],
 ['suicide','미제출 폭주체','unsubmitted_rampage.png'],['swarm','미이수 군집체','incomplete_swarm.png'],
 ['linker','진로방해 연결체','career_block_linker.png'],['gravity','취업압박 흡수체','employment_pressure_absorber.png'],
 ['branch','진로분기 변칙체','career_branch_variant.png']
];
export const MENU_MONSTER_ROSTER:readonly MenuMonsterSpec[]=[
 ...CHAPTER1_ENEMY_CATALOG.map(entry=>({chapter:1 as const,type:entry.id,name:entry.name,sprite:entry.sprite,color:'#f6d893'})),
 ...chapter2Types.map(([type,name,file,color])=>({chapter:2 as const,type,name,sprite:file?`/assets/chapter2/combat/waves/enemies/${file}`:'',color})),
 ...chapter3Types.map(([type,name,file])=>({chapter:3 as const,type,name,sprite:`/assets/chapter3/combat/waves/enemies/${file}`,color:'#c6a1ff'}))
];
export const MENU_NATIVE_CH3_TYPES=new Set(['drone','laser','suicide','charger','mine','swarm','splitter','linker','boomer','branch']);
export function randomizedMenuRoster(random:()=>number,expert:boolean){
 const quota=expert?[8,8,9]:[4,4,4];
 const shuffle=<T>(items:T[])=>{for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;};
 const picked:MenuMonsterSpec[]=[];
 for(let chapter=1;chapter<=3;chapter++)picked.push(...shuffle(MENU_MONSTER_ROSTER.filter(v=>v.chapter===chapter)).slice(0,quota[chapter-1]));
 return shuffle(picked);
}
export type MenuGuest={spec:MenuMonsterSpec;pos:Vec;home:Vec;age:number;hp:number;shoot:number;phase:number};
export type MenuGuestBullet=Vec&{vx:number;vy:number;age:number;life:number;r:number;chapter:1|2|3};
const imageCache=new Map<string,HTMLImageElement>();
function sprite(path:string){if(!path||typeof Image==='undefined')return null;let im=imageCache.get(path);if(!im){im=new Image();im.src=path;imageCache.set(path,im);}return im;}
export class MenuGuestRuntime{
 guests:MenuGuest[]=[];bullets:MenuGuestBullet[]=[];clock=0;
 constructor(private random:()=>number){}
 spawn(spec:MenuMonsterSpec,p:Vec){this.guests.push({spec,pos:{...p},home:{...p},age:0,hp:spec.type.includes('compressor')?8:3,shoot:1.15+this.random()*.6,phase:this.random()*Math.PI*2});}
 get count(){return this.guests.length;}
 get bulletCount(){return this.bullets.length;}
 clear(){this.guests=[];this.bullets=[];this.clock=0;}
 step(e:Engine,dt:number){this.clock+=dt;const p=e.localPlayer(),w=e.fieldW,h=e.fieldH;
  for(const g of this.guests){g.age+=dt;
   g.pos.x=g.home.x+Math.sin(g.age*(.7+g.spec.chapter*.13)+g.phase)*Math.min(50,w*.052);
   g.pos.y=g.home.y+Math.sin(g.age*.9+g.phase)*Math.min(35,h*.037);
   g.shoot-=dt;
   if(g.shoot<=0){const dx=p.x-g.pos.x,dy=p.y-g.pos.y,d=Math.hypot(dx,dy)||1,speed=125+g.spec.chapter*15+e.stage*10;
    this.bullets.push({x:g.pos.x,y:g.pos.y,vx:dx/d*speed,vy:dy/d*speed,age:0,life:7,r:8,chapter:g.spec.chapter});
    g.shoot=1.5+this.random()*1.2;
   }
   if(distance(g.pos,p)<PLAYER_HIT_RADIUS+29)e.hit(`메인 화면 사기 ${g.spec.name}`);
  }
  for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;if(distance(p,b)<PLAYER_HIT_RADIUS+b.r)e.hit('메인 화면 사기 혼합 웨이브탄');}
  this.bullets=this.bullets.filter(b=>b.age<b.life&&Math.abs(b.x)<w/2+80&&Math.abs(b.y)<h/2+80);
 }
 hitShots(shots:Shot[]){for(const shot of shots){if(shot.age>=3)continue;
   for(let i=this.guests.length-1;i>=0;i--){const g=this.guests[i];if(distance(shot,g.pos)>37)continue;
    g.hp-=shot.native?.damage??1;if(g.hp<=0)this.guests.splice(i,1);
    if(shot.native?.playerBulletKind!=='musicBeam'){shot.age=100;break;}
   }
  }
 }
 bomb(origin:Vec,radius:number){this.guests=this.guests.filter(g=>distance(origin,g.pos)>radius+32);this.bullets=this.bullets.filter(b=>distance(origin,b)>radius+b.r);}
 render(c:CanvasRenderingContext2D){c.save();for(const g of this.guests){const {spec,pos}=g,w=spec.type.includes('compressor')?92:67,h=w*(spec.chapter===1?1.05:.93),im=sprite(spec.sprite);c.save();c.translate(pos.x,pos.y);c.shadowColor=spec.color;c.shadowBlur=12;c.fillStyle=spec.color;c.strokeStyle='#080918';c.lineWidth=5;
   if(im?.complete&&im.naturalWidth)c.drawImage(im,-w/2,-h/2,w,h);
   else{c.beginPath();for(let i=0;i<7;i++){const a=-Math.PI/2+i*Math.PI*2/7,r=(i%2?23:34);i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.stroke();c.fillStyle='#050811';c.fillRect(-15,-4,10,9);c.fillRect(6,-4,10,9);}
   c.restore();}
  for(const b of this.bullets){c.save();c.shadowColor=b.chapter===1?'#ffe59d':b.chapter===2?'#8ee9ff':'#d9a8ff';c.shadowBlur=12;c.fillStyle=b.chapter===1?'#ffe2a2':b.chapter===2?'#83f5ff':'#f5b5ff';c.strokeStyle='#080b14';c.lineWidth=3;c.beginPath();c.arc(b.x,b.y,b.r,0,Math.PI*2);c.fill();c.stroke();c.restore();}c.restore();}
}
