
(() => {
  const boss='/assets/chapter3/story/characters/digrion_phase2_final.png';
  const major=[
    ['c1','M510 120 L488 250 L524 350 L476 468 L512 596 L478 748 L505 910'],
    ['c1','M350 260 L430 310 L402 402 L477 468'],
    ['c2','M675 238 L588 320 L614 420 L522 500'],
    ['c2','M310 565 L402 522 L470 590 L430 720'],
    ['c2','M705 544 L618 510 L540 582 L588 720'],
    ['c3','M370 780 L462 710 L516 782 L478 938'],
    ['c3','M548 165 L576 300 L548 438 L590 602 L548 835']
  ];
  const minor=[
    ['c2','M474 286 L430 245 L390 230'],['c2','M516 350 L564 296 L615 278'],
    ['c2','M482 468 L424 452 L376 480'],['c2','M524 500 L580 470 L634 488'],
    ['c3','M470 590 L408 628 L370 682'],['c3','M540 582 L606 620 L646 686'],
    ['c3','M430 720 L390 756 L360 830'],['c3','M588 720 L628 766 L650 842'],
    ['c3','M506 910 L458 986 L444 1080'],['c3','M548 835 L598 906 L618 1010']
  ];
  const svg=`<svg viewBox="0 0 1000 1536" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="d48Major" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset=".28" stop-color="#ffe5ff"/><stop offset=".68" stop-color="#ce7aff"/><stop offset="1" stop-color="#7625b8"/></linearGradient><linearGradient id="d48Minor" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#eebcff"/><stop offset="1" stop-color="#a64be3"/></linearGradient></defs>${major.map(([c,d])=>`<path class="major ${c}" d="${d}"></path>`).join('')}${minor.map(([c,d])=>`<path class="minor ${c}" d="${d}"></path>`).join('')}</svg>`;
  const clips=['polygon(20% 0,80% 0,73% 18%,27% 22%)','polygon(18% 17%,82% 18%,74% 38%,25% 42%)','polygon(19% 38%,81% 39%,74% 57%,24% 60%)','polygon(17% 55%,83% 57%,76% 74%,23% 77%)','polygon(22% 72%,78% 74%,71% 92%,27% 94%)','polygon(25% 10%,45% 8%,48% 94%,29% 94%)','polygon(53% 7%,73% 10%,69% 94%,50% 92%)'];
  const mv=[['-30vmin','-13vmin','-13deg','.00s'],['24vmin','-11vmin','10deg','.05s'],['-25vmin','2vmin','-8deg','.10s'],['27vmin','8vmin','14deg','.15s'],['-17vmin','19vmin','-11deg','.20s'],['11vmin','-21vmin','16deg','.25s'],['2vmin','21vmin','3deg','.30s']];
  const pieces=clips.map((clip,i)=>`<img class="d48-piece" src="${boss}" alt="" style="--clip:${clip};--x:${mv[i][0]};--y:${mv[i][1]};--r:${mv[i][2]};--d:${mv[i][3]}">`).join('');
  const sparks=Array.from({length:64},(_,i)=>{const a=((i*47)%360)*Math.PI/180,r=7+(i%9)*2.5;return `<i style="--x:${(Math.cos(a)*r).toFixed(1)}vmin;--y:${(Math.sin(a)*r*.76).toFixed(1)}vmin;--w:${2+(i%4)}px;--h:${34+(i%7)*7}px;--r:${(i*31)%360}deg;--d:${((i%13)*.055).toFixed(2)}s"></i>`}).join('');
  const waves=Array.from({length:9},(_,i)=>`<i class="d48-wave" style="--wd:${(i*.105).toFixed(3)}s"></i>`).join('');
  const sparkles=Array.from({length:52},(_,i)=>`<i style="--x:${8+(i*37)%85}%;--y:${12+(i*53)%72}%;--s:${(2.5+(i%5)*1.1).toFixed(1)}px;--d:${((i%17)*-.14).toFixed(2)}s;--dur:${(2.6+(i%7)*.23).toFixed(2)}s"></i>`).join('');
  window.STORY_CUSTOM_EFFECTS['digrion-body-break']=({layer,api})=>c3Mount(layer,`
    <div class="c3-digrion-death048">
      <img class="d48-bg" src="/assets/chapter3/story/backgrounds/digrion_core.png" alt="">
      <img class="d48-clean" src="/assets/chapter3/story/backgrounds/graduation_core_purified.png" alt="정화된 첨성대 코어 졸업 영역">
      <div class="d48-vignette"></div>
      <div class="d48-body-stage">
        <img class="d48-ghost" src="${boss}" alt="">
        <img class="d48-body" src="${boss}" alt="디그리온">
        <div class="d48-leaks"></div>
        <div class="d48-crack-mask">${svg}</div>
        <div class="d48-pieces">${pieces}</div>
      </div>
      <div class="d48-sparks">${sparks}</div>
      <div class="d48-impact-flash"></div>
      <div class="d48-gold-fill"></div>
      <div class="d48-wave-stack">${waves}</div>
      <div class="d48-purify-explosion"></div>
      <div class="d48-sparkles">${sparkles}</div>
    </div>`,(root,later)=>{
      const s=root.querySelector('.c3-digrion-death048');
      /* Body stays intact first, then cracks only inside the alpha silhouette and progressively branches. */
      later(()=>s?.classList.add('crack1'),1050);
      later(()=>s?.classList.add('crack2'),2700);
      later(()=>s?.classList.add('crack3'),4550);
      /* The illustration itself shatters into pieces. */
      later(()=>s?.classList.add('shatter'),7050);
      /* After the pieces separate, a foreground yellow purification explosion erupts from the exact center. */
      later(()=>{
        s?.classList.add('blast');
        api?.updateScene?.('graduation_core_purified',{force:true,suppressFlash:true});
      },8950);
      /* Once the waves have disappeared, all shake stops. Only the purified map and floating sparkles remain. */
      later(()=>s?.classList.add('settle'),11150);
    });
})();
