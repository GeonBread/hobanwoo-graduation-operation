

/* === CHAPTER3 PATCH 027 effect overrides === */
(() => {
  window.STORY_CUSTOM_EFFECTS['semester-time-passage'] = ({ layer, item }) => c3Mount(layer, `
    <div class="c3-semester-time-passage">
      <div class="time-bg"></div><div class="time-sweep"></div><div class="time-streaks"></div>
      <div class="time-calendar">
        <section class="sheet s1"><small>2030</small><strong>9</strong><span>SEPTEMBER</span></section>
        <section class="sheet s2"><small>2030</small><strong>10</strong><span>OCTOBER</span></section>
        <section class="sheet s3"><small>2030</small><strong>11</strong><span>NOVEMBER</span></section>
      </div>
      <div class="time-final"><small>TIME PASSED</small><strong>${c3Esc(item.text || '종강까지 3주 전')}</strong></div>
    </div>`);

  /* Always reveal the absolute top edge of the supplied Digrion-core illustration before shrinking into the story frame. */
  

  /* Story-cinematic death only: centered visual-novel sprite -> golden purification -> shrink-away -> two fullscreen waves. */
  

  window.STORY_CUSTOM_EFFECTS['six-stars-hex'] = ({ layer }) => {
    const stars=[
      ['시작','#ffd73c'],['적응','#6fd7ff'],['시험','#79e36f'],
      ['팀플','#ff9a43'],['긍지','#ff6fb5'],['졸업','#9b5cff']
    ];
    return c3Mount(layer, `<div class="c3-six-hex"><svg viewBox="0 0 600 600" class="links"><polygon points="300,70 500,185 500,415 300,530 100,415 100,185"/><path d="M300 70L500 185L500 415L300 530L100 415L100 185Z"/></svg>${stars.map((s,i)=>`<div class="node n${i+1}" style="--star-node:${s[1]}" aria-label="${s[0]}의 별"><i>★</i></div>`).join('')}<div class="center"><small>CORE LINK</small><strong>100%</strong></div></div>`, (root,later)=>{const scene=root.querySelector('.c3-six-hex');later(()=>scene?.classList.add('arranged'),400);later(()=>scene?.classList.add('linked'),2500);later(()=>scene?.classList.add('complete'),4700)});
  };
})();

