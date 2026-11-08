
/* === CHAPTER3 PATCH 035: calendar focus, monster births, final purification, shutdown === */
(() => {
  window.STORY_CUSTOM_EFFECTS = window.STORY_CUSTOM_EFFECTS || {};

  /* Each monster now condenses from its own local contamination mass instead of all three popping out of one burst. */
  

  const purifyParticles = (count, tone='gold') => Array.from({length:count},(_,i)=>{
    const a=(i*137.508)%360;
    const r=18+(i%13)*5;
    const d=(i%17)*.035;
    return `<i style="--a:${a}deg;--r:${r}vmin;--d:${d.toFixed(3)}s;--tone:${tone}"></i>`;
  }).join('');

  const spiritBody = (className='') => `<div class="c3-spirit-body35 ${className}"><div class="spirit-aura35"></div><div class="spirit-shell35"></div></div>`;

  window.STORY_CUSTOM_EFFECTS['purification-energy-form'] = ({ layer }) => c3Mount(layer, `<div class="c3-purify-form35">
    <img class="pf35-bg" src="/assets/chapter3/story/backgrounds/graduation_core_purified.png" alt="">
    <div class="pf35-vignette"></div>
    <div class="pf35-star s1" style="--star:#ffd73c">★</div><div class="pf35-star s2" style="--star:#6fd7ff">★</div>
    <div class="pf35-star s3" style="--star:#79e36f">★</div><div class="pf35-star s4" style="--star:#ff9a43">★</div>
    <div class="pf35-star s5" style="--star:#ff6fb5">★</div><div class="pf35-star s6" style="--star:#9b5cff">★</div>
    <div class="pf35-stream l1"></div><div class="pf35-stream l2"></div><div class="pf35-stream l3"></div>
    <div class="pf35-stream l4"></div><div class="pf35-stream l5"></div><div class="pf35-stream l6"></div>
    <div class="pf35-ring r1"></div><div class="pf35-ring r2"></div><div class="pf35-ring r3"></div>
    <div class="pf35-particles">${purifyParticles(72)}</div>
    <div class="pf35-core"><span></span><i></i><b></b></div>
    <div class="pf35-flash"></div>
  </div>`, (root, later) => {
    const scene=root.querySelector('.c3-purify-form35');
    later(()=>scene?.classList.add('gather'),180);
    later(()=>scene?.classList.add('surge'),2550);
    later(()=>scene?.classList.add('ready'),5050);
  });

  window.STORY_CUSTOM_EFFECTS['purification-launch'] = ({ layer }) => c3Mount(layer, `<div class="c3-purify-launch35">
    <img class="pl35-bg" src="/assets/chapter3/story/backgrounds/graduation_core_purified.png" alt="">
    <div class="pl35-tunnel"></div><div class="pl35-vignette"></div>
    <div class="pl35-core"><i></i><b></b></div>
    <div class="pl35-beam"><i></i></div>
    <div class="pl35-shock r1"></div><div class="pl35-shock r2"></div><div class="pl35-shock r3"></div>
    <div class="pl35-particles">${purifyParticles(54)}</div>
    <div class="pl35-flash"></div>
  </div>`, (root, later) => {
    const scene=root.querySelector('.c3-purify-launch35');
    later(()=>scene?.classList.add('charge'),120);
    later(()=>scene?.classList.add('fire'),950);
    later(()=>scene?.classList.add('rush'),1650);
  });

  

  

  window.STORY_CUSTOM_EFFECTS['student-card-shutdown'] = ({ layer }) => c3Mount(layer, `<div class="ch3-card-shutdown35">
    <div class="cs35-aura"></div>
    <img src="/assets/chapter3/story/characters/student_card_main.png" alt="학생증">
    <div class="cs35-ring"></div>
    <div class="cs35-flash"></div>
  </div>`, (root, later) => {
    const scene=root.querySelector('.ch3-card-shutdown35');
    later(()=>scene?.classList.add('powering-down'),250);
    later(()=>scene?.classList.add('off'),2450);
    later(()=>scene?.classList.add('wave'),2650);
  });
})();

