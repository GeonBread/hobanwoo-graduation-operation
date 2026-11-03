export function upgradePrologueRuntime(source: string): string {
  const once=(before:string,after:string)=>{if(source.split(before).length!==2)throw new Error('Chapter 1 prologue hook differs: '+before.slice(0,60));source=source.replace(before,()=>after);};
  // Opening credits must render in a viewport-level cinematic host.
  // Otherwise an old black-hold, fullscreen stage, or overlay can obscure all cards.
  once("    'first-purification-absorb'\n  ]);", "    'first-purification-absorb',\n    'opening-credits-sequence'\n  ]);");
  once("    } else {\n      storyStage.classList.add('is-cinematic-effect');", "    } else {\n      if (item.effect === 'opening-credits-sequence') {\n        window.Chapter1PrologueV2.clear();\n        storyStage.classList.remove('is-prologue-black-transition', 'is-prologue-black-hold');\n      }\n      storyStage.classList.add('is-cinematic-effect');");
  once("  const storyStage = document.getElementById('storyStage');","  window.Chapter1PrologueV2.rewrite(storySegments);\n  storySegments.intro = buildIntroSequence();\n  const storyStage = document.getElementById('storyStage');");
  once("    const duration = Number(item.effectDuration) || 1600;\n    if (item.effect === 'location-title-intro') {","    const duration = Number(item.effectDuration) || 1600;\n    if (item.effect === 'prologue-v2') {\n      window.Chapter1PrologueV2.present(item, storyStage);\n    } else if (item.effect === 'location-title-intro') {");
  once('  function typeCurrentLine() {\n    const item = currentDialogues[dialogueIndex];',"  function typeCurrentLine() {\n    const item = currentDialogues[dialogueIndex];\n    if (item?.effect !== 'prologue-v2') window.Chapter1PrologueV2.present(item, storyStage);");
  once('  function clearFlowTimers() {','  function clearFlowTimers() {\n    window.Chapter1PrologueV2.clear();');
  return source;
}
