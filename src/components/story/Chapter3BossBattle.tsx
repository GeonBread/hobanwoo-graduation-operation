import {useEffect,useRef,useState} from 'react';
import {Engine} from '../../game/chapter3/degreeon/engine';
import {patterns} from '../../game/chapter3/degreeon/patterns';
import {phaseOneScore,phaseTwoScore,startCuePractice,startStoryPreview,advanceStoryDialogue,skipEncounterPattern,skipEncounterPhase,type StoryPreview} from '../../game/chapter3/degreeon/encounter';
import {supportOptions,categoryNames,type Category} from '../../game/chapter3/degreeon/advanced';
import {manualSupportCombination,randomSupportCombination,isLaserSupportForbidden} from '../../game/chapter3/degreeon/supportMix';
import {EncounterOverlay} from '../../game/chapter3/degreeon/EncounterOverlay';
import {EncounterAudio} from '../../game/chapter3/degreeon/encounterAudio';
import {useAppStore} from '../../store';
import {sfx} from '../../game/AudioSystem';
import '../../game/chapter3/degreeon/bossFont.css';
import '../../game/chapter3/degreeon/font.css';
import '../../game/chapter3/degreeon/encounterOverlay.css';
import './chapter3BossBattle.css';
export type Chapter3BossLaunch={phase?:1|2;tests?:boolean};
type Props={key?:string;launch?:Chapter3BossLaunch;power?:number;onComplete:()=>void;onExit:()=>void;storyPaused?:boolean;onStoryPauseRequest:()=>void;onStoryPauseClose:()=>void};
export function Chapter3BossBattle({launch={},power=1,onComplete,onExit,storyPaused=false,onStoryPauseRequest,onStoryPauseClose}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<Engine|null>(null),audio=useRef<EncounterAudio|null>(null);
 const [revision,refresh]=useState(0),[tests,setTests]=useState(!!launch.tests),[tab,setTab]=useState<1|2|3|4>(launch.phase??1),[learning,setLearning]=useState<'first'|'expert'>('first');
 const [mixPhase,setMixPhase]=useState<1|2>(2),[mixNormal,setMixNormal]=useState('volley-cross'),[mixPrimary,setMixPrimary]=useState('path-fold'),[mixSecondary,setMixSecondary]=useState('');
 const testsRef=useRef(tests),pausedBeforeTests=useRef(false),initial=useRef({launch,power});
 const pauseRef=useRef({active:false,wasPaused:false}),storyPausedRef=useRef(storyPaused);storyPausedRef.current=storyPaused;
 const callbacks=useRef({onComplete,onExit,onStoryPauseRequest,onStoryPauseClose});callbacks.current={onComplete,onExit,onStoryPauseRequest,onStoryPauseClose};
 const focus=()=>canvas.current?.focus({preventScroll:true});
 const openTests=(open:boolean)=>{const e=engine.current;if(!e||storyPausedRef.current)return;if(open&&!testsRef.current)pausedBeforeTests.current=e.paused;testsRef.current=open;setTests(open);e.keys.clear();e.paused=open?true:pausedBeforeTests.current;if(!open)focus();};
 const act=(fn:(e:Engine)=>void,resume=false)=>{const e=engine.current;if(!e)return;audio.current?.unlock();fn(e);e.keys.clear();if(resume){testsRef.current=false;setTests(false);pausedBeforeTests.current=false;e.paused=false;focus();}e.notify();};
 // Story host owns the one and only ESC dialog. Save/restore the boss engine's
 // pause state so no separate simulator exit screen or lost Space input remains.
 const requestStoryPause=()=>{const e=engine.current;if(!e||pauseRef.current.active)return;
  pauseRef.current={active:true,wasPaused:testsRef.current?false:e.paused};
  testsRef.current=false;setTests(false);e.keys.clear();e.paused=true;e.notify();callbacks.current.onStoryPauseRequest();};
 useEffect(()=>{const e=engine.current;if(!e)return;
  if(storyPaused){if(!pauseRef.current.active)pauseRef.current={active:true,wasPaused:e.paused};e.keys.clear();e.paused=true;e.notify();}
  else if(pauseRef.current.active){e.paused=pauseRef.current.wasPaused;pauseRef.current={active:false,wasPaused:false};e.keys.clear();e.notify();focus();}
 },[storyPaused]);
 useEffect(()=>{
  const e=new Engine(canvas.current!,patterns),a=new EncounterAudio();engine.current=e;audio.current=a;
  const state=useAppStore.getState();e.nativeWeapon={style:state.shipStyle,color:state.shipColor,power:initial.current.power,shotIndex:0};e.hostPauseDialog=true;
  e.playStorySound=k=>{a.enabled=useAppStore.getState().settings.sfxVolume>0;a.play(k);};e.onItemPickup=()=>sfx.powerup();e.notify=()=>refresh(x=>x+1);
  e.startEncounter(initial.current.launch.phase===2);if(initial.current.launch.tests)e.paused=true;
  void document.fonts.load('400 52px "Degreeon Black Han"');
  const keyName=(v:KeyboardEvent)=>v.key.length===1?v.key.toLowerCase():v.key;
  const down=(v:KeyboardEvent)=>{
   const k=keyName(v);if(['F6','F7','F8','Escape'].includes(k))v.preventDefault();
   if(k==='F7'&&!v.repeat){openTests(!testsRef.current);return;}
   if(testsRef.current){if(k==='Escape')openTests(false);return;}
   if(k==='Escape'&&!v.repeat){if(storyPausedRef.current){callbacks.current.onStoryPauseClose();}else requestStoryPause();return;}
   if(storyPausedRef.current||pauseRef.current.active)return;
   const bombKey=k==='Shift'||v.code==='ShiftLeft'||v.code==='ShiftRight'||k==='x'||k==='b';
   // A clicked boss-control button may retain focus; Shift must still reach the
   // active arena while text-entry controls remain protected from hotkeys.
   if((v.target as HTMLElement)?.matches('input,select')&&k!=='Escape')return;
   if((v.target as HTMLElement)?.matches('button')&&k!=='Escape'&&!bombKey&&k!==' ')return;
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Shift'].includes(k))v.preventDefault();
   a.unlock();sfx.resumeAll();
   if(e.paused)return;
   if(k==='F6'&&!v.repeat){skipEncounterPattern(e);return;}
   if(k==='F8'&&!v.repeat){skipEncounterPhase(e);return;}
   if(k==='r'&&!v.repeat){e.restart();return;}
   if((k==='Enter'||k===' ')&&e.storyInputLocked){if(!v.repeat)advanceStoryDialogue(e);return;}
   if(bombKey&&!v.repeat){
    const before=e.bombs;e.bomb();if(e.bombs<before)sfx.bossExplode();return;
   }
   e.keys.add(k);
  };
  const up=(v:KeyboardEvent)=>e.keys.delete(keyName(v));
  const blur=()=>{e.keys.clear();e.paused=true;e.notify();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  // The entrance cinematic fades the story music; the actual encounter
  // begins with the supplied Starfall Circuit track (including direct tests).
  sfx.startChapter3BossBgm();e.start();focus();
  return()=>{e.stop();e.keys.clear();a.close();if(sfx.currentBgmTrack==='/assets/audio/chapter3/starfall-circuit.mp3')sfx.stopBgm();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
 },[]);
 useEffect(()=>{if(tests)document.querySelector<HTMLElement>('.c3boss-modal button')?.focus();},[tests]);
 const e=engine.current;
 const begin=(phase:1|2)=>act(e=>e.startEncounter(phase===2),true);
 const preview=(scene:StoryPreview)=>act(e=>startStoryPreview(e,scene),true);
 const phaseIds=(phase:1|2)=>new Set((phase===1?phaseOneScore:phaseTwoScore).flatMap(c=>[c.id,...c.supports]));
 const one=phaseIds(1),two=phaseIds(2);
 const mixNormals=(mixPhase===1?phaseOneScore:phaseTwoScore).map(c=>patterns.find(p=>p.id===c.id)!).filter(p=>p.category==='normal');
 const mixStage=learning==='expert'?3:mixPhase===2?2:0;
 const runMix=(kind:'alone'|'fixed'|'random')=>act(e=>{
  if(kind==='alone')manualSupportCombination(e,'support-preview',[mixPrimary],mixStage);
  else if(kind==='fixed')manualSupportCombination(e,mixNormal,[...new Set([mixPrimary,mixSecondary].filter(Boolean))],mixStage);
  else randomSupportCombination(e,mixPhase,mixNormal,mixStage);
 },true);
 const leave=()=>requestStoryPause();
 const trap=(v:{key:string;shiftKey:boolean;currentTarget:HTMLElement;preventDefault:()=>void})=>{if(v.key!=='Tab')return;const all=[...v.currentTarget.querySelectorAll<HTMLElement>('button,input,select')].filter(x=>!(x as HTMLButtonElement).disabled),first=all[0],last=all[all.length-1];if(v.shiftKey&&document.activeElement===first){v.preventDefault();last?.focus();}else if(!v.shiftKey&&document.activeElement===last){v.preventDefault();first?.focus();}};
 return <div className="c3boss-root" data-revision={revision}>
  <div className="c3boss-stage"><div className="c3boss-plane"><canvas ref={canvas} width={922} height={960} tabIndex={0} aria-label="챕터 3 디그리온 최종 보스 전투"/></div></div>
  <div className="chapter2-story-test-navigation chapter3-story-test-navigation c3boss-story-test-nav" aria-label="챕터 3 통합 테스트 이동">
   <div className="chapter2-story-test-toolbar"><button className="chapter2-story-test-skip" onClick={()=>act(skipEncounterPattern)}>SKIP · F6</button><button className="chapter2-story-test-toggle" onClick={()=>openTests(true)}>TEST 이동 · F7</button></div>
  </div>
  {e&&!tests&&!storyPaused&&e.pattern.category==='normal'&&(e.supportMix||e.selectedSupports.size>0)&&<div className="c3boss-mix-hud" role="status">
   <strong>SUPPORT MIX · {e.encounter.enabled?`${e.encounter.phase}페이즈`:'테스트'}</strong>
   <span>{e.supportLabSolo?'보조공격 단독 실험':e.pattern.name}</span>
   <small>{e.supportMix?[...e.supportMix.required.map(id=>supportOptions.find(o=>o.id===id)?.name??id),...e.supportMix.entries.map(x=>`${supportOptions.find(o=>o.id===x.id)?.name??x.id}${x.active?'':' (대기)'}`)].join(' + ')||'보조 없이 진행':Array.from(e.selectedSupports).map(id=>supportOptions.find(o=>o.id===id)?.name??id).join(' + ')}</small>
  </div>}
  {e&&!tests&&!storyPaused&&<EncounterOverlay e={e} onNext={()=>act(advanceStoryDialogue)} onSkip={()=>act(e=>e.skip())} onRestart={()=>act(e=>e.restart(),true)} onPractice={()=>openTests(true)} onContinue={e.encounter.preview?undefined:()=>callbacks.current.onComplete()}/>}
  {e?.gameOver&&!tests&&!storyPaused&&<div className="c3boss-retry"><button onClick={()=>act(e=>e.restart(),true)}>다시 도전 · R</button><button onClick={leave}>챕터 선택으로</button></div>}
  {tests&&e&&!storyPaused&&<div className="c3boss-dim c3boss-test-dim"><section className="c3boss-modal chapter2-story-test-panel" role="dialog" aria-modal="true" aria-label="디그리온 패턴 테스트" onKeyDown={trap}>
   <header><div><small>CHAPTER 03 / DEVELOPER TEST</small><h2>디그리온 전투 테스트</h2><p>테스트 창이 열린 동안 전투와 연출은 정지합니다.</p></div><button onClick={()=>openTests(false)}>닫기 · F7 / ESC</button></header>
   <div className="c3boss-test-actions"><button onClick={()=>begin(1)}>전체 보스전 시작</button><button onClick={()=>begin(2)}>2페이즈부터 시작</button><button onClick={()=>act(skipEncounterPattern,true)}>다음 패턴 · F6</button><button onClick={()=>act(skipEncounterPhase,true)}>현재 페이즈 클리어 · F8</button><button onClick={leave}>챕터 선택으로</button></div>
   <div className="c3boss-test-options"><label>패턴 학습 <select value={learning} onChange={v=>setLearning(v.target.value as 'first'|'expert')}><option value="first">최초 학습 · 1 → 4단계</option><option value="expert">숙련 버전 · 3 → 4단계</option></select></label><label><input type="checkbox" checked={e.invincible} onChange={v=>act(e=>{e.invincible=v.target.checked;})}/> 테스트 무적</label><label>탄 강화 <select value={e.nativeWeapon.power} onChange={v=>act(e=>{e.nativeWeapon.power=Number(v.target.value);})}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label></div>
   <p className="c3boss-state">{e.encounter.enabled?`${e.encounter.phase}페이즈`: '예비 패턴'} · {e.pattern.name} · {e.encounter.learning.first?'최초 학습':'숙련'} {e.stage+1}단계 · LIFE {e.hp} / BOMB {e.bombs}</p>
   <div className="c3boss-test-layout"><div className="c3boss-test-patterns">
    <nav className="c3boss-tabs" aria-label="테스트 페이즈">{([1,2,3,4] as const).map(n=><button key={n} aria-pressed={tab===n} onClick={()=>setTab(n)}>{n===4?'보조 공격 테스트':n===3?'미편성 패턴':`${n}페이즈`}</button>)}</nav>
    {(['normal','special','support'] as Category[]).map(category=>{
     const entries=tab===4?[]:tab===3?patterns.filter(p=>p.id!=='support-preview'&&!one.has(p.id)&&!two.has(p.id)&&p.category===category).map(p=>({p,c:null,index:-1})):(tab===1?phaseOneScore:phaseTwoScore).map((c,index)=>({p:patterns.find(p=>p.id===c.id)!,c,index})).filter(({p})=>p.category===category);
     if(!entries.length)return null;
     return <section className="c3boss-pattern-group" key={category} aria-label={`${categoryNames[category]} 테스트`}>
      <h3>{categoryNames[category]} <span>{entries.length}개</span></h3>
      <div className="c3boss-pattern-list">{entries.map(({p,c,index})=><button key={`${p.id}-${index}`} onClick={()=>act(e=>{if(tab===1||tab===2){startCuePractice(e,tab,index,learning);}else{e.leaveEncounter();e.selectedSupports.clear();e.expert=learning==='expert';e.select(patterns.indexOf(p));e.bossForm=2;}},true)}>
       {tab!==3&&<span>{String(index+1).padStart(2,'0')}</span>}
       <div><strong>{p.name}</strong><small>{c?(one.has(c.id)&&two.has(c.id)?'공통 패턴':`${tab}페이즈 전용`)+(p.category==='normal'?' · 매번 무작위 보조 조합'+(c.full?' / 화면 확장 필수':''):''):'현재 전투 편성에 포함되지 않은 원본 패턴'}</small></div><em>반복 테스트 ↗</em>
      </button>)}</div>
     </section>;
    })}
    {tab===4&&<section className="c3boss-support-lab" aria-label="보조 공격 단독 및 조합 테스트">
     <h3>보조 공격 단독 · 일반 공격 조합</h3>
     <p>단독 테스트는 일반 탄막 없이 보조공격만 보여줍니다. 조합 테스트에서는 일반 공격과 보조공격을 동시에 실행합니다. 랜덤 조합은 실제 전투와 동일한 추첨 방식을 사용합니다. 가로·세로 파동 및 거울 레이저에서는 공간별 시간 흐름과 3분신 공동 생존을 사용할 수 없습니다.</p>
     <div className="c3boss-mix-fields">
      <label>전투 페이즈<select value={mixPhase} onChange={v=>{setMixPhase(Number(v.target.value) as 1|2);setMixNormal('volley-cross');}}><option value={1}>1페이즈</option><option value={2}>2페이즈 · 매번 보조 포함</option></select></label>
      <label>일반 공격<select value={mixNormal} onChange={v=>{const id=v.target.value;setMixNormal(id);if(isLaserSupportForbidden(id,mixPrimary))setMixPrimary('erosion');if(isLaserSupportForbidden(id,mixSecondary))setMixSecondary('');}}>{mixNormals.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>보조 공격 A<select value={mixPrimary} onChange={v=>setMixPrimary(v.target.value)}>{supportOptions.map(p=><option key={p.id} value={p.id} disabled={isLaserSupportForbidden(mixNormal,p.id)}>{p.name}{isLaserSupportForbidden(mixNormal,p.id)?" · 레이저 적용 불가":""}</option>)}</select></label>
      <label>보조 공격 B<select value={mixSecondary} onChange={v=>setMixSecondary(v.target.value)}><option value="">선택하지 않음</option>{supportOptions.filter(p=>p.id!==mixPrimary).map(p=><option key={p.id} value={p.id} disabled={isLaserSupportForbidden(mixNormal,p.id)}>{p.name}{isLaserSupportForbidden(mixNormal,p.id)?" · 레이저 적용 불가":""}</option>)}</select></label>
     </div>
     <div className="c3boss-mix-buttons"><button onClick={()=>runMix('alone')}>보조 A 단독 테스트</button><button onClick={()=>runMix('fixed')}>선택한 공격 조합 테스트</button><button onClick={()=>runMix('random')}>무작위 조합 새로 뽑아 테스트</button></div>
     <h3>보조공격 전체 목록 · {supportOptions.length}종</h3>
     <div className="c3boss-support-list">{supportOptions.map(item=><button key={item.id} onClick={()=>{setMixPrimary(item.id);act(e=>manualSupportCombination(e,'support-preview',[item.id],mixStage),true);}}>{item.name}<small>단독 확인 ↗</small></button>)}</div>
    </section>}
    {tab!==4&&<p className="c3boss-test-note">전체 보스전에서는 일반 공격이 바뀔 때마다 보조 공격이 무작위로 다시 추첨됩니다. 2페이즈 일반 공격은 매번 보조 공격이 1종 이상 포함되며, 추가 보조공격은 전투 도중 합류하기도 합니다. 원하는 조합은 위 '보조 공격 테스트' 탭에서 직접 확인할 수 있습니다.</p>}
   </div><aside className="c3boss-scene-list" aria-label="연출 장면 선택"><strong>연출 장면 선택</strong><p>전투 없이 장면만 확인합니다.</p>{([['arrival','첫 등장'],['phase-clear','1페이즈 클리어'],['awakening','각성'],['victory','최종 처치'],['complete','클리어 화면']] as const).map(([id,title])=><button key={id} onClick={()=>preview(id)}>{title}<span aria-hidden="true">↗</span></button>)}</aside></div>
  </section></div>}
 </div>;
}
