import {emitNativeShots,nativeFireInterval,nativeCanFire,moveNativeShot,drawNativeShot,shotDamage,isNativeBeam} from './nativeWeapon';
import type {Shot} from './core';
import { drawBombEffects } from './bomb';
import type { Engine } from './engine';
import { clamp, smooth, distance, segmentDistance, Vec } from './core';
export const EXILE_MAX_ENEMIES=192;
const EXILE_INITIAL_ENEMIES=168;
export const EXILE_COLLAPSE_SECONDS=4;
export const exileDeadline=(stage:number)=>stage>=2?15:20;
export type ExileEnemy=Vec&{hp:number;age:number;vx:number;vy:number;kind?:'swarm'|'corrupt-spitter'|'corrupt-rupture';fireTimer?:number};
export type ExileEnemyShot=Vec&{vx:number;vy:number;age:number;color:string};
export type Exile={state:'grab'|'throw'|'drift'|'explore'|'collapse'|'enter'|'return'|'done';age:number;detached:boolean;viewW:number;viewH:number;camera:Vec;world:Vec;velocity:Vec;initialVelocity:Vec;flightStart:Vec;breakAt:Vec;travel:number;portal:Vec;w:number;h:number;spawn:number;from:Vec;entryFrom:Vec;enemies:ExileEnemy[];enemyShots:ExileEnemyShot[];shots:Shot[];fire:number;heading:number;returned:boolean;timeoutTriggered:boolean;bombOrigin:Vec|null;collapseSnapshot:HTMLCanvasElement|null};
export function freshExile():Exile{return {state:'grab',age:0,detached:false,viewW:1600,viewH:960,camera:{x:0,y:0},world:{x:0,y:0},velocity:{x:0,y:0},initialVelocity:{x:0,y:0},flightStart:{x:0,y:0},breakAt:{x:0,y:0},travel:0,portal:{x:0,y:0},w:0,h:0,spawn:0,from:{x:0,y:0},entryFrom:{x:0,y:0},enemies:[],enemyShots:[],shots:[],fire:0,heading:0,returned:false,timeoutTriggered:false,bombOrigin:null,collapseSnapshot:null};}
export function exileOutside(e:Engine){return e.pattern.id==='exile'&&e.phase==='active'&&e.advanced.exile.detached;}
export function enterExile(e:Engine){const size=e.gridSize(),x=e.advanced.exile;x.viewW=size.w;x.viewH=size.h;x.w=size.w*1.75;x.h=size.h*1.6;x.from=e.localPlayer();x.portal={x:x.w*.29,y:-x.h*.28};e.cooldown=5;}
export function seedExileEnemies(e:Engine){
 const x=e.advanced.exile,landing={x:x.flightStart.x+x.initialVelocity.x*1.85/3,y:x.flightStart.y+x.initialVelocity.y*1.85/3};
 const cols=Math.max(1,Math.ceil(Math.sqrt(EXILE_INITIAL_ENEMIES*x.w/x.h))),rows=Math.max(1,Math.floor(EXILE_INITIAL_ENEMIES/cols));x.enemies=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const p={x:-x.w/2+(col+.5+(e.random()-.5)*.45)*x.w/cols,y:-x.h/2+(row+.5+(e.random()-.5)*.45)*x.h/rows};
  if(distance(p,landing)<175||distance(p,x.portal)<100)continue;
  const shooter=e.stage>=2&&(row*cols+col)%4===0;
  x.enemies.push({...p,hp:shooter?3:2,age:1,vx:0,vy:0,
    kind:shooter?(row%2?'corrupt-spitter':'corrupt-rupture'):'swarm',
    fireTimer:shooter?.7+e.random()*1.1:undefined});
 }
 x.spawn=.43;
}
function setState(e:Engine,state:Exile['state']){
 const x=e.advanced.exile;x.state=state;x.age=0;
 if(state==='explore'&&!x.enemies.length)seedExileEnemies(e);
}
/** A timed-out exile destroys the ENTIRE outside space and costs precisely one LIFE.
 * Deliberately bypasses hit() cooldown: a last-second bomb or ordinary hit cannot
 * neutralise the deadline, and the blast is applied only once. */
export function collapseExile(e:Engine){
 const x=e.advanced.exile;
 if(x.state!=='explore'||x.timeoutTriggered)return;
 x.timeoutTriggered=true;
 x.velocity={x:0,y:0};x.enemies=[];x.enemyShots=[];x.shots=[];
 e.hits++;e.hp=Math.max(0,e.hp-1);e.cooldown=2.8;e.damageFlash=1.25;
 e.shake=Math.max(e.shake,.85);e.smartBombActive=false;e.bombParticles=[];
 e.log(`추방 공간 대폭발 · 제한시간 초과 · LIFE -1 (${e.hp})`);
 if(e.hp<=0){e.deaths++;e.dead=EXILE_COLLAPSE_SECONDS+.15;e.log('LIFE 0 · 공간 붕괴 연출 후 GAME OVER');}
 setState(e,'collapse');e.notify();
}
function spawnExileEnemy(e:Engine,p:Vec):ExileEnemy{
 const shooter=e.stage>=2&&e.random()<.27;
 return {...p,vx:0,vy:0,hp:shooter?3:2,age:0,
  kind:shooter?(e.random()<.5?'corrupt-spitter':'corrupt-rupture'):'swarm',
  fireTimer:shooter?.8+e.random()*.7:undefined};
}
function updateExileEnemyShots(e:Engine,dt:number){
 const x=e.advanced.exile;
 for(const bullet of x.enemyShots){
  bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;bullet.age+=dt;
  if(distance(bullet,x.world)<21){e.hit('추방 공간 특수 몬스터 조준탄');bullet.age=99;}
 }
 x.enemyShots=x.enemyShots.filter(b=>b.age<5&&Math.abs(b.x)<x.w/2+50&&Math.abs(b.y)<x.h/2+50);
}
export function updateExile(e:Engine,dt:number){
 const x=e.advanced.exile;x.age+=dt;e.cooldown=Math.max(e.cooldown,x.state==='explore'?0:.3);
 if(x.state==='grab'){
  const k=smooth(x.age/1.1);e.player=e.screen({x:x.from.x*(1-k)+e.boss.x*k,y:x.from.y*(1-k)+(e.boss.y+75)*k});
  if(x.age>=1.45){x.from=e.localPlayer();e.fx(e.boss,'burst',100,'#d48dff',.55);setState(e,'throw');}
 }else if(x.state==='throw'){
  const speed=1150,contact=(x.from.x+e.fieldW/2)/speed,t=Math.min(x.age,contact);
  e.player=e.screen({x:x.from.x-speed*t,y:x.from.y+220*t});
  if(x.age>=contact){
   // The same world position becomes the fullscreen avatar position at the breach.
   x.world=e.localPlayer();x.breakAt={...x.world};x.flightStart={...x.world};x.camera={x:0,y:0};x.initialVelocity={x:-speed,y:220};x.velocity={...x.initialVelocity};x.detached=true;
   // Leave enough void past the exit even in a portrait browser.
   x.w=Math.max(x.w,(Math.abs(x.world.x)+speed*1.85/3+100)*2);x.heading=Math.atan2(x.initialVelocity.y,x.initialVelocity.x)+Math.PI/2;seedExileEnemies(e);e.shake=.18;setState(e,'drift');
  }
 }else if(x.state==='drift'){
  const duration=1.85,k=clamp(x.age/duration,0,1),integral=duration*(k-k*k+k*k*k/3),v=(1-k)**2;
  x.velocity={x:x.initialVelocity.x*v,y:x.initialVelocity.y*v};x.world={x:x.flightStart.x+x.initialVelocity.x*integral,y:x.flightStart.y+x.initialVelocity.y*integral};
  x.travel=distance(x.world,x.flightStart);e.playerFacing=x.heading+Math.sin(k*Math.PI)*-.65;
  if(k>=1){x.velocity={x:0,y:0};setState(e,'explore');e.log('전체 화면 바깥 공간 · 방향키 유영 · SPACE 사격 · 포탈 탐색');}
 }else if(x.state==='explore'){
  // The countdown starts only when steering/exploration begins, not on the throw.
  if(x.age>=exileDeadline(e.stage)){collapseExile(e);}
  else{
   x.spawn-=dt;
   if(x.spawn<=0){
    x.spawn=.43-e.stage*.05; // ~1.5x the former reinforcement rate.
    if(x.enemies.length<EXILE_MAX_ENEMIES){
     const side=Math.floor(e.random()*4),pos=e.random()-.5,rx=x.viewW*.58,ry=x.viewH*.58;
     const p=side===0?{x:x.world.x+pos*x.viewW,y:x.world.y-ry}:side===1?{x:x.world.x+rx,y:x.world.y+pos*x.viewH}:side===2?{x:x.world.x+pos*x.viewW,y:x.world.y+ry}:{x:x.world.x-rx,y:x.world.y+pos*x.viewH};
     p.x=clamp(p.x,-x.w/2+30,x.w/2-30);p.y=clamp(p.y,-x.h/2+30,x.h/2-30);
     x.enemies.push(spawnExileEnemy(e,p));
    }
   }
   for(const m of x.enemies){
    m.age+=dt;
    const d=distance(m,x.world)||1,shooter=m.kind==='corrupt-spitter'||m.kind==='corrupt-rupture';
    const sp=shooter?(d<190?0:24+e.stage*4):19+e.stage*4;
    m.vx=(x.world.x-m.x)/d*sp;m.vy=(x.world.y-m.y)/d*sp;
    m.x+=m.vx*dt;m.y+=m.vy*dt;
    if(d<28)e.hit('화면 밖 오염 군집');
    if(shooter){
     m.fireTimer=(m.fireTimer??1)-dt;
     // Only visible shooters may fire, with a cap to prevent projectile overload.
     if(m.fireTimer<=0){
      m.fireTimer=(e.stage>=3?1.45:1.75)+e.random()*.42;
      if(exileEnemyVisible(x,m)&&d<690&&d>42&&x.enemyShots.length<96){
       const speed=180+e.stage*15;
       x.enemyShots.push({x:m.x,y:m.y,vx:(x.world.x-m.x)/d*speed,vy:(x.world.y-m.y)/d*speed,
        age:0,color:m.kind==='corrupt-rupture'?'#ffa9df':'#bd93ff'});
      }
     }
    }
   }
   updateExileEnemyShots(e,dt);
   x.fire-=dt;
   if((e.keys.has(' ')||e.autoFire)&&x.fire<=0&&nativeCanFire(e)){
    x.fire=nativeFireInterval(e);x.shots.push(...emitNativeShots(e,x.world,x.heading));
   }
   for(const s of x.shots){
    moveNativeShot(e,s,dt);if(s.age>=3)continue;
    const prev={x:s.x,y:s.y};s.age+=dt;s.x+=(s.vx??0)*dt;s.y+=s.vy*dt;
    const beam=isNativeBeam(s),m=beam?nearestExileEnemy(x):x.enemies.find(m=>m.hp>0&&segmentDistance(m,prev,s)<24);
    if(m&&(!beam||e.clock>=(s.beamNextHit??0))){m.hp-=shotDamage(s);if(beam)s.beamNextHit=e.clock+.12;else s.age=10;}
   }
   x.shots=x.shots.filter(s=>s.age<3);
   x.enemies=x.enemies.filter(m=>m.hp>0&&m.age<150);
   if(distance(x.world,x.portal)<58){x.entryFrom={...x.world};x.enemyShots=[];setState(e,'enter');e.log('복귀 포탈 진입');}
  }
 }else if(x.state==='collapse'){
  // Let the world finish its explosion before sending surviving players home.
  if(x.age>=EXILE_COLLAPSE_SECONDS&&e.hp>0){
   x.detached=false;e.player=e.point(.5,.76);x.enemies=[];x.enemyShots=[];x.shots=[];
   setState(e,'return');e.log('추방 공간 붕괴 후 강제 복귀');
  }
 }else if(x.state==='enter'){
  const k=smooth(x.age/.9);x.world={x:x.entryFrom.x+(x.portal.x-x.entryFrom.x)*k,y:x.entryFrom.y+(x.portal.y-x.entryFrom.y)*k};
  if(x.age>.95){setState(e,'return');x.detached=false;e.player=e.point(.5,.76);x.enemies=[];x.enemyShots=[];x.shots=[];}
 }else if(x.state==='return'&&x.age>1.25){x.returned=true;setState(e,'done');e.finish();}
 if(x.detached){
  const size=e.gridSize();x.viewW=size.w;x.viewH=size.h;const target={x:clamp(x.world.x+x.viewW*.18,-x.w/2+x.viewW/2,x.w/2-x.viewW/2),y:clamp(x.world.y,-x.h/2+x.viewH/2,x.h/2-x.viewH/2)},k=1-Math.exp(-5*dt);
  x.camera.x+=(target.x-x.camera.x)*k;x.camera.y+=(target.y-x.camera.y)*k;e.player=e.screen(x.world);
 }
}
export function moveExile(e:Engine,dt:number,dx:number,dy:number){
 const x=e.advanced.exile;if(x.state!=='explore')return;
 if(dx||dy){const target=Math.atan2(dy,dx)+Math.PI/2,delta=Math.atan2(Math.sin(target-x.heading),Math.cos(target-x.heading));x.heading+=clamp(delta,-4.8*dt,4.8*dt);x.velocity.x+=(Math.sin(x.heading)*330-x.velocity.x)*(1-Math.exp(-6*dt));x.velocity.y+=(-Math.cos(x.heading)*330-x.velocity.y)*(1-Math.exp(-6*dt));}
 else{x.velocity.x*=Math.exp(-3*dt);x.velocity.y*=Math.exp(-3*dt);}
 x.world.x=clamp(x.world.x+x.velocity.x*dt,-x.w/2+25,x.w/2-25);x.world.y=clamp(x.world.y+x.velocity.y*dt,-x.h/2+25,x.h/2-25);e.playerFacing=x.heading;
}
/** Position of the original screen in the whole-browser view, always receding right. */
export function exileProjection(x:Exile){return {x:x.viewW/2-x.camera.x+x.travel*.7,y:x.viewH/2-x.camera.y-x.travel*.12,scale:1/(1+(x.travel/220)**1.8)};}
function nearestExileEnemy(x:Exile){
 let best:Exile['enemies'][number]|undefined,bestD=Infinity;
 for(const m of x.enemies){if(m.hp<=0)continue;const d=(m.x-x.world.x)**2+(m.y-x.world.y)**2;if(d<bestD){best=m;bestD=d;}}
 return best;
}
let enemySprites:HTMLCanvasElement[]|null=null;
function enemySprite(damaged:boolean){
 if(!enemySprites){
  enemySprites=[false,true].map(hit=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
   const c=canvas.getContext('2d')!;c.translate(48,48);c.shadowColor='#be6dee';c.shadowBlur=12;
   c.fillStyle=hit?'#e7a9fd':'#7d3eaa';c.strokeStyle='#d09be9';c.lineWidth=2;c.beginPath();
   for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?15:27;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
   c.closePath();c.fill();c.stroke();return canvas;
  });
 }
 return enemySprites[Number(damaged)];
}
/** Boss exile's ranged enemies are native corruption masses, never wave sprites. */
const corruptionShooterSprites=new Map<string,HTMLCanvasElement>();
function corruptionShooterSprite(kind:'corrupt-spitter'|'corrupt-rupture',damaged:boolean){
 const key=kind+'-'+damaged,cached=corruptionShooterSprites.get(key);if(cached)return cached;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=112;
 const c=canvas.getContext('2d')!;c.translate(56,56);
 const rupture=kind==='corrupt-rupture';
 c.shadowColor=rupture?'#f057d9':'#ab6dff';c.shadowBlur=18;
 const shape=c.createRadialGradient(-9,-14,3,0,0,42);
 shape.addColorStop(0,damaged?'#f8caff':rupture?'#8941a7':'#6843ba');
 shape.addColorStop(.58,rupture?'#421452':'#321555');shape.addColorStop(1,'#11051e');
 c.fillStyle=shape;c.strokeStyle=damaged?'#ffd9ff':rupture?'#ed79d9':'#b58dff';c.lineWidth=3;
 c.beginPath();
 for(let i=0;i<16;i++){const a=-Math.PI/2+i*Math.PI/8,r=35+Math.sin(i*2.7+(rupture?1.2:0))*7+(i%4===0?7:0),px=Math.cos(a)*r,py=Math.sin(a)*r;
  if(i===0)c.moveTo(px,py);else c.lineTo(px,py);
 }c.closePath();c.fill();c.stroke();c.shadowBlur=0;
 // Uneven fissures and charged emission nodules, not a face or uniform wave-monster icon.
 c.lineWidth=2.8;c.strokeStyle=rupture?'#ffb0df':'#bc93ff';c.beginPath();
 c.moveTo(-14,-28);c.lineTo(-3,-9);c.lineTo(-17,2);c.lineTo(-2,15);c.lineTo(-5,30);
 c.moveTo(9,-25);c.lineTo(3,-8);c.lineTo(20,4);c.lineTo(10,21);c.stroke();
 c.fillStyle=rupture?'#ffe2f6':'#e9d8ff';c.shadowColor=rupture?'#ff8bdc':'#b88cff';c.shadowBlur=15;
 for(const [a,r] of [[-.4,8],[2.4,6],[4.4,5]]){c.beginPath();c.arc(Math.cos(a)*28,Math.sin(a)*28,r,0,Math.PI*2);c.fill();}
 c.shadowBlur=0;corruptionShooterSprites.set(key,canvas);return canvas;
}

export function exileEnemyVisible(x:Exile,m:Vec){return Math.abs(m.x-x.camera.x)<x.viewW/2+48&&Math.abs(m.y-x.camera.y)<x.viewH/2+48;}
export function exileOverlay(e:Engine,c:CanvasRenderingContext2D):boolean{
 if(e.pattern.id!=='exile'||e.phase!=='active')return false;const x=e.advanced.exile;
 if(x.state==='grab'){const a=e.screen(e.boss),b=e.player;c.save();c.strokeStyle='#c188ff';c.lineWidth=10;c.shadowColor='#bc79ff';c.shadowBlur=18;c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(a.x+140,b.y,b.x,b.y);c.stroke();c.strokeStyle='#efcaff';c.lineWidth=3;c.beginPath();c.ellipse(b.x,b.y,50,62,0,0,Math.PI*2);c.stroke();c.restore();}
 if(x.state==='throw'){const p=e.player;c.save();for(let i=0;i<18;i++){c.strokeStyle=i%3?'#b98be6':'#f0d3ff';c.globalAlpha=.2+i*.01;c.lineWidth=2+i%3;c.beginPath();c.moveTo(p.x+35+i*12,p.y-95+i*10);c.lineTo(p.x+220+i*12,p.y-125+i*10);c.stroke();}c.restore();}
 return false;
}
/** Four-second, fullscreen pollution catastrophe. Every fracture edge has
 * a corresponding moving panel; no label/text overlays the destruction. */
export function drawCollapseCatastrophe(e:Engine,c:CanvasRenderingContext2D,x:Exile,w:number,h:number){
 const t=clamp(x.age,0,EXILE_COLLAPSE_SECONDS),progress=t/EXILE_COLLAPSE_SECONDS;
 const cx=w*.5,cy=h*.5,diag=Math.hypot(w,h),shake=Math.sin(t*93)*21+Math.sin(t*137)*13;
 c.save();c.fillStyle='#030008';c.fillRect(0,0,w,h);
 // Violent global camera motion, followed by separated fragments of the old world.
 c.translate(shake*(1-progress*.4),Math.cos(t*101)*22+Math.sin(t*59)*10);
 // Pulsing contamination clouds race between simultaneous breaches in the sky.
 for(let j=0;j<7;j++){
  const px=w*(.11+((j*7)%13)/15)+Math.sin(t*1.9+j*3.2)*w*.07;
  const py=h*(.12+((j*5)%11)/13)+Math.cos(t*2.3+j)*h*.08;
  const rad=Math.min(w,h)*(.23+(j%3)*.095)*(1+.16*Math.sin(t*4+j));
  const haze=c.createRadialGradient(px,py,0,px,py,rad);
  const strength=(.24+.17*Math.sin(t*3.9+j*2.1)**2)*(1-smooth((t-3.2)/.8));
  haze.addColorStop(0,`rgba(181,55,235,${strength})`);
  haze.addColorStop(.45,`rgba(98,17,176,${strength*.6})`);
  haze.addColorStop(1,'rgba(35,0,65,0)');
  c.fillStyle=haze;c.fillRect(px-rad,py-rad,rad*2,rad*2);
 }
 const fracture=smooth((t-.36)/2.25),explode=smooth((t-.6)/2.5);
 const border=(index:number)=>{
  const a=-Math.PI/2+index*Math.PI*2/15,seed=index%15;
  return Array.from({length:7},(_,j)=>{const r=diag*1.05*j/6,zig=j===0||j===6?0:Math.sin(seed*13.77+j*6.1)*(.08+.018*j);
   return{x:cx+Math.cos(a+zig)*r,y:cy+Math.sin(a+zig)*r};});
 };
 for(let i=0;i<15;i++){
  const a=-Math.PI/2+(i+.5)*Math.PI*2/15,r=explode*(65+(i%5)*53),dx=Math.cos(a)*r,dy=Math.sin(a)*r+explode*explode*(130+(i%4)*22),rot=Math.sin(i*4.81)*explode*.26;
  const p=border(i),q=border(i+1);
  c.save();c.translate(cx+dx,cy+dy);c.rotate(rot);c.translate(-cx,-cy);
  c.beginPath();p.forEach((v,j)=>j?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));q.slice().reverse().forEach(v=>c.lineTo(v.x,v.y));c.closePath();c.clip();
  if(x.collapseSnapshot)c.drawImage(x.collapseSnapshot,0,0,w,h);
  else{const grad=c.createRadialGradient(cx,cy,4,cx,cy,diag);grad.addColorStop(0,'#361049');grad.addColorStop(1,'#080016');c.fillStyle=grad;c.fillRect(0,0,w,h);}
  c.fillStyle=`rgba(35,0,54,${fracture*.27})`;c.fillRect(0,0,w,h);c.restore();
  // Each MOVING fragment owns its own luminous, jagged edge. The artwork
  // itself separates from its neighbouring fragments as the tear opens.
  if(fracture>.02){
   c.save();c.translate(cx+dx,cy+dy);c.rotate(rot);c.translate(-cx,-cy);
   c.beginPath();p.forEach((v,j)=>j?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));q.slice().reverse().forEach(v=>c.lineTo(v.x,v.y));c.closePath();
   c.strokeStyle=`rgba(3,0,13,${.94*fracture})`;c.lineWidth=17;c.stroke();
   c.strokeStyle=`rgba(177,58,255,${.95*fracture})`;c.shadowColor='#d63cff';c.shadowBlur=29;c.lineWidth=5.2;c.stroke();
   c.shadowBlur=0;c.strokeStyle=`rgba(255,218,255,${.96*fracture})`;c.lineWidth=1.65;c.stroke();c.restore();
  }
  // Dark void and charged bevels trace the same screen-tearing boundaries.
  if(fracture>.01){
   c.save();c.globalAlpha=fracture*(1-smooth((t-3.1)/.95)*.85);
   for(let j=0;j<15;j++){
    const pts=border(j);c.beginPath();pts.forEach((v,k)=>k?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));
    c.lineJoin='miter';c.strokeStyle='#09000d';c.lineWidth=11;c.stroke();
    c.shadowColor='#dc5dff';c.shadowBlur=23;c.strokeStyle=j%3===0?'#ffe9ff':'#bc59f4';c.lineWidth=j%3===0?3.5:2.2;c.stroke();
   }c.restore();
  }
 }
 // Repeated explosions throughout the viewport, not a single centred radial flash.
 for(let i=0;i<19;i++){
  const start=.2+i*.167+(i%3)*.034,age=t-start;if(age<0||age>1.03)continue;
  const life=age/1.03,sx=w*(.10+(.81*((i*37)%19)/18)),sy=h*(.10+.79*((i*13)%23)/22);
  const radius=(30+Math.min(w,h)*(.04+(i%5)*.018))*(.5+life*3),fade=(1-smooth(life))*(.72+.28*Math.sin(age*27)**2);
  const g=c.createRadialGradient(sx,sy,0,sx,sy,radius);
  g.addColorStop(0,`rgba(255,252,249,${fade*.9})`);g.addColorStop(.12,`rgba(255,177,244,${fade*.9})`);
  g.addColorStop(.4,`rgba(167,48,231,${fade*.74})`);g.addColorStop(1,'rgba(42,0,73,0)');
  c.fillStyle=g;c.fillRect(sx-radius,sy-radius,radius*2,radius*2);
  c.save();c.translate(sx,sy);c.strokeStyle=`rgba(248,175,255,${fade*.75})`;
  c.lineWidth=1.5+(i%4);for(let ray=0;ray<9;ray++){const ang=ray*Math.PI*2/9+i*.88,len=radius*(.45+(ray%3)*.22);
   c.beginPath();c.moveTo(Math.cos(ang)*radius*.08,Math.sin(ang)*radius*.08);c.lineTo(Math.cos(ang+.04)*len,Math.sin(ang+.04)*len);c.stroke();}c.restore();
 }
 // Aggressive strobing impacts and a final void as the shattered space falls away.
 const pulse=Math.max(0,Math.sin(t*17))**14*(1-progress),impact=[.36,1.14,2.05,2.88].reduce((m,at)=>Math.max(m,Math.exp(-Math.pow((t-at)/.105,2))),0);
 c.fillStyle=`rgba(255,207,255,${.08+pulse*.13+impact*.27})`;c.fillRect(0,0,w,h);
 if(t>3.18){c.fillStyle=`rgba(2,0,8,${smooth((t-3.18)/.82)})`;c.fillRect(0,0,w,h);}
 c.restore();
}

export function drawExile(e:Engine,c:CanvasRenderingContext2D,drawPlayer:(p:Vec)=>void,drawArena:()=>void){
 const x=e.advanced.exile,w=x.viewW,h=x.viewH,panel=exileProjection(x);c.save();c.fillStyle='#080718';c.fillRect(0,0,w,h);
 const speed=Math.hypot(x.velocity.x,x.velocity.y),streak=x.state==='drift'?speed*.075:3;
 for(let group=0;group<2;group++){c.strokeStyle=group?'#9465d066':'#dba8ef44';c.lineWidth=1+group;c.beginPath();for(let i=group;i<180;i+=2){const px=((i*137.79-x.camera.x*.28)%w+w)%w,py=((i*87.73-x.camera.y*.28)%h+h)%h;c.moveTo(px,py);c.lineTo(px+streak,py-streak*.16);}c.stroke();}
 // The intact arena keeps its original artwork and HUD while moving off to the right.
 c.save();c.translate(panel.x,panel.y);c.scale(panel.scale,panel.scale);drawArena();c.restore();
 c.save();c.translate(w/2-x.camera.x,h/2-x.camera.y);
  for(const m of x.enemies){
   if(!exileEnemyVisible(x,m))continue;
   c.save();c.translate(m.x,m.y);c.globalAlpha=smooth(m.age/.7);
   if(m.kind==='corrupt-spitter'||m.kind==='corrupt-rupture'){
    const size=75+Math.sin(m.age*4.1)*5;
    c.rotate(Math.sin(m.age*1.3)*.13);c.drawImage(corruptionShooterSprite(m.kind,m.hp<2),-size/2,-size/2,size,size);
   }else{c.rotate(m.age*.3);c.drawImage(enemySprite(m.hp<2),-48,-48);}
   c.restore();
  }
  for(const bullet of x.enemyShots){
   c.save();c.translate(bullet.x,bullet.y);
   c.shadowColor=bullet.color;c.shadowBlur=16;c.fillStyle=bullet.color;
   c.beginPath();c.arc(0,0,8,0,Math.PI*2);c.fill();
   c.fillStyle='#fff';c.beginPath();c.arc(0,0,3,0,Math.PI*2);c.fill();c.restore();
  }
 if(x.state==='drift'){
  const k=clamp(x.age/1.85,0,1);c.save();c.translate(x.breakAt.x,x.breakAt.y);
  for(let i=0;i<30;i++){const a=i*2.399,r=25+k*(70+i*5);c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a+k*3);c.globalAlpha=(1-k)*.85;c.fillStyle=i%3?'#603c9e':'#d6b9ff';c.beginPath();c.moveTo(-9,-18);c.lineTo(14,-4);c.lineTo(4,20);c.closePath();c.fill();c.restore();}c.restore();
  c.save();c.globalAlpha=(1-k)*.55;c.strokeStyle='#e3baff';c.lineWidth=4;c.beginPath();c.moveTo(x.world.x+45,x.world.y-8);c.lineTo(x.world.x+45+streak*3,x.world.y-8-streak*.5);c.stroke();c.restore();
 }else{
  c.strokeStyle='#6d4a9144';c.lineWidth=3;c.strokeRect(-x.w/2,-x.h/2,x.w,x.h);c.strokeStyle='#6b478418';c.lineWidth=1;
  c.beginPath();for(let xx=-x.w/2;xx<x.w/2;xx+=140){c.moveTo(xx,-x.h/2);c.lineTo(xx,x.h/2);}
  for(let yy=-x.h/2;yy<x.h/2;yy+=140){c.moveTo(-x.w/2,yy);c.lineTo(x.w/2,yy);}c.stroke();

  for(const s of x.shots)drawNativeShot(e,c,s);
  c.save();c.translate(x.portal.x,x.portal.y);c.shadowColor='#76ffe0';c.shadowBlur=30;c.strokeStyle='#8affde';c.lineWidth=6;c.beginPath();c.ellipse(0,0,54,78,0,0,Math.PI*2);c.stroke();c.lineWidth=2;
  for(let j=0;j<3;j++){c.save();c.rotate(e.clock*(j%2?1:-1)+j);c.beginPath();c.ellipse(0,0,38+j*7,64+j*7,0,0,Math.PI*2);c.stroke();c.restore();}c.fillStyle='#8fffe629';c.fill();c.restore();
 }
 drawBombEffects(e,c);
 if(e.dead<=0&&!e.gameOver){c.save();if(x.state==='enter'){const k=clamp(x.age/.9,0,1);c.translate(x.world.x,x.world.y);c.rotate(k*9);c.scale(1-k,1-k);drawPlayer({x:0,y:0});}else drawPlayer(x.world);c.restore();}c.restore();
 if(x.state==='explore'||x.state==='enter'){
  const dest={x:w/2+x.portal.x-x.camera.x,y:h/2+x.portal.y-x.camera.y},avatar={x:w/2+x.world.x-x.camera.x,y:h/2+x.world.y-x.camera.y},ang=Math.atan2(dest.y-avatar.y,dest.x-avatar.x),cl={x:clamp(dest.x,64,w-64),y:clamp(dest.y,170,h-80)};
  c.save();c.translate(cl.x,cl.y);c.rotate(ang);c.fillStyle='#a2ffe1';c.shadowColor='#6effd8';c.shadowBlur=15;c.beginPath();c.moveTo(23,0);c.lineTo(-10,-12);c.lineTo(-10,12);c.closePath();c.fill();c.restore();c.fillStyle='#c5ffec';c.textAlign='center';c.font='bold 18px "Noto Sans KR"';c.fillText('복귀 포탈',cl.x,cl.y+37);
  c.save();c.translate(30,115);c.fillStyle='#070b18cc';c.fillRect(0,0,170,110);c.strokeStyle='#8b64ac';c.strokeRect(0,0,170,110);c.fillStyle='#b78cef';for(const m of x.enemies)c.fillRect((m.x/x.w+.5)*170,(m.y/x.h+.5)*110,2,2);c.fillStyle='#7cffdc';c.beginPath();c.arc((x.portal.x/x.w+.5)*170,(x.portal.y/x.h+.5)*110,5,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc((x.world.x/x.w+.5)*170,(x.world.y/x.h+.5)*110,3,0,Math.PI*2);c.fill();c.restore();
 }
 // Capture the last intact outside-space image once, just before timeout. The
 // explosion actually shatters that picture rather than drawing unrelated rays.
 if(x.state==='explore'&&!x.collapseSnapshot&&exileDeadline(e.stage)-x.age<.16&&typeof document!=='undefined'){
  const shot=document.createElement('canvas');shot.width=Math.max(1,Math.round(w));shot.height=Math.max(1,Math.round(h));
  shot.getContext('2d')?.drawImage(e.canvas,0,0,shot.width,shot.height);x.collapseSnapshot=shot;
 }
 // The timer belongs to the browser-wide exile view, not the retreating arena.
 if(x.state==='explore'||x.state==='enter'){
  const limit=exileDeadline(e.stage),remaining=Math.max(0,limit-x.age),critical=remaining<=5&&x.state==='explore';
  c.save();c.translate(w/2,38);c.fillStyle='rgba(4,6,17,.9)';c.strokeStyle=critical?'#ff8d73':'#bea0e8';c.lineWidth=2;
  c.fillRect(-184,-22,368,64);c.strokeRect(-184,-22,368,64);
  c.font='900 18px "Noto Sans KR",sans-serif';c.textAlign='center';c.fillStyle=critical?'#ffd0ba':'#f1eaff';
  c.fillText(x.state==='enter'?'복귀 포탈 진입 중':`공간 붕괴까지 ${remaining.toFixed(1)}초`,0,4);
  c.fillStyle='#3b214a';c.fillRect(-162,19,324,7);
  c.fillStyle=critical?'#ff765a':'#8fffe0';c.fillRect(-162,19,324*(x.state==='enter'?1:remaining/limit),7);
  c.restore();
 }
 if(x.state==='collapse')drawCollapseCatastrophe(e,c,x,w,h);
 c.restore();
}
