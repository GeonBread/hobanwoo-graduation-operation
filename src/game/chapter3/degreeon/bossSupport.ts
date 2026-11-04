/** Chapter 3 Degreeon support waves, mirroring Chapter 2 boss intervals/drop odds.
 * Only Chapter 3 projectile-firing monsters are selected: inspection eye and file carrier.
 * Physics use the existing local arena coordinates; background, boss cues and HUD are unchanged. */
import type {Engine} from './engine';
import type {WorldActor} from './core';

export const BOSS_SUPPORT_DROP_CHANCE=.55;
export const BOSS_SUPPORT_HEAL_CHANCE=.34;
export const BOSS_SUPPORT_GROUP_SIZE=3;
export const BOSS_SUPPORT_FIRST_DELAY=6.5;
export const BOSS_SUPPORT_INTERVAL_MIN=10.5;
export const BOSS_SUPPORT_INTERVAL_SPAN=2.5;

export function resetBossSupport(e:Engine,delay=BOSS_SUPPORT_FIRST_DELAY){
  e.bossSupportTimer=delay;
  e.bossSupportWaveSerial=0;
}

/** No support mobs during dialogue, isolated practice, or special/escape patterns. */
export function supportsMaySpawn(e:Engine){
  return e.encounter.enabled && e.encounter.mode==='combat' && !e.encounter.trainingOnly &&
    e.pattern.category==='normal' && e.phase==='active' && !e.attackLocked &&
    !e.gameOver && e.dead<=0 && !e.paused && !e.continuity.closing &&
    !e.continuity.bridge && !e.stormInputLocked && !e.smartBombActive;
}

export function spawnBossSupportGroup(e:Engine){
  const group:WorldActor[]=[];
  const top=-e.fieldH/2;
  // Different mixed squads keep each visit varied without introducing any
  // non-projectile attackers. Every three-unit group uses both shooter types.
  const formations:(('inspection'|'carrier')[])[]=[
    ['inspection','carrier','inspection'],
    ['carrier','inspection','carrier'],
    ['inspection','inspection','carrier'],
    ['carrier','carrier','inspection']
  ];
  const formation=formations[Math.floor(e.random()*formations.length)];
  for(let i=0;i<BOSS_SUPPORT_GROUP_SIZE;i++){
    const lane=[.18,.5,.82][i],kind=formation[i];
    const x=(lane-.5)*e.fieldW;
    group.push(e.addEnemy({
      x,y:top-85-i*34,vx:0,vy:0,
      hp:10,r:kind==='carrier'?37:38,age:0,life:42,
      color:kind==='carrier'?'#ffd783':'#54e0ff',
      fireTimer:.45+i*.1,firePeriod:.9,
      supportKind:kind,supportState:'enter',supportIndex:i,
      supportWaveSerial:e.bossSupportWaveSerial,
      supportTargetY:top+Math.min(e.fieldH*.42,i===1?395:335),
      supportAnchorX:x,supportPhase:i*Math.PI,
      item:'energy',value:1
    }));
  }
  e.bossSupportWaveSerial++;
  e.log(`보스 지원몹 · 탄환 사격 3기 출현 (${e.bossSupportWaveSerial}회)`);
  return group;
}

export function updateBossSupportSchedule(e:Engine,dt:number){
  if(!e.encounter.enabled||e.encounter.mode!=='combat'||e.encounter.trainingOnly||e.paused||e.gameOver||e.dead>0)return;
  // Chapter 2 times are real boss-combat seconds, not just uninterrupted normal cues.
  // Let the countdown continue during special-pattern intros and only summon
  // once the next safe normal encounter opens.
  e.bossSupportTimer=Math.max(0,e.bossSupportTimer-dt);
  if(e.bossSupportTimer>0||!supportsMaySpawn(e))return;
  if(e.enemies.some(a=>a.hp>0&&!!a.supportKind)){e.bossSupportTimer=1;return;}
  spawnBossSupportGroup(e);
  e.bossSupportTimer=BOSS_SUPPORT_INTERVAL_MIN+e.random()*BOSS_SUPPORT_INTERVAL_SPAN;
}

export function updateBossSupportActor(e:Engine,a:WorldActor,dt:number){
  if(!a.supportKind||a.hp<=0||dt<=0)return;
  if(a.supportState==='enter'){
    a.y=Math.min(a.supportTargetY??-160,a.y+185*dt);
    if(a.y>=(a.supportTargetY??-160)){
      a.supportState='hover';
      a.supportAnchorX=a.x;
      a.fireTimer=.45+(a.supportIndex??0)*.1;
    }
    return;
  }
  const index=a.supportIndex??0;
  const x=(a.supportAnchorX??a.x)+Math.sin(a.age*2.25+(a.supportPhase??0))*34;
  a.x+= (x-a.x)*Math.min(1,dt*5.2);
  a.fireTimer-=dt;
  if(a.fireTimer>0)return;
  a.fireTimer=.78+e.random()*.22;
  const player=e.localPlayer(),dx=player.x-a.x,dy=player.y-a.y;
  const mag=Math.hypot(dx,dy)||1;
  const speed=390; // Chapter 2 boss support bullet speed.
  e.add({kind:'orb',x:a.x,y:a.y+21,vx:dx/mag*speed,vy:dy/mag*speed,
    r:7,warn:0,life:4.5,color:a.color,
    visual:a.supportKind==='carrier'?'shard':'core',
    tag:a.supportKind==='carrier'?'결재 파일 캐리어 탄':'졸업 검수 아이 탄'});
}

/** One roll per defeated support, identical to Chapter 2's 55% / heal 34%, power 66%. */
export function defeatBossSupport(e:Engine,a:WorldActor){
  if(!a.supportKind||a.supportDropResolved)return;
  a.supportDropResolved=true;
  a.hp=0;
  e.fx(a,'burst',35,a.color,.48);
  if(e.random()>=BOSS_SUPPORT_DROP_CHANCE)return;
  const heal=e.random()<BOSS_SUPPORT_HEAL_CHANCE;
  e.addItem({x:a.x,y:a.y,vx:0,vy:120,r:11,age:0,life:16,hp:1,
    item:heal?'life':'energy',value:1,pickupRadius:78,
    color:heal?'#4ade80':'#38bdf8'});
  e.log(`지원몹 아이템 드롭 · ${heal?'LIFE':'POWER'}`);
}
