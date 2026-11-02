export function upgradePrologueRuntime(source: string): string {
  const once=(before:string,after:string)=>{if(source.split(before).length!==2)throw new Error('Chapter 1 prologue hook differs: '+before.slice(0,60));source=source.replace(before,()=>after);};
  once("  const storyStage = document.getElementById('storyStage');","  window.Chapter1PrologueV2.rewrite(storySegments);\n  storySegments.intro = buildIntroSequence();\n  const storyStage = document.getElementById('storyStage');");
  once("    const duration = Number(item.effectDuration) || 1600;\n    if (item.effect === 'location-title-intro') {","    const duration = Number(item.effectDuration) || 1600;\n    if (item.effect === 'prologue-v2') {\n      window.Chapter1PrologueV2.present(item, storyStage);\n    } else if (item.effect === 'location-title-intro') {");
  once('  function typeCurrentLine() {\n    const item = currentDialogues[dialogueIndex];',"  function typeCurrentLine() {\n    const item = currentDialogues[dialogueIndex];\n    if (item?.effect !== 'prologue-v2') window.Chapter1PrologueV2.present(item, storyStage);");
  once('  function clearFlowTimers() {','  function clearFlowTimers() {\n    window.Chapter1PrologueV2.clear();');
  return source;
}
