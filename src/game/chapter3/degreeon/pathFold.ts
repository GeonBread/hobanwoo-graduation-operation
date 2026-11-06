import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {clamp,smooth,distance,segmentDistance,PLAYER_HIT_RADIUS} from './core';
import {bombReaches} from './bomb';
export const TRACE_RECORD_TIME=4,TRACE_WARN_TIME=1.05,TRACE_HALF_WIDTH=18;
type TracePoint=Vec&{at:number};
export type PathFoldState={phase:'record'|'warn'|'zip'|'rest';age:number;sample:number;round:number;limit:number;zipDuration:number;points:TracePoint[];cleared:Set<number>;activated:number;bulletTimer:number;offsets:number[];totalLength:number;};
export const freshPathFold=():PathFoldState=>({phase:'record',age:0,sample:0,round:0,limit:3,zipDuration:2.15,points:[],cleared:new Set(),activated:0,bulletTimer:1.2,offsets:[],totalLength:0});
function syncPathLengths(s:PathFoldState){
 if(s.offsets.length===s.points.length)return;
 s.offsets=[];let total=0;for(let i=0;i<s.points.length;i++){if(i>0)total+=distance(s.points[i-1],s.points[i]);s.offsets.push(total);}
 s.totalLength=Math.max(1,total);
}
export function pathSegmentAge(e:Engine,i:number){const s=e.pathFold;syncPathLengths(s);const u=(s.offsets[Math.max(0,i-1)]??0)/s.totalLength;
 return (s.phase==='rest'?s.zipDuration+.6+s.age:s.age)-u*s.zipDuration;
}
export function pathSegmentLive(e:Engine,i:number){const s=e.pathFold,a=pathSegmentAge(e,i);return s.phase==='zip'&&!s.cleared.has(i)&&a>=0&&a<.85;}
export function pathFoldHits(e:Engine,p:Vec){
 const s=e.pathFold;return s.points.some((q,i)=>pathSegmentLive(e,i)&&segmentDistance(p,i?s.points[i-1]:q,q)<TRACE_HALF_WIDTH+PLAYER_HIT_RADIUS);
}
export function enterPathFold(e:Engine){e.pathFold=freshPathFold();e.pathFold.limit=3;e.pathFold.zipDuration=2.15-e.stage*.14;}
export function nextPathFoldRecord(e:Engine){const s=e.pathFold;s.phase='record';s.age=0;s.sample=0;s.points=[{...e.localPlayer(),at:0}];s.cleared.clear();s.activated=0;s.offsets=[];s.totalLength=0;}
export function pathFoldActive(e:Engine){return e.phase==='active'&&(e.pattern.id==='path-fold'||e.pattern.category!=='special'&&e.selectedSupports.has('path-fold'));}
export function updatePathFold(e:Engine,dt:number){
 const s=e.pathFold;s.age+=dt;
 // The selected normal attack supplies ordinary bullets when this runs as a
 // support overlay. Solo support previews therefore contain only the fold.
 if(s.phase==='record'){
  if(!s.points.length)s.points.push({...e.localPlayer(),at:0});s.sample+=dt;
  if(s.sample>=1/24){s.sample%=1/24;const p=e.localPlayer(),last=s.points[s.points.length-1];if(distance(p,last)>3||s.age-last.at>.24)s.points.push({...p,at:Math.min(TRACE_RECORD_TIME,s.age)});}
  if(s.age>=TRACE_RECORD_TIME){s.points.push({...e.localPlayer(),at:TRACE_RECORD_TIME});s.offsets=[];syncPathLengths(s);s.phase='warn';s.age=0;e.log('이동 경로 고정 · 오래된 지점부터 전장이 닫힙니다.');}
 }else if(s.phase==='warn'){
  if(s.age>=TRACE_WARN_TIME){s.phase='zip';s.age=0;e.log('지퍼 절단 개시 · 기록한 경로를 벗어나세요.');}
 }else if(s.phase==='zip'){
  s.activated=s.points.filter((_,i)=>pathSegmentAge(e,i)>=0).length;
  for(const body of e.bodies())if(pathFoldHits(e,e.local(body)))e.hit('지나온 길의 공간 봉합',body);
  if(s.age>=s.zipDuration+.6){s.phase='rest';s.age=0;s.round++;}
 }else if(s.age>=.5){if(s.round>=s.limit){if(e.pattern.id==='path-fold')e.finish();else{s.round=0;nextPathFoldRecord(e);}}else if(e.emitting)nextPathFoldRecord(e);}
}
export function clearPathFoldByBomb(e:Engine){
 if(!pathFoldActive(e)||!['warn','zip'].includes(e.pathFold.phase))return;const s=e.pathFold;
 for(let i=0;i<s.points.length;i++){const b=s.points[i],a=i?s.points[i-1]:b,near=e.nearestPoint(e.smartBombWorldOrigin,a,b);if(bombReaches(e,near,TRACE_HALF_WIDTH))s.cleared.add(i);}
}
function line(c:CanvasRenderingContext2D,a:Vec,b:Vec){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
export function renderPathFold(e:Engine,c:CanvasRenderingContext2D){
 const s=e.pathFold;if(!s.points.length||e.phase!=='active')return;
 c.save();c.lineCap='round';c.lineJoin='round';
 for(let i=0;i<s.points.length;i++){
  const b=s.points[i],a=i?s.points[i-1]:b,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,n={x:-dy/len,y:dx/len},cleared=s.cleared.has(i);
  if(s.phase==='record'){
   c.strokeStyle='#090612';c.lineWidth=8;c.setLineDash([12,12]);line(c,a,b);
   c.strokeStyle='#ffe7a6';c.lineWidth=3.4;c.setLineDash([9,15]);c.shadowColor='#ffdc8a';c.shadowBlur=12;line(c,a,b);c.shadowBlur=0;c.setLineDash([]);
   if(i%5===0){c.fillStyle='#fff0bb';c.strokeStyle='#070817';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,4,0,Math.PI*2);c.fill();c.stroke();}continue;
  }
  const age=pathSegmentAge(e,i),open=s.phase==='warn'||s.phase==='zip'&&age<0;
  if(open){
   if(distance(a,b)<.1){c.save();c.globalAlpha=cleared?.12:.45;c.fillStyle='#bc79ed';c.strokeStyle='#e6b1ff';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,TRACE_HALF_WIDTH,0,Math.PI*2);c.fill();c.stroke();c.restore();}
   c.globalAlpha=cleared?.12:1;c.fillStyle=s.phase==='warn'?'rgba(186,117,255,.16)':'rgba(136,235,255,.14)';c.beginPath();c.moveTo(a.x+n.x*TRACE_HALF_WIDTH,a.y+n.y*TRACE_HALF_WIDTH);c.lineTo(b.x+n.x*TRACE_HALF_WIDTH,b.y+n.y*TRACE_HALF_WIDTH);c.lineTo(b.x-n.x*TRACE_HALF_WIDTH,b.y-n.y*TRACE_HALF_WIDTH);c.lineTo(a.x-n.x*TRACE_HALF_WIDTH,a.y-n.y*TRACE_HALF_WIDTH);c.closePath();c.fill();
   c.strokeStyle='#080817';c.lineWidth=6.2;c.setLineDash([17,11]);
   for(const side of [-1,1])line(c,{x:a.x+n.x*TRACE_HALF_WIDTH*side,y:a.y+n.y*TRACE_HALF_WIDTH*side},{x:b.x+n.x*TRACE_HALF_WIDTH*side,y:b.y+n.y*TRACE_HALF_WIDTH*side});
   c.strokeStyle=s.phase==='warn'?'#ffe9ad':'#bff8ff';c.lineWidth=3.2;for(const side of [-1,1])line(c,{x:a.x+n.x*TRACE_HALF_WIDTH*side,y:a.y+n.y*TRACE_HALF_WIDTH*side},{x:b.x+n.x*TRACE_HALF_WIDTH*side,y:b.y+n.y*TRACE_HALF_WIDTH*side});c.setLineDash([]);
   if(s.phase==='warn'&&!cleared){const k=clamp(s.age/TRACE_WARN_TIME,0,1),zig=6+10*k;for(const side of [-1,1]){c.beginPath();const steps=Math.max(3,Math.ceil(len/22));for(let j=0;j<=steps;j++){const t=j/steps,px=a.x+dx*t+n.x*TRACE_HALF_WIDTH*side,py=a.y+dy*t+n.y*TRACE_HALF_WIDTH*side,offset=(j%2?1:-1)*zig*(1-k);j?c.lineTo(px+n.x*offset,py+n.y*offset):c.moveTo(px+n.x*offset,py+n.y*offset);}c.strokeStyle='#f8d7ff';c.lineWidth=1.6;c.stroke();}}continue;
  }
  const opacity=s.phase==='rest'?1-smooth(s.age/.5):1-smooth((age-.18)/.58);if(opacity<=0)continue;c.globalAlpha=opacity*(cleared?.14:1);
  const close=smooth(age/.16),gap=TRACE_HALF_WIDTH*(1-close);
  for(const side of [-1,1]){
   const inner=gap*side,outer=(TRACE_HALF_WIDTH+18)*side;
   const grad=c.createLinearGradient(b.x+n.x*outer,b.y+n.y*outer,b.x+n.x*inner,b.y+n.y*inner);grad.addColorStop(0,'#120d20');grad.addColorStop(.54,'#5a357f');grad.addColorStop(1,'#f0caff');c.fillStyle=grad;c.beginPath();c.moveTo(a.x+n.x*outer,a.y+n.y*outer);c.lineTo(b.x+n.x*outer,b.y+n.y*outer);c.lineTo(b.x+n.x*inner,b.y+n.y*inner);c.lineTo(a.x+n.x*inner,a.y+n.y*inner);c.closePath();c.fill();
  }
  c.strokeStyle=cleared?'#839a9a':'#fff7d4';c.lineWidth=cleared?1:4.2;c.shadowColor='#fed888';c.shadowBlur=cleared?0:20;line(c,a,b);c.shadowBlur=0;
  if(!cleared&&s.phase==='zip'&&age>=0&&age<.24){const k=smooth(age/.24),hx=a.x+dx*k,hy=a.y+dy*k;
   c.save();c.strokeStyle='#b4fffa';c.shadowColor='#89fff0';c.shadowBlur=18;c.lineWidth=4;c.beginPath();c.arc(hx,hy,7+19*k,0,Math.PI*2);c.stroke();c.restore();
   c.save();c.translate(hx,hy);c.rotate(Math.atan2(dy,dx));c.strokeStyle='#fff0bf';c.lineWidth=2.4;for(const side of [-1,1]){c.beginPath();c.moveTo(-11,-TRACE_HALF_WIDTH*.48*side);for(let k2=0;k2<5;k2++){const x=-11+k2*7,y=(k2%2?1:-1)*7*side;c.lineTo(x,y);}c.lineTo(24,TRACE_HALF_WIDTH*.55*side);c.stroke();}c.restore();}
  if(e.hitboxes&&pathSegmentLive(e,i)){c.strokeStyle='#fff9';c.lineWidth=TRACE_HALF_WIDTH*2;line(c,a,b);}
 }
 if(s.phase==='record'){const p=s.points[s.points.length-1];c.globalAlpha=.8;c.strokeStyle='#d8b4f4';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,13,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(s.age/TRACE_RECORD_TIME,0,1));c.stroke();}
 c.restore();
}
export const pathFoldPattern:Pattern={id:'path-fold',name:'지나온 길이 접힌다',english:'FOOTPRINT ZIPPER',subtitle:'4초간 남긴 이동 경로를 기억하세요. 예고 후 오래된 경로부터 전장이 지그재그로 접히며 닫힙니다.',category:'support',orientation:0,stages:['이동 흔적 3회','빠른 봉합 3회','경로 봉합 3회','고속 추격 봉합 3회'],duration:Infinity,enter:enterPathFold,update:updatePathFold,render:renderPathFold,exit:e=>{e.pathFold=freshPathFold();}};
