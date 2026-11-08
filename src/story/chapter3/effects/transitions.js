
// Wave entrance: Chapter 1/2 red-shutter idiom; never draw a boss-like battle map preview.
window.STORY_CUSTOM_EFFECTS['combat-transition']=({layer,item,api})=>{
  api?.setMode?.('game');
  item.duration=3400;
  return c3Mount(layer,`<div class="ch3-wave-entry071" aria-label="챕터 3 정화 웨이브 진입">
    <div class="battle-red-shutter071"></div><div class="battle-transition-cross071"></div>
    <div class="battle-transition-title071"><small>CHAPTER 03</small><strong>정화 전투 개시</strong><span>졸업 오염 파편을 돌파하라</span></div>
  </div>`);
};
window.STORY_CUSTOM_EFFECTS['graduation-to-black']=({layer,item,api})=>{
  item.duration=6300;
  const cleanup=c3Mount(layer,`<div class="ch3-ceremony-black-fade2026" aria-hidden="true"></div>`);
  const timer=window.setTimeout(()=>api?.updateScene?.('black_screen',{force:true,suppressFlash:true}),3050);
  return()=>{window.clearTimeout(timer);cleanup?.();};
};
