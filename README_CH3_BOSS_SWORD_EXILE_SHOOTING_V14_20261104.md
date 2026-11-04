# CH3 Degreeon V14 - HP sword, exile corruption catastrophe, phase-2 fire fix

## Applying
Unzip into the project root (or drag this ZIP onto `APPLY_PATCH.cmd`).
Requires V13 previously applied. No replacement audio/images needed.

## Changes
1. HP-bar sword: at most 4/5/6 completed slashes per appearance according to stage; move the HP bar back home before cue handoff.
2. Exile shooter enemies: replace chapter wave enemy art with two procedural purple corruption masses native to the outside-space scene; their projectiles still aim at Hobanwoo.
3. Exile timeout: keep 20 seconds normal and 15 seconds expert; subtract precisely one LIFE, then spend 4 seconds on a text-free world-breaking cinematic. The outside-space screen splits into 15 moving jagged pieces with rotating/descending debris, multiple offset explosions, purple contamination glow, strong shaking, and a fade to black. The game over or return happens only after the 4-second effect.
4. Phase-2 Space shooting: avoid an unintended 0.2-second science-weapon lull, remove premature fire blocking at a pending exclusive-pattern handoff, keep firing during non-live arena rotation where shooting is otherwise allowed, and handle Space after button focus.

## Scope
Modified source code:
- src/game/chapter3/degreeon/sword.ts
- src/game/chapter3/degreeon/exile.ts
- src/game/chapter3/degreeon/nativeWeapon.ts
- src/game/chapter3/degreeon/continuity.ts
- src/game/chapter3/degreeon/encounter.ts
- src/game/chapter3/degreeon/engine.ts
- src/components/story/Chapter3BossBattle.tsx

Tests:
- tests/chapter3/degreeonExileFluidTimingV13.test.ts (adapted deadline assertions)
- tests/chapter3/degreeonBossFollowupV14.test.ts (new focused tests)

Verification: Node-based boss regression suites, TypeScript source checks and Git whitespace check. Full browser game compilation not run because external package dependencies and full asset tree are unavailable in the source-only context.
