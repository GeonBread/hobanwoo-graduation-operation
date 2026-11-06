/** Live support-attack composition for Degreeon's story fight.
 * A cue no longer owns a fixed support list. On every NORMAL attack entry,
 * select a new compatible mix. The optional second component enters later
 * into the already running attack, so the overlap is visible in real time.
 * Special attacks remain intact and independently choreographed.
 */
import type {Engine} from './engine';
import {configureZones} from './advanced';
import {enterPathFold} from './pathFold';

export type MixPhase=1|2;
export type SupportMixEntry={id:string;at:number;active:boolean};
export type SupportMixState={phase:MixPhase;normalId:string;entries:SupportMixEntry[];required:string[]};

const PHASE1_POOL=['erosion','magnet','portals','recycle','time','clones'] as const;
const PHASE2_POOL=['erosion','magnet','portals','recycle','time','clones','path-fold'] as const;

/** Exclude combinations that visually occlude the only safe lane, and keep the
 * fullscreen stamp's forced field-warp separate from other geometry rules.
 * Every listed automatic helper works during a normal attack; manual laboratory
 * previews can still select ALL other support options. */
export function compatibleSupports(phase:MixPhase,normalId:string):string[]{
 const list=[...(phase===2?PHASE2_POOL:PHASE1_POOL)];
 if(['corridor-horizontal','corridor-vertical','volley-gap','volley-rhythm'].includes(normalId)){
  const forbidden=['clones','path-fold'];
  if(normalId==='corridor-horizontal'||normalId==='corridor-vertical')forbidden.push('time');
  for(const id of forbidden){const i=list.indexOf(id as typeof list[number]);if(i>=0)list.splice(i,1);}
 }
 if(normalId==='mirror')for(const id of ['time','clones']){const i=list.indexOf(id as typeof list[number]);if(i>=0)list.splice(i,1);}
 if(normalId==='graduation-stamp')return ['magnet','portals','recycle'];
 if(['link','tile-stream','tail-shed'].includes(normalId)){
  const i=list.indexOf('path-fold' as typeof list[number]);if(i>=0)list.splice(i,1);
 }
 return list;
}

/** Even manual experiments cannot inject prohibited timing or split lives
 * into the two screen-wide plasma corridor patterns. */
export function isLaserSupportForbidden(normalId:string,id:string){
 return (normalId==='corridor-vertical'||normalId==='corridor-horizontal'||normalId==='mirror')&&(id==='time'||id==='clones');
}

function indexFromRandom(random:()=>number,length:number){return Math.max(0,Math.min(length-1,Math.floor(random()*length)));}

export function rollSupportMix(random:()=>number,phase:MixPhase,normalId:string,required:string[]=[],avoidPrimary=''):SupportMixState{
 const choices=compatibleSupports(phase,normalId).filter(id=>!required.includes(id));
 // Avoid forcing exactly the same helper on consecutive phase-two normals.
 if(phase===2&&avoidPrimary&&choices.length>1){const previous=choices.indexOf(avoidPrimary);if(previous>=0)choices.splice(previous,1);}
 const entries:SupportMixEntry[]=[];
 if(!choices.length)return {phase,normalId,entries,required:[...required]};
 // Phase 2: every NORMAL pattern must be mixed. Phase 1: occasional helper.
 if(phase===1&&random()>=.58)return {phase,normalId,entries,required:[...required]};
 const a=choices.splice(indexFromRandom(random,choices.length),1)[0];
 entries.push({id:a,at:0,active:false});
 const secondChance=phase===2?.42:.16;
 if(choices.length&&random()<secondChance){
  const b=choices.splice(indexFromRandom(random,choices.length),1)[0];
  entries.push({id:b,at:1.55+random()*1.65,active:false});
 }
 // A footprint zipper needs its full record/warn/zip arc before cue handoff.
 // Always launch it immediately rather than halfway through a short normal.
 if(entries.length===2&&entries[1].id==='path-fold'){
  entries[1].at=0;entries[0].at=1.55+random()*1.65;
  entries.sort((x,y)=>x.at-y.at);
 }
 return {phase,normalId,entries,required:[...required]};
}

export function activateSupport(e:Engine,id:string){
 if(isLaserSupportForbidden(e.pattern.id,id))return;
 if(e.selectedSupports.has(id))return;
 e.selectedSupports.add(id);
 if(id==='time')configureZones(e);
 if(id==='path-fold')enterPathFold(e);
 e.log(`랜덤 보조 공격 발동 · ${id} + ${e.pattern.name}`);
}

/** Install after Engine.begin(), which resets the arena and the support state. */
export function installSupportMix(e:Engine,plan:SupportMixState){
 e.supportMix=plan;
 for(const entry of plan.entries){if(entry.at>0)continue;activateSupport(e,entry.id);entry.active=true;}
 const chosen=[...plan.required,...plan.entries.map(x=>x.id)];
 e.log(`일반 공격 무작위 보조 조합 · ${plan.normalId} + ${chosen.length?chosen.join(' / '):'없음'}`);
}

/** The second helper joins a running normal attack at its randomized offset. */
export function updateSupportMix(e:Engine){
 const s=e.supportMix;if(!s||e.phase!=='active'||e.pattern.category!=='normal'||(e.encounter.enabled&&e.encounter.mode!=='combat'))return;
 for(const entry of s.entries){
  if(entry.active||e.t<entry.at||e.continuity.closing)continue;
  activateSupport(e,entry.id);entry.active=true;
 }
}

/** Manual testing deliberately bypasses the story cue's fixed rotation/health
 * and launches a normal plus a user-selected helper in the exact same arena. */
export function manualSupportCombination(e:Engine,normalId:string,supportIds:string[],stage=3){
 const solo=normalId==='support-preview';
 const liveNormal=solo?'flowers':normalId;
 const index=e.patterns.findIndex(p=>p.id===liveNormal&&p.category==='normal');
 if(index<0)return false;
 if(e.encounter.enabled)e.leaveEncounter();
 const allowed=supportIds.filter(id=>!isLaserSupportForbidden(liveNormal,id));
 e.selectedSupports=new Set(allowed);e.fullField=false;
 e.supportPreviewId=liveNormal;e.begin(index,stage);e.supportLabSolo=solo;
 e.bossForm=stage>=2?2:1;e.bossHpMax=240;e.bossHp=e.bossHpMax;
 if(allowed.includes('path-fold'))enterPathFold(e);
 e.log(`${solo?'보조공격 단독 실험':'수동 보조 조합 실험'} · ${liveNormal} + ${allowed.join(' / ')||'없음'}`);
 return true;
}

export function randomSupportCombination(e:Engine,phase:MixPhase,normalId:string,stage=3){
 const plan=rollSupportMix(()=>e.random(),phase,normalId);
 if(!manualSupportCombination(e,normalId,[],stage))return false;
 installSupportMix(e,plan);
 return true;
}
