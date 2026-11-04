import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {clamp,smooth,distance,segmentDistance,PLAYER_HIT_RADIUS} from './core';
import {bombReaches} from './bomb';
export const TRACE_RECORD_TIME=4,TRACE_WARN_TIME=1.05,TRACE_HALF_WIDTH=18;
type TracePoint=Vec&{at:number};
export type PathFoldState={phase:'record'|'warn'|'zip'|'rest';age:number;sample:number;round:number;limit:number;zipDuration:number;points:TracePoint[];cleared:Set<number>;activated:number;bulletTimer:number;offsets:number[];totalLength:number;previousPoints:TracePoint[];previousAge:number;};
export const freshPathFold=():PathFoldState=>({phase:'record',age:0,sample:0,round:0,limit:3,zipDuration:2.6,points:[],cleared:new Set(),activated:0,bulletTimer:1.2,offsets:[],totalLength:0,previousPoints:[],previousAge:99});
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
function enter(e:Engine){e.pathFold=freshPathFold();e.pathFold.limit=3;e.pathFold.zipDuration=2.6-e.stage*.2;}
function nextRecord(e:Engine){const s=e.pathFold;s.phase='record';s.age=0;s.sample=0;s.points=[{...e.localPlayer(),at:0}];s.cleared.clear();s.activated=0;s.offsets=[];s.totalLength=0;}
function update(e:Engine,dt:number){
 const s=e.pathFold;s.age+=dt;s.previousAge+=dt;if(s.previousAge>2.35)s.previousPoints=[];
 // Mix ordinary aimed boss bullets into the three geometric folds.
 s.bulletTimer-=dt;
 if(e.emitting&&s.bulletTimer<=0&&s.phase!=='rest'){
  const origin={...e.boss},target=e.localPlayer(),angle=Math.atan2(target.y-origin.y,target.x-origin.x),count=e.stage>=2?5:3;
  for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*.19,spd=165+e.stage*13;
   e.add({...origin,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:8,visual:'shard',warn:.6,life:7,color:'#ffe8aa',tag:'지나온 길 봉합 교차탄'});
  }
  s.bulletTimer=Math.max(1.8,2.8-e.stage*.24);
 }
 if(s.phase==='record'){
  if(!s.points.length)s.points.push({...e.localPlayer(),at:0});s.sample+=dt;
  if(s.sample>=1/24){s.sample%=1/24;const p=e.localPlayer(),last=s.points[s.points.length-1];if(distance(p,last)>3||s.age-last.at>.24)s.points.push({...p,at:Math.min(TRACE_RECORD_TIME,s.age)});}
  if(s.age>=TRACE_RECORD_TIME){s.points.push({...e.localPlayer(),at:TRACE_RECORD_TIME});s.offsets=[];syncPathLengths(s);s.phase='warn';s.age=0;e.log('이동 경로 고정 · 오래된 지점부터 전장이 닫힙니다.');}
 }else if(s.phase==='warn'){
  if(s.age>=TRACE_WARN_TIME){s.phase='zip';s.age=0;e.log('지퍼 절단 개시 · 기록한 경로를 벗어나세요.');}
 }else if(s.phase==='zip'){
  s.activated=s.points.filter((_,i)=>pathSegmentAge(e,i)>=0).length;
  for(const body of e.bodies())if(pathFoldHits(e,e.local(body)))e.hit('지나온 길의 공간 봉합',body);
  if(s.age>=s.zipDuration+.6){s.previousPoints=s.points.map(p=>({...p}));s.previousAge=0;s.phase='rest';s.age=0;s.round++;}
 }else if(s.age>=.5){if(s.round>=s.limit)e.finish();else if(e.emitting)nextRecord(e);}
}
export function clearPathFoldByBomb(e:Engine){
 if(e.pattern.id!=='path-fold'||!['warn','zip'].includes(e.pathFold.phase))return;const s=e.pathFold;
 for(let i=0;i<s.points.length;i++){const b=s.points[i],a=i?s.points[i-1]:b,near=e.nearestPoint(e.smartBombWorldOrigin,a,b);if(bombReaches(e,near,TRACE_HALF_WIDTH))s.cleared.add(i);}
}
function line(c:CanvasRenderingContext2D,a:Vec,b:Vec){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
function render(e:Engine,c:CanvasRenderingContext2D){
 const s=e.pathFold;if(!s.points.length||e.phase!=='active')return;
 c.save();c.lineCap='round';c.lineJoin='round';
 // Preserve the last folded seam as a fading scar. This prevents each fold
 // from disappearing abruptly when the next recorded trajectory starts.
 if(s.previousPoints.length>1&&s.previousAge<2.35){
  const fade=1-smooth(s.previousAge/2.35);
  c.save();c.globalAlpha=fade*.75;c.shadowColor='#b9a0ff';c.shadowBlur=16;c.strokeStyle='#1a0b37';c.lineWidth=10;c.beginPath();
  s.previousPoints.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
  c.strokeStyle='#b1ebff';c.lineWidth=3.2;c.stroke();c.shadowBlur=0;
  if(s.phase==='record'&&s.points.length){
   const a=s.previousPoints[s.previousPoints.length-1],b=s.points[0];c.globalAlpha=fade*.42;c.strokeStyle='#ffe6a4';c.lineWidth=2;c.setLineDash([10,8]);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.setLineDash([]);
  }
  c.restore();
 }
 for(let i=0;i<s.points.length;i++){
  const b=s.points[i],a=i?s.points[i-1]:b,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,n={x:-dy/len,y:dx/len},cleared=s.cleared.has(i);
  if(s.phase==='record'){
   c.strokeStyle='#080719';c.lineWidth=11;c.shadowColor='#fff0ad';c.shadowBlur=8;line(c,a,b);
   c.strokeStyle='#fff3bf';c.lineWidth=5;line(c,a,b);c.shadowBlur=0;
   c.strokeStyle='#64f9ed';c.lineWidth=2;c.globalAlpha=.85;line(c,a,b);c.globalAlpha=1;
   if(i%6===0){c.fillStyle='#fef0bb';c.strokeStyle='#070817';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,4.5,0,Math.PI*2);c.fill();c.stroke();}continue;
  }
  const age=pathSegmentAge(e,i),open=s.phase==='warn'||s.phase==='zip'&&age<0;
  if(open){
   if(distance(a,b)<.1){c.save();c.globalAlpha=cleared?.12:.45;c.fillStyle='#bc79ed';c.strokeStyle='#e6b1ff';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,TRACE_HALF_WIDTH,0,Math.PI*2);c.fill();c.stroke();c.restore();}
   c.globalAlpha=cleared?.12:1;c.strokeStyle=s.phase==='warn'?'#fff0b44d':'#b0eaff44';c.lineWidth=TRACE_HALF_WIDTH*2;line(c,a,b);c.strokeStyle='#080817';c.lineWidth=7;c.setLineDash([12,8]);
   for(const side of [-1,1])line(c,{x:a.x+n.x*TRACE_HALF_WIDTH*side,y:a.y+n.y*TRACE_HALF_WIDTH*side},{x:b.x+n.x*TRACE_HALF_WIDTH*side,y:b.y+n.y*TRACE_HALF_WIDTH*side});
   c.strokeStyle='#fff5bc';c.lineWidth=3.5;for(const side of [-1,1])line(c,{x:a.x+n.x*TRACE_HALF_WIDTH*side,y:a.y+n.y*TRACE_HALF_WIDTH*side},{x:b.x+n.x*TRACE_HALF_WIDTH*side,y:b.y+n.y*TRACE_HALF_WIDTH*side});c.setLineDash([]);
   if(s.phase==='warn'&&!cleared){const k=clamp(s.age/TRACE_WARN_TIME,0,1);c.strokeStyle='#f4d9ff';c.lineWidth=2;line(c,{x:a.x+n.x*TRACE_HALF_WIDTH*(1-k),y:a.y+n.y*TRACE_HALF_WIDTH*(1-k)},{x:b.x+n.x*TRACE_HALF_WIDTH*(1-k),y:b.y+n.y*TRACE_HALF_WIDTH*(1-k)});}continue;
  }
  const opacity=s.phase==='rest'?1-smooth(s.age/.5):1-smooth((age-.25)/.6);if(opacity<=0)continue;c.globalAlpha=opacity*(cleared?.14:1);
  const close=smooth(age/.18),gap=TRACE_HALF_WIDTH*(1-close);
  for(const side of [-1,1]){
   const inner=gap*side,outer=(TRACE_HALF_WIDTH+22)*side;
   const grad=c.createLinearGradient(b.x+n.x*outer,b.y+n.y*outer,b.x+n.x*inner,b.y+n.y*inner);grad.addColorStop(0,'#141024');grad.addColorStop(.7,'#7248a5');grad.addColorStop(1,'#e8bcff');c.fillStyle=grad;c.beginPath();c.moveTo(a.x+n.x*outer,a.y+n.y*outer);c.lineTo(b.x+n.x*outer,b.y+n.y*outer);c.lineTo(b.x+n.x*inner,b.y+n.y*inner);c.lineTo(a.x+n.x*inner,a.y+n.y*inner);c.closePath();c.fill();
  }
  c.strokeStyle=cleared?'#839a9a':'#fff7d4';c.lineWidth=cleared?1:5;c.shadowColor='#fed888';c.shadowBlur=cleared?0:23;line(c,a,b);c.shadowBlur=0;
  if(!cleared&&s.phase==='zip'&&age>=0&&age<.27){const k=smooth(age/.27),hx=a.x+dx*k,hy=a.y+dy*k;
   c.save();c.strokeStyle='#b4fffa';c.shadowColor='#89fff0';c.shadowBlur=19;c.lineWidth=4;c.beginPath();c.arc(hx,hy,8+21*k,0,Math.PI*2);c.stroke();c.restore();}

  const steps=Math.max(1,Math.ceil(len/12));c.fillStyle='#efceff';for(let j=0;j<steps;j++){const k=(j+.5)/steps,x=a.x+dx*k,y=a.y+dy*k,side=(i+j)%2?1:-1;c.beginPath();c.moveTo(x-n.x*2,y-n.y*2);c.lineTo(x+dx/len*5+n.x*side*9,y+dy/len*5+n.y*side*9);c.lineTo(x-dx/len*5+n.x*side*9,y-dy/len*5+n.y*side*9);c.closePath();c.fill();}
  if(e.hitboxes&&pathSegmentLive(e,i)){c.strokeStyle='#fff9';c.lineWidth=TRACE_HALF_WIDTH*2;line(c,a,b);}
 }
 if(s.phase==='record'){const p=s.points[s.points.length-1];c.globalAlpha=.8;c.strokeStyle='#d8b4f4';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,13,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(s.age/TRACE_RECORD_TIME,0,1));c.stroke();}
 c.restore();
}
export const pathFoldPattern:Pattern={id:'path-fold',name:'지나온 길이 접힌다',english:'FOOTPRINT ZIPPER',subtitle:'4초간 남긴 이동 경로를 기억하세요. 예고 후 오래된 경로부터 지퍼처럼 닫힙니다.',category:'special',orientation:0,stages:['이동 흔적 3회','빠른 봉합 3회','경로 봉합 3회','고속 추격 봉합 3회'],duration:Infinity,enter,update,render,exit:e=>{e.pathFold=freshPathFold();}};
