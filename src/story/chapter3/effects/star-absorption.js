
(() => {
  const parseHex052=value=>{const hex=String(value||'#ffd73c').trim().replace('#','');const c=hex.length===3?hex.split('').map(x=>x+x).join(''):hex.padEnd(6,'0').slice(0,6);const n=Number.parseInt(c,16);return Number.isFinite(n)?[(n>>16)&255,(n>>8)&255,n&255]:[255,215,60]};
  const mixWhite052=(rgb,a)=>rgb.map(v=>Math.round(v*(1-a)+255*a));
  const motes052=()=>Array.from({length:30},(_,i)=>{const ang=((i*47)%360)*Math.PI/180;const rad=25+(i%8)*9;const sx=(Math.cos(ang)*rad).toFixed(1)+'px';const sy=(Math.sin(ang)*rad*.72).toFixed(1)+'px';const s=(3+(i%4)*1.15).toFixed(1)+'px';const d=((i%11)*.05).toFixed(2)+'s';return `<i style="--sx:${sx};--sy:${sy};--s:${s};--d:${d}"></i>`}).join('');
  const after052=()=>Array.from({length:24},(_,i)=>{const x=(24+((i*37)%53)).toFixed(1)+'%';const y=(55+((i*29)%31)).toFixed(1)+'%';const s=(2.6+(i%4)*1.1).toFixed(1)+'px';const d=((i%12)*.06).toFixed(2)+'s';return `<i style="--x:${x};--y:${y};--s:${s};--d:${d}"></i>`}).join('');

  window.STORY_CUSTOM_EFFECTS['star-breakout']=({layer,item})=>{
    const color=String(item.color||'#ffd73c');
    const rgb=parseHex052(color);
    const mid=mixWhite052(rgb,.36);
    const light=mixWhite052(rgb,.72);
    const style=`--star-color:${color};--star-rgb:${rgb.join(',')};--star-mid-rgb:${mid.join(',')};--star-light-rgb:${light.join(',')}`;
    return c3Mount(layer,`
      <div class="c3-star-card-absorb052" style="${style}">
        <div class="sc52-vignette"></div><div class="sc52-field"></div>
        <div class="sc52-stream s1"></div><div class="sc52-stream s2"></div><div class="sc52-stream s3"></div>
        <div class="sc52-card-wrap"><div class="sc52-card-aura"></div><img class="sc52-card" src="/assets/chapter3/story/characters/student_card_main.png" alt="학생증"></div>
        <div class="sc52-star"><span class="sc52-star-shape"></span><i class="sc52-star-core"></i></div>
        <div class="sc52-motes">${motes052()}</div>
        <div class="sc52-impact"></div><div class="sc52-wave w1"></div><div class="sc52-wave w2"></div><div class="sc52-wave w3"></div>
        <div class="sc52-after">${after052()}</div>
      </div>`,(root,later)=>{
        const scene=root.querySelector('.c3-star-card-absorb052');
        later(()=>scene?.classList.add('star-in'),120);
        later(()=>scene?.classList.add('card-in'),520);
        later(()=>scene?.classList.add('attract'),1320);
        later(()=>scene?.classList.add('absorb'),2150);
        /* star reaches the exact card center near 3.12 s; only then fire card flash/waves */
        later(()=>scene?.classList.add('absorbed'),3160);
      });
  };
})();
