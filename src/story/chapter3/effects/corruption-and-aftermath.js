
/* === CHAPTER3 PATCH 038: fullscreen monster birth, beam-vs-spirit finale, grand body break === */
(() => {
  window.STORY_CUSTOM_EFFECTS = window.STORY_CUSTOM_EFFECTS || {};

  const makeBirthParticles38 = (pod) => Array.from({ length: 26 }, (_, i) => {
    const angle = (i * 137.508 + pod * 31) * Math.PI / 180;
    const radius = 90 + (i % 7) * 22;
    return `<i style="--px:${(Math.cos(angle) * radius).toFixed(1)}px;--py:${(Math.sin(angle) * radius).toFixed(1)}px;--pd:${((i % 9) * .04).toFixed(3)}s"></i>`;
  }).join('');

  window.STORY_CUSTOM_EFFECTS['first-monster-birth'] = ({ layer }) => c3Mount(layer, `<div class="c3-monster-birth38">
    <img class="mb38-bg" src="/assets/chapter3/story/backgrounds/campus_night.png" alt="">
    <div class="mb38-vignette"></div>
    <div class="mb38-sky-rift"><i class="r1"></i><i class="r2"></i><i class="r3"></i><b></b></div>
    <div class="mb38-column"></div>
    <div class="mb38-cloud cloud-a"></div><div class="mb38-cloud cloud-b"></div>
    <div class="mb38-rays">${Array.from({length:18},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
    ${[1,2,3].map(n=>`<div class="mb38-pod p${n}">
      <div class="mb38-pod-cloud"></div>
      <div class="mb38-orbit o1"></div><div class="mb38-orbit o2"></div>
      <div class="mb38-particles">${makeBirthParticles38(n)}</div>
      <div class="mb38-core"><i></i><b></b></div>
      <div class="mb38-burst"></div>
      <img class="mb38-monster" src="/assets/chapter3/story/monsters/birth_monster_${n}.png" alt="오염 개체 ${n}">
    </div>`).join('')}
    <div class="mb38-screen-flash"></div>
  </div>`, (root, later) => {
    const scene = root.querySelector('.c3-monster-birth38');
    const shake = (cls, at) => {
      later(() => scene?.classList.add(cls), at);
      later(() => scene?.classList.remove(cls), at + 430);
    };
    later(() => scene?.classList.add('ritual'), 80);
    later(() => scene?.classList.add('surge'), 1050);
    later(() => scene?.classList.add('start-1'), 2050);
    later(() => scene?.classList.add('born-1'), 2850); shake('shake-1', 2820);
    later(() => scene?.classList.add('start-2'), 3150);
    later(() => scene?.classList.add('born-2'), 4100); shake('shake-2', 4070);
    later(() => scene?.classList.add('start-3'), 4450);
    later(() => scene?.classList.add('born-3'), 5400); shake('shake-3', 5370);
    later(() => scene?.classList.add('stabilized'), 6350);
  });

  const spirit38 = (cls='') => `<div class="c3-spirit38 ${cls}"><div class="spirit38-aura"></div><div class="spirit38-body"><i></i></div></div>`;

  window.STORY_CUSTOM_EFFECTS['purification-collision'] = ({ layer }) => c3Mount(layer, `<div class="c3-purify-collision38">
    <img class="pc38-bg" src="/assets/chapter3/story/backgrounds/graduation_core_purified.png" alt="">
    <div class="pc38-vignette"></div>
    ${spirit38('pc38-spirit')}
    <div class="pc38-beam"><span></span><i></i><b></b></div>
    <div class="pc38-contact"></div>
    <div class="pc38-wave w1"></div><div class="pc38-wave w2"></div><div class="pc38-wave w3"></div>
    <div class="pc38-lightning">${Array.from({length:18},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
    <div class="pc38-fragments">${Array.from({length:30},(_,i)=>`<i style="--i:${i};--a:${(i*41)%360}deg"></i>`).join('')}</div>
    <div class="pc38-flash"></div>
  </div>`, (root, later) => {
    const scene=root.querySelector('.c3-purify-collision38');
    later(()=>scene?.classList.add('impact'),420);
    later(()=>scene?.classList.add('struggle'),1350);
    later(()=>scene?.classList.add('overpower'),3950);
    later(()=>scene?.classList.add('purge'),5700);
    later(()=>scene?.classList.add('final-flash'),6650);
    later(()=>scene?.classList.add('cleared'),7400);
  });

  const sparkle38 = Array.from({length:72},(_,i)=>{
    const x=(7 + ((i*37)%87));
    const y=(8 + ((i*53)%82));
    const s=(3 + (i%5)*1.3).toFixed(1);
    const d=((i%19)*.075).toFixed(3);
    return `<i style="--x:${x}%;--y:${y}%;--s:${s}px;--d:${d}s"></i>`;
  }).join('');
  window.STORY_CUSTOM_EFFECTS['purification-explosion'] = ({ layer }) => c3Mount(layer, `<div class="c3-purify-aftermath38">
    <img class="pa38-bg" src="/assets/chapter3/story/backgrounds/graduation_core_purified.png" alt="">
    <div class="pa38-bloom"></div><div class="pa38-wave"></div><div class="pa38-flash"></div>
    <div class="pa38-sparkles">${sparkle38}</div>
  </div>`, (root, later) => {
    const scene=root.querySelector('.c3-purify-aftermath38');
    later(()=>scene?.classList.add('glint'),120);
    later(()=>scene?.classList.add('sparkle'),420);
    later(()=>scene?.classList.add('settle'),3550);
  });

  
})();

