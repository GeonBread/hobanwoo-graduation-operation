import {handFrame,handHits,drawHands,handRects} from './handRig';
export {handRects,handHits,handParts} from './handRig';
import type {Engine} from './engine';
import type {Pattern,Vec} from './core';
import {clamp,smooth,distance,circleRect,segmentDistance,PLAYER_HIT_RADIUS} from './core';
import {bombReaches} from './bomb';
export type Hand={side:number;u:number;mode:'slam'|'sweep'|'cage'|'deep'|'stir'|'flurry';age:number;warn:number;life:number;impacted:boolean;impacts?:number};
export type HandState={age:number;round:number;timer:number;hands:Hand[]};
export type InspectionEye={x:number;angle:number;direction:-1|1;detection:number};
export type InspectionState={age:number;angle:number;lastPlayer:Vec;motion:number;detection:number;cooldown:number;detections:number;eyes:InspectionEye[]};
export type GraduationLock=Vec&{hp:number;maxHp:number;broken:boolean};
export type GateState={age:number;phase:'locks'|'open'|'expose'|'overload';phaseAge:number;locks:GraduationLock[];order:number[];opened:number;timer:number;overloadTick:number};
export type UnseenState={hands:HandState;inspection:InspectionState;gate:GateState};
export const freshUnseen=():UnseenState=>({hands:{age:0,round:0,timer:.3,hands:[]},inspection:{age:0,angle:Math.PI/2,lastPlayer:{x:0,y:0},motion:0,detection:0,cooldown:0,detections:0,eyes:[]},gate:{age:0,phase:'locks',phaseAge:0,locks:[],order:[1,0,2],opened:0,timer:1,overloadTick:0}});
function spawnHand(e:Engine,side:number,mode:Hand['mode'],u:number){const life=mode==='flurry'?2.5:mode==='stir'?2.6:mode==='deep'?2:mode==='cage'?2:1.7;e.unseen.hands.hands.push({side,u,mode,age:0,warn:1.1-e.stage*.06,life,impacted:false,impacts:0});}
function updateHands(e:Engine,dt:number){const s=e.unseen.hands;s.age+=dt;s.timer-=dt;
 if(e.emitting&&s.timer<=0&&s.round<8&&s.age<28){const n=s.round++,mode:Hand['mode']=['slam','deep','sweep','flurry','stir','cage'][n%6] as Hand['mode'];
  if(mode==='cage'){const center=clamp(e.localPlayer().y,-e.fieldH/2+150,e.fieldH/2-150)/e.fieldH;spawnHand(e,1,mode,center);spawnHand(e,3,mode,-center);s.timer=3;}
  else{const side=n%4,p=e.localPlayer(),a=side*Math.PI/2,span=side%2?e.fieldH:e.fieldW,u=clamp((p.x*Math.cos(a)+p.y*Math.sin(a))/span,-.35,.35);spawnHand(e,side,mode,mode==='sweep'||mode==='stir'?0:u);s.timer=mode==='flurry'?3.25:mode==='stir'?3.2:mode==='deep'?2.5:1.85-e.stage*.09;}}
 for(const h of s.hands){h.age+=dt;const t=h.age-h.warn,cycle=h.mode==='flurry'?Math.floor(Math.max(0,t)/.78):0,impactTime=h.mode==='flurry'?cycle*.78+.18:.26;
  if(t>=impactTime&&(h.impacts??0)<=cycle&&(h.mode!=='flurry'||cycle<3)){h.impacted=true;h.impacts=cycle+1;e.shake=Math.max(e.shake,.15);const f=handFrame(e,h),p=handRects(e,h)[0];e.fx({x:f.x+p.x*Math.cos(f.a)-p.y*Math.sin(f.a),y:f.y+p.x*Math.sin(f.a)+p.y*Math.cos(f.a)},'burst',95,'#ddaeff',.6);}
  for(const b of e.bodies())if(handHits(e,h,e.local(b)))e.hit('전장 밖 거대한 손',b);}
 s.hands=s.hands.filter(h=>h.age<h.warn+h.life);if((s.round>=8||s.age>28)&&!s.hands.length)e.finish();
}
function inspectionOrigin(e:Engine,eye:InspectionEye):Vec{return{x:eye.x,y:-e.fieldH/2+130};}
function inspectionEyeSees(e:Engine,eye:InspectionEye,p:Vec){
 const origin=inspectionOrigin(e,eye),a=Math.atan2(p.y-origin.y,p.x-origin.x);
 let delta=a-eye.angle;while(delta>Math.PI)delta-=Math.PI*2;while(delta< -Math.PI)delta+=Math.PI*2;
 return Math.abs(delta)<.20;
}
function ensureInspectionEyes(e:Engine){const s=e.unseen.inspection,count=e.stage>=2?2:1;
 if(s.eyes.length===count)return;
 const saved=e.inspectionMemory?.eyes;
 s.eyes=Array.from({length:count},(_,i)=>({
  x:count===1?0:(i===0?-1:1)*e.fieldW*.27,
  angle:saved?.length===count?saved[i].angle:Math.PI/2+(count===1?0:i===0?-.31:.31),
  direction:(saved?.length===count?saved[i].direction:count===1?1:i===0?1:-1) as -1|1,
  detection:0
 }));s.angle=s.eyes[0].angle;
}
export function inspectionSees(e:Engine,p:Vec){ensureInspectionEyes(e);return e.unseen.inspection.eyes.some(eye=>inspectionEyeSees(e,eye,p));}
function updateInspection(e:Engine,dt:number){const s=e.unseen.inspection;ensureInspectionEyes(e);s.age+=dt;
 const min=Math.PI/2-.98,max=Math.PI/2+.98,rate=e.stage>=2?.78:.52;
 for(const [i,eye] of s.eyes.entries()){
  eye.x=s.eyes.length===1?0:(i===0?-1:1)*e.fieldW*.27;
  eye.angle+=eye.direction*rate*dt;
  if(eye.angle>=max){eye.angle=max-(eye.angle-max);eye.direction=-1;}
  else if(eye.angle<=min){eye.angle=min+(min-eye.angle);eye.direction=1;}
 }
 s.angle=s.eyes[0].angle;s.cooldown=Math.max(0,s.cooldown-dt);const p=e.localPlayer();s.motion=distance(p,s.lastPlayer)/Math.max(dt,.0001);s.lastPlayer={...p};
 const moving=s.motion>24;
 for(const eye of s.eyes){const seen=e.bodies().some(b=>inspectionEyeSees(e,eye,e.local(b)));eye.detection=seen&&moving?Math.min(1,eye.detection+dt*5):Math.max(0,eye.detection-dt*3);}
 s.detection=Math.max(0,...s.eyes.map(eye=>eye.detection));
 if(e.emitting&&s.detection>=1&&s.cooldown===0){s.detections++;s.cooldown=1.3;s.detection=0;s.eyes.forEach(eye=>eye.detection=0);const origin={x:p.x,y:-e.fieldH/2-40};e.add({...origin,vx:0,vy:900,r:8,visual:'spear',warn:.75,life:(e.fieldH+150)/900+.2,color:'#ffcc9d',tag:'졸업 검수 오염창',motion:{kind:'spear',anchor:origin,target:{x:p.x,y:e.fieldH/2+50},direction:{x:0,y:1},trigger:e.fieldH+120}});e.log('움직임 감지 · 고정 위치 오염창 예고');}
 if(e.emitting&&e.beat<=0){e.beat=2-e.stage*.16;const gap=(Math.floor(s.age/3)%3-1)*e.fieldW*.25;for(let x=-e.fieldW/2+28;x<e.fieldW/2;x+=55){if(Math.abs(x-gap)<100)continue;e.add({x,y:-e.fieldH/2-16,vx:0,vy:90+e.stage*10,r:13,visual:'drop',warn:0,life:e.fieldH/90+2,color:'#ffe0a1',tag:'검수 중 느린 오염탄'});}}
}
function drawInspection(e:Engine,c:CanvasRenderingContext2D){const s=e.unseen.inspection;ensureInspectionEyes(e);const len=Math.hypot(e.fieldW,e.fieldH);
 for(const eye of s.eyes){const o=inspectionOrigin(e,eye),danger=eye.detection>.15;c.save();c.translate(o.x,o.y);c.rotate(eye.angle);
  const g=c.createRadialGradient(0,0,12,0,0,len);g.addColorStop(0,danger?'#ffb76d55':'#fff2c044');g.addColorStop(1,'#f5cf7300');c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.arc(0,0,len,-.2,.2);c.closePath();c.fill();
  c.strokeStyle=danger?'#ffbd84aa':'#fff0bfaa';c.lineWidth=2.7;for(const a of [-.2,.2]){c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*len,Math.sin(a)*len);c.stroke();}
  c.rotate(-eye.angle);c.fillStyle='#201628';c.strokeStyle='#ffe4a4';c.lineWidth=3;c.shadowColor='#ffd58a';c.shadowBlur=18;c.beginPath();c.ellipse(0,0,46,23,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#fff4d0';c.beginPath();c.arc(Math.cos(eye.angle)*7,Math.sin(eye.angle)*7,12,0,Math.PI*2);c.fill();c.restore();
 }
 const p=e.localPlayer();if(inspectionSees(e,p)){c.save();c.strokeStyle=s.detection>.15?'#ffba77':'#9fffe1';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,28,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.05,s.detection));c.stroke();c.restore();}
}
export function syncGateLocks(e:Engine){const g=e.unseen.gate,n=g.locks.length;for(let i=0;i<n;i++){
 g.locks[i].x=(i-(n-1)/2)*Math.min(210/(Math.max(1,(n-1)/2)),e.fieldW/(n+1)*.88);
 g.locks[i].y=-e.fieldH*.10;
}}
export function shootGraduationLock(e:Engine,p:Vec,prev:Vec):boolean{
 if(e.pattern.id!=='graduation-gate'||e.phase!=='active'||e.unseen.gate.phase!=='locks')return false;
 const g=e.unseen.gate;
 for(const [i,lock]of g.locks.entries()){
  if(lock.broken||segmentDistance(lock,prev,p)>32)continue;
  if(g.order[g.opened]===i){
   lock.hp--;e.fx(lock,'ring',24,'#ffe5a5',.2);
   if(lock.hp<=0){
    lock.broken=true;g.opened++;e.shake=Math.max(e.shake,.1);e.fx(lock,'burst',70,'#ffe7b4',.7);
    e.log(`졸업문 잠금 해제 · ${g.opened}/${g.locks.length}`);releaseGateVolley(e,g.opened);
    if(g.opened===g.locks.length){g.phase='open';g.phaseAge=0;}
   }
  }else e.fx(lock,'ring',20,'#9588aa',.2);
  return true;
 }
 return false;
}
export function gateBlocksBoss(e:Engine){return e.pattern.id==='graduation-gate'&&e.phase==='active'&&e.unseen.gate.phase!=='expose';}
function releaseGateVolley(e:Engine,level:number){
 const origin={x:0,y:-e.fieldH/2+190},n=10+level*3;
 for(let i=0;i<n;i++){
  const a=(i+.5)*Math.PI/n,speed=125+level*19;
  e.add({...origin,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:9,visual:'core',warn:.8,life:8,color:level===5?'#ffd294':'#d7a4ff',tag:'졸업문 잠금 파열탄'});
 }
}
function floodGateExplosion(e:Engine,age:number){
 const origin={x:0,y:-e.fieldH/2+190};
 const offset=age*2.8;
 for(let i=0;i<16;i++){
  const a=i*Math.PI*2/16+offset,v=190+(i%4)*29+e.stage*9;
  e.add({...origin,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:i%3===0?12:9,visual:'core',warn:0,life:8,color:i%2===0?'#ff5b8b':'#ffbb57',tag:'졸업문 시간초과 폭발탄'});
 }
 e.shake=Math.max(e.shake,.23);
 e.fx(origin,'burst',110,'#ff6e88',.4);
}
function updateGate(e:Engine,dt:number){
 const g=e.unseen.gate;g.age+=dt;g.phaseAge+=dt;syncGateLocks(e);
 if(!g.locks.length){
  const count=e.stage>=2?5:3,maxHp=e.stage>=2?8+(e.stage-2)*2:4+e.stage;
  g.locks=Array.from({length:count},()=>({x:0,y:0,hp:maxHp,maxHp,broken:false}));
  g.order=count===5?[2,0,4,1,3]:e.stage%2?[1,2,0]:[1,0,2];syncGateLocks(e);
 }
 if(g.phase==='locks'){
  g.timer-=dt;
  if(e.emitting&&g.timer<=0){
   g.timer=1.9-e.stage*.13;
   const p=e.localPlayer(),a=Math.atan2(p.y-e.boss.y,p.x-e.boss.x);
   for(let i=-1;i<=1;i++)e.add({...e.boss,vx:Math.cos(a+i*.25)*(145+g.opened*30),vy:Math.sin(a+i*.25)*(145+g.opened*30),r:8,visual:'needle',warn:.65,life:8,color:'#cba0ff',tag:'잠긴 졸업문 경비탄'});
  }
  if(g.age>(e.stage>=2?40:29)){
   g.phase='overload';g.phaseAge=0;g.overloadTick=0;
   e.log('제한시간 초과 · 졸업문 폭발! 5초간 사방으로 오염탄 방출');
   e.shake=Math.max(e.shake,.5);
  }
 }else if(g.phase==='overload'){
  if(g.phaseAge<5){
   g.overloadTick-=dt;
   while(g.overloadTick<=0){floodGateExplosion(e,g.phaseAge);g.overloadTick+=.25;}
  }else if(g.phaseAge-dt<5){
   // Let the last radial blast dissolve instead of vanishing in one frame.
   for(const h of e.hazards)if(h.tag==='졸업문 시간초과 폭발탄'&&h.floodFadeAge===undefined)h.floodFadeAge=0;
  }
  if(g.phaseAge>=6.2)e.finish();
 }else if(g.phase==='open'){
  const o={x:0,y:-e.fieldH/2+190};
  for(const h of e.hazards){const d=distance(h,o)||1;h.vx+=(o.x-h.x)/d*850*dt;h.vy+=(o.y-h.y)/d*850*dt;if(d<60){h.life=0;h.age=100;}}
  if(g.phaseAge>=1.65){e.hazards=[];g.phase='expose';g.phaseAge=0;e.cooldown=Math.max(e.cooldown,.6);e.log('졸업문 개방 · 디그리온 노출');}
 }else if(g.phaseAge>=3.4)e.finish();
}
function drawGate(e:Engine,c:CanvasRenderingContext2D){
 const g=e.unseen.gate,y=-e.fieldH/2+185,w=Math.min(460,e.fieldW*.72),h=280;
 const opening=g.phase==='locks'?g.opened*(.2/g.locks.length):g.phase==='open'?.2+.8*smooth(g.phaseAge/1.65):g.phase==='overload'?0:1;
 c.save();c.translate(0,y);c.shadowColor=g.phase==='overload'?'#ff526f':'#deacfa';c.shadowBlur=g.phase==='overload'?42:22;
 c.fillStyle='#090714';c.strokeStyle=g.phase==='overload'?'#ff718a':'#d4afd9';c.lineWidth=8;
 c.beginPath();c.roundRect(-w/2-12,-h/2-12,w+24,h+24,12);c.fill();c.stroke();
 for(const side of [-1,1]){
  c.save();c.translate(side*opening*w*.46,0);
  const grad=c.createLinearGradient(side<0?-w/2:0,0,side<0?0:w/2,0);
  grad.addColorStop(0,g.phase==='overload'?'#4b0b2a':'#201331');grad.addColorStop(.5,g.phase==='overload'?'#ac3147':'#553367');grad.addColorStop(1,'#201331');
  c.fillStyle=grad;c.strokeStyle=g.phase==='overload'?'#ffb1bc':'#d7a5d8';c.lineWidth=3;
  c.fillRect(side<0?-w/2:0,-h/2,w/2,h);c.strokeRect(side<0?-w/2:0,-h/2,w/2,h);
  c.strokeStyle='#bb8fbb';c.strokeRect(side<0?-w/2+16:16,-h/2+16,w/2-32,h-32);
  c.fillStyle='#f3d49f';c.beginPath();c.arc(side*20,15,7,0,Math.PI*2);c.fill();c.restore();
 }
 if(g.phase==='open'){
  c.strokeStyle='#e5b5ff88';c.lineWidth=2;
  for(let i=0;i<10;i++){const a=i*Math.PI*2/10,d=45+((1-g.phaseAge/1.65)*150+i*17)%150;c.beginPath();c.moveTo(Math.cos(a)*d,Math.sin(a)*d*.5);c.lineTo(Math.cos(a)*(d+26),Math.sin(a)*(d+26)*.5);c.stroke();}
 }
 if(g.phase==='overload'){
  c.save();c.strokeStyle='#ffb2a2';c.lineWidth=5;c.shadowColor='#ff5577';c.shadowBlur=22;
  for(let i=0;i<9;i++){const x=(i-4)*w/10,a=Math.sin(g.phaseAge*13+i*1.7)*21;c.beginPath();c.moveTo(x,-h*.45);c.lineTo(x+a,h*.42);c.stroke();}
  c.font='900 30px sans-serif';c.textAlign='center';c.fillStyle='#fff1cb';c.fillText(`폭발 탄막 ${Math.max(0,5-g.phaseAge).toFixed(1)}초`,0,6);c.restore();
 }
 c.restore();
 if(g.phase==='overload')return;
 for(const [i,lock]of g.locks.entries()){
  if(lock.broken)continue;
  const lit=g.order[g.opened]===i;c.save();c.translate(lock.x,lock.y);
  c.strokeStyle=lit?'#ffe6a5':'#83768d';c.fillStyle=lit?'#6b4633':'#272130';c.shadowColor='#ffcf7d';c.shadowBlur=lit?22:0;c.lineWidth=5;
  c.beginPath();c.arc(0,-22,17,Math.PI,Math.PI*2);c.stroke();c.beginPath();c.roundRect(-27,-22,54,51,7);c.fill();c.stroke();
  c.fillStyle=lit?'#fff4d2':'#554b63';c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();c.fillRect(-2,1,4,12);
  c.fillStyle='#fff2bd';for(let j=0;j<lock.hp;j++)c.fillRect(-23+j*46/lock.maxHp,37,Math.max(2,40/lock.maxHp),4);
  c.restore();
 }
}
export function clearUnseenByBomb(e:Engine){if(e.pattern.id!=='graduation-gate'||e.unseen.gate.phase!=='locks')return;const g=e.unseen.gate,lock=g.locks[g.order[g.opened]];if(lock&&bombReaches(e,lock,30)&&!e.gateBombSpent){e.gateBombSpent=true;lock.hp=1;shootGraduationLock(e,lock,lock);}}
const make=(id:string,name:string,english:string,subtitle:string,duration:number,update:Pattern['update'],render:Pattern['render']):Pattern=>({id,name,english,subtitle,category:'special',orientation:0,stages:['규칙 학습','연속 대응','복합 회피','숙련 시험'],duration,enter:e=>{e.unseen=freshUnseen();e.unseen.inspection.lastPlayer=e.localPlayer();if(id==='inspection')ensureInspectionEyes(e);e.beat=1;},update,render,exit:()=>{}});
export const unseenPatterns=[make('outside-hands','전장 밖의 손','HANDS BEYOND THE FRAME','깊은 찌르기·휘젓기·3연속 내려찍기·쓸기·양손 조이기의 전체 그림자 예고를 피하세요.',Infinity,updateHands,drawHands),make('inspection','졸업 검수 시선','GRADUATION INSPECTION','움직이면 검수 시선이 감지합니다. 일반은 중앙 1개, 숙련은 좌우 2개의 시선이 계속 순찰합니다.',27,updateInspection,drawInspection),make('graduation-gate','잠겨버린 졸업문','LOCKED GRADUATION GATE','빛나는 자물쇠를 순서대로 사격하세요. 숙련 단계는 5개입니다. 제한시간 내 해제하지 못하면 5초간 폭발 탄막이 쏟아집니다.',Infinity,updateGate,drawGate)];
