import {ARRIVAL_SECONDS,DEFEAT_SECONDS} from './bossCinema';
import React from 'react';
import type {Engine} from './engine';
import {storyLines,revealDialogue} from './encounter';
export function EncounterOverlay({e,onNext,onRestart,onPractice,onContinue}:{e:Engine;onNext:()=>void;onRestart:()=>void;onPractice:()=>void;onContinue?:()=>void}){
 const s=e.encounter;if(!e.storyInputLocked||e.paused)return null;
 if(s.mode==='preview-end')return <section className="encounter-complete" aria-label="연출 감상 완료"><h1>연출 재생 완료</h1><p>전투 없이 연출만 감상했습니다.</p><div><button onClick={onRestart}>다시 보기</button><button onClick={onPractice}>연출 목록</button></div></section>;
 if(s.mode==='complete')return s.preview?<section className="encounter-complete" aria-label="연출 감상 완료"><h1>연출 재생 완료</h1><div><button onClick={onRestart}>다시 보기</button><button onClick={onPractice}>연출 목록</button></div></section>:null;
 const line=s.mode==='opening'&&s.age<ARRIVAL_SECONDS||s.mode==='victory'&&s.age<DEFEAT_SECONDS?undefined:storyLines[s.mode]?.[s.line];if(!line)return null;
 const text=revealDialogue(line,s.lineAge,s.revealed).text,mark=line.emphasis?text.lastIndexOf(line.emphasis):-1;
 return <section className={'encounter-dialogue '+(s.phase===2||s.mode==='threat'?'awakened ':'')+(line.still?'still ':'')+(s.weighted?'landed':'')} aria-label="디그리온의 대사">
  <div className="encounter-voice"><p aria-live="off">{mark>=0?<>{text.slice(0,mark)}<span className="encounter-emphasis">{line.emphasis}</span>{text.slice(mark+line.emphasis!.length)}</>:text||'\u00a0'}</p></div>
  <button className="encounter-next" onClick={onNext}>Enter / Space <span>다음</span></button>
 </section>;
}
