


/* === CHAPTER3 PATCH 029: Digrion spirit manifestation + chooser overlay safety === */
(() => {
  window.STORY_CUSTOM_EFFECTS = window.STORY_CUSTOM_EFFECTS || {};
  window.STORY_CUSTOM_EFFECTS['digrion-spirit-reveal'] = ({ layer }) => {
    const particles = Array.from({length:54},(_,i)=>{
      const angle=(i*137.508 + (i%7)*11) * Math.PI/180;
      const radius=180 + (i%11)*34;
      const x0=Math.cos(angle)*radius;
      const y0=Math.sin(angle)*radius*.72;
      const x1=Math.cos(angle)*42;
      const y1=Math.sin(angle)*30;
      const size=3+(i%4)*1.25;
      const delay=(i%13)*0.035;
      return `<i style="--x0:${x0.toFixed(1)}px;--y0:${y0.toFixed(1)}px;--x1:${x1.toFixed(1)}px;--y1:${y1.toFixed(1)}px;--s:${size.toFixed(1)}px;--d:${delay.toFixed(3)}s"></i>`;
    }).join('');
    return c3Mount(layer, `<div class="c3-spirit-reveal029">
      <img class="sr-bg" src="/assets/chapter3/story/backgrounds/graduation_core_purified.png" alt="">
      <div class="sr-vignette"></div><div class="sr-beam"></div>
      <div class="sr-ring r1"></div><div class="sr-ring r2"></div><div class="sr-ring r3"></div>
      <div class="sr-particles">${particles}</div>
      <div class="sr-manifest"><div class="sr-shell"></div></div>
      <div class="sr-shock"></div><div class="sr-flash"></div>
    </div>`);
  };

  const hoist = () => ['storySectionPanel','storyEffectPanel','dialogueJumpPanel'].forEach(id => {
    const panel=document.getElementById(id);
    if (!panel) return;
    if (panel.parentElement !== document.body) document.body.appendChild(panel);
    panel.style.setProperty('z-index','2147483647','important');
    panel.style.setProperty('pointer-events','auto','important');
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',hoist,{once:true});
  else hoist();
})();

