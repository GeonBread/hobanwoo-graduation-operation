// @ts-nocheck
/*
 * Chapter 2 wave v24: original simulator encounter logic only.
 * The project continues to own player HP, player bullets, smart bomb, HUD,
 * purification gauge, scrolling background map, parallax, audio and assets.
 * Original source: user supplied Hobanwoo_Ch2_Waves_v24_Images_BGM.zip
 */
import { drawScrollingMapDown } from "../render/scrollingMap";
import { getCombatParallax } from "../render/combatParallax";
import { sfx } from "../AudioSystem";
import { spawnChapter1EnemyHitEffectSystem } from "../chapter1/chapter1WaveImpactSystem";
import { PowerUp } from "../entities";

export type Chapter2WaveEnemyType =
  | "ghost"
  | "pointer"
  | "submarine"
  | "anxiety"
  | "noreply"
  | "format"
  | "energy"
  | "reference"
  | "highlighter"
  | "countdown"
  | "compressor"
  | "drone";

export interface Chapter2WaveRuntime {
  enabled: boolean;
  running: boolean;
  selectedWave: number;
  nextWave: number;
  elapsed: number;
  waveCount: number;
  title: string;
  section: string;
  description: string;
  progress: number;
  allWavesCleared: boolean;
}


/**
 * Chapter 2 story wave runtime.
 *
 * Ported from chapter2_wave_simulation_v6.  The simulator's temporary player,
 * HUD and input layer are intentionally not used here.  Only Chapter 2 enemy
 * behaviour, bullets, telegraphs, effects and wave sequencing are retained.
 * The real GameEngine player, weapon, HP/bomb HUD and input systems remain in
 * charge of the player side of combat.
 */
const W = 900;
const H = 1200;
const MONSTER_SCALE = 1.28 * 1.3;
const ENEMY_BULLET_VISUAL_SCALE = 1.3;
// Keep the simulator's original enemy/effect proportions. The source simulator
// rendered a 900 x 1200 virtual field into a 720 x 960 canvas (uniform 0.8x).
// The integrated game is wider (922 x 960), so only X positions are widened to
// use the project field; sprite/effect sizes still use the original uniform scale.
const CHAPTER2_ENEMY_HP_SCALE = 0.455; // 기존 0.65에서 30% 감소
const INK = "#070911";
const DIFFICULTY = 1;
const MAX_PARTICLES = 220;
const MAX_VANISHES = 72;
const chapter2WaveBackground = typeof Image !== "undefined" ? new Image() : null;
if (chapter2WaveBackground) {
  chapter2WaveBackground.src = "/assets/chapter2/combat/backgrounds/chapter2_wave_map.png";
}

function drawChapter2WaveBackground(engine: any): void {
  const image = chapter2WaveBackground;
  const canvas = engine?.canvas as HTMLCanvasElement | undefined;
  const context = engine?.ctx as CanvasRenderingContext2D | undefined;
  if (!canvas || !context) return;
  if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    drawScrollingMapDown(context, image, canvas.width, canvas.height, time, 8);
  } else {
    context.fillStyle = "#050914";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  // 탄/적 가독성을 위해 노을 배경을 살짝 어둡게 유지합니다.
  context.fillStyle = "rgba(2, 6, 18, 0.30)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if(image?.complete&&image.naturalWidth>0)getCombatParallax(engine,"wave12").draw(context,canvas.width,canvas.height,time);
}


function createChapter2WaveRuntime() {
    return {
        enabled: false,
        running: false,
        selectedWave: 0,
        nextWave: 0,
        elapsed: 0,
        waveCount: 24,
        title: "",
        section: "",
        description: "",
        progress: 0,
        allWavesCleared: false,
    };
}
let activeEngine = null;
let ctx = null;
let enemies = [];
let bullets = [];
let effects = [];
let trails = [];
let particles = [];
let vanishes = [];
let time = 0;
let shake = 0;
let waveRunning = false;
let currentWaveIndex = 0;
let waveTime = 0;
let waveGap = 0;
let waveEventState = new Set();
let waveRunCounter = 0;
let currentWaveRunId = 0;
let waveTargetSpawned = 0;
let waveTargetMaxHp = 0;
let spawnContextWaveRunId = null;
let completionNotified = false;
let lastBombActive = false;
const player = { x: W / 2, y: H - 125, r: 25, inv: 0 };
const clearTargetTypes = new Set([
    "anxiety",
    "noreply",
    "energy",
    "countdown",
    "compressor",
    "drone",
]);
const enemyHpByType = {
    ghost: 12,
    pointer: 12,
    submarine: 14,
    anxiety: 28,
    noreply: 40,
    format: 24,
    energy: 52,
    reference: 14,
    highlighter: 26,
    countdown: 36,
    compressor: 150,
    drone: 22,
};
const monsterAuraColors = {
    ghost: "#c9f5ff",
    pointer: "#4ec9ff",
    submarine: "#54d5ff",
    anxiety: "#9c67ff",
    noreply: "#72de82",
    format: "#ff514d",
    energy: "#a76cff",
    reference: "#54d5ff",
    highlighter: "#b8ea4b",
    countdown: "#ffc83f",
    compressor: "#ffd23f",
    drone: "#ffab48",
};
const bulletEffectColors = {
    paper: "#ffd23f",
    drop: "#9c67ff",
    x: "#ff5c58",
    energy: "#a76cff",
    energyWisp: "#a76cff",
    energyBomb: "#a76cff",
    citation: "#54d5ff",
    citationAnchor: "#54d5ff",
    ink: "#b8ea4b",
    timer: "#ffc83f",
    block: "#ffd23f",
    miniShard: "#72de82",
    noReplyShard: "#72de82",
    noReplyCore: "#72de82",
    boomerangPage: "#ffab48",
    eliteWall: "#ffd23f",
};
const monsterImagePaths = {
    ghost: "/assets/chapter2/combat/waves/enemies/ghost_exam.png",
    pointer: "/assets/chapter2/combat/waves/enemies/laser_pointer.png",
    anxiety: "/assets/chapter2/combat/waves/enemies/anxiety_core.png",
    noreply: "/assets/chapter2/combat/waves/enemies/no_reply.png",
    format: "/assets/chapter2/combat/waves/enemies/format_error.png",
    energy: "/assets/chapter2/combat/waves/enemies/energy_absorber.png",
    reference: "/assets/chapter2/combat/waves/enemies/reference_bug.png",
    highlighter: "/assets/chapter2/combat/waves/enemies/highlighter.png",
    countdown: "/assets/chapter2/combat/waves/enemies/countdown_bot.png",
    compressor: "/assets/chapter2/combat/waves/enemies/page_compressor.png",
};
const bulletImagePaths = {
    paper: "/assets/chapter2/combat/waves/bullets/paper_shard.png",
    drop: "/assets/chapter2/combat/waves/bullets/anxiety_drop.png",
    x: "/assets/chapter2/combat/waves/bullets/format_x.png",
    energyOrb: "/assets/chapter2/combat/waves/bullets/energy_orb.png",
    citation: "/assets/chapter2/combat/waves/bullets/citation_bracket.png",
    ink: "/assets/chapter2/combat/waves/bullets/ink_nib.png",
    timer: "/assets/chapter2/combat/waves/bullets/timer_orb.png",
    block: "/assets/chapter2/combat/waves/bullets/paper_block.png",
};
const images = {};
const spriteCache = new WeakMap();
if (typeof Image !== "undefined") {
    for (const [key, src] of Object.entries(monsterImagePaths)) {
        if (!src)
            continue;
        const image = new Image();
        image.src = src;
        images[key] = image;
    }
    for (const [key, src] of Object.entries(bulletImagePaths)) {
        const image = new Image();
        image.src = src;
        images[key] = image;
    }
}
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rnd = (min, max) => min + Math.random() * (max - min);
const len = (x, y) => Math.hypot(x, y) || 1;
const diff = () => DIFFICULTY;
function angleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
function turnAngle(current, target, maxStep) {
    const d = angleDelta(current, target);
    return current + clamp(d, -maxStep, maxStep);
}
function virtualScaleX(engine) {
    return Math.max(0.001, engine.canvas.width / W);
}
function virtualScaleY(engine) {
    return Math.max(0.001, engine.canvas.height / H);
}
let renderWorldWidth = W;
function angleForHorizontalStretch(angle, xStretch) {
    if (!Number.isFinite(angle) || Math.abs(xStretch - 1) < 0.0001)
        return angle;
    return Math.atan2(Math.sin(angle), Math.cos(angle) * xStretch);
}
/**
 * The simulator used one uniform scale (0.8) because 900:1200 == 720:960.
 * The game field is 922:960. Scaling the whole Chapter 2 layer by sx/sy
 * independently made monsters, bullets and circular effects look horizontally
 * stretched. For rendering only, widen world X coordinates while keeping one
 * uniform size scale. Gameplay/collision coordinates are left untouched.
 */
function withOriginalAspectRenderState(engine, draw) {
    const uniformScale = virtualScaleY(engine);
    const xStretch = virtualScaleX(engine) / uniformScale;
    const restores = [];
    const setNumber = (object, key, value) => {
        if (!object || !Number.isFinite(object[key]))
            return;
        const before = object[key];
        object[key] = value;
        restores.push(() => { object[key] = before; });
    };
    const stretchX = (object, key) => {
        if (!object || !Number.isFinite(object[key]))
            return;
        setNumber(object, key, object[key] * xStretch);
    };
    const stretchAngle = (object, key) => {
        if (!object || !Number.isFinite(object[key]))
            return;
        setNumber(object, key, angleForHorizontalStretch(object[key], xStretch));
    };
    const stretchDataX = (data) => {
        if (!data)
            return;
        for (const key of ["gap", "gapCurrent", "gapTarget", "stopX"])
            stretchX(data, key);
        for (const key of ["aim", "bodyAngle"])
            stretchAngle(data, key);
    };
    for (const enemy of enemies) {
        stretchX(enemy, "x");
        stretchX(enemy, "vx");
        stretchX(enemy, "motionX");
        stretchDataX(enemy.data);
    }
    for (const bullet of bullets) {
        stretchX(bullet, "x");
        stretchX(bullet, "vx");
        stretchAngle(bullet, "a");
        stretchDataX(bullet.data);
    }
    for (const trail of trails) {
        stretchX(trail, "x");
        stretchX(trail, "x1");
        stretchX(trail, "x2");
    }
    for (const effect of effects)
        stretchX(effect, "x");
    for (const particle of particles) {
        stretchX(particle, "x");
        stretchX(particle, "vx");
    }
    for (const vanish of vanishes)
        stretchX(vanish, "x");
    const previousRenderWorldWidth = renderWorldWidth;
    renderWorldWidth = W * xStretch;
    try {
        engine.ctx.scale(uniformScale, uniformScale);
        draw();
    }
    finally {
        renderWorldWidth = previousRenderWorldWidth;
        for (let i = restores.length - 1; i >= 0; i -= 1)
            restores[i]();
    }
}
function syncPlayerFromEngine(engine) {
    const sx = virtualScaleX(engine);
    const sy = virtualScaleY(engine);
    player.x = (engine.player.x + engine.player.width / 2) / sx;
    player.y = (engine.player.y + engine.player.height / 2) / sy;
    player.r = Math.max(13, Math.min(engine.player.width / sx, engine.player.height / sy) * 0.34);
    player.inv = Math.max(0, Number(engine.player.invulnTimer) || 0);
}
function applyVirtualPlayerPullToEngine(engine, beforeX, beforeY) {
    if (Math.abs(player.x - beforeX) < 0.001 && Math.abs(player.y - beforeY) < 0.001)
        return;
    const sx = virtualScaleX(engine);
    const sy = virtualScaleY(engine);
    const cx = player.x * sx;
    const cy = player.y * sy;
    engine.player.x = clamp(cx - engine.player.width / 2, 0, Math.max(0, engine.canvas.width - engine.player.width));
    engine.player.y = clamp(cy - engine.player.height / 2, 0, Math.max(0, engine.canvas.height - engine.player.height));
}
function rgba(hex, alpha) {
    const source = hex.replace("#", "");
    const value = source.length === 3 ? source.split("").map((c) => c + c).join("") : source;
    const n = parseInt(value, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
function cachedSprite(image, w, h) {
    if (!image || !image.complete || !image.naturalWidth || typeof document === "undefined")
        return null;
    let map = spriteCache.get(image);
    if (!map) {
        map = new Map();
        spriteCache.set(image, map);
    }
    const key = `${Math.round(w)}x${Math.round(h)}`;
    const cached = map.get(key);
    if (cached)
        return cached;
    const ratio = Math.min(w / image.naturalWidth, h / image.naturalHeight);
    const dw = Math.max(1, image.naturalWidth * ratio);
    const dh = Math.max(1, image.naturalHeight * ratio);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(dw * scale));
    canvas.height = Math.max(1, Math.ceil(dh * scale));
    const cctx = canvas.getContext("2d");
    if (!cctx)
        return null;
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = "high";
    cctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const out = { canvas, w: dw, h: dh };
    map.set(key, out);
    return out;
}
function drawImageFit(image, x, y, w, h, rotation = 0, alpha = 1) {
    if (!ctx)
        return;
    const sprite = cachedSprite(image, w, h);
    if (!sprite)
        return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(sprite.canvas, -sprite.w / 2, -sprite.h / 2, sprite.w, sprite.h);
    ctx.restore();
}
function addEffect(type, x, y, options = {}) {
    effects.push({
        type,
        x,
        y,
        t: 0,
        life: options.life || 0.5,
        color: options.color || "#7fefff",
        r: options.r || 20,
        vx: options.vx || 0,
        vy: options.vy || 0,
        alpha: options.alpha ?? 1,
    });
}
function pushParticle(options) {
    if (particles.length >= MAX_PARTICLES)
        return;
    particles.push({
        x: options.x,
        y: options.y,
        vx: options.vx || 0,
        vy: options.vy || 0,
        age: 0,
        life: options.life || 0.35,
        size: options.size || 2,
        color: options.color || "#ffffff",
        shape: options.shape || "diamond",
        spin: options.spin ?? rnd(-8, 8),
        phase: Math.random() * Math.PI * 2,
    });
}
function burstParticles(x, y, color, count = 12, speed = 180) {
    const n = Math.min(count, MAX_PARTICLES - particles.length);
    for (let i = 0; i < n; i += 1) {
        const angle = rnd(0, Math.PI * 2);
        const particleSpeed = rnd(speed * 0.35, speed);
        pushParticle({
            x,
            y,
            vx: Math.cos(angle) * particleSpeed,
            vy: Math.sin(angle) * particleSpeed,
            life: rnd(0.2, 0.48),
            size: rnd(1.5, 4.2),
            color,
            shape: particleSpeed > 120 ? "streak" : "diamond",
        });
    }
}
function pushVanish(x, y, color, size, strength = 1) {
    if (vanishes.length >= MAX_VANISHES)
        return;
    vanishes.push({ x, y, color, size, age: 0, life: 0.34 * strength, strength, phase: Math.random() * Math.PI * 2 });
}
function vanishBullet(bullet, strength = 1) {
    if (!bullet || bullet.dormant)
        return;
    pushVanish(bullet.x, bullet.y, bulletEffectColors[bullet.kind] || "#a6dfff", Math.max(14, bullet.r * 1.8), strength);
}
function compactAlive(array, predicate) {
    let write = 0;
    for (let i = 0; i < array.length; i += 1) {
        if (predicate(array[i]))
            array[write++] = array[i];
    }
    array.length = write;
}
function spawnBullet(kind, x, y, angle, speed, options = {}) {
    if (kind !== 'eliteWall' && bullets.length > 220)
        return null;
    const bullet = {
        kind,
        x,
        y,
        px: x,
        py: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        a: angle,
        t: 0,
        stateT: 0,
        state: options.state || "main",
        r: options.r || 14,
        scale: options.scale || 1,
        alpha: options.alpha ?? 1,
        active: options.active ?? true,
        dormant: options.dormant || false,
        curve: options.curve || 0,
        turnAt: options.turnAt || 0,
        turned: false,
        wall: options.wall || false,
        w: options.w || 0,
        h: options.h || 0,
        cool: options.cool || 0,
        spin: options.spin || 0,
        seed: Math.random() * Math.PI * 2,
        flash: options.flash ?? ((options.dormant || options.active === false) ? 0 : 0.12),
        data: { ...(options.data || {}) },
        waveRunId: options.waveRunId ?? spawnContextWaveRunId ?? null,
        dead: false,
    };
    bullets.push(bullet);
    if (!bullet.dormant && bullet.active) {
        const color = bulletEffectColors[kind] || "#a6dfff";
        for (let i = 0; i < 2; i += 1) {
            const aa = angle + Math.PI + rnd(-0.32, 0.32);
            const ss = rnd(45, 90);
            pushParticle({ x, y, vx: Math.cos(aa) * ss, vy: Math.sin(aa) * ss, life: rnd(0.12, 0.22), size: rnd(1.2, 2.4), color, shape: "streak" });
        }
    }
    return bullet;
}
function aim(x, y) {
    return Math.atan2(player.y - y, player.x - x);
}
function monsterBox(type) {
    const box = {
        ghost: [110, 130],
        pointer: [135, 64],
        submarine: [130, 72],
        anxiety: [118, 105],
        noreply: [124, 92],
        format: [116, 106],
        energy: [112, 112],
        reference: [105, 86],
        highlighter: [208, 92],
        countdown: [118, 105],
        compressor: [188, 156],
        drone: [112, 92],
    };
    return [box[type][0] * MONSTER_SCALE, box[type][1] * MONSTER_SCALE];
}
function addEnemy(type, options = {}) {
    const [mw, mh] = monsterBox(type);
    const defaultR = Math.max(42, Math.min(mw, mh) * 0.36);
    const rawMaxHp = options.maxHp || enemyHpByType[type] || 20;
    const maxHp = Math.max(1, Math.ceil(rawMaxHp * CHAPTER2_ENEMY_HP_SCALE));
    const enemy = {
        type,
        x: options.x ?? W / 2,
        y: options.y ?? -80,
        vx: options.vx || 0,
        vy: options.vy || 0,
        motionX: 0,
        motionY: 0,
        t: 0,
        state: options.state || "enter",
        stateT: 0,
        r: options.r || defaultR,
        dead: false,
        shots: 0,
        bounces: 0,
        cool: options.cool || 0,
        seed: Math.random() * Math.PI * 2,
        exhaustTimer: rnd(0.11, 0.18),
        maxHp,
        hp: maxHp,
        hitFlash: 0,
        clearTarget: options.clearTarget ?? clearTargetTypes.has(type),
        waveRunId: options.waveRunId ?? null,
        data: { ...(options.data || {}) },
        waveTag: options.tag || null,
        bombConsumed: false,
    };
    enemies.push(enemy);
    return enemy;
}
function tagged(tag) {
    return enemies.find((enemy) => !enemy.dead && enemy.waveRunId === currentWaveRunId && enemy.waveTag === tag);
}
function taggedAll(tag) {
    return enemies.filter((enemy) => !enemy.dead && enemy.waveRunId === currentWaveRunId && enemy.waveTag === tag);
}
function spawnWaveEnemy(type, options = {}) {
    const enemy = addEnemy(type, { ...options, tag: options.tag || type, waveRunId: currentWaveRunId });
    waveTargetSpawned += 1;
    waveTargetMaxHp += enemy.maxHp;
    return enemy;
}
function spawnReferenceSquad() {
    for (let i = 0; i < 4; i += 1) {
        spawnWaveEnemy("reference", { x: W / 2 + (i - 1.5) * 95, y: -80 - i * 35, data: { index: i }, tag: `reference-${i}` });
    }
}
function spawnSubmarine(x = W / 2, options = {}) {
    const y = options.y ?? -70;
    const angle = aim(x, y);
    const speed = 304 * diff();
    return spawnWaveEnemy("submarine", {
        ...options,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        state: "main",
        r: options.r || 52,
        tag: options.tag || "submarine",
    });
}
function hardSpawn(type, options = {}) {
    const { hpMul, ...rest } = options;
    const mul = hpMul ?? (clearTargetTypes.has(type) ? 1.2 : 1.1);
    const base = rest.maxHp ?? enemyHpByType[type] ?? 20;
    return spawnWaveEnemy(type, { ...rest, maxHp: Math.ceil(base * mul) });
}
function hardSubmarine(x = W / 2, options = {}) {
    const y = options.y ?? -70;
    const angle = aim(x, y);
    const speed = 326 * diff();
    return hardSpawn("submarine", {
        ...options,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        state: "main",
        r: options.r || 52,
        tag: options.tag || "hard-submarine",
        hpMul: options.hpMul ?? 1.08,
    });
}
function hardSubmarineOffset(x = W / 2, targetOffsetX = 0, options = {}) {
    const y = options.y ?? -70;
    const targetX = clamp(player.x + targetOffsetX, 70, W - 70);
    const targetY = player.y;
    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = 326 * diff();
    return hardSpawn("submarine", {
        ...options,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        state: "main",
        r: options.r || 52,
        tag: options.tag || "hard-submarine-offset",
        hpMul: options.hpMul ?? 1.08,
    });
}
function spawnHardReferenceSquad(prefix = "hard-reference") {
    for (let i = 0; i < 4; i += 1) {
        hardSpawn("reference", { x: W / 2 + (i - 1.5) * 95, y: -80 - i * 35, data: { index: i }, tag: `${prefix}-${i}`, hpMul: 1.08 });
    }
}
function waveEvent(key, label, condition, action) {
    return { key, label, condition, action };
}
const S = (type, count, xs, hp) => ({ type, count, xs, hp });
const scenarioSpecs = [
    { title: '유령 출석부가 몰려온다', desc: '좌우 및 원호 형태로 등장하는 출석 유령이 기본 탄막을 펼칩니다.', initial: [S('ghost', 3, [180, 450, 720])], adds: [{ kills: 3, groups: [S('ghost', 4, [140, 320, 580, 760])], label: '추가 출석부' }] },
    { title: '복도 모서리 매복', desc: '형식 몬스터가 벽을 튕기며 X 탄막을 흩뿌리고, 불안 몬스터가 중앙으로 압박합니다.', initial: [S('format', 2, [210, 690])], adds: [{ kills: 2, groups: [S('anxiety', 2, [270, 630])], label: '모서리 압박' }] },
    { title: '발표 레이저 포인터 10기', desc: '알림창 없이 원본 빨간 조준 레이저만 사용합니다. 위·아래에서 2기씩 교대로 등장하고 화면 밖까지 완전히 돌진하면 그대로 사라집니다.', mode: 'slides', initial: [S('pointer', 10, [170, 730, 230, 670, 140, 760, 300, 600, 210, 690])] },
    { title: '참고문헌 개별 습격', desc: '기존 엑셀 격자를 완전히 제거했습니다. 참고문헌 몬스터와 뒤이어 나타나는 포인터의 공격을 피하세요.', mode: 'excel', initial: [S('reference', 3, [180, 450, 720])], adds: [{ kills: 3, groups: [S('pointer', 2, [260, 640])], label: '후방 포인터' }] },
    { title: '형광펜 도형 돌진', desc: '형광펜 몬스터 3마리가 동시에 등장해 전부 도형을 그린 뒤 돌진합니다.', mode: 'shapeRush', initial: [S('highlighter', 3, [180, 450, 720])] },
    { title: '형광펜 자유 낙서', desc: '형광펜들이 화면 곳곳을 크게 돌아다니며 낙서하고, 낙서가 끝난 뒤 다시 이동해 다른 구역에 재시도합니다.', mode: 'graffiti', initial: [S('highlighter', 6, [120, 450, 780, 780, 450, 120])], adds: [{ kills: 2, groups: [S('highlighter', 2, [220, 680])], label: '추가 낙서 형광펜' }] },
    { title: '형광펜 혼합 러시', desc: '도형 발사 형광펜 10기가 화면 사방에서 순차적으로 진입합니다. 5기쯤 등장한 뒤 낙서 형광펜 3기와 줄 긋는 형광펜 1기가 합류합니다.', mode: 'hybridHighlighter', initial: [S('highlighter', 14, [140, 300, 600, 780, 805, 810, 775, 580, 320, 120, 150, 450, 760, 450])] },
    { title: '네트워크 잠수정 전개', desc: '팀플 잠수함 4기와 무응답 코어 1기가 처치 조건 없이 동시에 출현합니다. 몬스터 전원은 화면 밖에서 직접 진입합니다.', initial: [S('submarine', 4, [170, 360, 540, 730]), S('noreply', 1, [450])] },
    { title: '번개 포인트가 흔들린다', desc: '에너지 볼 세 기가 교대로 정지해 번개를 떨구고, 추가 소환 때는 큰 폭탄이 뒤따릅니다.', initial: [S('energy', 3, [210, 450, 690])], adds: [{ kills: 3, groups: [S('energy', 2, [310, 590])], label: '후속 에너지 볼' }] },
    { title: '팀플 잠수함 30기 연속 조준 돌진', desc: '잠수함 3기씩 총 30기가 끊김 없이 등장합니다. 출현하는 순간 플레이어를 조준해 대각선으로 돌진하고, 맵 바깥으로 나가면 소멸합니다.', mode: 'submarineThirty', initial: [S('submarine', 3, [170, 450, 730])] },
    { title: '갈라가 드론 편대', desc: '드론 10기가 화면 밖으로 빠졌다가 다시 들어오며, 기존보다 2배 느린 주기로 파편과 부메랑 문서를 던집니다.', mode: 'galaga', initial: [S('drone', 10, [105, 175, 245, 315, 385, 515, 585, 655, 725, 795])] },
    { title: '제출 실패 폭발', desc: '카운트다운 몬스터를 늦게 처리하면 제출 실패 알림창이 심하게 흔들린 뒤 폭발하며 잔해 탄알을 흩뿌립니다.', mode: 'submit', initial: [S('countdown', 4, [170, 360, 540, 730])] },
    { title: '유령 10기 포위 추격', desc: '유령 10기가 화면 밖에서 직접 진입해 포위·추격하고, 플레이어 뒤쪽까지 실제로 이동한 후 몸통박치기합니다.', mode: 'hunt', initial: [S('ghost', 10, [105,275,450,630,795,105,275,450,630,795])] },
    { title: '반사 X탄 격전', desc: 'X탄 몬스터 6마리가 3마리씩 좌우 모서리에서 한 줄 대형으로 진입해, 두 그룹이 서로 대칭을 이루며 움직이며 공격합니다.', mode: 'formatMirror', initial: [S('format', 6, [170, 170, 170, 730, 730, 730])] },
    { title: '무응답 역 V 편대', desc: '무응답 몬스터 7기가 역 V자 대열을 이루고 진입합니다. 각 몬스터는 한 번에 무응답 폭탄 1개만 발사합니다.', mode: 'noreplyInvV', initial: [S('noreply', 7, [250, 320, 390, 450, 510, 580, 650])] },
    { title: '별 진형 레이저 20기', desc: '레이저 포인터 20기가 화면 상단 바깥에서 진입합니다. 돌진 후에도 화면 밖을 경유해 반드시 상단에서 다시 진입합니다. 8기 처치 시 세로 압축기 1기가 추가됩니다.', mode: 'starChain', initial: [S('pointer', 20, Array.from({length:20}, (_,i)=>450))], adds: [{ kills: 8, groups: [S('compressor', 1, [450])], label: '세로 압축기 등장' }] },
    { title: '발표 리허설 · 압축기 협공', desc: '화면을 가리는 발표 알림창을 제거했습니다. 문서 압축기 1기, 레이저 포인터 2기, 참고문헌 몬스터 2기가 기존 고유 공격을 계속합니다.', mode: 'slides2', initial: [S('compressor', 1, [450]), S('pointer', 2, [170, 730]), S('reference', 2, [300, 600])] },
    { title: '불안 몬스터 V자 협공', desc: '불안 몬스터 8기가 더 선명한 V자 대형을 유지한 채 2발씩 조준 탄막을 발사합니다. 탄 발사 주기는 기존보다 1.4배 느리고, 알림창은 계속 누적되며 최대 10개까지 화면에 남아 공격합니다.', mode: 'questionsV', initial: [S('anxiety', 8, [135, 220, 305, 390, 510, 595, 680, 765])] },
    { title: '드론 삼각 편대', desc: '1단계는 드론 8기의 삼각 편대입니다. 이후 왼쪽에서 사격 편대 8기가 대형 전체로 좌우 왕복하고, 마지막에는 좌우에서 5기씩 두 그룹이 오각형 편대로 진입해 천천히 회전하며 생존 수에 맞춰 삼각형·사각형 등으로 재정렬합니다.', mode: 'triangleDrones', initial: [S('drone', 8, [140, 230, 320, 410, 500, 590, 680, 770])], adds: [{ kills: 8, groups: [S('reference', 8, [170, 240, 310, 380, 520, 590, 660, 730])], label: '좌측 왕복 사격 편대' }, { kills: 16, groups: [S('format', 10, [170, 240, 310, 380, 450, 450, 520, 590, 660, 730])], label: '좌우 회전 오각 편대' }] },
    { title: '형광펜 격자 줄긋기', desc: '세로 5기→화면 맨 아래까지 가로 7기→위·아래 교대 대각선 2기씩 6회→가로·세로 동시 2기씩 8회. 총 40기 모두 손그림처럼 삐뚤한 선을 긋고 화면 밖으로 퇴장합니다.', mode: 'lineGrid', initial: [S('highlighter', 5, [130, 290, 450, 610, 770])] },
    { title: '최종 보고서 폭주', desc: '대형 드론과 에너지 볼이 동시에 밀어붙이는 후반 압박 웨이브입니다.', initial: [S('drone', 3, [210, 450, 690]), S('energy', 2, [300, 600])], adds: [{ kills: 3, groups: [S('compressor', 2, [260, 640]), S('ghost', 2, [340, 560])], label: '최종 추가 전개' }] },
    { title: '동시 도형 러시', desc: '형광펜 6마리가 상단 3기·하단 3기로 동시에 등장해 각자 도형을 그리고 즉시 돌진합니다.', mode: 'shapeRushDual', initial: [S('highlighter', 6, [190, 450, 710, 190, 450, 710])] },
    { title: '양측 대칭 사격 열', desc: '드론 대신 탄환형 적 둘의 열이 세로축 대칭으로 줄지어 움직이며 교차 사격을 퍼붓습니다.', mode: 'mirrorColumns', initial: [S('reference', 10, [270, 630, 270, 630, 270, 630, 270, 630, 270, 630])] },
    { title: '화면 세로 분할 · 잠수함 40기 · 압축기', desc: '형광펜 3기가 세로 전체에 줄을 긋습니다. 잠수함 40기가 무작위 높이·방향으로 침입하고 완전히 퇴장합니다. 마지막에는 압축기 2기가 가로·세로를 매번 무작위로 공격합니다.', mode: 'screenSplit', initial: [S('highlighter', 3, [225, 450, 675])] }
];
let scenarioKills = 0;
let scenarioObjects = [];
let scenarioWaveMode = '';
let scenarioStageLabel = '';
let scenarioStage = 1;
let scenarioLastShape = '';
let scenarioShapeElapsed = 0;
let scenarioClock = 0;
let scenarioObjectSerial = 1;
let scenarioAttackTimer = 0;
let scenarioEnemiesSpawned = 0;
let scenarioLastCoreShot = -1;
let scenarioCorePhase = 1;
let scenarioPlayerTrail = [];
let scenarioStarCursor = 0;
let scenarioStarCooldown = 0;
let scenarioPaintSerial = 0;
let scenarioKillSequence = 0;
let scenarioSplitSeenCount = 0;
let scenarioSplitSpawned = 0;
let scenarioSplitSpawnTimer = 0;
let scenarioSplitCompressorsSpawned = false;
let scenarioSplitAxisRounds = new Map();
let scenarioLineGridOrders = {};
let scenarioSubSpawned = 0;
let scenarioSubSpawnTimer = 0;
const scenarioHuntHomes = [
    [105,165],[335,125],[630,125],[795,225],[805,515],
    [785,865],[595,985],[330,985],[105,845],[93,485]
];
function scenarioStarPoint(i) {
    // 20 points across a five-pronged contour, instead of 20 tiny numbered sprites.
    const a=-Math.PI/2+i*Math.PI/10;
    const rx=[330,240,165,240][i%4];
    const ry=[320,235,170,235][i%4];
    return {x:450+Math.cos(a)*rx,y:455+Math.sin(a)*ry};
}
function scenarioStarVertex(i) { return scenarioStarPoint(i*2); }

function scenarioSpec() { return scenarioSpecs[currentWaveIndex] || scenarioSpecs[0]; }
function scenarioSpawnGroups(groups, prefix) {
    for (const group of groups) {
        for (let i = 0; i < group.count; i++) {
            const x = group.xs?.[i] ?? (group.count === 1 ? 450 : 100 + (700 * i / (group.count - 1)));
            const tag = `${prefix}-${group.type}-${i}`;
            const extra = { x, y: group.y ?? -245, tag, data: group.type === 'reference' ? { index: (scenarioEnemiesSpawned % 4) } : {} };
            if (group.hp)
                extra.maxHp = group.hp;
            const e = group.type === 'submarine' ? spawnSubmarine(x, extra) : spawnWaveEnemy(group.type, extra);
            e.scenarioOrder = scenarioEnemiesSpawned++;
            if (scenarioWaveMode === 'submarineThirty' && e.type === 'submarine') {
                const serial = scenarioSubSpawned++;
                const side = (Math.floor(serial / 3) % 2 === 0) ? -1 : 1;
                const row = serial % 3;
                e.data.subThirty = true;
                e.data.subThirtySerial = serial;
                e.data.subThirtyY = 245 + row * 245 + (Math.floor(serial/3)%3)*17;
                e.x = side < 0 ? -245 : W + 245;
                e.y = e.data.subThirtyY;
                const aimX = player.x, aimY = player.y;
                const launchAngle = Math.atan2(aimY-e.y, aimX-e.x);
                const launchSpeed = 580 * diff();
                e.data.subThirtyTargetX = aimX;
                e.data.subThirtyTargetY = aimY;
                e.data.subThirtyAim = launchAngle;
                e.vx = Math.cos(launchAngle) * launchSpeed;
                e.vy = Math.sin(launchAngle) * launchSpeed;
                e.data.bodyAngle = launchAngle;
                e.state = 'subThirtyFlight'; e.stateT = 0;
            }
            if (scenarioWaveMode === 'screenSplit' && e.type === 'compressor') {
                e.data.splitFinalCompressor = true;
                e.data.splitFinalSerial = i;
                e.data.clampAxis = i===0?'horizontal':'vertical';
                e.data.nextAxisRandom = true;
            }
            if (scenarioWaveMode === 'slides' && e.type === 'pointer') {
                const anchors = [
                    { x: 180, y: 170 }, { x: 720, y: 170 },
                    { x: 250, y: 805 }, { x: 650, y: 805 },
                    { x: 130, y: 155 }, { x: 770, y: 155 },
                    { x: 315, y: 820 }, { x: 585, y: 820 },
                    { x: 220, y: 180 }, { x: 680, y: 180 }
                ];
                const slot = i % anchors.length;
                const pair = Math.floor(slot / 2);
                const fromTop = pair % 2 === 0;
                const a = anchors[slot];
                e.data.presentationSlot = slot;
                e.data.presentationDelay = pair * 1.05 + (slot % 2) * .08;
                e.data.presentationAnchorX = a.x;
                e.data.presentationAnchorY = a.y;
                e.data.presentationSide = fromTop ? 'top' : 'bottom';
                e.data.presentationWarned = false;
                e.data.bodyAngle = fromTop ? Math.PI / 2 : -Math.PI / 2;
                e.x = a.x;
                e.y = fromTop ? -170 : H + 170;
                e.state = 'presentationWait';
                e.stateT = 0;
                e.cool = 0;
            }
                        if (scenarioWaveMode === 'galaga' && e.type === 'drone') {
                e.state = 'galagaFlight'; e.stateT = 0;
                e.data.galagaSlot = i;
                e.data.galagaAge = -i * .28; e.data.boomerangBursts = 0;
                e.x = -180; e.y = -180; e.cool = .75 + i * .12;
            }
            if (scenarioWaveMode === 'graffiti' && e.type === 'highlighter') {
                // Spread the 8 highlighters around the whole field instead of clustering them in the center.
                // They enter from the nearest outer edge and each one patrols a broad sector of the map.
                const sectors = [
                    { x: 120, y: 210, sx: -230, sy: 170, minX: 80, maxX: 300, minY: 150, maxY: 360 },
                    { x: 450, y: 165, sx: 450, sy: -190, minX: 270, maxX: 630, minY: 135, maxY: 300 },
                    { x: 780, y: 210, sx: W + 230, sy: 170, minX: 600, maxX: 820, minY: 150, maxY: 360 },
                    { x: 785, y: 505, sx: W + 230, sy: 505, minX: 610, maxX: 825, minY: 325, maxY: 690 },
                    { x: 760, y: 860, sx: W + 230, sy: H + 170, minX: 570, maxX: 820, minY: 690, maxY: 945 },
                    { x: 450, y: 905, sx: 450, sy: H + 170, minX: 250, maxX: 650, minY: 735, maxY: 965 },
                    { x: 140, y: 860, sx: -230, sy: H + 170, minX: 80, maxX: 320, minY: 690, maxY: 945 },
                    { x: 115, y: 515, sx: -230, sy: 515, minX: 75, maxX: 295, minY: 330, maxY: 700 }
                ];
                const sector = sectors[i % sectors.length];
                e.state = 'graffitiEnter'; e.stateT = 0;
                e.data.graffitiSlot = i;
                e.data.graffitiDelay = i * .22;
                e.data.entryX = sector.x;
                e.data.entryY = sector.y;
                e.data.zoneMinX = sector.minX;
                e.data.zoneMaxX = sector.maxX;
                e.data.zoneMinY = sector.minY;
                e.data.zoneMaxY = sector.maxY;
                e.x = sector.sx;
                e.y = sector.sy;
                e.data.wayX = e.data.entryX;
                e.data.wayY = e.data.entryY;
                e.data.paintWait = 0.62 + i * .10;
                e.data.paintRef = null;
            }
            if (scenarioWaveMode === 'shapeRushDual' && e.type === 'highlighter') {
                const sectors = [
                    { x: 185, y: 210, sx: 185, sy: -250, cx: 225, cy: 300, minX: 90, maxX: 320, minY: 170, maxY: 400 },
                    { x: 450, y: 175, sx: 450, sy: -250, cx: 450, cy: 255, minX: 300, maxX: 600, minY: 150, maxY: 380 },
                    { x: 715, y: 210, sx: 715, sy: -250, cx: 675, cy: 300, minX: 580, maxX: 810, minY: 170, maxY: 400 },
                    { x: 185, y: 820, sx: 185, sy: H + 230, cx: 225, cy: 690, minX: 90, maxX: 320, minY: 560, maxY: 860 },
                    { x: 450, y: 855, sx: 450, sy: H + 230, cx: 450, cy: 745, minX: 300, maxX: 600, minY: 610, maxY: 900 },
                    { x: 715, y: 820, sx: 715, sy: H + 230, cx: 675, cy: 690, minX: 580, maxX: 810, minY: 560, maxY: 860 }
                ];
                const sector = sectors[i % sectors.length];
                e.state = 'shapeRushEnter'; e.stateT = 0;
                e.data.shapeRushSlot = i;
                e.data.shapeRushDelay = 0;
                e.data.entryX = sector.x;
                e.data.entryY = sector.y;
                e.data.zoneMinX = sector.minX;
                e.data.zoneMaxX = sector.maxX;
                e.data.zoneMinY = sector.minY;
                e.data.zoneMaxY = sector.maxY;
                e.data.shapeCenterX = sector.cx;
                e.data.shapeCenterY = sector.cy;
                e.x = sector.sx;
                e.y = sector.sy;
                e.data.wayX = sector.x;
                e.data.wayY = sector.y;
                e.data.paintWait = 0.34 + (i % 3) * .06;
                e.data.paintRef = null;
            }
                        if (scenarioWaveMode === 'shapeRush' && e.type === 'highlighter') {
                const sectors = [
                    { x: 210, y: 255, sx: -240, sy: 240, cx: 260, cy: 330, minX: 120, maxX: 380, minY: 220, maxY: 460 },
                    { x: 690, y: 255, sx: W + 240, sy: 240, cx: 640, cy: 330, minX: 520, maxX: 780, minY: 220, maxY: 460 },
                    { x: 450, y: 170, sx: 450, sy: -230, cx: 450, cy: 275, minX: 280, maxX: 620, minY: 170, maxY: 390 }
                ];
                const sector = sectors[i % sectors.length];
                e.state = 'shapeRushEnter'; e.stateT = 0;
                e.data.shapeRushSlot = i;
                e.data.shapeRushDelay = 0;
                e.data.entryX = sector.x;
                e.data.entryY = sector.y;
                e.data.zoneMinX = sector.minX;
                e.data.zoneMaxX = sector.maxX;
                e.data.zoneMinY = sector.minY;
                e.data.zoneMaxY = sector.maxY;
                e.data.shapeCenterX = sector.cx;
                e.data.shapeCenterY = sector.cy;
                e.x = sector.sx;
                e.y = sector.sy;
                e.data.wayX = sector.x;
                e.data.wayY = sector.y;
                e.data.paintWait = 0.65 + i * .08;
                e.data.paintRef = null;
            }
            if (scenarioWaveMode === 'hybridHighlighter' && e.type === 'highlighter') {
                const shapeSectors = [
                    { x: 140, y: 215, sx: -250, sy: 200, cx: 190, cy: 300, minX: 75, maxX: 300, minY: 170, maxY: 430 },
                    { x: 300, y: 160, sx: 300, sy: -220, cx: 315, cy: 270, minX: 170, maxX: 460, minY: 145, maxY: 395 },
                    { x: 600, y: 160, sx: 600, sy: -220, cx: 585, cy: 270, minX: 440, maxX: 730, minY: 145, maxY: 395 },
                    { x: 780, y: 215, sx: W + 250, sy: 200, cx: 720, cy: 300, minX: 610, maxX: 825, minY: 170, maxY: 430 },
                    { x: 805, y: 380, sx: W + 250, sy: 380, cx: 720, cy: 430, minX: 620, maxX: 825, minY: 300, maxY: 565 },
                    { x: 810, y: 580, sx: W + 250, sy: 580, cx: 720, cy: 585, minX: 620, maxX: 825, minY: 455, maxY: 720 },
                    { x: 775, y: 820, sx: W + 250, sy: H + 180, cx: 700, cy: 740, minX: 580, maxX: 820, minY: 660, maxY: 930 },
                    { x: 580, y: 910, sx: 580, sy: H + 180, cx: 560, cy: 780, minX: 420, maxX: 700, minY: 700, maxY: 930 },
                    { x: 320, y: 915, sx: 320, sy: H + 180, cx: 340, cy: 785, minX: 185, maxX: 490, minY: 705, maxY: 935 },
                    { x: 120, y: 815, sx: -250, sy: H + 180, cx: 205, cy: 735, minX: 80, maxX: 320, minY: 650, maxY: 910 }
                ];
                const graffitiSectors = [
                    { x: 150, y: 485, sx: -250, sy: 485, minX: 70, maxX: 320, minY: 320, maxY: 700 },
                    { x: 450, y: 205, sx: 450, sy: -220, minX: 265, maxX: 635, minY: 150, maxY: 470 },
                    { x: 760, y: 505, sx: W + 250, sy: 505, minX: 575, maxX: 825, minY: 310, maxY: 735 }
                ];
                if (i < 10) {
                    const sector = shapeSectors[i % shapeSectors.length];
                    const forcedKinds = ['triangle','diamond','chevron','loop','triangle','diamond','chevron','loop','triangle','chevron'];
                    e.state = 'shapeRushEnter'; e.stateT = 0;
                    e.data.shapeRushSlot = i;
                    e.data.shapeRushDelay = i * .48;
                    e.data.entryX = sector.x;
                    e.data.entryY = sector.y;
                    e.data.zoneMinX = sector.minX;
                    e.data.zoneMaxX = sector.maxX;
                    e.data.zoneMinY = sector.minY;
                    e.data.zoneMaxY = sector.maxY;
                    e.data.shapeCenterX = sector.cx;
                    e.data.shapeCenterY = sector.cy;
                    e.data.shapeForceKind = forcedKinds[i % forcedKinds.length];
                    e.x = sector.sx;
                    e.y = sector.sy;
                    e.data.wayX = sector.x;
                    e.data.wayY = sector.y;
                    e.data.paintWait = 0.40 + i * .08;
                    e.data.paintRef = null;
                } else if (i < 13) {
                    const idx = i - 10;
                    const sector = graffitiSectors[idx];
                    e.state = 'graffitiEnter'; e.stateT = 0;
                    e.data.graffitiSlot = idx;
                    e.data.graffitiDelay = 2.35 + idx * .38;
                    e.data.entryX = sector.x;
                    e.data.entryY = sector.y;
                    e.data.zoneMinX = sector.minX;
                    e.data.zoneMaxX = sector.maxX;
                    e.data.zoneMinY = sector.minY;
                    e.data.zoneMaxY = sector.maxY;
                    e.x = sector.sx;
                    e.y = sector.sy;
                    e.data.wayX = e.data.entryX;
                    e.data.wayY = e.data.entryY;
                    e.data.paintWait = 0.55 + idx * .12;
                    e.data.paintRef = null;
                } else {
                    e.state = 'mixLineEnter'; e.stateT = 0;
                    e.data.lineMixSlot = 0;
                    e.data.mixLineDelay = 2.95;
                    e.data.entryX = 450;
                    e.data.entryY = 230;
                    e.x = 450;
                    e.y = -240;
                    e.data.stroke = 0;
                    e.data.paintRef = null;
                }
            }
            if (scenarioWaveMode === 'mirrorColumns' && e.type === 'reference') {
                const row = Math.floor(i / 2);
                const side = i % 2 === 0 ? -1 : 1;
                const baseY = 200 + row * 125;
                e.data.mirrorColumnSlot = i;
                e.data.mirrorColumnSide = side;
                e.data.mirrorColumnRow = row;
                e.data.mirrorColumnDelay = row * .28;
                e.data.mirrorColumnBaseY = baseY;
                e.data.mirrorColumnBaseX = side < 0 ? 290 : 610;
                e.data.mirrorColumnPhase = Math.random() * Math.PI * 2;
                e.data.bodyAngle = side < 0 ? 0 : Math.PI;
                e.x = side < 0 ? -150 : W + 150;
                e.y = baseY;
                e.state = 'mirrorColumnWait';
                e.stateT = 0;
                e.cool = .8 + row * .05;
            }
            if (scenarioWaveMode === 'formatMirror' && e.type === 'format') {
                const group = i < 3 ? 0 : 1;
                const local = i % 3;
                e.data.formatMirrorGroup = group;
                e.data.formatMirrorSlot = local;
                e.data.formatMirrorCadence = 1.10 + local * .08;
                e.data.bodyAngle = group === 0 ? 0 : Math.PI;
                e.x = group === 0 ? -220 - local * 54 : W + 220 + local * 54;
                e.y = 90 + local * 98;
                e.state = 'formatMirrorEnter';
                e.stateT = 0;
                e.cool = .68 + local * .12;
                e.shots = 0;
            }
            if (scenarioWaveMode === 'questionsV' && e.type === 'anxiety') {
                e.data.questionsVSlot = i;
                e.data.questionsVCadence = (.88 + (i % 4) * .07) * 1.4;
                e.data.questionsVSpread = ((i % 2) ? .03 : -.03);
                e.data.bodyAngle = Math.PI / 2;
                e.x = 450 + (i - 3.5) * 42;
                e.y = -190 - i * 28;
                e.state = 'questionsVForm';
                e.stateT = 0;
                e.cool = .42 + i * .08;
            }
            if (scenarioWaveMode === 'noreplyInvV' && e.type === 'noreply') {
                const anchors = scenarioNoreplyInvVAnchors();
                const anchor = anchors[i % anchors.length];
                e.data.noreplyInvVSlot = i;
                e.data.noreplyInvVCadence = 1.26 + (i % 3) * .12;
                e.data.bodyAngle = Math.PI / 2;
                e.x = 450 + (i - (anchors.length - 1) / 2) * 42;
                e.y = -210 - i * 34;
                e.data.noreplyInvVAnchorX = anchor.x;
                e.data.noreplyInvVAnchorY = anchor.y;
                e.state = 'noreplyInvVForm';
                e.stateT = 0;
                e.cool = .48 + i * .07;
                e.data.fired = false;
            }
            if (scenarioWaveMode === 'lineGrid' && e.type === 'highlighter') {
                const phase = prefix === 'grid-horizontal' ? 'horizontal'
                    : prefix === 'grid-diagonal' ? 'diagonal'
                    : prefix === 'grid-final' ? 'final' : 'vertical';
                const line = scenarioLineGridEndpoints(phase, i);
                e.data.lineGridSlot = i;
                e.data.lineGridPhase = phase;
                e.data.lineGridOrientation = line.orientation;
                e.data.lineGridTargetX = line.x1;
                e.data.lineGridTargetY = line.y1;
                e.data.lineGridX1 = line.x1;
                e.data.lineGridY1 = line.y1;
                e.data.lineGridX2 = line.x2;
                e.data.lineGridY2 = line.y2;
                e.data.lineGridDelay = scenarioLineGridDelay(phase, i);
                const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
                e.x = line.x1 - Math.cos(angle) * 190;
                e.y = line.y1 - Math.sin(angle) * 190;
                e.data.bodyAngle = angle;
                e.state = 'lineGridWait';
                e.stateT = 0;
                e.data.stroke = 0;
                e.data.batchId = null;
                e.data.lineGridCompleted = false;
            }
            if (scenarioWaveMode === 'triangleDrones' && e.type === 'drone') {
                e.data.triangleDroneSlot = i;
                e.data.triangleDroneCadence = .68 + (i % 3) * .06;
                e.data.bodyAngle = Math.PI / 2;
                e.x = 450 + (i - 3.5) * 36;
                e.y = -210 - i * 34;
                e.state = 'triangleDroneForm';
                e.stateT = 0;
                e.cool = .38 + i * .07;
                e.shots = 0;
                e.data.boomerangBursts = 0;
            }
            if (scenarioWaveMode === 'triangleDrones' && e.type === 'reference') {
                e.data.triangleSweepSlot = i;
                e.data.triangleSweepCadence = .82 + (i % 4) * .05;
                e.data.bodyAngle = 0;
                e.x = -240 - (i % 4) * 58;
                e.y = 252 + Math.floor(i / 4) * 126 + (i % 2) * 16;
                e.state = 'triangleSweepEnter';
                e.stateT = 0;
                e.cool = .48 + i * .05;
                e.shots = 0;
            }
            if (scenarioWaveMode === 'triangleDrones' && e.type === 'format') {
                const group = i < 5 ? 0 : 1;
                const local = i % 5;
                e.data.trianglePolygonGroup = group;
                e.data.trianglePolygonSlot = local;
                e.data.trianglePolygonCadence = .78 + (local % 3) * .06;
                e.data.bodyAngle = group === 0 ? 0 : Math.PI;
                e.x = group === 0 ? -260 - local * 42 : W + 260 + local * 42;
                e.y = (group === 0 ? 360 : 600) + (local - 2) * 15;
                e.state = 'trianglePolygonEnter';
                e.stateT = 0;
                e.cool = .54 + local * .05;
                e.shots = 0;
            }
            if (scenarioWaveMode === 'screenSplit' && e.type === 'highlighter') {
                const xs = [225, 450, 675];
                e.data.splitPenSlot = i;
                e.data.splitPenX = xs[i % xs.length];
                e.data.splitPenTop = -34;
                e.data.splitPenBottom = H + 34;
                e.data.splitPenDelay = i * .18;
                e.data.bodyAngle = Math.PI / 2;
                e.x = e.data.splitPenX;
                e.y = -220;
                e.state = 'splitPenWait';
                e.stateT = 0;
                e.data.paintRef = null;
            }
            if (scenarioWaveMode === 'screenSplit' && e.type === 'submarine') {
                const slot = scenarioSplitSpawned++;
                const side = Math.random() < .5 ? -1 : 1;
                const lane = 55 + Math.random() * (H - 110);
                e.data.splitSubSlot = slot;
                e.data.splitSubSide = side;
                e.data.splitSubDelay = 0;
                e.data.splitSubStarted = true;
                e.data.splitSubSeen = false;
                e.data.splitSubLaneY = lane;
                e.data.bodyAngle = side < 0 ? 0 : Math.PI;
                e.x = side < 0 ? -240 : W + 240;
                e.y = lane;
                e.vx = side < 0 ? 420 + rnd(0,120) : -420 - rnd(0,120);
                e.vy = 0;
                e.state = 'splitSubMove';
                e.stateT = 0;
                e.cool = .55 + Math.random()*.55;
            }
            if (scenarioWaveMode === 'submit' && e.type === 'countdown') {
                const id = scenarioEnemiesSpawned;
                const second = scenarioStage > 1;
                if (second) {
                    const xy = [[125,300],[375,250],[645,325],[780,470],[120,640],[345,710],[595,675],[765,860]][i];
                    e.x=xy[0];e.y=-245;
                    e.data.submitDesiredY=xy[1];
                    e.state='submitArrive';e.data.n=3;
                }
                e.data.submitIndex=id;
                e.data.submitRemaining=second ? 10.8 : 9.2;
                e.data.submitMax=e.data.submitRemaining;
                e.data.submitFailed=false;
                scenarioObjects.push({id:scenarioObjectSerial++,kind:'submit',owner:e,x:e.x-67,y:e.y-120,w:134,h:56,t:0,alive:true,title:String(id),stage:scenarioStage,notice:'waiting'});
            }
            if (scenarioWaveMode === 'starChain' && e.type === 'compressor') {
                // WAVE 26 전용 세로 압축기. 레이저 8기 처치 후 출현.
                e.data.clampAxis = 'vertical';
            }
            if (scenarioWaveMode === 'hunt' && e.type === 'ghost') {
                const home=scenarioHuntHomes[i];
                e.data.huntSlot=i;
                e.data.huntHomeX=home[0];e.data.huntHomeY=home[1];
                e.data.huntDelay=i*.17;
                const edge=i%4;
                e.x=edge===0?-235:edge===1?W+235:home[0];
                e.y=edge===2?-235:edge===3?H+235:home[1];
                e.state='huntWait';e.stateT=0;
            }
            if (scenarioWaveMode === 'starChain' && e.type === 'pointer') {
                const slot=i, p=scenarioStarPoint(slot);
                e.data.starSlot=slot; e.data.starX=p.x; e.data.starY=p.y;
                // Five columns x four fully off-screen rows, ALL above the map.
                // Each enemy flies from its own entrance toward its star vertex.
                const column=slot%5, row=Math.floor(slot/5);
                e.x=105+column*(W-210)/4;
                e.y=-230-row*115;
                e.data.starEntranceX=e.x;
                e.data.starEntranceY=e.y;
                e.vx=0;e.vy=0;
                e.state='starEnter'; e.stateT=0;
                e.data.bodyAngle=Math.atan2(p.y-e.y,p.x-e.x);
            }
        }
    }
}
function makeScenarioEvents(spec) {
    if (spec.mode === 'lineGrid') {
        const phaseDone = phase => !currentWaveEnemies().some(e => e.data.lineGridPhase === phase);
        return [
            waveEvent('initial', '세로 선긋기 5기', () => true,
                () => { scenarioStage = 1; scenarioStageLabel = '세로 줄긋기 1/4 · 5기'; scenarioSpawnGroups(spec.initial, 'grid-vertical'); }),
            waveEvent('grid-horizontal', '가로 선긋기 7기',
                () => waveEventState.has('initial') && phaseDone('vertical'),
                () => { scenarioStage = 2; scenarioStageLabel = '가로 줄긋기 2/4 · 7기 · 하단까지'; scenarioSpawnGroups([S('highlighter', 7, Array(7).fill(450))], 'grid-horizontal'); }),
            waveEvent('grid-diagonal', '대각선 양방향 12기',
                () => waveEventState.has('grid-horizontal') && phaseDone('horizontal'),
                () => { scenarioStage = 3; scenarioStageLabel = '대각선 교차 3/4 · 2기씩 6회'; scenarioSpawnGroups([S('highlighter', 12, Array(12).fill(450))], 'grid-diagonal'); }),
            waveEvent('grid-final', '가로·세로 동시 16기',
                () => waveEventState.has('grid-diagonal') && phaseDone('diagonal'),
                () => { scenarioStage = 4; scenarioStageLabel = '가로·세로 동시 4/4 · 2기씩 8회'; scenarioSpawnGroups([S('highlighter', 16, Array(16).fill(450))], 'grid-final'); })
        ];
    }
    const events = [waveEvent('initial', '최초 몬스터 출현', () => true, () => scenarioSpawnGroups(spec.initial, 'initial'))];
    if (spec.mode === 'submarineThirty')
        events.push(waveEvent('submarine-30-complete','30기 전체 편대 출현',()=>scenarioSubSpawned>=30,()=>{}));
    if (spec.mode === 'screenSplit')
        events.push(waveEvent('split-40-and-compressors','40기 출현 및 압축기 후속 출현',()=>scenarioSplitSpawned>=40 && scenarioSplitCompressorsSpawned,()=>{}));
    for (let i = 0; i < (spec.adds || []).length; i++) {
        const add = spec.adds[i];
        events.push(waveEvent(`reinforce-${i}`, add.label || '지원군 등장', () => scenarioKills >= add.kills, () => {
            scenarioStage = i + 2;
            scenarioStageLabel = add.label || `추가 그룹 ${i + 1}`;
            scenarioSpawnGroups(add.groups, `stage-${i + 2}`);
            if (spec.mode === 'rehearsal')
                scenarioShapeElapsed = 0;
        }));
    }
    return events;
}
const hardWaveDefs = scenarioSpecs.map((spec, i) => ({ section: `PART ${Math.floor(i / 5) + 1}`, title: spec.title, desc: spec.desc, duration: 0, events: makeScenarioEvents(spec) }));
function resetScenario(index) {
    scenarioKills = 0;
    scenarioObjects = [];
    scenarioPlayerTrail = [];
    scenarioLineGridOrders = {};
    scenarioStarCursor = 0;
    scenarioStarCooldown = 0.55;
    scenarioPaintSerial = 0;
    scenarioKillSequence = 0;
    scenarioSplitSeenCount = 0;
    scenarioSplitSpawned = 0;
    scenarioSplitSpawnTimer = 1.10;
    scenarioSplitCompressorsSpawned = false;
    scenarioSplitAxisRounds = new Map();
    scenarioSubSpawned = 0;
    scenarioSubSpawnTimer = .72;
    scenarioClock = 0;
    scenarioAttackTimer = 0;
    scenarioStage = 1;
    scenarioStageLabel = '첫 번째 공격';
    scenarioEnemiesSpawned = 0;
    scenarioWaveMode = scenarioSpecs[index]?.mode || '';
    scenarioLastShape = '';
    scenarioShapeElapsed = 0;
    scenarioLastCoreShot = -1;
    scenarioCorePhase = 1;
    scenarioObjectSerial = 1;
    const put = (kind, x, y, w, h, extra = {}) => scenarioObjects.push({ id: scenarioObjectSerial++, kind, x, y, w, h, baseX: x, baseY: y, t: 0, alive: true, ...extra });
    switch (scenarioWaveMode) {
        case 'slides':
            // No floating announcement windows or blocking PPT cards for the pointer-only wave.
            break;
        case 'slides2':
            // WAVE 17: remove both floating announcement / slide windows entirely.
            // Enemy spawns and their original attacks remain unchanged.
            break;
        case 'excel':
            // User removed the spreadsheet grid. Keep the existing enemy combination only.
            break;
        case 'walls':
            put('paperWall', 0, 410, 160, 470, { blocking: true, side: -1 });
            put('paperWall', 740, 410, 160, 470, { blocking: true, side: 1 });
            break;
        case 'footnotes':
            for (let i = 0; i < 5; i++) {
                put('footnote', 145 + (i % 3) * 235, 370 + Math.floor(i / 3) * 175, 126, 65, { blocking: true, text: String(i + 1) });
            }
            break;
        case 'submit':
            // Each countdown robot owns its own nonblocking status badge.
            // Stage 2 adds more badges on the kill-trigger, never on a timer.
            break;
        case 'questions':
            put('question', 135, 405, 170, 100, { text: 'WHY?', hp: 3, shootAt: 1.4 });
            put('question', 595, 530, 175, 96, { text: 'REVISE', hp: 3, shootAt: 1.9 });
            break;
        case 'search':
            put('search', 520, 116, 290, 58, { text: '검색: 오류' });
            break;
        case 'midnight':
            put('deadlineSign', 280, 95, 340, 70, { text: '23 : 59' });
            break;
        case 'final':
            put('deadlineSign', 288, 105, 324, 70, { text: 'DEADLINE' });
            break;
    }
}
function recycleScenarioEnemy(e) {
    // Preserve continuity: an ordinary survivor must visibly fly back instead of being teleported to a fresh random spawn.
    if (e.dead || e.data.galagaSlot != null || e.data.huntSlot != null || e.data.graffitiSlot != null || e.data.starSlot != null) return;
    if (e.data.presentationSlot!=null || e.data.subThirty || e.data.splitSubSlot!=null) { e.dead=true; return; }
    // Ordinary ghosts, presentation pointers and submarines return from the top.
    // Special choreography waves 3/10/13/16/24 still dispose of exiting monsters.
    if (['ghost','pointer','submarine'].includes(e.type)) {
        if ([2,9,12,15,23].includes(currentWaveIndex)) {e.dead=true;return;}
        e.x=clamp(e.x,155,W-155);
        e.y=-Math.max(110,e.r*2.5);
        e.vx=0;
        e.vy=170*diff();
        e.state='enter';
        e.stateT=0;
        e.t=0;
        e.cool=Math.max(0,e.cool);
        return;
    }
    if (e.state==='smoothReenter') return;
    e.data.smoothReturnX=clamp(e.x,155,W-155);
    e.data.smoothReturnY=clamp(e.y,185,H-185);
    e.state='smoothReenter'; e.stateT=0;
}
function scenarioSmoothReturn(e,dt) {
    const x=e.data.smoothReturnX??450, y=e.data.smoothReturnY??215;
    const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy);
    const step=530*diff()*dt;
    if(d>1) { const p=Math.min(step,d)/d;e.x+=dx*p;e.y+=dy*p;e.data.bodyAngle=Math.atan2(dy,dx); }
    if(d<=Math.max(12,step)) {
        e.vx=0;e.vy=0;e.cool=0;
        if(e.type==='submarine') {
            const a=aim(e.x,e.y),sp=330*diff();e.vx=Math.cos(a)*sp;e.vy=Math.sin(a)*sp;
            e.state='main';
        } else if(e.type==='pointer') {
            e.data.aim=aim(e.x,e.y);e.state='aim';
        } else if(e.type==='format') {
            const a=aim(e.x,e.y);e.vx=Math.cos(a)*210*diff();e.vy=Math.sin(a)*210*diff();e.state='bounce';
        } else if(e.type==='ghost') {
            e.state='postMove';
        } else if(e.type==='highlighter') {
            e.data.stroke=0;e.state='enter';
        } else if(e.type==='reference') {
            e.data.anchorMade=false;e.state='build';
        } else if(e.type==='countdown') {
            e.data.n=3;e.state='count';
        } else if(e.type==='drone') {
            e.state='hover';
        } else if(e.type==='compressor') {
            e.data.phase=e.data.phase||1;e.state='charge';
        } else e.state='enter';
        e.stateT=0;
    }
}
function isScenarioRect(o) { return o.alive && o.blocking && ['slide', 'sheetLine', 'paperWall', 'footnote'].includes(o.kind); }
function scenarioPointIn(o, x, y, pad = 0) { return x >= o.x - pad && x <= o.x + o.w + pad && y >= o.y - pad && y <= o.y + o.h + pad; }
function scenarioBlocks(x, y, r = 0) { return scenarioObjects.some(o => isScenarioRect(o) && scenarioPointIn(o, x, y, r)); }
function distLine(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); }
function getScenarioSupports() { return currentWaveEnemies().filter(e => e.type === 'noreply' || e.type === 'energy'); }
function scenarioIsLinked(e) { return ['network', 'teams', 'final'].includes(scenarioWaveMode) && getScenarioSupports().length > 0 && !['noreply', 'energy', 'compressor'].includes(e.type); }
function scenarioDamageScale(e) { return scenarioIsLinked(e) ? 0.7 : 1; }
function spawnWarningLine(x1, y1, x2, y2, color, delay = 1.0, active = .3, life = 2.2) {
    scenarioObjects.push({ id: scenarioObjectSerial++, kind: 'warnLine', x: 0, y: 0, w: 0, h: 0, x1, y1, x2, y2, color, delay, active, life, t: 0, alive: true });
}
function updateScenarioEnvironment(engine, dt) {
    scenarioClock += dt;
    scenarioAttackTimer += dt;
    scenarioUpdateNewMechanics(dt);
    const spec = scenarioSpec();
    const living = currentWaveEnemies();
    if (scenarioWaveMode === 'rehearsal') {
        const sh = scenarioKills >= 6 ? 'CIRCLE' : scenarioKills >= 3 ? 'X' : 'V';
        if (sh !== scenarioLastShape) {
            scenarioLastShape = sh;
            scenarioShapeElapsed = 0;
            scenarioStageLabel = `진형 ${sh} 변환`;
        }
        scenarioShapeElapsed += dt;
    }
    if (scenarioWaveMode === 'final') {
        // Final normal wave: the anxiety core retains its original aimed-fan/evade AI.
        // HP thresholds add layered effects; they do not replace that AI.
        const core = living.find(e => e.type === 'anxiety');
        if (core) {
            const ratio = core.hp / Math.max(1, core.maxHp);
            const phase = ratio <= .30 ? 3 : ratio <= .65 ? 2 : 1;
            if (phase > scenarioCorePhase) {
                scenarioCorePhase = phase;
                scenarioStageLabel = phase === 2 ? '불안 코어 · X탄 변이' : '불안 코어 · 조준 경고';
            }
            if (core.shots > scenarioLastCoreShot) {
                scenarioLastCoreShot = core.shots;
                if (phase >= 2)
                    for (let j = 0; j < 4; j++)
                        spawnBullet('x', core.x, core.y + 25, Math.PI / 4 + j * Math.PI / 2, 240, { r: 10, scale: .27 });
                if (phase >= 3)
                    spawnWarningLine(core.x, core.y, player.x, player.y, '#ff789e', .85, .32, 1.6);
            }
        }
        if (scenarioKills >= 14)
            scenarioStageLabel = '4단계 · 불안 코어';
        else if (scenarioKills >= 10)
            scenarioStageLabel = '3단계 · 발표 오류';
        else if (scenarioKills >= 5)
            scenarioStageLabel = '2단계 · 팀플 붕괴';
        else
            scenarioStageLabel = '1단계 · 과제 마감';
    }
    if (['network', 'teams', 'final'].includes(scenarioWaveMode) && scenarioAttackTimer > 3.2 && living.length > 2) {
        scenarioAttackTimer = 0;
        const supports = getScenarioSupports();
        if (supports.length) {
            const e = supports[Math.floor(scenarioClock) % supports.length];
            spawnBullet('energy', e.x, e.y + 42, aim(e.x, e.y), 155, { r: 9, scale: .43 });
        }
    }
    if (scenarioWaveMode === 'clock' && scenarioAttackTimer > 3.1 && living.some(e => e.type === 'countdown')) {
        scenarioAttackTimer = 0;
        const a = scenarioClock * .83;
        spawnWarningLine(450, 245, 450 + Math.cos(a) * 740, 245 + Math.sin(a) * 740, '#ffae5a', 1.15, .32, 2.05);
    }
    if (scenarioWaveMode === 'correction' && scenarioAttackTimer > 2.8 && living.some(e => e.type === 'highlighter')) {
        scenarioAttackTimer = 0;
        spawnWarningLine(clamp(player.x - 95, 40, 800), clamp(player.y - 70, 400, 1050), clamp(player.x + 95, 90, 865), clamp(player.y - 40, 400, 1050), '#ff566f', .95, .65, 2.35);
    }
    if (scenarioWaveMode === 'barcode' && scenarioAttackTimer > 3.2 && living.length > 0) {
        scenarioAttackTimer = 0;
        const x = scenarioClock % 2 < 1 ? 260 : 630;
        spawnWarningLine(x, 285, x + 30, 1050, '#ff6378', 1.0, .32, 1.9);
    }
    if (scenarioWaveMode === 'domino' && scenarioAttackTimer > 3.5 && living.some(e => e.type === 'reference')) {
        scenarioAttackTimer = 0;
        for (let i = 0; i < 3; i++)
            spawnWarningLine(160 + i * 230, 330, 160 + i * 230, 750, '#7bd9ff', .65 + i * .33, .25, 2.3);
    }
    if (scenarioWaveMode === 'questions' && scenarioAttackTimer > 5 && living.length > 0) {
        scenarioAttackTimer = 0;
        const x = 160 + Math.random() * 540;
        scenarioObjects.push({ id: scenarioObjectSerial++, kind: 'question', x, y: 240, w: 178, h: 98, baseX: x, baseY: 240, text: ['WHY?', 'ERROR', 'REVISE', '?'][Math.floor(Math.random() * 4)], hp: 3, shootAt: 1.5, t: 0, alive: true });
    }
    for (const o of scenarioObjects) {
        if (!o.alive)
            continue;
        o.t += dt;
        if (scenarioUpdateNewObject(o,dt)) continue;
        if (o.kind === 'slide') {
            const slideControllerAlive = scenarioWaveMode === 'slides'
                ? living.some(e => e.type === 'pointer')
                : living.some(e => e.type === 'compressor');
            if (!slideControllerAlive) {
                o.x += ((o.baseX < 450 ? -480 : 480) * dt);
                if (o.x < -o.w - 20 || o.x > W + 20)
                    o.alive = false;
            }
            else
                o.x = o.baseX + Math.sin(scenarioClock * .7 + o.id) * o.dx;
        }
        else if (o.kind === 'paperWall') {
            const remaining = living.filter(e => e.type === 'compressor').length;
            if (remaining === 0) {
                o.x += (o.side < 0 ? -420 : 420) * dt;
                if (o.x < -200 || o.x > 920)
                    o.alive = false;
            }
            else {
                const squeeze = (Math.sin(scenarioClock * .7) + 1) * .5;
                o.x = o.side < 0 ? (-48 + squeeze * 80) : (788 - squeeze * 80);
            }
        }
        else if (o.kind === 'sheetLine') {
            // Each defeated reference bug breaks part of the spreadsheet grid.
            const controllers = living.filter(e => e.type === 'reference').length;
            if (controllers === 0 || (controllers < 3 && (o.segment % 3) >= controllers))
                o.alive = false;
        }
        else if (o.kind === 'question') {
            o.y = o.baseY + Math.sin(scenarioClock * .75 + o.id) * 16;
            if (o.t > o.shootAt) {
                o.shootAt = o.t + 1.6;
                spawnBullet('paper', o.x + o.w * .5, o.y + o.h, aim(o.x + o.w * .5, o.y + o.h), 230, { r: 10, scale: .62 });
            }
            if (living.length === 0)
                o.alive = false;
        }
        else if (o.kind === 'warnLine') {
            if (o.t >= o.life)
                o.alive = false;
        }
    }
    // Effects have stable, bounded lifetimes. Old projectiles remain during wave transition.
    compactAlive(scenarioObjects, o => o.alive);
}
function applyScenarioFormation(dt) {
    if (scenarioWaveMode !== 'rehearsal' || scenarioShapeElapsed > 1.8)
        return;
    const group = currentWaveEnemies().filter(e => e.type === 'ghost' || e.type === 'format');
    const sh = scenarioLastShape, n = Math.max(1, group.length);
    group.forEach((e, i) => {
        if (['signal', 'vanish', 'appear', 'warn'].includes(e.state))
            return;
        const a = -Math.PI / 2 + (2 * Math.PI * i / n);
        let tx = 450, ty = 265;
        if (sh === 'V') {
            tx = 170 + i * (560 / Math.max(1, n - 1));
            ty = 175 + Math.abs(tx - 450) * .52;
        }
        if (sh === 'X') {
            const s = (i % 2 ? 1 : -1), u = (Math.floor(i / 2) + .5) / Math.max(1, Math.ceil(n / 2));
            tx = 450 + s * u * 275;
            ty = 175 + u * 230;
        }
        if (sh === 'CIRCLE') {
            tx = 450 + Math.cos(a) * 260;
            ty = 300 + Math.sin(a) * 145;
        }
        const gain = 1 - Math.exp(-3 * dt);
        e.x += (tx - e.x) * gain;
        e.y += (ty - e.y) * gain;
    });
}
function scenarioHitsPlayer(engine) {
    if (engine.player?.invulnTimer > 0 || engine.player?.isDead)
        return;
    for (const o of scenarioObjects) {
        if (!o.alive) continue;
        if (o.kind==='paintMark' && o.t>=o.warn && o.t<o.life) {
            if (scenarioPolylineHit(scenarioVisiblePaintPoints(o),player.x,player.y,o.width/2 + player.r*.48)) {
                damageChapter2Player(engine);return;
            }
        } else if (o.kind==='shapeRush' && o.phase==='charge') {
            const pts = scenarioShiftPoints(o.points, o.moveX || 0, o.moveY || 0);
            if (scenarioPolylineHit(pts, player.x, player.y, o.width / 2 + player.r * .48)) {
                damageChapter2Player(engine);return;
            }
        } else if (o.kind==='verticalPaper' && o.blocking && scenarioPointIn(o,player.x,player.y,player.r*.35)) {
            damageChapter2Player(engine);return;
        } else if (o.kind==='submitBlast' && o.t<o.life && Math.hypot(player.x-o.x,player.y-o.y)<o.radius*(.45+o.t/o.life*.75)) {
            damageChapter2Player(engine);return;
        } else if (o.kind==='warnLine' && o.t>=o.delay && o.t<=o.delay+o.active) {
            if (distLine(player.x,player.y,o.x1,o.y1,o.x2,o.y2)<18+player.r*.45) {damageChapter2Player(engine);return;}
        } else if (o.kind==='timerBeam' && o.t>=o.warning && o.t<o.life) {
            if (distLine(player.x,player.y,o.x1,o.y1,o.x2,o.y2)<o.width*.42+player.r*.50) {damageChapter2Player(engine);return;}
        }
    }
}
function scenarioProcessShot(shot, sx, sy) {
    if (!shot.active || shot.isEnemy)
        return false;
    const x = (shot.x + (shot.width || 8) * .5) / sx, y = (shot.y + (shot.height || 10) * .5) / sy;
    for (const o of scenarioObjects) {
        if (o.kind === 'question' && o.alive && scenarioPointIn(o, x, y, 4)) {
            o.hp--;
            shot.active = false;
            if (o.hp <= 0) {
                o.alive = false;
                addEffect('pulse', o.x + o.w / 2, o.y + o.h / 2, { life: .5, r: 52, color: '#7fe2ff' });
            }
            return true;
        }
        if (isScenarioRect(o) && scenarioPointIn(o, x, y, 4)) {
            shot.active = false;
            return true;
        }
    }
    return false;
}
function scenarioProcessEnemyBullet(b) {
    if (!b.dead && !b.dormant && b.active && b.kind !== 'eliteWall' && scenarioBlocks(b.x, b.y, Math.min(7, b.r * .45))) {
        vanishBullet(b, .6);
        b.dead = true;
    }
}
function drawScenarioBefore() {
    if (!ctx)
        return;
    ctx.save();
    ctx.scale(virtualScaleX(activeEngine), virtualScaleY(activeEngine));
    for (const o of scenarioObjects) {
        if (!o.alive) continue;
        if (scenarioDrawNewObject(o)) continue;
        if (o.kind === 'slide') {
            const accent = o.accent || '#7fd3ff';
            ctx.fillStyle = 'rgba(246,249,255,.95)';
            ctx.strokeStyle = accent;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(o.x, o.y, o.w, o.h, 16);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(18,34,57,.96)';
            ctx.beginPath();
            ctx.roundRect(o.x + 8, o.y + 8, o.w - 16, 26, 10);
            ctx.fill();
            ctx.fillStyle = '#ff6f83'; ctx.beginPath(); ctx.arc(o.x + 24, o.y + 21, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffd36c'; ctx.beginPath(); ctx.arc(o.x + 38, o.y + 21, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#6be39a'; ctx.beginPath(); ctx.arc(o.x + 52, o.y + 21, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e8f7ff';
            ctx.textAlign = 'left';
            ctx.font = '700 12px system-ui';
            ctx.fillText(o.badge || 'ALERT', o.x + 70, o.y + 25);
            ctx.fillStyle = '#163250';
            ctx.font = '900 18px system-ui';
            ctx.fillText(o.title || 'PRESENTATION', o.x + 18, o.y + 58);
            ctx.fillStyle = '#6a839a';
            ctx.font = '700 12px system-ui';
            ctx.fillText(o.subtitle || '상황 보고', o.x + 18, o.y + 76);
            ctx.fillStyle = 'rgba(22,50,80,.08)';
            ctx.beginPath();
            ctx.roundRect(o.x + o.w - 96, o.y + 48, 74, 58, 10);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.fillRect(o.x + o.w - 88, o.y + 92, 10, 10);
            ctx.fillRect(o.x + o.w - 72, o.y + 80, 10, 22);
            ctx.fillRect(o.x + o.w - 56, o.y + 68, 10, 34);
            ctx.fillStyle = '#4b6782';
            (o.lines || []).forEach((line, j) => {
                ctx.fillText(line, o.x + 18, o.y + 100 + j * 16);
            });
        }
        else if (o.kind === 'sheetLine') {
            ctx.fillStyle = 'rgba(91,220,177,.28)';
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeStyle = '#64f0cd';
            ctx.lineWidth = 2;
            ctx.strokeRect(o.x, o.y, o.w, o.h);
        }
        else if (o.kind === 'paperWall') {
            ctx.fillStyle = 'rgba(235,227,209,.74)';
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeStyle = '#cda96e';
            ctx.lineWidth = 5;
            ctx.strokeRect(o.x, o.y, o.w, o.h);
            ctx.strokeStyle = '#8b8682';
            ctx.lineWidth = 3;
            for (let j = 0; j < 11; j++) {
                const yy = o.y + 35 + j * 37;
                ctx.beginPath();
                ctx.moveTo(o.x + 17, yy);
                ctx.lineTo(o.x + o.w - 17, yy);
                ctx.stroke();
            }
        }
        else if (o.kind === 'footnote') {
            ctx.fillStyle = 'rgba(239,244,254,.85)';
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeStyle = '#8bb6e9';
            ctx.lineWidth = 3;
            ctx.strokeRect(o.x, o.y, o.w, o.h);
            ctx.fillStyle = '#2c5888';
            ctx.textAlign = 'left';
            ctx.font = 'bold 21px monospace';
            ctx.fillText('[' + o.text + ']', o.x + 15, o.y + 37);
            ctx.fillStyle = '#7d97b0';
            ctx.fillRect(o.x + 54, o.y + 25, o.w - 65, 7);
        }
        else if (o.kind === 'question') {
            ctx.fillStyle = 'rgba(11,39,73,.92)';
            ctx.strokeStyle = '#68d5f9';
            ctx.lineWidth = 5;
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeRect(o.x, o.y, o.w, o.h);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 29px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(o.text, o.x + o.w / 2, o.y + o.h / 2 + 9);
            ctx.fillStyle = '#73e5f6';
            ctx.fillRect(o.x + 7, o.y + o.h - 11, (o.w - 14) * Math.max(0, o.hp / 3), 4);
        }
        else if (o.kind === 'search') {
            ctx.fillStyle = 'rgba(17,37,68,.92)';
            ctx.strokeStyle = '#8abaff';
            ctx.lineWidth = 2;
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeRect(o.x, o.y, o.w, o.h);
            ctx.font = 'bold 19px system-ui';
            ctx.fillStyle = '#cce9ff';
            ctx.textAlign = 'left';
            ctx.fillText('⌕  ' + o.text, o.x + 21, o.y + 37);
        }
        else if (o.kind === 'deadlineSign') {
            ctx.fillStyle = 'rgba(68,15,32,.9)';
            ctx.strokeStyle = '#ff6e8a';
            ctx.lineWidth = 3;
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeRect(o.x, o.y, o.w, o.h);
            ctx.fillStyle = '#ffd7df';
            ctx.textAlign = 'center';
            ctx.font = 'bold 30px ui-monospace,monospace';
            ctx.fillText(o.text, o.x + o.w / 2, o.y + 43);
        }
        else if (o.kind === 'warnLine') {
            const warn = o.t < o.delay;
            ctx.save();
            ctx.strokeStyle = o.color;
            ctx.lineWidth = warn ? 5 : 20;
            ctx.globalAlpha = warn ? .35 + .3 * Math.abs(Math.sin(o.t * 11)) : .85;
            ctx.setLineDash(warn ? [18, 15] : []);
            ctx.beginPath();
            ctx.moveTo(o.x1, o.y1);
            ctx.lineTo(o.x2, o.y2);
            ctx.stroke();
            ctx.restore();
        }
    }
    if (['network', 'teams', 'final'].includes(scenarioWaveMode)) {
        const living = currentWaveEnemies(), supports = getScenarioSupports();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#b68cfa';
        ctx.setLineDash([12, 8]);
        ctx.globalAlpha = .58;
        for (const e of living)
            if (scenarioIsLinked(e)) {
                let closest = null, best = Infinity;
                for (const p of supports) {
                    const d = Math.hypot(e.x - p.x, e.y - p.y);
                    if (d < best) {
                        best = d;
                        closest = p;
                    }
                }
                if (closest) {
                    ctx.beginPath();
                    ctx.moveTo(e.x, e.y);
                    ctx.lineTo(closest.x, closest.y);
                    ctx.stroke();
                }
            }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }
    if (scenarioWaveMode==='starChain') drawScenarioStarGuide();
    if (scenarioWaveMode === 'rehearsal') {
        ctx.save();
        ctx.globalAlpha = .35;
        ctx.strokeStyle = '#b8e4ff';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 12]);
        ctx.beginPath();
        const sh = scenarioLastShape;
        if (sh === 'V') {
            ctx.moveTo(135, 165);
            ctx.lineTo(450, 470);
            ctx.lineTo(765, 165);
        }
        else if (sh === 'X') {
            ctx.moveTo(190, 160);
            ctx.lineTo(710, 465);
            ctx.moveTo(710, 160);
            ctx.lineTo(190, 465);
        }
        else {
            ctx.ellipse(450, 300, 260, 145, 0, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.restore();
    }
    if (['copy', 'search'].includes(scenarioWaveMode)) {
        const living = currentWaveEnemies().filter(e => e.type === 'ghost').slice(0, 2);
        ctx.strokeStyle = '#c6e8ff';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 7]);
        for (const e of living) {
            ctx.strokeRect(e.x - 65, e.y - 68, 130, 135);
            ctx.globalAlpha = .16;
            ctx.strokeRect(clamp(e.x + 100, 50, 800) - 65, e.y - 68, 130, 135);
            ctx.globalAlpha = 1;
        }
        ctx.setLineDash([]);
    }
    ctx.restore();
}
function drawScenarioAfter() {
    if (!ctx || scenarioWaveMode !== 'final')
        return;
    ctx.save();
    ctx.scale(virtualScaleX(activeEngine), virtualScaleY(activeEngine));
    ctx.fillStyle = 'rgba(4,15,32,.82)';
    ctx.fillRect(253, 75, 394, 48);
    ctx.strokeStyle = '#ebb977';
    ctx.strokeRect(253, 75, 394, 48);
    ctx.font = 'bold 21px system-ui';
    ctx.fillStyle = '#ffe0aa';
    ctx.textAlign = 'center';
    ctx.fillText(scenarioStageLabel, 450, 107);
    ctx.restore();
}
/*
 * Chapter 2 wave-special behavior extensions (simulation-only).
 * All changes are scoped by scenarioWaveMode and preserve the original AI
 * for normal occurrences of these Chapter 2 enemy types.
 */
function scenarioPolylineHit(points,x,y,r) {
    for(let i=1;i<points.length;i++)
        if(distLine(x,y,points[i-1].x,points[i-1].y,points[i].x,points[i].y)<r) return true;
    return false;
}
function scenarioCatmull(points,t) {
    const i=Math.floor(t),u=t-i,n=points.length;
    const a=points[(i-1+n)%n],b=points[i%n],c=points[(i+1)%n],d=points[(i+2)%n];
    const calc=(k)=>.5*((2*b[k])+(-a[k]+c[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*u*u+(-a[k]+3*b[k]-3*c[k]+d[k])*u*u*u);
    return {x:calc(0),y:calc(1)};
}
function scenarioFarClampX(px) {
    const side = px < W * .5 ? 1 : -1;
    const target = W * .5 + side * (W * .24);
    return clamp(target + rnd(-42, 42), 190, W - 190);
}
function scenarioFarClampY(py) {
    const side = py < H * .55 ? 1 : -1;
    const target = H * .54 + side * (H * .17);
    return clamp(target + rnd(-36, 36), 430, H - 270);
}
function scenarioMirrorFormat(e, dt) {
    const q = diff();
    const group = e.data.formatMirrorGroup ?? 0;
    const living = currentWaveEnemies().filter(o => !o.dead && o.data.formatMirrorGroup === group)
        .sort((a, b) => (a.scenarioOrder ?? 0) - (b.scenarioOrder ?? 0));
    const index = living.indexOf(e);
    if (index < 0) return;
    const n = living.length;
    const enter = clamp((e.stateT || 0) / 1.05, 0, 1);
    const waveX = Math.sin(scenarioClock * 1.05) * 112;
    const waveY = Math.sin(scenarioClock * 1.72) * 36;
    const baseX = group === 0 ? 128 : W - 128;
    const centerX = group === 0 ? scenarioFormationLerp(-205, baseX + waveX, enter) : scenarioFormationLerp(W + 205, baseX - waveX, enter);
    const centerY = 214 + waveY;
    const offset = (index - (n - 1) / 2) * 96;
    const slant = (index - (n - 1) / 2) * (group === 0 ? 16 : -16);
    const target = { x: centerX + slant, y: centerY + offset };
    const dx = target.x - e.x, dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.min(dist, 420 * q * dt);
    if (dist > .001) {
        e.x += dx / dist * step;
        e.y += dy / dist * step;
    }
    const look = aim(e.x, e.y);
    e.data.bodyAngle = turnAngle(e.data.bodyAngle || look, look, dt * 4.2);
    e.cool -= dt;
    if (e.cool <= 0) {
        e.cool += e.data.formatMirrorCadence || 1.16;
        const a = e.data.bodyAngle;
        spawnBullet('x', e.x, e.y + 8, a - .12, 258 * q, { r: 14, scale: .60, data: { source: 'formatMirror', maxLife: 19 } });
        spawnBullet('x', e.x, e.y + 8, a + .12, 258 * q, { r: 14, scale: .60, data: { source: 'formatMirror', maxLife: 19 } });
        if ((e.shots || 0) % 2 === 1) {
            spawnBullet('paper', e.x, e.y + 10, a - .28, 225 * q, { r: 10, scale: .54, data: { source: 'formatMirror', maxLife: 18 } });
            spawnBullet('paper', e.x, e.y + 10, a + .28, 225 * q, { r: 10, scale: .54, data: { source: 'formatMirror', maxLife: 18 } });
        }
        e.shots = (e.shots || 0) + 1;
    }
}

function scenarioGalagaDrone(e,dt) {
    // Galaga path deliberately leaves the stage and returns. Leaving is never a kill.
    const pts=[[-180,-170],[110,95],[515,190],[785,300],[505,515],[190,395],
      [280,125],[890,80],[1070,-195],[610,-250],[110,-245],[-250,-230]];
    e.data.galagaAge+=dt;
    if(e.data.galagaAge<0) {e.x=-200;e.y=-200;return;}
    const timeInLoop=e.data.galagaAge%15.0;
    const p=scenarioCatmull(pts,timeInLoop/15*pts.length);
    e.x=p.x;e.y=p.y;
    if (currentWaveIndex===10) {
        const fullyOutside=e.x < -e.r || e.x > W+e.r || e.y < -e.r || e.y > H+e.r;
        if (e.data.galagaHasEntered && fullyOutside) {
            // Start immediately on the incoming top edge; avoid long off-screen orbit.
            e.data.galagaAge=1.1;
            const entry=scenarioCatmull(pts,1.1/15*pts.length);
            e.x=clamp(entry.x,150,W-150);e.y=Math.max(-e.r+4,Math.min(95,entry.y));
            e.data.galagaHasEntered=false;
        } else if (!fullyOutside) {
            e.data.galagaHasEntered=true;
        }
    }
    e.state='galagaFlight';
    e.cool-=dt;
    if(e.cool<=0 && e.x>75 && e.x<W-75 && e.y>80 && e.y<H*.76) {
        const a=aim(e.x,e.y);
        spawnBullet('miniShard',e.x,e.y+22,a,250,{r:10,scale:.67,data:{source:'reportDrone',maxLife:12}});
        e.shots++;
        if(e.shots%3===0) {
            spawnBullet('boomerangPage',e.x-13,e.y+14,a-.42,210,{r:11,scale:.70,data:{curve:-1,source:'reportDrone',maxLife:12}});
            spawnBullet('boomerangPage',e.x+13,e.y+14,a+.42,210,{r:11,scale:.70,data:{curve:1,source:'reportDrone',maxLife:12}});
        }
        e.cool=(.85+(e.data.galagaSlot%3)*.14)*2;
    }
}

function scenarioThirtySubmarine(e,dt) {
    // Aim is captured at the actual off-screen launch. The submarine never
    // teleports or changes its destination mid-flight; it travels along that ray.
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.data.bodyAngle = e.data.subThirtyAim;
    e.cool = (e.cool||0) - dt;
    if(e.cool <= 0 && e.x > 70 && e.x < W-70 && e.y > 65 && e.y < H-65) {
        spawnBullet('miniShard',e.x,e.y,e.data.subThirtyAim,290,{r:9,scale:.6});
        e.cool = .65;
    }
    // A diagonal submarine may exit through any of the four edges.
    if(e.x < -245 || e.x > W+245 || e.y < -245 || e.y > H+245) e.dead=true;
}
function scenarioPresentationPointer(e,dt) {
    const q=diff();
    const moveTo=(x,y,speed)=>{
        const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy);
        if(d>1){const k=Math.min(d,dt*speed);e.x+=dx/d*k;e.y+=dy/d*k;e.data.bodyAngle=Math.atan2(dy,dx);}
        return d<Math.max(5,dt*speed*1.12);
    };
    if(e.state==='presentationWait') {
        e.data.presentationDelay=Math.max(0,(e.data.presentationDelay||0)-dt);
        if(e.data.presentationDelay>0)return;
        setState(e,'presentationEnter');
    }
    if(e.state==='presentationEnter') {
        if(moveTo(e.data.presentationAnchorX,e.data.presentationAnchorY,340*q)) {
            e.data.aim=aim(e.x,e.y);setState(e,'aim');
        }
        return;
    }
    if(e.state==='aim') {
        const target=aim(e.x,e.y);
        e.data.bodyAngle=turnAngle(e.data.bodyAngle??Math.PI/2,target,7.2*q*dt);
        e.data.aim=e.data.bodyAngle;
        if(e.stateT>.72/q)setState(e,'flash');
        return;
    }
    if(e.state==='flash') {
        if(e.stateT>.48/q) {
            const a=e.data.aim;
            e.vx=Math.cos(a)*900*q;e.vy=Math.sin(a)*900*q;
            e.data.bodyAngle=a;setState(e,'dash');
        }
        return;
    }
    if(e.state==='dash') {
        e.x+=e.vx*dt;e.y+=e.vy*dt;
        e.data.bodyAngle=Math.atan2(e.vy,e.vx);
        // Permanently despawn after the WHOLE monster exits. Do not recycle or snap back.
        if(e.x<-260||e.x>W+260||e.y<-260||e.y>H+260)e.dead=true;
    }
}
function scenarioMirrorColumnShooter(e,dt) {
    const moveTo=(x,y,speed)=>{
        const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy);
        if(d>1){const k=Math.min(d,dt*speed);e.x+=dx/d*k;e.y+=dy/d*k;e.data.bodyAngle=Math.atan2(dy,dx);}
        return d<Math.max(4,dt*speed*1.1);
    };
    if(e.state==='mirrorColumnWait') {
        e.data.mirrorColumnDelay=Math.max(0,(e.data.mirrorColumnDelay||0)-dt);
        if(e.data.mirrorColumnDelay>0) return;
        e.state='mirrorColumnEnter'; e.stateT=0;
    }
    const side=e.data.mirrorColumnSide||-1;
    const baseX=e.data.mirrorColumnBaseX|| (side<0?290:610);
    const baseY=e.data.mirrorColumnBaseY||220;
    if(e.state==='mirrorColumnEnter') {
        if(moveTo(baseX,baseY,270)) {
            e.state='mirrorColumnPatrol'; e.stateT=0;
        }
        return;
    }
    const tx=baseX + Math.sin(scenarioClock*1.6 + baseY*.01 + (e.data.mirrorColumnPhase||0))*88;
    const ty=baseY + Math.sin(scenarioClock*2.15 + baseX*.01 + (e.data.mirrorColumnPhase||0))*48;
    moveTo(tx,ty,220);
    e.cool=(e.cool||0)-dt;
    if(e.cool<=0) {
        const a=aim(e.x,e.y);
        spawnBullet('paper',e.x,e.y+14,a,255,{r:9,scale:.58});
        spawnBullet('paper',e.x-9*side,e.y+8,a+side*.12,245,{r:8,scale:.48});
        spawnBullet('paper',e.x+9*side,e.y+8,a-side*.12,245,{r:8,scale:.48});
        e.cool=.92 + (e.data.mirrorColumnRow||0)*.05;
    }
}
function scenarioScreenSplitPen(e,dt) {
    const moveTo=(x,y,speed)=>{
        const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy);
        if(d>1){const k=Math.min(d,dt*speed);e.x+=dx/d*k;e.y+=dy/d*k;e.data.bodyAngle=Math.atan2(dy,dx);}
        return d<Math.max(4,dt*speed*1.12);
    };
    if(e.state==='splitPenWait') {
        e.data.splitPenDelay=Math.max(0,(e.data.splitPenDelay||0)-dt);
        if(e.data.splitPenDelay>0) return;
        setState(e,'splitPenEnter');
    }
    if(e.state==='splitPenEnter') {
        if(moveTo(e.data.splitPenX,e.data.splitPenTop,340)) {
            const points=[{x:e.data.splitPenX,y:e.data.splitPenTop},{x:e.data.splitPenX,y:e.data.splitPenBottom}];
            const pathLength=Math.abs(e.data.splitPenBottom-e.data.splitPenTop);
            const mark={id:scenarioObjectSerial++,kind:'paintMark',owner:e,points,pathLength:Math.max(pathLength,1),progress:0,
                paintSpeed:720,width:29,color:'#ffe64d',x:points[0].x,y:points[0].y,w:0,h:0,alive:true,
                t:0,life:999,warn:0,finished:false,splitBarrier:true,releaseArmed:false};
            scenarioObjects.push(mark);
            e.data.paintRef=mark;
            setState(e,'splitPenDraw');
        }
        return;
    }
    const mark=e.data.paintRef;
    if(e.state==='splitPenDraw' && mark && mark.alive) {
        const before=mark.progress;
        mark.progress=clamp(before+dt*mark.paintSpeed/mark.pathLength,0,1);
        const b=scenarioPointAlongPaint(mark,mark.progress);
        const a=scenarioPointAlongPaint(mark,before);
        e.x=b.x;e.y=b.y;
        if(Math.hypot(b.x-a.x,b.y-a.y)>.001)e.data.bodyAngle=Math.atan2(b.y-a.y,b.x-a.x);
        if(mark.progress>=1) {mark.finished=true;setState(e,'splitPenHold');}
        return;
    }
    if(e.state==='splitPenHold') {
        e.y=e.data.splitPenBottom;
        e.data.bodyAngle=Math.PI/2;
        if(scenarioSplitSpawned>=40) setState(e,'splitPenExit');
        return;
    }
    if(e.state==='splitPenExit') {
        e.y+=315*dt;
        if(e.y>H+240) e.dead=true;
    }
}

function scenarioScreenSplitSubmarine(e,dt) {
    if(e.state==='splitSubMove') {
        e.x+=e.vx*dt;
        e.y=e.data.splitSubLaneY;
        e.data.bodyAngle=e.vx>=0?0:Math.PI;
        if(!e.data.splitSubSeen && e.x>=-110 && e.x<=W+110) {
            e.data.splitSubSeen=true;
            scenarioSplitSeenCount++;
        }
        e.cool=(e.cool||0)-dt;
        if(e.cool<=0 && e.x>-95 && e.x<W+95) {
            const a=e.vx>=0?0:Math.PI;
            spawnBullet('miniShard',e.x+(e.vx>=0?22:-22),e.y,a,285,
                {r:9,scale:.58,data:{source:'screenSplitSub',maxLife:8}});
            e.cool=1.05+((e.data.splitSubSlot||0)%5)*.06;
        }
        // Completely leave and disappear, never teleport or reverse at the edge.
        if((e.vx>0&&e.x>W+255)||(e.vx<0&&e.x<-255))e.dead=true;
    }
}
function scenarioVisiblePaintPoints(o) {
    const points=o.points;
    if (!points || points.length < 2) return points || [];
    const u=clamp(o.progress||0,0,1);
    if (u<=0) return [points[0]];
    const total=o.pathLength||1;
    let left=u*total;
    const visible=[points[0]];
    for(let i=1;i<points.length;i++) {
        const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.y-a.y);
        if(d<=0.001)continue;
        if(left>=d) {visible.push(b);left-=d;continue;}
        const t=left/d;
        visible.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
        break;
    }
    return visible;
}
function scenarioPointAlongPaint(o,progress) {
    const temporary={...o,progress};
    const pts=scenarioVisiblePaintPoints(temporary);
    return pts[pts.length-1] || o.points[0];
}
function scenarioMakePaintPath(e) {
    const kinds=['zigzag','arc','stripe','scribble'];
    const kind=kinds[(scenarioPaintSerial++)%kinds.length];
    // Start EXACTLY under the highlighter; never conjure painted lines elsewhere.
    const sx=e.x, sy=e.y, n=kind==='scribble'?10:8;
    const zx=((e.data.zoneMinX ?? 120)+(e.data.zoneMaxX ?? (W-120)))*.5;
    const zy=((e.data.zoneMinY ?? 180)+(e.data.zoneMaxY ?? (H-150)))*.5;
    const tangent=Math.atan2(sy-zy,sx-zx)+Math.PI/2;
    const angle=(Math.random()<.58?tangent:Math.atan2(H*.5-sy+rnd(-320,320),W*.5-sx+rnd(-380,380)))+rnd(-.72,.72);
    const dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
    const minX=e.data.zoneMinX ?? 85, maxX=e.data.zoneMaxX ?? (W-85);
    const minY=e.data.zoneMinY ?? 150, maxY=e.data.zoneMaxY ?? (H-135);
    const length=rnd(235,360), pts=[{x:sx,y:sy}];
    for(let i=1;i<n;i++) {
        const u=i/(n-1);
        let off=0;
        if(kind==='zigzag') off=(i%2?1:-1)*rnd(36,56)*(Math.min(1,u*5));
        else if(kind==='arc') off=Math.sin(u*Math.PI)*rnd(62,92);
        else if(kind==='stripe') off=Math.sin(u*Math.PI*2)*rnd(6,12);
        else off=Math.sin(u*Math.PI*3.8)*rnd(45,62)+Math.cos(u*Math.PI*6.2)*rnd(18,28);
        pts.push({x:clamp(sx+dx*length*u+nx*off,minX,maxX),
                  y:clamp(sy+dy*length*u+ny*off,minY,maxY)});
    }
    let pathLength=0;
    for(let i=1;i<pts.length;i++)pathLength+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
    const o={id:scenarioObjectSerial++,kind:'paintMark',owner:e,points:pts,pathLength:Math.max(pathLength,1),
       progress:0,paintSpeed:rnd(170,225),width:rnd(38,62),
       color:['#d2fa48','#e6fb76','#a2f868','#ffdd63'][scenarioPaintSerial%4],
       shape:kind,x:sx,y:sy,w:0,h:0,alive:true,t:0,warn:.58,life:999,finished:false};
    scenarioObjects.push(o);
    return o;
}

function scenarioShiftPoints(points, dx = 0, dy = 0) {
    return (points || []).map(p => ({ x: p.x + dx, y: p.y + dy }));
}

function scenarioBeamToEdge(x, y, angle, pad = 32) {
    const dx = Math.cos(angle), dy = Math.sin(angle), hits = [];
    const add = (t, px, py) => { if (t > 0 && Number.isFinite(t)) hits.push({ t, x: px, y: py }); };
    if (Math.abs(dx) > 0.0001) {
        let t = (-pad - x) / dx; add(t, x + dx * t, y + dy * t);
        t = (W + pad - x) / dx; add(t, x + dx * t, y + dy * t);
    }
    if (Math.abs(dy) > 0.0001) {
        let t = (-pad - y) / dy; add(t, x + dx * t, y + dy * t);
        t = (H + pad - y) / dy; add(t, x + dx * t, y + dy * t);
    }
    hits.sort((a, b) => a.t - b.t);
    return hits[0] || { x: x + dx * 800, y: y + dy * 800 };
}
function spawnScenarioTimerBeam(owner, angle) {
    const end = scenarioBeamToEdge(owner.x, owner.y, angle, 42);
    scenarioObjects.push({
        id: scenarioObjectSerial++, kind: 'timerBeam', owner, x1: owner.x, y1: owner.y, x2: end.x, y2: end.y,
        angle, width: 34, warning: .34 / diff(), life: .92 / diff(), t: 0, alive: true
    });
}
function scenarioHybridLineHighlighter(e, dt) {
    const moveTo = (x, y, speed) => {
        const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy) || 1;
        const step = Math.min(speed * dt, d);
        e.x += dx / d * step;
        e.y += dy / d * step;
        e.data.bodyAngle = Math.atan2(dy, dx);
        return d < 10;
    };
    if (e.state === 'mixLineEnter') {
        e.data.mixLineDelay = Math.max(0, (e.data.mixLineDelay || 0) - dt);
        if (e.data.mixLineDelay > 0)
            return;
        if (moveTo(e.data.entryX, e.data.entryY, 270)) {
            e.data.stroke = 0;
            e.data.batchId = `mix-hl-${e.seed}-${time.toFixed(3)}`;
            e.data.lastAngle = null;
            highlighterLineAcrossScreen(e);
            setState(e, 'reposition');
        }
        return;
    }
    if (e.state === 'reposition') {
        const l = e.data.line;
        const dx = l.x1 - e.x, dy = l.y1 - e.y, d = Math.hypot(dx, dy) || 1;
        const sp = 960 * diff();
        e.x += dx / d * Math.min(sp * dt, d);
        e.y += dy / d * Math.min(sp * dt, d);
        e.data.bodyAngle = l.angle;
        if (d < 10) {
            e.x = l.x1; e.y = l.y1;
            e.data.progress = 0;
            addEffect('pulse', e.x, e.y, { life: .25, r: 17, color: '#d7ff36' });
            setState(e, 'paint');
        }
        return;
    }
    if (e.state === 'paint') {
        const l = e.data.line;
        const prevX = e.x, prevY = e.y;
        const speed = 700 * diff();
        e.data.progress = Math.min(l.len, (e.data.progress || 0) + speed * dt);
        const u = e.data.progress / l.len;
        const baseX = l.x1 + (l.x2 - l.x1) * u;
        const baseY = l.y1 + (l.y2 - l.y1) * u;
        const nx = -l.dy, ny = l.dx;
        const wobble = Math.sin(u * 19.5 + e.data.wobbleSeed) * 3.2 + Math.sin(u * 46.0 + e.data.wobbleSeed * .41) * 1.15;
        e.x = baseX + nx * wobble;
        e.y = baseY + ny * wobble;
        e.data.bodyAngle = l.angle;
        const segLen = Math.hypot(e.x - prevX, e.y - prevY);
        if (segLen > 1)
            trails.push({ kind: 'highlightStroke', batchId: e.data.batchId, x1: prevX, y1: prevY, x2: e.x, y2: e.y, t: 0, life: 999, fadeStart: null, r: 20 + rnd(-2.5, 2.5), alpha: .76, seed: Math.random() * 10 });
        if (e.data.progress >= l.len) {
            e.data.stroke = (e.data.stroke || 0) + 1;
            if (e.data.stroke >= 3) {
                const fadeDuration = 2.0 / diff();
                for (const t of trails) {
                    if (t.kind === 'highlightStroke' && t.batchId === e.data.batchId) {
                        t.fadeStart = t.t;
                        t.life = t.t + fadeDuration;
                    }
                }
                e.data.fadeDuration = fadeDuration;
                e.data.fadeX = clamp(l.x2 - l.dx * 140, 120, W - 120);
                e.data.fadeY = clamp(l.y2 - l.dy * 140, 110, H - 110);
                e.x = e.data.fadeX; e.y = e.data.fadeY;
                setState(e, 'fade');
            } else {
                highlighterLineAcrossScreen(e);
                setState(e, 'reposition');
            }
        }
        return;
    }
    if (e.state === 'fade') {
        const l = e.data.line;
        const fx = e.data.fadeX ?? clamp(e.x, 120, W - 120);
        const fy = e.data.fadeY ?? clamp(e.y, 110, H - 110);
        e.x = fx + Math.sin(e.stateT * 3.4 + e.seed) * 12;
        e.y = fy + Math.sin(e.stateT * 4.1 + e.seed * .7) * 7;
        e.data.bodyAngle = l.angle;
        if (e.stateT > (e.data.fadeDuration || 2.0 / diff())) {
            e.data.stroke = 0;
            e.data.batchId = `mix-hl-${e.seed}-${time.toFixed(3)}`;
            highlighterLineAcrossScreen(e);
            setState(e, 'reposition');
        }
    }
}
function scenarioShapeRushTitle(kind) {
    return ({ triangle: '삼각 돌진', diamond: '마름모 돌진', chevron: 'V자 돌진', loop: '고리 돌진' }[kind] || '도형 돌진');
}
function scenarioMakeShapeRushPath(e) {
    const kinds = ['triangle', 'diamond', 'chevron', 'loop'];
    const forcedKind = e.data.shapeForceKind;
    const kind = forcedKind || kinds[(scenarioPaintSerial++) % kinds.length];
    const cx = clamp((e.data.shapeCenterX ?? e.x) + rnd(-28, 28), 150, W - 150);
    const cy = clamp((e.data.shapeCenterY ?? e.y) + rnd(-24, 24), 180, H - 260);
    let pts = [];
    if (kind === 'triangle') {
        pts = [{ x: cx - 90, y: cy + 62 }, { x: cx + 2, y: cy - 86 }, { x: cx + 98, y: cy + 58 }, { x: cx - 90, y: cy + 62 }];
    }
    else if (kind === 'diamond') {
        pts = [{ x: cx - 96, y: cy }, { x: cx, y: cy - 76 }, { x: cx + 96, y: cy }, { x: cx, y: cy + 76 }, { x: cx - 96, y: cy }];
    }
    else if (kind === 'chevron') {
        pts = [{ x: cx - 94, y: cy - 58 }, { x: cx, y: cy + 42 }, { x: cx + 94, y: cy - 58 }, { x: cx + 38, y: cy - 10 }, { x: cx, y: cy + 78 }, { x: cx - 38, y: cy - 10 }, { x: cx - 94, y: cy - 58 }];
    }
    else {
        const rx = 92, ry = 58;
        for (let i = 0; i <= 9; i++) {
            const a = Math.PI + Math.PI * 2 * (i / 9);
            pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
        }
    }
    let pathLength = 0;
    for (let i = 1; i < pts.length; i++)
        pathLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const color = ['#d2fa48', '#e6fb76', '#a2f868', '#ffdd63'][scenarioPaintSerial % 4];
    const o = {
        id: scenarioObjectSerial++, kind: 'shapeRush', owner: e, points: pts, pathLength: Math.max(pathLength, 1), progress: 0,
        paintSpeed: rnd(210, 245), width: rnd(34, 48), color, shape: kind, x: pts[0].x, y: pts[0].y,
        w: 0, h: 0, alive: true, t: 0, life: 999, phase: 'drawing', hold: 0.62, holdMax: 0.62,
        moveX: 0, moveY: 0, vx: 0, vy: 0, chargeAge: 0, chargeLife: 1.55
    };
    scenarioObjects.push(o);
    return o;
}
function scenarioDrawShapeRush(o) {
    const phase = o.phase || 'drawing';
    let pts = [];
    if (phase === 'drawing')
        pts = scenarioVisiblePaintPoints(o);
    else
        pts = scenarioShiftPoints(o.points, o.moveX || 0, o.moveY || 0);
    if (!pts || pts.length < 2)
        return;
    const alpha = phase === 'charge' ? .95 : phase === 'armed' ? .86 : .76;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++)
        ctx.lineTo(pts[i].x, pts[i].y);
    if (phase === 'drawing') {
        ctx.lineWidth = o.width + 8;
        ctx.strokeStyle = '#fff2ad';
        ctx.globalAlpha = .18;
        ctx.setLineDash([10, 14]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++)
            ctx.lineTo(pts[i].x, pts[i].y);
    }
    else if (phase === 'armed') {
        const pulse = .74 + .26 * Math.sin(time * 12 + o.id);
        ctx.lineWidth = o.width * 1.72;
        ctx.strokeStyle = o.color;
        ctx.globalAlpha = .16 * pulse;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++)
            ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineWidth = Math.max(4, o.width * .17);
        ctx.strokeStyle = '#fff6cc';
        ctx.setLineDash([14, 10]);
        ctx.globalAlpha = .75 * pulse;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++)
            ctx.lineTo(pts[i].x, pts[i].y);
    }
    if (phase === 'charge') {
        ctx.lineWidth = o.width * 1.65;
        ctx.strokeStyle = o.color;
        ctx.globalAlpha = .20;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++)
            ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineWidth = o.width;
    ctx.strokeStyle = o.color;
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++)
        ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineWidth = Math.max(2.4, o.width * .12);
    ctx.strokeStyle = '#fffef3';
    ctx.globalAlpha = .24 + (phase === 'armed' ? .18 : 0);
    ctx.stroke();
    ctx.restore();
}
function scenarioShapeRushHighlighter(e,dt) {
    const moveTo = (x, y, speed) => {
        const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy);
        if (d > 1) {
            const k = Math.min(d, dt * speed);
            e.x += dx / d * k;
            e.y += dy / d * k;
            e.data.bodyAngle = Math.atan2(dy, dx);
        }
        return d < Math.max(3, dt * speed * 1.1);
    };
    if (e.state === 'shapeRushEnter') {
        e.data.shapeRushDelay = Math.max(0, (e.data.shapeRushDelay || 0) - dt);
        if (e.data.shapeRushDelay > 0)
            return;
        if (moveTo(e.data.entryX, e.data.entryY, 210)) {
            e.state = 'shapeRushRoam';
            e.stateT = 0;
            e.data.paintWait = Math.max(.35, (e.data.paintWait || .75) * .65);
            e.data.wayX = e.x;
            e.data.wayY = e.y;
        }
        return;
    }
    const mark = e.data.paintRef;
    if (mark && mark.alive && mark.phase === 'drawing') {
        if (e.state === 'shapeRushReady') {
            const start = mark.points[0];
            if (moveTo(start.x, start.y, 265)) {
                e.state = 'shapeRushPainting';
                e.stateT = 0;
                mark.progress = 0;
            }
            return;
        }
        e.state = 'shapeRushPainting';
        const before = mark.progress;
        mark.progress = clamp(before + dt * mark.paintSpeed / mark.pathLength, 0, 1);
        const a = scenarioPointAlongPaint(mark, before);
        const b = scenarioPointAlongPaint(mark, mark.progress);
        e.x = b.x;
        e.y = b.y;
        if (Math.hypot(b.x - a.x, b.y - a.y) > .0001)
            e.data.bodyAngle = Math.atan2(b.y - a.y, b.x - a.x);
        if (mark.progress >= 1) {
            mark.phase = 'armed';
            mark.progress = 1;
            mark.hold = 0.68;
            mark.holdMax = 0.68;
            mark.targetX = player.x;
            mark.targetY = player.y;
            e.data.paintRef = null;
            e.data.paintWait = rnd(1.7, 2.4);
            e.state = 'shapeRushRoam';
            const minX = e.data.zoneMinX ?? 120, maxX = e.data.zoneMaxX ?? (W - 120);
            const minY = e.data.zoneMinY ?? 190, maxY = e.data.zoneMaxY ?? (H - 165);
            e.data.wayX = rnd(minX, maxX);
            e.data.wayY = rnd(minY, maxY);
            e.shots++;
        }
        return;
    }
    e.state = 'shapeRushRoam';
    const minX = e.data.zoneMinX ?? 120, maxX = e.data.zoneMaxX ?? (W - 120);
    const minY = e.data.zoneMinY ?? 180, maxY = e.data.zoneMaxY ?? (H - 165);
    if (e.data.wayX == null || Math.hypot(e.data.wayX - e.x, e.data.wayY - e.y) < 30) {
        e.data.wayX = rnd(minX, maxX);
        e.data.wayY = rnd(minY, maxY);
    }
    moveTo(e.data.wayX, e.data.wayY, 116);
    e.data.paintWait -= dt;
    const painting = scenarioObjects.filter(o => o.alive && o.kind === 'shapeRush' && o.phase === 'drawing').length;
    // No artificial two-painter bottleneck in the six-monster dual formation.
    // Every living marker must be able to start its own independent stroke.
    const paintingCap = scenarioWaveMode === 'shapeRushDual' ? 6 : scenarioWaveMode === 'hybridHighlighter' ? 5 : scenarioWaveMode === 'shapeRush' ? 3 : 2;
    if (e.data.paintWait <= 0 && painting < paintingCap) {
        e.data.paintRef = scenarioMakeShapeRushPath(e);
        e.state = 'shapeRushReady';
    }
}
function scenarioGraffitiHighlighter(e,dt) {
    // Preserve the full native enemy image, approach from outside, then physically
    // follow the stroke. Only the part BEHIND the moving highlighter is dangerous.
    const moveTo=(x,y,speed)=>{
        const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy);
        if(d>1){const k=Math.min(d,dt*speed);e.x+=dx/d*k;e.y+=dy/d*k;e.data.bodyAngle=Math.atan2(dy,dx);}
        return d<Math.max(3,dt*speed*1.1);
    };
    if(e.state==='graffitiEnter') {
        e.data.graffitiDelay=Math.max(0,e.data.graffitiDelay-dt);
        if(e.data.graffitiDelay>0) return;
        if(moveTo(e.data.entryX,e.data.entryY,185)) {
            e.state='graffitiRoam';e.stateT=0;
            e.data.paintWait=Math.max(.18,e.data.paintWait*.5);
            e.data.wayX=e.x;e.data.wayY=e.y;
        }
        return;
    }
    const mark=e.data.paintRef;
    if(mark && mark.alive && !mark.finished) {
        if(mark.t < mark.warn) {e.state='graffitiReady';return;}
        e.state='graffitiPainting';
        const before=mark.progress;
        mark.progress=clamp(before+dt*mark.paintSpeed/mark.pathLength,0,1);
        const a=scenarioPointAlongPaint(mark,before);
        const b=scenarioPointAlongPaint(mark,mark.progress);
        e.x=b.x;e.y=b.y;
        if(Math.hypot(b.x-a.x,b.y-a.y)>0.0001) e.data.bodyAngle=Math.atan2(b.y-a.y,b.x-a.x);
        if(mark.progress>=1) {
            mark.finished=true;
            mark.life=mark.t+1.35; // completed stroke fades promptly
            e.data.paintRef=null;
            e.data.paintWait=rnd(.86,1.32);
            e.state='graffitiRoam';
            const minX=e.data.zoneMinX ?? 110, maxX=e.data.zoneMaxX ?? (W-110);
            const minY=e.data.zoneMinY ?? 180, maxY=e.data.zoneMaxY ?? (H-165);
            e.data.wayX=rnd(minX,maxX);e.data.wayY=rnd(minY,maxY);
            e.shots++;
        }
        return;
    }
    e.state='graffitiRoam';
    const minX=e.data.zoneMinX ?? 110, maxX=e.data.zoneMaxX ?? (W-110);
    const minY=e.data.zoneMinY ?? 180, maxY=e.data.zoneMaxY ?? (H-165);
    if(e.data.wayX==null || Math.hypot(e.data.wayX-e.x,e.data.wayY-e.y)<40){
        const farSamples=Array.from({length:5},()=>({x:rnd(minX,maxX),y:rnd(minY,maxY)}));
        farSamples.sort((a,b)=>Math.hypot(b.x-e.x,b.y-e.y)-Math.hypot(a.x-e.x,a.y-e.y));
        e.data.wayX=farSamples[0].x;e.data.wayY=farSamples[0].y;
    }
    moveTo(e.data.wayX,e.data.wayY,168);
    e.data.paintWait-=dt;
    const painting=scenarioObjects.filter(o=>o.alive&&o.kind==='paintMark'&&!o.finished).length;
    if(e.data.paintWait<=0 && painting<5 && e.x>80 && e.x<W-80 && e.y>145 && e.y<H-120) {
        e.data.paintRef=scenarioMakePaintPath(e);
        e.state='graffitiReady';
    }
}
function scenarioHuntRearPosition(e) {
    const inp=activeEngine?.input||{};
    let vx=(inp.right?1:0)-(inp.left?1:0),vy=(inp.down?1:0)-(inp.up?1:0);
    if(vx===0&&vy===0){vx=0;vy=-1;} // Behind an upwards-facing player is below them.
    const n=Math.hypot(vx,vy)||1;vx/=n;vy/=n;
    const px=-vy,py=vx; // perpendicular offset for room near the lower edge
    const candidates=[
        {x:clamp(player.x-vx*190,78,W-78),y:clamp(player.y-vy*190,145,H-125)},
        {x:clamp(player.x-vx*135+px*180,85,W-85),y:clamp(player.y-vy*135+py*180,145,H-125)},
        {x:clamp(player.x-vx*135-px*180,85,W-85),y:clamp(player.y-vy*135-py*180,145,H-125)},
        {x:clamp(player.x+px*210,85,W-85),y:clamp(player.y+py*210,145,H-125)},
        {x:clamp(player.x-px*210,85,W-85),y:clamp(player.y-py*210,145,H-125)}
    ];
    const occupied=currentWaveEnemies().filter(o=>o!==e&&o.data.huntSlot!=null&&o.state!=='huntWait');
    // Prefer a genuine rear location. Fallback to a lateral rear position if
    // the player is already at the very bottom border.
    const safe=candidates.find(p=>Math.hypot(p.x-player.x,p.y-player.y)>155 &&
      occupied.every(o=>Math.hypot(p.x-o.x,p.y-o.y)>145));
    return safe||candidates.find(p=>Math.hypot(p.x-player.x,p.y-player.y)>150)||candidates[0];
}
function scenarioHuntGhost(e,dt) {
    const moveTo=(x,y,speed)=>{
        const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy)||1;
        const k=Math.min(d,dt*speed);e.x+=dx/d*k;e.y+=dy/d*k;
        e.data.bodyAngle=Math.atan2(dy,dx);
        return d<=Math.max(10,k);
    };
    if(e.state==='huntWait') {
        if(e.stateT>e.data.huntDelay)setState(e,'huntEnter');
        return;
    }
    if(e.state==='huntEnter') {
        if(moveTo(e.data.huntHomeX,e.data.huntHomeY,375))setState(e,'huntChase');
        return;
    }
    if(e.state==='huntChase') {
        const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy)||1;
        let sx=0,sy=0;
        for(const o of currentWaveEnemies()) {
            if(o===e||o.data.huntSlot==null||o.state==='huntWait')continue;
            const rx=e.x-o.x,ry=e.y-o.y,d=Math.hypot(rx,ry);
            if(d>1&&d<165){sx+=rx/d*(165-d)*2.2;sy+=ry/d*(165-d)*2.2;}
        }
        e.x=clamp(e.x+(dx/dist*128+sx)*dt,65,W-65);
        e.y=clamp(e.y+(dy/dist*128+sy)*dt,95,H-85);
        if(dist<185){
            const p=scenarioHuntRearPosition(e);
            e.data.huntTeleport=p; // target waypoint only, not a teleport
            scenarioObjects.push({id:scenarioObjectSerial++,kind:'huntMark',x:p.x,y:p.y,w:0,h:0,alive:true,t:0,life:1.25,owner:e});
            setState(e,'huntSignal');
        }
        return;
    }
    if(e.state==='huntSignal') {
        if(e.stateT>.24)setState(e,'huntGlide');
        return;
    }
    if(e.state==='huntGlide') {
        const p=e.data.huntTeleport;
        if(!p||moveTo(p.x,p.y,490))setState(e,'huntAim');
        return;
    }
    if(e.state==='huntAim') {
        const a=aim(e.x,e.y);e.data.bodyAngle=turnAngle(e.data.bodyAngle||a,a,dt*9);
        if(e.stateT>.26) {
            e.vx=Math.cos(a)*600;e.vy=Math.sin(a)*600;
            setState(e,'huntDash');
        }
        return;
    }
    if(e.state==='huntDash') {
        e.x+=e.vx*dt;e.y+=e.vy*dt;
        if(e.stateT>.67||e.x<-130||e.x>W+130||e.y<-130||e.y>H+130)setState(e,'huntRecover');
        return;
    }
    if(e.state==='huntRecover') {
        if(moveTo(e.data.huntHomeX,e.data.huntHomeY,470))setState(e,'huntChase');
    }
}
function scenarioStarPointer(e,dt) {
    const s=e.state;
    if(s==='starEnter') {
        const dx=e.data.starX-e.x,dy=e.data.starY-e.y,d=Math.hypot(dx,dy)||1;
        const k=Math.min(d,dt*450);
        e.x+=dx/d*k;e.y+=dy/d*k;
        e.data.bodyAngle=Math.atan2(dy,dx);
        if(d<Math.max(12,k))setState(e,'starHold');
    } else if(s==='starHold') {
        e.data.bodyAngle=turnAngle(e.data.bodyAngle||Math.PI/2,aim(e.x,e.y),dt*2.1);
    } else if(s==='starAim') {
        e.data.bodyAngle=turnAngle(e.data.bodyAngle||Math.PI/2,aim(e.x,e.y),dt*7.4);
        e.data.aim=e.data.bodyAngle;
        if(e.stateT>.40)setState(e,'starFlash');
    } else if(s==='starFlash') {
        if(e.stateT>.21){const a=e.data.aim;
            e.vx=Math.cos(a)*860;e.vy=Math.sin(a)*860;
            e.data.bodyAngle=a;setState(e,'starDash');
        }
    } else if(s==='starDash') {
        e.x+=e.vx*dt;e.y+=e.vy*dt;
        // Do not reverse the charge while still visible. Leave the ENTIRE stage first.
        if(e.x<-215||e.x>W+215||e.y<-215||e.y>H+215){
            const topX=e.data.starEntranceX ?? e.data.starX;
            const topY=Math.min(-260,e.data.starEntranceY ?? -260);
            let waypoints=[];
            if(e.y>H+215) {
                // From bottom: traverse the off-screen bottom margin to an outer rail,
                // climb that rail outside the side edge, then travel along the top.
                const railX=e.x<W/2?-285:W+285;
                waypoints=[{x:railX,y:e.y},{x:railX,y:topY},{x:topX,y:topY}];
            } else if(e.x<-215||e.x>W+215) {
                // From left/right: remain outside the side boundary until above screen.
                const railX=e.x<0?-285:W+285;
                waypoints=[{x:railX,y:topY},{x:topX,y:topY}];
            } else {
                // Already beyond the top: return to the original top entry lane.
                waypoints=[{x:topX,y:topY}];
            }
            e.data.starReturnWaypoints=waypoints;
            e.data.starReturnIndex=0;
            setState(e,'starReturn');
        }
    } else if(s==='starReturn') {
        const route=e.data.starReturnWaypoints||[];
        const next=route[e.data.starReturnIndex||0];
        if(!next) {
            // Now physically above the map. Fly DOWN into the star formation again.
            e.vx=0;e.vy=0;
            setState(e,'starEnter');
            return;
        }
        const dx=next.x-e.x,dy=next.y-e.y,d=Math.hypot(dx,dy);
        if(d>.0001) {
            const step=Math.min(d,1020*dt);
            e.x+=dx/d*step;e.y+=dy/d*step;
            e.data.bodyAngle=Math.atan2(dy,dx);
            if(step>=d-.001)e.data.starReturnIndex++;
        } else e.data.starReturnIndex++;
        if(e.data.starReturnIndex>=route.length) {
            e.data.starReturnWaypoints=null;
            e.data.starReturnIndex=0;
            e.vx=0;e.vy=0;
            setState(e,'starEnter');
        }
    }
}
function scenarioQuestionsVAnchors() {
    return [
        { x: 145, y: 150 }, { x: 235, y: 230 }, { x: 325, y: 310 }, { x: 415, y: 395 },
        { x: 505, y: 395 }, { x: 595, y: 310 }, { x: 685, y: 230 }, { x: 775, y: 150 }
    ];
}
function scenarioNoreplyInvVAnchors() {
    return [
        { x: 450, y: 145 },
        { x: 380, y: 220 }, { x: 520, y: 220 },
        { x: 310, y: 295 }, { x: 590, y: 295 },
        { x: 240, y: 370 }, { x: 660, y: 370 }
    ];
}
function scenarioQuestionPopupAnchor(index) {
    const anchors = [
        { x: 88, y: 205 }, { x: 646, y: 205 }, { x: 118, y: 348 }, { x: 616, y: 348 },
        { x: 148, y: 492 }, { x: 586, y: 492 }, { x: 98, y: 638 }, { x: 636, y: 638 },
        { x: 168, y: 782 }, { x: 556, y: 782 }
    ];
    return anchors[index % anchors.length];
}
function scenarioTriangleRows(n) {
    const rows = [];
    let remaining = Math.max(0, n);
    let next = 1;
    while (remaining > 0) {
        const size = Math.min(next, remaining);
        rows.push(size);
        remaining -= size;
        next += 1;
    }
    return rows;
}
function scenarioTriangleDroneTargets(count) {
    const rows = scenarioTriangleRows(count);
    const out = [];
    let rowIndex = 0;
    const baseY = 190;
    for (const size of rows) {
        const y = baseY + rowIndex * 88;
        const span = Math.max(0, size - 1) * 94;
        const startX = 450 - span / 2;
        for (let i = 0; i < size; i++) out.push({ x: startX + i * 94, y });
        rowIndex += 1;
    }
    return out;
}
function scenarioSweepFormationTargets(count) {
    const out = [];
    const cols = Math.min(4, Math.max(1, Math.ceil(count / 2)));
    const rows = Math.ceil(count / cols);
    let placed = 0;
    for (let r = 0; r < rows; r++) {
        const size = Math.min(cols, count - placed);
        const span = Math.max(0, size - 1) * 92;
        const startX = -span / 2;
        const y = (r - (rows - 1) / 2) * 92;
        for (let c = 0; c < size; c++) out.push({ x: startX + c * 92, y });
        placed += size;
    }
    return out;
}
function scenarioPolygonOffsets(count, radius, rotation) {
    if (count <= 0) return [];
    if (count === 1) return [{ x: 0, y: 0 }];
    if (count === 2) {
        return [
            { x: Math.cos(rotation) * radius * .72, y: Math.sin(rotation) * radius * .72 },
            { x: -Math.cos(rotation) * radius * .72, y: -Math.sin(rotation) * radius * .72 }
        ];
    }
    const out = [];
    for (let i = 0; i < count; i++) {
        const a = rotation - Math.PI / 2 + i * Math.PI * 2 / count;
        out.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
    }
    return out;
}
function scenarioQuestionVAnxiety(e, dt) {
    const q = diff();
    const anchors = scenarioQuestionsVAnchors();
    const slot = clamp(e.data.questionsVSlot ?? 0, 0, anchors.length - 1);
    const target = anchors[slot];
    const dx = target.x - e.x, dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.min(dist, 420 * q * dt);
    if (dist > .001) {
        e.x += dx / dist * step;
        e.y += dy / dist * step;
    }
    const look = aim(e.x, e.y);
    e.data.bodyAngle = turnAngle(e.data.bodyAngle || look, look, dt * 4.6);
    e.cool -= dt;
    if (e.cool <= 0) {
        e.cool += e.data.questionsVCadence || .95;
        const base = e.data.bodyAngle + (e.data.questionsVSpread || 0);
        spawnBullet('drop', e.x - 8, e.y + 6, base - .10, 286 * q, { r: 13, scale: .34 });
        spawnBullet('drop', e.x + 8, e.y + 6, base + .10, 286 * q, { r: 13, scale: .34 });
        e.shots = (e.shots || 0) + 1;
        addEffect('pulse', e.x, e.y + 8, { life: .3, r: 24, color: '#b97cff', alpha: .45 });
    }
}
function scenarioTriangleDrone(e, dt) {
    const q = diff();
    const living = currentWaveEnemies().filter(o => !o.dead && o.type === 'drone' && o.data.triangleDroneSlot != null)
        .sort((a, b) => (a.scenarioOrder ?? 0) - (b.scenarioOrder ?? 0));
    const index = living.indexOf(e);
    if (index < 0) return;
    const targets = scenarioTriangleDroneTargets(living.length);
    const target = targets[index] || { x: 450, y: 260 };
    const dx = target.x - e.x, dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.min(dist, 430 * q * dt);
    if (dist > .001) {
        e.x += dx / dist * step;
        e.y += dy / dist * step;
    }
    const look = aim(e.x, e.y);
    e.data.bodyAngle = turnAngle(e.data.bodyAngle || look, look, dt * 4.3);
    e.cool -= dt;
    if (e.cool <= 0) {
        e.cool += e.data.triangleDroneCadence || .76;
        e.shots = (e.shots || 0) + 1;
        const a = e.data.bodyAngle;
        spawnBullet('miniShard', e.x, e.y + 28, a, 252 * q, { r: 10, scale: .68, data: { source: 'triangleDrone', maxLife: 20 } });
        if (e.shots % 3 === 0) {
            spawnBullet('boomerangPage', e.x - 16, e.y + 8, a - .44, 220 * q, { r: 13, scale: .78, data: { curve: -1, source: 'triangleDrone', maxLife: 20 } });
            spawnBullet('boomerangPage', e.x + 16, e.y + 8, a + .44, 220 * q, { r: 13, scale: .78, data: { curve: 1, source: 'triangleDrone', maxLife: 20 } });
        }
    }
}
// Stage-local interpolation: chapter 1/other modules have their own `lerp`
// functions, which are NOT visible in this module's closure.
function scenarioFormationLerp(from, to, t) {
    return from + (to - from) * clamp(t, 0, 1);
}
function scenarioTriangleSweepShooter(e, dt) {
    const q = diff();
    const living = currentWaveEnemies().filter(o => !o.dead && o.data.triangleSweepSlot != null)
        .sort((a, b) => (a.scenarioOrder ?? 0) - (b.scenarioOrder ?? 0));
    const index = living.indexOf(e);
    if (index < 0) return;
    const localT = e.stateT || 0;
    const enter = clamp(localT / 1.0, 0, 1);
    const baseX = scenarioFormationLerp(-170, 450 + Math.sin(Math.max(0, localT - 1.05) * .92) * 255, enter);
    const baseY = 420 + Math.sin(Math.max(0, localT - .6) * .55) * 28;
    const offsets = scenarioSweepFormationTargets(living.length);
    const off = offsets[index] || { x: 0, y: 0 };
    const target = { x: baseX + off.x, y: baseY + off.y };
    const dx = target.x - e.x, dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.min(dist, 455 * q * dt);
    if (dist > .001) {
        e.x += dx / dist * step;
        e.y += dy / dist * step;
    }
    const look = aim(e.x, e.y);
    e.data.bodyAngle = turnAngle(e.data.bodyAngle || look, look, dt * 4.1);
    e.cool -= dt;
    if (e.cool <= 0) {
        e.cool += e.data.triangleSweepCadence || .82;
        const a = e.data.bodyAngle;
        spawnBullet('citation', e.x, e.y + 14, a, 250 * q, { r: 13, scale: .74, data: { source: 'triangleSweep', maxLife: 18 } });
        if ((e.shots || 0) % 2 === 1) {
            spawnBullet('paper', e.x - 10, e.y + 6, a - .18, 228 * q, { r: 10, scale: .52, data: { source: 'triangleSweep', maxLife: 18 } });
            spawnBullet('paper', e.x + 10, e.y + 6, a + .18, 228 * q, { r: 10, scale: .52, data: { source: 'triangleSweep', maxLife: 18 } });
        }
        e.shots = (e.shots || 0) + 1;
    }
}
function scenarioNoreplyInvV(e, dt) {
    const q = diff();
    const anchors = scenarioNoreplyInvVAnchors();
    const slot = clamp(e.data.noreplyInvVSlot ?? 0, 0, anchors.length - 1);
    const anchor = anchors[slot] || anchors[0];
    const bobX = Math.sin(scenarioClock * 1.08 + slot * .75) * 7;
    const bobY = Math.sin(scenarioClock * 1.55 + slot * .58) * 4;
    const tx = anchor.x + bobX;
    const ty = anchor.y + bobY;
    const dx = tx - e.x, dy = ty - e.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.min(dist, 430 * q * dt);
    if (dist > .001) {
        e.x += dx / dist * step;
        e.y += dy / dist * step;
    }
    const look = aim(e.x, e.y + 20);
    e.data.bodyAngle = turnAngle(e.data.bodyAngle || look, look, dt * 4.4);
    if (e.state === 'noreplyInvVForm' && dist < 14) {
        e.x = tx;
        e.y = ty;
        e.cool = .46 + slot * .06;
        setState(e, 'noreplyInvVHold');
        return;
    }
    if (e.state !== 'noreplyInvVHold')
        return;
    e.cool -= dt;
    if (e.cool <= 0) {
        e.cool += e.data.noreplyInvVCadence || 1.34;
        const fireAngle = look + rnd(-.06, .06);
        spawnBullet('noReplyCore', e.x, e.y + 44, fireAngle, 276 * q, { r: 22, scale: .95, state: 'main' });
        addEffect('pulse', e.x, e.y + 36, { life: .20, r: 15, color: '#7ee7ff' });
        e.shots = (e.shots || 0) + 1;
    }
}

// Wave 20 only: this shuffle MUST live in the wave-simulator scope.
// A shuffle() helper in a different game module is not visible here.
function scenarioLineGridShuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function scenarioLineGridOrdersForPhase(phase) {
    if (!scenarioLineGridOrders[phase]) {
        if (phase === 'vertical')
            scenarioLineGridOrders[phase] = scenarioLineGridShuffle([0, 1, 2, 3, 4]);
        else if (phase === 'horizontal')
            scenarioLineGridOrders[phase] = scenarioLineGridShuffle([0, 1, 2, 3, 4, 5, 6]);
        else if (phase === 'diagonal')
            scenarioLineGridOrders[phase] = scenarioLineGridShuffle([0, 1, 2, 3, 4, 5]);
        else
            scenarioLineGridOrders[phase] = scenarioLineGridShuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    }
    return scenarioLineGridOrders[phase];
}
function scenarioLineGridDelay(phase, index) {
    const order = scenarioLineGridOrdersForPhase(phase);
    if (phase === 'vertical')
        return order.indexOf(index) * .46 + Math.random() * .12;
    if (phase === 'horizontal')
        return order.indexOf(index) * .34 + Math.random() * .10;
    if (phase === 'diagonal') {
        const pair = Math.floor(index / 2);
        return order.indexOf(pair) * .82 + Math.random() * .08;
    }
    const pair = Math.floor(index / 2);
    return order.indexOf(pair) * .48 + Math.random() * .08;
}
function scenarioLineGridEndpoints(phase, index) {
    const pad = 52;
    if (phase === 'vertical') {
        const x = 130 + index * ((W - 260) / 4);
        return { orientation: 'vertical', x1: x, y1: -pad, x2: x, y2: H + pad };
    }
    if (phase === 'horizontal') {
        // H=1200: y = 75, 255, 435, 615, 795, 975, 1155.
        // The final stripe reaches the BOTTOM of the arena instead of stopping near y=880.
        const y = 75 + index * ((H - 120) / 6);
        const fromLeft = index % 2 === 0;
        return { orientation: 'horizontal', x1: fromLeft ? -pad : W + pad, y1: y,
            x2: fromLeft ? W + pad : -pad, y2: y };
    }
    if (phase === 'diagonal') {
        // Six distinct passes: a symmetric pair per pass; top, bottom, top, bottom...
        // The pair's lines cross each other, and later passes occupy shifted lanes.
        const pass = Math.floor(index / 2), side = index % 2;
        const fromTop = pass % 2 === 0;
        const lane = Math.floor(pass / 2);
        const xStart = side === 0 ? 95 + lane * 105 : W - 95 - lane * 105;
        const xEnd = side === 0 ? W - 90 + lane * 32 : 90 - lane * 32;
        return { orientation: 'diagonal', x1: xStart, y1: fromTop ? -pad : H + pad,
            x2: xEnd, y2: fromTop ? H + pad : -pad };
    }
    // Eight final pairs: each pair draws one FULL-height vertical stripe and
    // one FULL-width horizontal stripe at precisely the same time.
    const pair = Math.floor(index / 2);
    if (index % 2 === 0) {
        const x = 80 + pair * ((W - 160) / 7);
        return { orientation: 'vertical', x1: x, y1: -pad, x2: x, y2: H + pad };
    }
    const y = 80 + pair * ((H - 160) / 7);
    const fromLeft = pair % 2 === 0;
    return { orientation: 'horizontal', x1: fromLeft ? -pad : W + pad, y1: y,
        x2: fromLeft ? W + pad : -pad, y2: y };
}
function scenarioLineGridBuildLine(e) {
    const x1 = e.data.lineGridX1, y1 = e.data.lineGridY1;
    const x2 = e.data.lineGridX2, y2 = e.data.lineGridY2;
    const vx = x2 - x1, vy = y2 - y1;
    const len = Math.hypot(vx, vy) || 1;
    e.data.line = { x1, y1, x2, y2, dx: vx / len, dy: vy / len, len,
        angle: Math.atan2(vy, vx) };
    e.data.wobbleSeed = Math.random() * 1000;
    e.data.progress = 0;
    e.data.batchId = `line-grid-${e.seed}-${time.toFixed(3)}`;
}
function scenarioLineGridFadeTrails(batchId, fadeDuration) {
    for (const t of trails) {
        if (t.kind === 'highlightStroke' && t.batchId === batchId) {
            t.fadeStart = t.t;
            t.life = t.t + fadeDuration;
        }
    }
}
function scenarioLineGridHighlighter(e, dt) {
    const moveTo = (x, y, speed) => {
        const dx = x - e.x, dy = y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < .001) return true;
        const step = Math.min(speed * dt, dist);
        e.x += dx / dist * step;
        e.y += dy / dist * step;
        e.data.bodyAngle = Math.atan2(dy, dx);
        return step >= dist - .01;
    };
    if (e.state === 'lineGridWait') {
        e.data.lineGridDelay = Math.max(0, (e.data.lineGridDelay || 0) - dt);
        if (e.data.lineGridDelay > 0) return;
        setState(e, 'lineGridEnter');
    }
    if (e.state === 'lineGridEnter') {
        if (moveTo(e.data.lineGridTargetX, e.data.lineGridTargetY, 640 * diff())) {
            scenarioLineGridBuildLine(e);
            e.data.bodyAngle = e.data.line.angle;
            setState(e, 'lineGridDraw');
        }
        return;
    }
    if (e.state === 'lineGridDraw') {
        const line = e.data.line;
        const prevX = e.x, prevY = e.y;
        e.data.progress = Math.min(line.len, (e.data.progress || 0) + 755 * diff() * dt);
        const u = e.data.progress / line.len;
        const baseX = line.x1 + (line.x2 - line.x1) * u;
        const baseY = line.y1 + (line.y2 - line.y1) * u;
        const nx = -line.dy, ny = line.dx;
        // Use the exact two-frequency handmade wobble of the preexisting line-drawing pen.
        const wobble = Math.sin(u * 18.4 + e.data.wobbleSeed) * 3.5
            + Math.sin(u * 43.0 + e.data.wobbleSeed * .37) * 1.35;
        e.x = baseX + nx * wobble;
        e.y = baseY + ny * wobble;
        e.data.bodyAngle = line.angle;
        if (Math.hypot(e.x - prevX, e.y - prevY) > 1) {
            trails.push({ kind: 'highlightStroke', batchId: e.data.batchId,
                x1: prevX, y1: prevY, x2: e.x, y2: e.y, t: 0, life: 999,
                fadeStart: null, r: 20 + rnd(-2.5, 2.5), alpha: .76,
                seed: Math.random() * 10 });
        }
        if (e.data.progress >= line.len) {
            e.data.lineGridCompleted = true;
            scenarioLineGridFadeTrails(e.data.batchId, 2.25 / diff());
            setState(e, 'lineGridExit');
        }
        return;
    }
    if (e.state === 'lineGridExit') {
        // Never hover, wrap, teleport or re-enter. Keep flying along the original
        // drawn line and permanently disappear only AFTER leaving the entire field.
        const line = e.data.line;
        const speed = 730 * diff();
        e.x += line.dx * speed * dt;
        e.y += line.dy * speed * dt;
        e.data.bodyAngle = line.angle;
        if (e.x < -225 || e.x > W + 225 || e.y < -225 || e.y > H + 225)
            e.dead = true;
    }
}
function scenarioTrianglePolygonShooter(e, dt) {
    const q = diff();
    const group = e.data.trianglePolygonGroup ?? 0;
    const living = currentWaveEnemies().filter(o => !o.dead && o.data.trianglePolygonGroup === group)
        .sort((a, b) => (a.scenarioOrder ?? 0) - (b.scenarioOrder ?? 0));
    const index = living.indexOf(e);
    if (index < 0) return;
    const localT = e.stateT || 0;
    const enter = clamp(localT / 1.12, 0, 1);
    const anchorY = group === 0 ? 360 : 600;
    const anchorX = group === 0 ? 250 : 650;
    const centerX = group === 0 ? scenarioFormationLerp(-220, anchorX, enter) : scenarioFormationLerp(W + 220, anchorX, enter);
    const centerY = anchorY;
    const rotation = (group === 0 ? 1 : -1) * (Math.max(0, localT - .8) * .42) + (group === 0 ? 0 : Math.PI / 5);
    const radius = living.length >= 5 ? 92 : living.length === 4 ? 88 : living.length === 3 ? 82 : 78;
    const offsets = scenarioPolygonOffsets(living.length, radius, rotation);
    const off = offsets[index] || { x: 0, y: 0 };
    const target = { x: centerX + off.x, y: centerY + off.y };
    const dx = target.x - e.x, dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.min(dist, 470 * q * dt);
    if (dist > .001) {
        e.x += dx / dist * step;
        e.y += dy / dist * step;
    }
    const look = aim(e.x, e.y);
    e.data.bodyAngle = turnAngle(e.data.bodyAngle || look, look, dt * 4.8);
    e.cool -= dt;
    if (e.cool <= 0) {
        e.cool += e.data.trianglePolygonCadence || .82;
        const a = e.data.bodyAngle;
        spawnBullet('x', e.x, e.y + 8, a, 265 * q, { r: 14, scale: .62, data: { source: 'trianglePolygon', maxLife: 19 } });
        if (living.length >= 3 && (e.shots || 0) % 2 === 0) {
            spawnBullet('paper', e.x, e.y + 10, a - .16, 236 * q, { r: 10, scale: .55, data: { source: 'trianglePolygon', maxLife: 18 } });
            spawnBullet('paper', e.x, e.y + 10, a + .16, 236 * q, { r: 10, scale: .55, data: { source: 'trianglePolygon', maxLife: 18 } });
        }
        e.shots = (e.shots || 0) + 1;
    }
}
function updateScenarioSpecialEnemy(e,dt) {

    if(e.data.subThirty) {scenarioThirtySubmarine(e,dt);return true;}
    if(e.data.presentationSlot!=null) {scenarioPresentationPointer(e,dt);return true;}
    if(e.data.galagaSlot!=null) {scenarioGalagaDrone(e,dt);return true;}
    if(e.data.graffitiSlot!=null) {scenarioGraffitiHighlighter(e,dt);return true;}
    if(e.data.shapeRushSlot!=null) {scenarioShapeRushHighlighter(e,dt);return true;}
    if(e.data.lineMixSlot!=null) {scenarioHybridLineHighlighter(e,dt);return true;}
    if(e.data.huntSlot!=null) {scenarioHuntGhost(e,dt);return true;}
    if(e.data.starSlot!=null) {scenarioStarPointer(e,dt);return true;}
    if(e.data.mirrorColumnSlot!=null) {scenarioMirrorColumnShooter(e,dt);return true;}
    if(e.data.formatMirrorGroup!=null) {scenarioMirrorFormat(e,dt);return true;}
    if(e.data.questionsVSlot!=null) {scenarioQuestionVAnxiety(e,dt);return true;}
    if(e.data.noreplyInvVSlot!=null) {scenarioNoreplyInvV(e,dt);return true;}
    if(e.data.lineGridSlot!=null) {scenarioLineGridHighlighter(e,dt);return true;}
    if(e.data.triangleSweepSlot!=null) {scenarioTriangleSweepShooter(e,dt);return true;}
    if(e.data.trianglePolygonGroup!=null) {scenarioTrianglePolygonShooter(e,dt);return true;}
    if(e.data.triangleDroneSlot!=null) {scenarioTriangleDrone(e,dt);return true;}
    if(e.data.splitPenSlot!=null) {scenarioScreenSplitPen(e,dt);return true;}
    if(e.data.splitSubSlot!=null) {scenarioScreenSplitSubmarine(e,dt);return true;}
    return false;
}
function spawnScenarioVerticalClamp(e) {
    // 가로형 eliteWall의 금속 레일과 압축 헤드를 축 회전하여 그대로 재사용.
    // 독립적인 거대 종이 사각형을 만들지 않아 외형과 피격 판정이 일관됩니다.
    const phase=e.data.phase||1;
    const half=phase===1?170:phase===2?153:140;
    const center=clamp(e.data.verticalGapCurrent ?? player.y, 420, H-255);
    const hold=phase===1?.13:phase===2?.15:.17;
    const inbound=phase===1?.10:phase===2?.085:.07;
    // 18 contiguous rail columns, including both left and right screen borders.
    // Do not vary the gap per column: the entire attack must honor the one straight safe strip.
    const cols=18;
    for(let i=0;i<cols;i++) {
        const x=18+(W-36)*i/(cols-1);
        const gap=center;
        const topStart=-145,bottomStart=H+145;
        const topStop=gap-half-68,bottomStop=gap+half+68;
        const topSpeed=Math.abs(topStop-topStart)/inbound;
        const bottomSpeed=Math.abs(bottomStart-bottomStop)/inbound;
        spawnBullet('eliteWall',x,topStart,Math.PI/2,0,{
            wall:true,r:0,scale:.24,dormant:true,active:false,
            data:{axis:'vertical',side:'top',stopY:topStop,speed:topSpeed,hold,delay:0,phase,impactFx:i===Math.floor(cols/2)}
        });
        spawnBullet('eliteWall',x,bottomStart,-Math.PI/2,0,{
            wall:true,r:0,scale:.24,dormant:true,active:false,
            data:{axis:'vertical',side:'bottom',stopY:bottomStop,speed:bottomSpeed,hold,delay:0,phase,impactFx:false}
        });
    }
    addEffect('pulse',e.x,e.y+20,{life:.55,r:50,color:'#ffd84e'});
}
function scenarioUpdateNewMechanics(dt) {
    if (scenarioWaveMode==='submarineThirty') {
        scenarioSubSpawnTimer-=dt;
        if(scenarioSubSpawned<30 && scenarioSubSpawnTimer<=0) {
            scenarioSpawnGroups([S('submarine',Math.min(3,30-scenarioSubSpawned),[175,450,725])],`continuous-${Math.floor(scenarioSubSpawned/3)}`);
            // Start the next trio before the previous trio has left the field.
            scenarioSubSpawnTimer+=.72;
        }
        scenarioStageLabel=`잠수함 3기씩 플레이어 조준 돌진 · ${scenarioSubSpawned}/30기 투입`;
    }
    if (scenarioWaveMode==='screenSplit') {
        scenarioSplitSpawnTimer-=dt;
        if(scenarioSplitSpawned<40 && scenarioSplitSpawnTimer<=0) {
            const batch=Math.min(40-scenarioSplitSpawned,Math.random()<.22?2:1);
            scenarioSpawnGroups([S('submarine',batch,Array.from({length:batch},()=>450))],`chaos-${scenarioSplitSpawned}`);
            scenarioSplitSpawnTimer+=rnd(.13,.36);
        }
        if(scenarioSplitSpawned>=40 && !scenarioSplitCompressorsSpawned && !currentWaveEnemies().some(e=>e.data.splitSubSlot!=null)) {
            scenarioSplitCompressorsSpawned=true;
            scenarioSpawnGroups([S('compressor',2,[250,670])],'final-random-compressors');
            scenarioStage=2;
        }
        if(scenarioSplitSpawned>=40) {
            for(const o of scenarioObjects) if(o.kind==='paintMark' && o.splitBarrier && o.alive && !o.releaseArmed) {
                o.releaseArmed=true;
                o.life=Math.min(o.life,o.t+1.6);
            }
        }
        scenarioStageLabel=scenarioSplitCompressorsSpawned
            ? '최종 압축기 2기 · 가로/세로 랜덤 공격'
            : `전장 전체 세로 분할 · 무작위 잠수함 ${scenarioSplitSpawned}/40기`;
    }
    if(scenarioWaveMode==='starChain') {
        scenarioStarCooldown-=dt;
        if(scenarioStarCooldown<=0) {
            let fired=false;
            for(let attempts=0;attempts<20;attempts++) {
                const slot=scenarioStarCursor%20;scenarioStarCursor=(slot+1)%20;
                const e=currentWaveEnemies().find(o=>o.data.starSlot===slot);
                if(!e)continue;
                if(e.state!=='starHold') continue;
                setState(e,'starAim');
                scenarioStageLabel='별 진형 · 연속 조준 및 돌진';
                fired=true;break;
            }
            scenarioStarCooldown=fired?.63:.16;
        }
    }
    if(scenarioWaveMode==='galaga')
        scenarioStageLabel='갤러그 편대 · 살아남은 적은 계속 귀환';
    if(scenarioWaveMode==='graffiti')
        scenarioStageLabel='영역 색칠 · 경고 → 색칠 → 소멸';
    if(scenarioWaveMode==='shapeRush')
        scenarioStageLabel='도형 돌진 · 형광펜 실시간 드로잉';
    if(scenarioWaveMode==='shapeRushDual')
        scenarioStageLabel='6기 동시 도형 러시 · 상단/하단 동시 전개';
    if(scenarioWaveMode==='hybridHighlighter')
        scenarioStageLabel='혼합 형광펜 · 10기 도형 → 3기 낙서 → 1기 횡선';
    if(scenarioWaveMode==='mirrorColumns')
        scenarioStageLabel='대칭 사격 열 · 교차 탄막';
    if(scenarioWaveMode==='hunt')
        scenarioStageLabel='유령 포위 · 후방까지 직접 이동 → 돌진';
    if(scenarioWaveMode==='horizontalClamp')
        scenarioStageLabel='가로 압축 · 좌우 금속 레일';
    if(scenarioWaveMode==='starChain' && currentWaveEnemies().some(e => e.type === 'compressor'))
        scenarioStageLabel='별 레이저 + 상하 압축 · 경고 후 이동';
    if (scenarioWaveMode === 'questionsV') {
        let popupCount = scenarioObjects.filter(o => o.kind === 'question' && o.alive).length;
        const anxietyAlive = currentWaveEnemies().filter(e => e.type === 'anxiety' && !e.dead).length;
        if (anxietyAlive > 0 && popupCount < 10 && scenarioAttackTimer >= 1.15) {
            const anchor = scenarioQuestionPopupAnchor(popupCount);
            scenarioObjects.push({ id: scenarioObjectSerial++, kind: 'question', x: anchor.x, y: anchor.y, w: 178, h: 98, baseX: anchor.x, baseY: anchor.y, text: ['WARNING', 'ERROR', 'ALERT', 'RETRY'][scenarioObjectSerial % 4], hp: 3, shootAt: .65, t: 0, alive: true });
            scenarioAttackTimer = 0;
            popupCount += 1;
        }
        scenarioStageLabel = `불안 V진형 · 알림창 ${Math.min(10, popupCount)}/10`;
    }
    if (scenarioWaveMode === 'triangleDrones') {
        if (currentWaveEnemies().some(e => e.data.trianglePolygonGroup != null)) {
            const leftAlive = currentWaveEnemies().filter(e => !e.dead && e.data.trianglePolygonGroup === 0).length;
            const rightAlive = currentWaveEnemies().filter(e => !e.dead && e.data.trianglePolygonGroup === 1).length;
            scenarioStageLabel = `좌우 회전 편대 · 좌 ${leftAlive} / 우 ${rightAlive} 생존`;
        } else if (currentWaveEnemies().some(e => e.data.triangleSweepSlot != null)) {
            const sweepAlive = currentWaveEnemies().filter(e => !e.dead && e.data.triangleSweepSlot != null).length;
            scenarioStageLabel = `좌측 왕복 사격 편대 · ${sweepAlive}기`;
        } else {
            const droneAlive = currentWaveEnemies().filter(e => e.type === 'drone' && !e.dead).length;
            scenarioStageLabel = `드론 삼각 편대 · ${droneAlive}기 재정렬 사격`;
        }
    }
    if(scenarioWaveMode==='submit') {
        const active=currentWaveEnemies().filter(e=>e.type==='countdown');
        scenarioStageLabel='제출 카운트다운 · 실패 알림 진동 후 잔해 폭발';
        for(const e of active) {
            if(e.data.submitIndex==null || e.data.submitFailed || e.state==='enter')continue;
            e.data.submitRemaining=Math.max(0,e.data.submitRemaining-dt);
            if(e.data.submitRemaining<=0) {
                e.data.submitFailed=true;
                const o=scenarioObjects.find(o=>o.kind==='submit'&&o.owner===e&&o.alive);
                if(o){o.notice='failed';o.displayTime=1.6;o.t=0;o.shakeTime=.48;o.exploded=false;}
                activeEngine.screenShakeIntensity = Math.max(activeEngine.screenShakeIntensity || 0, 12);
                scenarioObjects.push({id:scenarioObjectSerial++,kind:'submitBlast',x:e.x,y:e.y,w:0,h:0,radius:108,t:0,life:.52,alive:true});
                for(let k=0;k<16;k++){const a=Math.random()*Math.PI*2,s=120+Math.random()*280;spawnBullet('paper',e.x,e.y,a,s,{r:8+Math.random()*5,scale:.34+Math.random()*.28});}
                addEffect('pulse',e.x,e.y,{life:.53,r:55,color:'#ff6472'});
                burstParticles(e.x,e.y,'#ff7897',16,165);
                for(let j=0;j<10;j++) spawnBullet('timer',e.x,e.y,j*Math.PI/5,225,{r:12,scale:.68});
                e.shots++;
            }
        }
    }
}
function scenarioUpdateNewObject(o,dt) {
    if(o.kind==='paintMark'||o.kind==='huntMark'||o.kind==='submitBlast') {
        if(o.t>=o.life)o.alive=false;return true;
    }
    if(o.kind==='timerBeam') {
        if(o.t>=o.life)o.alive=false;
        return true;
    }
    if(o.kind==='shapeRush') {
        if(o.phase==='armed') {
            o.hold=Math.max(0,(o.hold||0)-dt);
            if(o.hold<=0) {
                const pts=o.points||[];
                let sx=0,sy=0;
                for(const p of pts){sx+=p.x;sy+=p.y;}
                const cx=pts.length?sx/pts.length:o.x, cy=pts.length?sy/pts.length:o.y;
                const a=Math.atan2((o.targetY??player.y)-cy,(o.targetX??player.x)-cx);
                o.vx=Math.cos(a)*590;o.vy=Math.sin(a)*590;
                o.phase='charge';o.chargeAge=0;
                addEffect('pulse',cx,cy,{life:.42,r:54,color:o.color||'#d8ff63'});
            }
        } else if(o.phase==='charge') {
            o.moveX=(o.moveX||0)+o.vx*dt;
            o.moveY=(o.moveY||0)+o.vy*dt;
            o.chargeAge=(o.chargeAge||0)+dt;
            const moved=scenarioShiftPoints(o.points,o.moveX||0,o.moveY||0);
            if(o.chargeAge>(o.chargeLife||1.55) || moved.every(p=>p.x<-180||p.x>W+180||p.y<-180||p.y>H+180)) o.alive=false;
        }
        return true;
    }
    if(o.kind==='submit') {
        if(o.owner?.dead && o.notice==='waiting') {o.notice='success';o.displayTime=1.3;o.t=0;}
        if(o.notice==='failed' && (o.shakeTime||0)>0) {
            o.shakeTime=Math.max(0,o.shakeTime-dt);
            activeEngine.screenShakeIntensity = Math.max(activeEngine.screenShakeIntensity || 0, 8 + o.shakeTime * 10);
        }
        if(o.notice!=='waiting') {o.displayTime-=dt;if(o.displayTime<=0)o.alive=false;}
        else if(!o.owner || o.owner.dead) o.alive=false;
        if(o.owner) {
            const margin=67;
            o.x=clamp(o.owner.x-margin,5,W-o.w-5);
            o.y=clamp(o.owner.y-125,74,H-o.h-40);
        }
        return true;
    }
    return false;
}
function scenarioDrawPaint(o) {
    if(o.points.length<2)return;
    const warning=o.t<o.warn;
    const partial=warning && !o.splitBarrier ? o.points : scenarioVisiblePaintPoints(o);
    if(partial.length<2)return;
    const alpha=o.finished?clamp((o.life-o.t)/.55,0,1):1;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(partial[0].x,partial[0].y);
    for(let i=1;i<partial.length;i++)ctx.lineTo(partial[i].x,partial[i].y);
    if(warning) {
        // A low-opacity PREVIEW only: damage and colored paint come afterwards.
        ctx.lineWidth=o.width+7;ctx.strokeStyle='#ffe8a1';
        ctx.globalAlpha=.16+.16*Math.abs(Math.sin(o.t*13));
        ctx.setLineDash([10,15]);ctx.stroke();ctx.setLineDash([]);
    } else {
        ctx.lineWidth=o.width*1.55;ctx.strokeStyle=o.color;ctx.globalAlpha=alpha*.15;ctx.stroke();
        ctx.lineWidth=o.width;ctx.strokeStyle=o.color;ctx.globalAlpha=alpha*.65;ctx.stroke();
        ctx.lineWidth=Math.max(2,o.width*.12);ctx.strokeStyle='#fffaca';ctx.globalAlpha=alpha*.24;ctx.stroke();
    }
    ctx.restore();
}
function scenarioDrawNewObject(o) {
    if(o.kind==='paintMark') {scenarioDrawPaint(o);return true;}
    if(o.kind==='shapeRush') {scenarioDrawShapeRush(o);return true;}
    if(o.kind==='submit') {
        if(o.owner?.state==='enter'&&o.notice==='waiting')return true;
        ctx.save();
        const waiting=o.notice==='waiting',fail=o.notice==='failed';
        const shake=fail?(Math.sin((scenarioClock+o.id)*72)*6*Math.max(0,o.shakeTime||0)+Math.cos((scenarioClock+o.id)*61)*3*Math.max(0,o.shakeTime||0)):0;
        ctx.translate(shake, fail ? Math.sin((scenarioClock+o.id)*57)*2.2*Math.max(0,o.shakeTime||0) : 0);
        ctx.fillStyle=waiting?'rgba(13,33,58,.85)':fail?'rgba(95,19,38,.91)':'rgba(12,89,66,.88)';
        ctx.strokeStyle=waiting?'#ffd184':fail?'#ff627f':'#7df2bb';
        ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(o.x,o.y,o.w,o.h,9);ctx.fill();ctx.stroke();
        ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold 16px system-ui';
        ctx.fillText(waiting?'제출 '+o.title+' · 대기':fail?'제출 실패':'제출 완료',o.x+o.w/2,o.y+23);
        ctx.font='bold 13px ui-monospace,monospace';
        ctx.fillStyle=waiting?'#ffe9b6':fail?'#ffb0bb':'#aaffd8';
        ctx.fillText(waiting?(Math.max(0,o.owner.data.submitRemaining)).toFixed(1)+'s':fail?'TIME OUT · BOOM':'SUCCESS',o.x+o.w/2,o.y+43);
        if(waiting){ctx.fillStyle='#ffe28f';ctx.fillRect(o.x+7,o.y+o.h-7,(o.w-14)*clamp(o.owner.data.submitRemaining/o.owner.data.submitMax,0,1),3);}
        ctx.restore();return true;
    }
    if(o.kind==='submitBlast'){
        const u=o.t/o.life;ctx.save();ctx.globalAlpha=(1-u)*.75;
        ctx.lineWidth=10*(1-u)+3;ctx.strokeStyle='#ff6880';
        ctx.beginPath();ctx.arc(o.x,o.y,o.radius*(.3+u*.8),0,Math.PI*2);ctx.stroke();
        ctx.restore();return true;
    }
    if(o.kind==='timerBeam') {
        const warning=o.t<o.warning;
        const pulse=.55+.45*Math.sin((scenarioClock+o.id)*18);
        const nx=Math.cos(o.angle+Math.PI/2), ny=Math.sin(o.angle+Math.PI/2);
        ctx.save();
        ctx.lineCap='round';
        if(warning) {
            ctx.globalCompositeOperation='screen';
            ctx.setLineDash([18,14]);ctx.lineDashOffset=-o.t*120;
            ctx.strokeStyle='rgba(255,214,133,.88)';ctx.lineWidth=6;
            ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();
        } else {
            ctx.globalCompositeOperation='screen';
            for(let i=0;i<6;i++) {
                const off=(Math.sin(o.t*24+i*1.4+o.id)*.5+Math.sin(o.t*41+i*.8+o.id*.7)*.5)*(4+i*1.9);
                ctx.strokeStyle=`rgba(255, ${190+i*7}, 86, ${0.12+i*0.05})`;
                ctx.lineWidth=o.width + 18 - i*2.6;
                ctx.beginPath();
                ctx.moveTo(o.x1+nx*off,o.y1+ny*off);
                ctx.lineTo(o.x2+nx*off,o.y2+ny*off);
                ctx.stroke();
            }
            ctx.strokeStyle='rgba(255,247,214,.96)';ctx.lineWidth=8 + pulse*3;
            ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();
            ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=3.2;
            ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();
            for(let j=0;j<8;j++) {
                const t=j/7;
                const bx=o.x1+(o.x2-o.x1)*t + nx*Math.sin(o.t*35+j*1.8)*3;
                const by=o.y1+(o.y2-o.y1)*t + ny*Math.sin(o.t*28+j*1.6)*3;
                ctx.fillStyle=`rgba(255,255,255,${0.26+pulse*0.12})`;
                ctx.beginPath();ctx.arc(bx,by,1.4+((j%3)*0.5),0,Math.PI*2);ctx.fill();
            }
        }
        ctx.restore();return true;
    }
    if(o.kind==='huntMark') {
        const p=o.t/o.life;ctx.save();ctx.globalAlpha=(1-p)*.65;
        ctx.strokeStyle='#eccfff';ctx.lineWidth=4;ctx.setLineDash([11,9]);
        ctx.beginPath();ctx.arc(o.x,o.y,40+p*12,0,Math.PI*2);ctx.stroke();
        ctx.restore();return true;
    }
    return false;
}
function drawScenarioProtectiveShield(e,w,h,y) {
    // A visible effect corresponds exactly to the 30% damage reduction.
    const rx=Math.max(48,w*.52),ry=Math.max(43,h*.50),t=time*2.6+e.seed;
    ctx.save();ctx.globalCompositeOperation='screen';ctx.translate(e.x,y);
    const grad=ctx.createRadialGradient(0,0,rx*.12,0,0,rx*1.22);
    grad.addColorStop(0,'rgba(114,134,255,.04)');
    grad.addColorStop(.75,'rgba(126,177,255,.15)');grad.addColorStop(1,'rgba(154,208,255,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,0,rx*1.18,ry*1.18,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#94ddff';ctx.lineWidth=3.8;ctx.globalAlpha=.65+.25*Math.sin(t);
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#bd9fff';ctx.lineWidth=5;ctx.globalAlpha=.8;
    for(let j=0;j<3;j++){
      const a=t*.72+j*Math.PI*2/3;
      ctx.beginPath();ctx.ellipse(0,0,rx+7,ry+7,0,a,a+.57);ctx.stroke();
    }
    for(let j=0;j<4;j++){
      const a=t*.6+j*Math.PI/2;
      ctx.fillStyle='#e5faff';ctx.beginPath();ctx.arc(Math.cos(a)*rx,Math.sin(a)*ry,3.6,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
}
function drawScenarioStarGuide() {
    const pts=Array.from({length:20},(_,i)=>scenarioStarPoint(i));
    ctx.save();ctx.strokeStyle='#96b0ff';ctx.globalAlpha=.30;
    ctx.lineWidth=3;ctx.setLineDash([11,13]);
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
    ctx.closePath();ctx.stroke();ctx.setLineDash([]);ctx.restore();
}

function getRedesignSimulatorState(engine) {
    if (!engine?.chapter2Wave?.enabled)
        return null;
    return { wave: currentWaveIndex + 1, alive: currentWaveEnemies().length, killed: scenarioKills, spawned: scenarioEnemiesSpawned,
        mechanics: {starCursor:scenarioStarCursor,graffitiMarks:scenarioObjects.filter(o=>o.alive&&o.kind==='paintMark').length,
        submitFailed:scenarioObjects.filter(o=>o.kind==='submit'&&o.notice==='failed').length,
        submitSuccess:scenarioObjects.filter(o=>o.kind==='submit'&&o.notice==='success').length,
        submitTimedOut:currentWaveEnemies().filter(e=>e.data.submitFailed).length,
        submissionBadges:scenarioObjects.filter(o=>o.kind==='submit'&&o.alive).length,
        verticalPanels:bullets.filter(b=>!b.dead&&b.kind==='eliteWall'&&b.data.axis==='vertical').length,
        clampWarnings:currentWaveEnemies().filter(e=>e.type==='compressor'&&e.state==='charge').map(e=>({axis:e.data.clampAxis||'horizontal',time:e.stateT,phase:e.data.phase||1})),
        shielded:currentWaveEnemies().filter(e=>scenarioIsLinked(e)).length,
        hunterDashes:currentWaveEnemies().filter(e=>e.state==='huntDash').length,
        pointerDashes:currentWaveEnemies().filter(e=>e.state==='starDash'||e.state==='dash').length,
        shapePainters:currentWaveEnemies().filter(e=>e.data.shapeRushSlot!=null).length,
        shapeDrawing:scenarioObjects.filter(o=>o.alive&&o.kind==='shapeRush'&&o.phase==='drawing').length,
        shapeOwners:scenarioObjects.filter(o=>o.kind==='shapeRush').map(o=>o.owner?.data.shapeRushSlot),
        presentationTelegraphs:currentWaveEnemies().filter(e=>e.data.presentationSlot!=null && (e.state==='aim'||e.state==='flash')).length,
        lineGridStates:currentWaveEnemies().filter(e=>e.data.lineGridPhase!=null)
            .map(e=>({id:e.scenarioOrder, phase:e.data.lineGridPhase,
                orientation:e.data.lineGridOrientation,slot:e.data.lineGridSlot,
                state:e.state,x:Math.round(e.x),y:Math.round(e.y),
                progress:Math.round((e.data.progress||0)/(e.data.line?.len||1)*100),
                finished:!!e.data.lineGridCompleted,
                entryX:e.data.lineGridX1,entryY:e.data.lineGridY1,
                endX:e.data.lineGridX2,endY:e.data.lineGridY2})),
        lineGridStrokeCount:trails.filter(t=>t.kind==='highlightStroke').length,
        splitSeen:scenarioSplitSeenCount,splitSpawned:scenarioSplitSpawned,splitFinalCompressors:scenarioSplitCompressorsSpawned,subThirtySpawned:scenarioSubSpawned,
        splitLanes:currentWaveEnemies().filter(e=>e.data.splitSubSlot!=null).map(e=>e.data.splitSubLaneY),
        splitLineProgress:scenarioObjects.filter(o=>o.kind==='paintMark'&&o.splitBarrier).map(o=>o.progress),
        splitLineLifetimes:scenarioObjects.filter(o=>o.kind==='paintMark'&&o.splitBarrier).map(o=>o.life),
        splitReleased:scenarioObjects.filter(o=>o.kind==='paintMark'&&o.splitBarrier&&o.releaseArmed).length},
        part: Math.floor(currentWaveIndex / 5) + 1, phase: scenarioStageLabel, form: scenarioWaveMode === 'rehearsal' ? [scenarioLastShape] : [],
        hazards: scenarioObjects.filter(o => o.alive).length, projectiles: bullets.length, allWavesCleared: !!engine.chapter2Wave.allWavesCleared,
        enemyStates: currentWaveEnemies().slice(0, 30).map(e => ({ type: e.type, state: e.state, shots: e.shots,
            x: Math.round(e.x), y: Math.round(e.y), r: Math.round(e.r), id:e.scenarioOrder,
            displayW: Math.round(monsterBox(e.type)[0]*(e.data.visualScale||1)),
            displayH: Math.round(monsterBox(e.type)[1]*(e.data.visualScale||1)),
            slot: e.data.graffitiSlot ?? e.data.huntSlot ?? e.data.starSlot ?? e.data.galagaSlot ?? null,
            painting: !!e.data.paintRef, stroke: e.data.stroke || 0, bounces: e.bounces,
            hp: Math.round(e.hp * 10) / 10 })),
        paintStates: scenarioObjects.filter(o=>o.alive&&o.kind==='paintMark').map(o=>({
            slot: o.owner?.data.graffitiSlot ?? null, progress: o.progress, t: o.t,
            finished: o.finished, warn: o.warn, life: o.life,
            head: scenarioPointAlongPaint(o,o.progress), start:o.points[0] })),
        bulletKinds: bullets.reduce((a, b) => { a[b.kind] = (a[b.kind] || 0) + 1; return a; }, {}) };
}
function debugDefeatCurrentWaveEnemies(engine) {
    if (!engine?.chapter2Wave?.enabled)
        return false;
    // Kill all currently spawned monsters; deferred kill-triggered groups must still spawn.
    const live = currentWaveEnemies().slice();
    for (const e of live)
        destroyEnemy(e);
    updateWaveSequence(engine, 0);
    return true;
}
function getRedesignAssetStatus() { return { enemyCount: Object.keys(monsterImagePaths).length, bulletCount: Object.keys(bulletImagePaths).length }; }
function getRedesignSimulatorGeometry() { return { width: W, height: H }; }
function chooseGhostTeleportPosition() {
    // 세로형 슈팅 기준으로 플레이어의 "앞"은 화면 위쪽입니다.
    // 플레이어 바로 앞이 아니라 약 340~430px 떨어진 전방 후보를 우선합니다.
    const desiredGaps = [370, 410, 450, 340];
    const sideOffsets = [0, -70, 70, -125, 125, -175, 175];
    const candidates = [];
    for (const gap of desiredGaps) {
        for (const side of sideOffsets) {
            const x = clamp(player.x + side, 90, W - 90);
            const y = clamp(player.y - gap, 105, H - 230);
            const dx = x - player.x, dy = y - player.y, d = Math.hypot(dx, dy);
            const isAhead = y < player.y - 80;
            if (isAhead)
                candidates.push({ x, y, d, gap, side });
        }
    }
    // 화면 위쪽에 공간이 부족한 경우에도 반드시 플레이어보다 위쪽이면서
    // 최소 320px 정도 떨어진 위치를 찾도록 좌우 전방 후보를 추가합니다.
    const upperY = clamp(player.y - 250, 90, Math.max(90, player.y - 90));
    for (const x of [90, W - 90, player.x < W / 2 ? W - 110 : 110]) {
        const d = Math.hypot(x - player.x, upperY - player.y);
        if (upperY < player.y - 80)
            candidates.push({ x, y: upperY, d, gap: 250, side: x - player.x });
    }
    const safe = candidates
        .filter(v => v.d >= 320)
        .sort((a, b) => {
        // 정면 중앙에 가깝고 목표 간격 390px 부근인 후보를 우선합니다.
        const sa = Math.abs(a.side) * 1.25 + Math.abs(a.d - 390);
        const sb = Math.abs(b.side) * 1.25 + Math.abs(b.d - 390);
        return sa - sb;
    });
    if (safe.length)
        return { x: safe[0].x, y: safe[0].y };
    // 극단적인 위치에서도 가장 멀리 떨어진 전방 후보를 사용합니다.
    const farthest = candidates.sort((a, b) => b.d - a.d)[0];
    return farthest ? { x: farthest.x, y: farthest.y } : { x: clamp(player.x, 90, W - 90), y: 105 };
}
function setState(e, s) { e.state = s; e.stateT = 0; }
function highlighterLineAcrossScreen(e) {
    const minX = -120, maxX = W + 120, minY = -120, maxY = H + 120;
    let angle = 0;
    for (let tries = 0; tries < 12; tries++) {
        angle = rnd(0, Math.PI);
        const prev = e.data.lastAngle;
        if (prev == null)
            break;
        let d = Math.abs(angle - prev) % Math.PI;
        d = Math.min(d, Math.PI - d);
        if (d > .34)
            break;
    }
    const cx = clamp(player.x + rnd(-190, 190), 115, W - 115);
    const cy = clamp(player.y + rnd(-210, 210), 115, H - 115);
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const hits = [];
    const add = (t, x, y) => {
        if (x >= minX - 1 && x <= maxX + 1 && y >= minY - 1 && y <= maxY + 1)
            hits.push({ t, x, y });
    };
    if (Math.abs(dx) > .0001) {
        let t = (minX - cx) / dx;
        add(t, minX, cy + t * dy);
        t = (maxX - cx) / dx;
        add(t, maxX, cy + t * dy);
    }
    if (Math.abs(dy) > .0001) {
        let t = (minY - cy) / dy;
        add(t, cx + t * dx, minY);
        t = (maxY - cy) / dy;
        add(t, cx + t * dx, maxY);
    }
    hits.sort((a, b) => a.t - b.t);
    const unique = [];
    for (const h of hits) {
        if (!unique.some(u => Math.hypot(u.x - h.x, u.y - h.y) < 2))
            unique.push(h);
    }
    let a = unique[0], b = unique[unique.length - 1];
    if (!a || !b) {
        a = { x: cx - Math.cos(angle) * 900, y: cy - Math.sin(angle) * 900 };
        b = { x: cx + Math.cos(angle) * 900, y: cy + Math.sin(angle) * 900 };
    }
    if (Math.random() < .5) {
        const tmp = a;
        a = b;
        b = tmp;
        angle += Math.PI;
    }
    const vx = b.x - a.x, vy = b.y - a.y, len = Math.hypot(vx, vy) || 1;
    e.data.line = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, dx: vx / len, dy: vy / len, len, angle: Math.atan2(vy, vx) };
    e.data.lastAngle = ((e.data.line.angle % Math.PI) + Math.PI) % Math.PI;
    e.data.wobbleSeed = Math.random() * 1000;
    e.data.progress = 0;
}
function spawnEliteClamp(e) {
    if (e.data.clampAxis === 'vertical') { spawnScenarioVerticalClamp(e); return; }
    const phase = e.data.phase || 1;
    const half = phase === 1 ? 125 : phase === 2 ? 102 : 82;
    const hold = phase === 1 ? .12 : phase === 2 ? .14 : .16;
    const inbound = phase === 1 ? .10 : phase === 2 ? .085 : .07;
    // Overlapping rows fully cover the top and bottom with no unreachable gaps.
    // Match the rendered safe rectangle exactly: no sine-offset gaps between rows.
    const rows = 20;
    const edgePad = 20;
    const topY = edgePad;
    const bottomY = H - edgePad;
    const gapCenter = e.data.gapCurrent ?? e.data.gapTarget ?? e.data.gap ?? W / 2;
    for (let i = 0; i < rows; i++) {
        const t = rows <= 1 ? 0.5 : i / (rows - 1);
        const y = topY + (bottomY - topY) * t;
        const rowGap = gapCenter;
        const leftStart = -145, rightStart = W + 145;
        const leftStop = rowGap - half - 68, rightStop = rowGap + half + 68;
        const leftSpeed = Math.abs(leftStop - leftStart) / inbound;
        const rightSpeed = Math.abs(rightStart - rightStop) / inbound;
        spawnBullet("eliteWall", leftStart, y, 0, 0, { wall: true, r: 0, scale: .24, dormant: true, active: false, data: { side: "left", stopX: leftStop, speed: leftSpeed, hold, delay: 0, phase, impactFx: i === Math.floor(rows / 2) } });
        spawnBullet("eliteWall", rightStart, y, Math.PI, 0, { wall: true, r: 0, scale: .24, dormant: true, active: false, data: { side: "right", stopX: rightStop, speed: rightSpeed, hold, delay: 0, phase, impactFx: false } });
    }
    addEffect("pulse", e.x, e.y + 20, { life: .55, r: 48, color: "#ffd84e" });
}
function updateEnemy(e, dt) {
    const oldX = e.x, oldY = e.y;
    e.t += dt;
    e.stateT += dt;
    const q = diff();
    if (e.state === 'smoothReenter') {
        scenarioSmoothReturn(e,dt);
        e.motionX=(e.x-oldX)/Math.max(dt,.001);
        e.motionY=(e.y-oldY)/Math.max(dt,.001);
        return;
    }
    if (updateScenarioSpecialEnemy(e,dt)) {
        e.motionX=(e.x-oldX)/Math.max(dt,.001);
        e.motionY=(e.y-oldY)/Math.max(dt,.001);
        return;
    }
    if (e.type === "ghost") {
        const ghostCruise = () => {
            e.y += 126*q*dt;
            e.x += Math.sin(e.t*3.2+e.seed)*82*dt;
            e.x=clamp(e.x,75,W-75);
        };
        if(e.state==='enter') {
            ghostCruise();
            if(e.y>=325 && Math.hypot(player.x-e.x,player.y-e.y)<750) {
                const dest=chooseGhostTeleportPosition();
                e.data.tx=dest.x;e.data.ty=dest.y;
                addEffect('ghostWarning',e.x,e.y,{life:.64/q,r:50,color:'#fff0a5',alpha:1});
                setState(e,'signal');
            }
        } else if(e.state==='signal') {
            ghostCruise();
            if(e.stateT>.42/q) setState(e,'ghostGlide');
        } else if(e.state==='ghostGlide') {
            const dx=e.data.tx-e.x,dy=e.data.ty-e.y, dist=Math.hypot(dx,dy);
            const speed=410*q*dt;
            if(dist>1) {const k=Math.min(dist,speed);e.x+=dx/dist*k;e.y+=dy/dist*k;}
            if(dist<=Math.max(10,speed)) {
                addEffect('ghostArrival',e.x,e.y,{life:.4/q,r:42,color:'#eee9ff',alpha:.75});
                setState(e,'postMove');
            }
        } else if(e.state==='postMove') ghostCruise();
    }
    else if (e.type === "pointer") {
        if (e.state === "enter") {
            if (e.data.bodyAngle == null)
                e.data.bodyAngle = Math.PI / 2;
            e.y += 170 * q * dt;
            if (e.y >= 170) {
                e.y = 170;
                setState(e, "aim");
            }
        }
        else if (e.state === "aim") {
            const target = aim(e.x, e.y);
            e.data.bodyAngle = turnAngle(e.data.bodyAngle ?? Math.PI / 2, target, 7.2 * q * dt);
            e.data.aim = e.data.bodyAngle;
            if (e.stateT > .72 / q)
                setState(e, "flash");
        }
        else if (e.state === "flash") {
            if (e.stateT > .48 / q) {
                const a = e.data.aim;
                e.vx = Math.cos(a) * 900 * q;
                e.vy = Math.sin(a) * 900 * q;
                e.data.bodyAngle = a;
                setState(e, "dash");
            }
        }
        else {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.data.bodyAngle = Math.atan2(e.vy, e.vx);
        }
    }
    else if (e.type === "submarine") {
        if (e.state === "main") {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            if (e.stateT > .62 / q)
                setState(e, "dive");
        }
        else if (e.state === "dive") {
            e.x += e.vx * dt * .45;
            e.y += e.vy * dt * .45;
            e.x += Math.sin(e.t * 12 + e.seed) * 15 * dt;
            if (e.stateT > .72 / q) {
                const a = aim(e.x, e.y), s = Math.max(520, 576 * q);
                e.vx = Math.cos(a) * s;
                e.vy = Math.sin(a) * s;
                addEffect("pulse", e.x, e.y, { life: .45, r: 44, color: "#63d5ff" });
                addEffect("bubble", e.x - 12, e.y + 6, { life: .48, vx: Math.cos(a + Math.PI * .6) * 105, vy: Math.sin(a + Math.PI * .6) * 105, r: 7, color: "#76e0ff", alpha: .72 });
                addEffect("bubble", e.x + 12, e.y - 6, { life: .48, vx: Math.cos(a - Math.PI * .6) * 105, vy: Math.sin(a - Math.PI * .6) * 105, r: 7, color: "#76e0ff", alpha: .72 });
                e.cool = 0;
                setState(e, "dash");
            }
        }
        else {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.cool -= dt;
            if (e.cool <= 0) {
                e.cool = .14;
                const a = Math.atan2(-e.vy, -e.vx) + rnd(-.25, .25);
                addEffect("bubble", e.x - e.vx * .02, e.y - e.vy * .02, { life: .48, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, r: 4, color: "#6ddfff", alpha: .55 });
            }
        }
    }
    else if (e.type === "anxiety") {
        if (e.state === "enter") {
            e.y += 130 * q * dt;
            e.x += Math.sin(e.t * 9) * 85 * dt;
            if (e.y > 220) {
                e.y = 220;
                setState(e, "move");
            }
        }
        else if (e.state === "move") {
            e.y = 220 + Math.sin(e.t * 2.4 + e.seed) * 18;
            e.x = clamp(e.x + Math.sin(e.t * 10) * 145 * dt, 85, W - 85);
            if (e.stateT > 1.15 / q)
                setState(e, "stop");
        }
        else if (e.state === "stop") {
            if (e.stateT > .22 / q) {
                const a = aim(e.x, e.y);
                for (let i = -2; i <= 2; i++)
                    spawnBullet("drop", e.x, e.y, a + i * .21, 285 * q, { r: 13, scale: .34 });
                e.shots++;
                e.vx = (Math.random() < .5 ? -1 : 1) * 220;
                setState(e, "evade");
            }
        }
        else if (e.state === "evade") {
            e.x += e.vx * dt;
            if (e.stateT > .3 / q)
                setState(e, "move");
        }
        else
            e.y -= 190 * dt;
    }
    else if (e.type === "noreply") {
        if (e.state === "enter") {
            e.y += 145 * q * dt;
            if (e.y > 220) {
                e.y = 220;
                setState(e, "attack");
            }
        }
        else if (e.state === "attack") {
            e.x += Math.sin(e.t * 2.4 + e.seed) * 28 * dt;
            if (!e.data.fired && e.stateT > .34 / q) {
                e.data.fired = true;
                const speed = 272 * q;
                const a1 = aim(e.x - 18, e.y + 48) - .07;
                const a2 = aim(e.x + 18, e.y + 48) + .07;
                spawnBullet("noReplyCore", e.x - 18, e.y + 48, a1, speed, { r: 22, scale: .95, state: "main" });
                spawnBullet("noReplyCore", e.x + 18, e.y + 48, a2, speed, { r: 22, scale: .95, state: "main" });
            }
            if (e.stateT > 2.15 / q) {
                e.shots++;
                e.data.fired = false;
                setState(e, "attack");
            }
        }
        else
            e.y -= 170 * dt;
    }
    else if (e.type === "format") {
        if (e.state === "enter") {
            const targetY=150;
            e.y+=Math.min(targetY-e.y,235*q*dt);
            if(e.y>=targetY-3) {
                e.y=targetY;
                if(e.data.corridorFriendly){
                    const dir=e.x<W/2?1:-1;
                    e.vx=dir*250*q;e.vy=86*q;
                }else{
                    e.vx=(e.x<W/2?1:-1)*210*q;
                    e.vy=210*q;
                }
                setState(e,'bounce');
            }
        }
        else if (e.state === "bounce") {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            let hit = false;
            if (e.x < 80 || e.x > W - 80) {
                e.vx *= -1;
                e.x = clamp(e.x, 80, W - 80);
                hit = true;
            }
            if (e.y < 120 || e.y > H * .62) {
                e.vy *= -1;
                e.y = clamp(e.y, 120, H * .62);
                hit = true;
            }
            if (hit) {
                e.bounces++;
                const a = Math.atan2(e.vy, e.vx);
                spawnBullet("x", e.x, e.y, a + Math.PI / 2, 250 * q, { r: 13, scale: .27 });
                spawnBullet("x", e.x, e.y, a - Math.PI / 2, 250 * q, { r: 13, scale: .27 });
                addEffect("pulse", e.x, e.y, { life: .35, r: 20, color: "#ff5960" });
                if (e.bounces >= 3)
                    setState(e, "warn");
            }
        }
        else if (e.state === "warn") {
            if (e.stateT > .62 / q) {
                for (let i = 0; i < 8; i++)
                    spawnBullet("x", e.x, e.y, i * Math.PI / 4, 310 * q, { r: 14, scale: .3 });
                for (let i = 0; i < 18; i++)
                    addEffect("spark", e.x, e.y, { life: .5, vx: rnd(-230, 230), vy: rnd(-230, 230), r: rnd(3, 7), color: "#ff565d" });
                burstParticles(e.x, e.y, "#ffe270", 16, 225);
                e.bounces = 0;
                e.vx *= -1;
                e.vy *= -1;
                setState(e, "bounce");
            }
        }
    }
    else if (e.type === "energy") {
        if (e.state === "enter") {
            e.y += 125 * q * dt;
            if (e.y > 255) {
                e.y = 255;
                e.data.round = 0;
                setState(e, "summon");
            }
        }
        else if (e.state === "summon") {
            // Smoothly drift to the orbit; never jump to the global center on state change.
            const tx=W/2+Math.sin(e.t*1.8+e.seed)*115;
            e.x+=(tx-e.x)*Math.min(1,dt*3.9*q);
            if (!e.data.spawned) {
                e.data.spawned = true;
                e.data.collected = 0;
                e.data.round++;
                const cx = player.x, cy = player.y;
                for (let i = 0; i < 3; i++)
                    spawnBullet("energyWisp", cx, cy, 0, 0, { r: 15, scale: .64, data: { owner: e, index: i, angle: i * Math.PI * 2 / 3, radius: 255, cx, cy } });
            }
            if (e.stateT > 1.35 / q)
                setState(e, "recall");
        }
        else if (e.state === "recall") {
            const dx = e.x - player.x, dy = e.y - player.y, d = len(dx, dy);
            if (d < 520) {
                player.x += dx / d * 22 * dt;
                player.y += dy / d * 22 * dt;
            }
            if (e.stateT > 1.2 / q || e.data.collected >= 3)
                setState(e, "overcharge");
        }
        else if (e.state === "overcharge") {
            e.x += Math.sin(e.stateT * 42) * 2.6;
            if (e.stateT > .48 / q) {
                const a = aim(e.x, e.y);
                spawnBullet("energyBomb", e.x, e.y + 56, a, 225 * q, { r: 31, scale: 1.44, data: { splitAt: .92 / q, owner: e } });
                setState(e, "cool");
            }
        }
        else if (e.state === "cool") {
            e.x += Math.sin(e.t * 3.4) * 95 * dt;
            if (e.stateT > .72 / q) {
                e.data.spawned = false;
                setState(e, "summon");
            }
        }
        else
            e.y -= 165 * dt;
    }
    else if (e.type === "reference") {
        const idx = e.data.index || 0;
        const targetX = W / 2 + (idx - 1.5) * 135, targetY = 165 + (idx % 2) * 72;
        if (e.state === "enter") {
            e.x += (targetX - e.x) * 4.2 * dt;
            e.y += (targetY - e.y) * 4.2 * dt;
            if (Math.hypot(targetX - e.x, targetY - e.y) < 8) {
                e.x = targetX;
                e.y = targetY;
                setState(e, "build");
            }
        }
        else if (e.state === "build") {
            // Rejoin the formation by flying, not by reassigning the formation coordinate.
            const tx=targetX+Math.sin(e.t*4+idx)*25;
            const ty=targetY+Math.cos(e.t*3.2+idx)*14;
            const k=Math.min(1,dt*5.8*q);
            e.x+=(tx-e.x)*k;
            e.y+=(ty-e.y)*k;
            if (!e.data.anchorMade && e.stateT > .22 / q + idx * .13) {
                e.data.anchorMade = true;
                const ang = -Math.PI * 3 / 4 + idx * Math.PI / 2;
                const ax = clamp(player.x + Math.cos(ang) * 205, 85, W - 85);
                const ay = clamp(player.y + Math.sin(ang) * 150, 330, H - 90);
                spawnBullet("citationAnchor", e.x, e.y, Math.atan2(ay - e.y, ax - e.x), 360 * q, { r: 13, scale: .58, data: { index: idx, targetX: ax, targetY: ay } });
            }
            if (e.stateT > 1.62 / q) {
                const a = aim(e.x, e.y) + (idx - 1.5) * .055;
                spawnBullet("citation", e.x, e.y + 24, a, 315 * q, { r: 12, scale: 1.05, curve: idx % 2 ? -.22 : .22 });
                e.vx = (idx < 2 ? 1 : -1) * (330 + idx * 18) * q;
                e.vy = (115 + (idx % 2) * 55) * q;
                setState(e, "cross");
            }
        }
        else {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.y += Math.sin(e.t * 10 + idx) * 38 * dt;
        }
    }
    else if (e.type === "highlighter") {
        if (e.state === "enter") {
            // 등장 직후 대기 없이 첫 선의 시작점으로 곧바로 돌진합니다.
            e.data.stroke = 0;
            e.data.batchId = `hl-${e.seed}-${time.toFixed(3)}`;
            e.data.lastAngle = null;
            highlighterLineAcrossScreen(e);
            setState(e, "reposition");
        }
        else if (e.state === "reposition") {
            const l = e.data.line;
            const dx = l.x1 - e.x, dy = l.y1 - e.y, d = Math.hypot(dx, dy) || 1;
            const sp = 900 * q;
            e.x += dx / d * Math.min(sp * dt, d);
            e.y += dy / d * Math.min(sp * dt, d);
            e.data.bodyAngle = l.angle;
            if (d < 10) {
                e.x = l.x1;
                e.y = l.y1;
                e.data.progress = 0;
                e.data.prevX = e.x;
                e.data.prevY = e.y;
                addEffect("pulse", e.x, e.y, { life: .25, r: 17, color: "#d7ff36" });
                setState(e, "paint");
            }
        }
        else if (e.state === "paint") {
            const l = e.data.line;
            const prevX = e.x, prevY = e.y;
            const speed = 650 * q;
            e.data.progress = Math.min(l.len, e.data.progress + speed * dt);
            const u = e.data.progress / l.len;
            const baseX = l.x1 + (l.x2 - l.x1) * u;
            const baseY = l.y1 + (l.y2 - l.y1) * u;
            const nx = -l.dy, ny = l.dx;
            const wobble = Math.sin(u * 19.5 + e.data.wobbleSeed) * 3.2 + Math.sin(u * 46.0 + e.data.wobbleSeed * .41) * 1.15;
            e.x = baseX + nx * wobble;
            e.y = baseY + ny * wobble;
            e.data.bodyAngle = l.angle;
            const segLen = Math.hypot(e.x - prevX, e.y - prevY);
            if (segLen > 1) {
                trails.push({ kind: "highlightStroke", batchId: e.data.batchId, x1: prevX, y1: prevY, x2: e.x, y2: e.y, t: 0, life: 999, fadeStart: null, r: 20 + rnd(-2.5, 2.5), alpha: .76, seed: Math.random() * 10 });
            }
            if (e.data.progress >= l.len) {
                e.data.stroke++;
                if (e.data.stroke >= 4) {
                    const fadeDuration = 2.65 / q;
                    for (const t of trails) {
                        if (t.kind === "highlightStroke" && t.batchId === e.data.batchId) {
                            t.fadeStart = t.t;
                            t.life = t.t + fadeDuration;
                        }
                    }
                    e.data.fadeDuration = fadeDuration;
                    // 마지막 획의 바깥쪽 끝에서 화면 안쪽으로 한 걸음 되돌아와
                    // 잉크가 사라지는 동안에도 형광펜 본체가 계속 보이게 합니다.
                    e.data.fadeX = clamp(l.x2 - l.dx * 150, 120, W - 120);
                    e.data.fadeY = clamp(l.y2 - l.dy * 150, 110, H - 110);
                    // Fade destination is a waypoint; do not snap to it instantly.
                    setState(e, "fade");
                }
                else {
                    highlighterLineAcrossScreen(e);
                    setState(e, "reposition");
                }
            }
        }
        else if (e.state === "fade") {
            const l = e.data.line;
            const fx = e.data.fadeX ?? clamp(e.x, 120, W - 120);
            const fy = e.data.fadeY ?? clamp(e.y, 110, H - 110);
            // 선이 사라지는 동안 화면 안에서 가볍게 떠 있도록 유지합니다.
            const vx=fx-e.x,vy=fy-e.y,d=Math.hypot(vx,vy);
            if(d>2) {const step=Math.min(d,dt*280*q);e.x+=vx/d*step;e.y+=vy/d*step;e.data.bodyAngle=Math.atan2(vy,vx);}
            else e.data.bodyAngle=l.angle;
            if (e.stateT > (e.data.fadeDuration || 2.65 / q))
                recycleScenarioEnemy(e);
        }
    }
    else if (e.type === "countdown") {
        const clockLaserMode = scenarioWaveMode === 'clock';
        if(e.state==='submitArrive') {
            const y=e.data.submitDesiredY??205;
            e.y+=Math.min(Math.max(0,y-e.y),235*q*dt);
            if(e.y>=y-2)setState(e,'count');
        }
        else if (e.state === "enter") {
            e.y += 145 * q * dt;
            if (e.y > 205) {
                e.y = 205;
                e.data.n = 3;
                e.data.clockLaserToggle = false;
                setState(e, "count");
            }
        }
        else if (e.state === "count") {
            if (e.stateT > .82 / q) {
                const n = e.data.n, count = n === 3 ? 4 : n === 2 ? 6 : 8;
                for (let i = 0; i < count; i++)
                    spawnBullet("timer", e.x, e.y, i * Math.PI * 2 / count + e.t * .15, 245 * q, { r: 12, scale: .66 });
                e.data.n--;
                if (e.data.n <= 0) {
                    if (clockLaserMode) {
                        e.data.clockLaserToggle = !e.data.clockLaserToggle;
                        if (e.data.clockLaserToggle) {
                            e.data.lockAngle = aim(e.x, e.y);
                            setState(e, 'beamAim');
                        }
                        else setState(e, "zero");
                    }
                    else setState(e, "zero");
                }
                else
                    e.stateT = 0;
            }
        }
        else if (e.state === 'beamAim') {
            const target = aim(e.x, e.y);
            e.data.lockAngle = turnAngle(e.data.lockAngle ?? target, target, dt * 8.2);
            e.data.bodyAngle = e.data.lockAngle;
            if (e.stateT > .42 / q) {
                spawnScenarioTimerBeam(e, e.data.lockAngle);
                addEffect('pulse', e.x, e.y, { life: .32, r: 34, color: '#ffd175' });
                e.shots++;
                e.data.n = 3;
                setState(e, 'count');
            }
        }
        else if (e.state === "zero") {
            if (e.stateT > .72 / q) {
                spawnBullet("timer", e.x, e.y, aim(e.x, e.y), 270 * q, { r: 27, scale: 1.12 });
                e.shots++;
                e.data.n = 3;
                setState(e, "count");
            }
        }
    }
    else if (e.type === "compressor") {
        const cruise = () => {
            if (e.data.moveVX == null)
                e.data.moveVX = (Math.random() < .5 ? -1 : 1) * 82 * q;
            e.x += e.data.moveVX * dt;
            const left = 155, right = W - 155;
            if (e.x < left) {
                e.x = left;
                e.data.moveVX = Math.abs(e.data.moveVX);
            }
            else if (e.x > right) {
                e.x = right;
                e.data.moveVX = -Math.abs(e.data.moveVX);
            }
            e.y = 175 + Math.sin(e.t * 1.45 + e.seed) * 9;
        };
        if (e.state === "enter") {
            e.y += 105 * q * dt;
            if (e.y > 175) {
                e.y = 175;
                e.data.phase = 1;
                e.data.clampCount = 0;
                e.data.moveVX = (Math.random() < .5 ? -1 : 1) * 82 * q;
                const g = scenarioFarClampX(player.x);
                e.data.gapTarget = g;
                e.data.gapCurrent = g;
                e.data.verticalGapTarget=scenarioFarClampY(player.y);
                e.data.verticalGapCurrent=e.data.verticalGapTarget;
                setState(e, "charge");
            }
        }
        else if (e.state === "charge") {
            if (e.data.splitFinalCompressor && !e.data.axisChosenForCharge) {
                const round=e.data.clampCount||0;
                if(!scenarioSplitAxisRounds.has(round)) scenarioSplitAxisRounds.set(round,Math.random()<.5?0:1);
                const bit=(scenarioSplitAxisRounds.get(round)+(e.data.splitFinalSerial||0))%2;
                e.data.clampAxis=bit?'vertical':'horizontal';
                e.data.axisChosenForCharge=true;
            }
            cruise();
            const follow = (1 - Math.exp(-dt * 4.8 * q));
            const target = e.data.gapTarget ?? W / 2;
            e.data.gapCurrent = (e.data.gapCurrent ?? target) + (target - (e.data.gapCurrent ?? target)) * follow;
            const vy=e.data.verticalGapTarget??H*.65;
            e.data.verticalGapCurrent=(e.data.verticalGapCurrent??vy)+(vy-(e.data.verticalGapCurrent??vy))*follow;
            // 원래 0.62~0.88초 -> 최소 1.9~2.45초의 시각적 경고 시간.
            if (e.stateT > (e.data.phase === 1 ? 2.45 : e.data.phase === 2 ? 2.15 : 1.90) / q) {
                e.data.clampCount = (e.data.clampCount || 0) + 1;
                spawnEliteClamp(e);
                e.data.axisChosenForCharge=false;
                setState(e, "clamp");
            }
        }
        else if (e.state === "clamp") {
            cruise();
            const follow = (1 - Math.exp(-dt * 3.4 * q));
            const target = e.data.gapTarget ?? W / 2;
            e.data.gapCurrent = (e.data.gapCurrent ?? target) + (target - (e.data.gapCurrent ?? target)) * follow;
            const wait = e.data.phase === 1 ? 1.75 : e.data.phase === 2 ? 1.62 : 1.52;
            if (e.stateT > wait / q) {
                const count = e.data.phase === 3 ? 12 : 8;
                for (let i = 0; i < count; i++)
                    spawnBullet("block", e.x, e.y + 42, i * Math.PI * 2 / count + (e.data.phase % 2) * .18, 235 * q + (e.data.phase - 1) * 28, { r: 12, scale: .2 });
                for (let i = 0; i < 14; i++)
                    addEffect("spark", e.x, e.y + 30, { life: .5, vx: rnd(-220, 220), vy: rnd(-120, 250), r: rnd(3, 7), color: "#ffd84e" });
                if (e.data.phase >= 3) {
                    e.data.phase = 1;
                    e.data.gapTarget = scenarioFarClampX(player.x);
                    e.data.verticalGapTarget=scenarioFarClampY(player.y);
                    setState(e, "recover");
                }
                else {
                    e.data.phase++;
                    const shift = e.data.phase === 2 ? (player.x < W / 2 ? 110 : -110) : 0;
                    e.data.gapTarget = scenarioFarClampX(player.x + shift);
                    const vshift=e.data.phase===2?(player.y<H*.58?80:-80):0;
                    e.data.verticalGapTarget=scenarioFarClampY(player.y + vshift);
                    setState(e, "charge");
                }
            }
        }
        else if (e.state === "recover") {
            cruise();
            if (e.stateT > .82 / q)
                setState(e, "charge");
        }
    }
    else if (e.type === "drone") {
        if (e.state === "enter") {
            e.y += 180 * q * dt;
            if (e.y > 310) {
                e.y = 310;
                e.shots = 0;
                e.cool = 0;
                e.data.boomerangBursts = 0;
                setState(e, "hover");
            }
        }
        else if (e.state === "hover") {
            e.x += Math.sin(e.t * 2.5 + e.seed) * 40 * dt;
            e.cool -= dt;
            if (e.cool <= 0) {
                e.cool = .72 / q;
                e.shots++;
                const a = aim(e.x, e.y);
                spawnBullet("miniShard", e.x, e.y + 28, a, 245 * q, { r: 10, scale: .68, data: { source: "reportDrone", maxLife: 20 } });
                if (e.shots % 3 === 0 && (e.data.boomerangBursts || 0) < 4) {
                    e.data.boomerangBursts = (e.data.boomerangBursts || 0) + 1;
                    spawnBullet("boomerangPage", e.x - 16, e.y + 8, a - .48, 215 * q, { r: 13, scale: .78, data: { curve: -1, source: "reportDrone", maxLife: 20 } });
                    spawnBullet("boomerangPage", e.x + 16, e.y + 8, a + .48, 215 * q, { r: 13, scale: .78, data: { curve: 1, source: "reportDrone", maxLife: 20 } });
                }
            }
        }
    }
    e.motionX = (e.x - oldX) / Math.max(dt, .001);
    e.motionY = (e.y - oldY) / Math.max(dt, .001);
    if (!e.dead && e.state !== "fade" && e.state !== "vanish") {
        e.exhaustTimer -= dt;
        if (e.exhaustTimer <= 0 && particles.length < MAX_PARTICLES * .82) {
            const [mw, mh] = monsterBox(e.type), color = monsterColor(e.type);
            pushParticle({ x: e.x + rnd(-8, 8), y: e.y + mh * .27, vx: rnd(-12, 12), vy: rnd(32, 60), life: rnd(.18, .34), size: rnd(1.2, 2.6), color, shape: "streak" });
            e.exhaustTimer = rnd(.11, .18);
        }
    }
    if (e.x < -180 || e.x > W + 180 || e.y < -220 || e.y > H + 220)
        recycleScenarioEnemy(e);
}
function bulletImage(k) { return images[k]; }
function updateBullet(b, dt) {
    b.px = b.x;
    b.py = b.y;
    b.t += dt;
    b.stateT += dt;
    b.cool -= dt;
    b.flash = Math.max(0, (b.flash || 0) - dt);
    if (b.kind === "citationAnchor") {
        if (b.state === "main") {
            const dx = b.data.targetX - b.x, dy = b.data.targetY - b.y, d = len(dx, dy), sp = 360 * diff();
            if (d < sp * dt + 6) {
                b.x = b.data.targetX;
                b.y = b.data.targetY;
                b.vx = 0;
                b.vy = 0;
                b.state = "anchor";
                b.stateT = 0;
                b.dormant = true;
                b.active = false;
            }
            else {
                b.x += dx / d * sp * dt;
                b.y += dy / d * sp * dt;
                b.a = Math.atan2(dy, dx);
            }
        }
        else if (b.state === "anchor") {
            if (b.stateT > .78 / diff() + b.data.index * .06) {
                b.dormant = false;
                b.active = true;
                b.state = "launch";
                b.stateT = 0;
                b.a = aim(b.x, b.y);
                const sp = 320 * diff();
                b.vx = Math.cos(b.a) * sp;
                b.vy = Math.sin(b.a) * sp;
                b.curve = b.data.index % 2 ? -.25 : .25;
            }
        }
        else {
            b.a += b.curve * .85 * dt;
            const sp = len(b.vx, b.vy);
            b.vx = Math.cos(b.a) * sp;
            b.vy = Math.sin(b.a) * sp;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        }
    }
    else if (b.kind === "energyWisp") {
        const owner = b.data.owner;
        if (!owner || owner.dead) {
            if (b.state !== "orphan") {
                b.state = "orphan";
                b.stateT = 0;
                b.dormant = false;
                b.active = true;
                b.a = aim(b.x, b.y);
                const sp = 235 * diff();
                b.vx = Math.cos(b.a) * sp;
                b.vy = Math.sin(b.a) * sp;
            }
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        }
        else if (b.state === "main") {
            b.data.angle += 2.35 * dt;
            b.data.radius = Math.max(102, b.data.radius - 112 * dt);
            b.x = b.data.cx + Math.cos(b.data.angle) * b.data.radius;
            b.y = b.data.cy + Math.sin(b.data.angle) * b.data.radius * .72;
            b.a = b.data.angle + Math.PI / 2;
            if (owner.state === "recall") {
                b.state = "return";
                b.stateT = 0;
                b.dormant = true;
                b.active = false;
            }
        }
        else {
            const dx = owner.x - b.x, dy = owner.y - b.y, d = len(dx, dy), sp = 540 * diff();
            b.x += dx / d * sp * dt;
            b.y += dy / d * sp * dt;
            b.a = Math.atan2(dy, dx);
            if (d < 24) {
                b.dead = true;
                owner.data.collected = (owner.data.collected || 0) + 1;
                addEffect("pulse", owner.x, owner.y, { life: .26, r: 18, color: "#a87cff" });
            }
        }
    }
    else if (b.kind === "energyBomb") {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.t > (b.data.splitAt || .9)) {
            const base = aim(b.x, b.y);
            for (let i = 0; i < 8; i++)
                spawnBullet("energy", b.x, b.y, i * Math.PI / 4 + base * .08, 225 * diff() + (i % 2) * 45, { r: 12, scale: .66 });
            for (let i = -1; i <= 1; i++)
                spawnBullet("energy", b.x, b.y, base + i * .18, 285 * diff(), { r: 13, scale: .72 });
            addEffect("pulse", b.x, b.y, { life: .58, r: 56, color: "#b88aff" });
            const owner = b.data.owner;
            if (owner && !owner.dead)
                owner.data.bombsSplit = (owner.data.bombsSplit || 0) + 1;
            vanishBullet(b, 1.35);
            b.dead = true;
        }
    }
    else if (b.kind === "eliteWall") {
        const vertical=b.data.axis==='vertical';
        const side=b.data.side;
        const dir=side==='left'||side==='top'?1:-1;
        const p=vertical?'y':'x',v=vertical?'vy':'vx';
        const stop=vertical?b.data.stopY:b.data.stopX;
        if (b.state === "main") {
            if (b.stateT < b.data.delay) return;
            b.dormant=false;b.active=true;b[v]=dir*b.data.speed;
            b.state='inbound';b.stateT=0;
        }
        else if (b.state === 'inbound') {
            b[p]+=b[v]*dt;
            const reached=dir===1?b[p]>=stop:b[p]<=stop;
            if(reached) {
                b[p]=stop;b[v]=0;b.state='hold';b.stateT=0;
                if(b.data.impactFx) {
                    // Heavy metal clamp impact: shake the entire arena and the player layer.
                    shake=Math.max(shake,25);
                    if(activeEngine) activeEngine.screenShakeIntensity=Math.max(activeEngine.screenShakeIntensity||0,17);
                    addEffect('pulse',vertical?b.x:W/2,vertical?H/2:b.y,
                        {life:.40,r:66,color:'#ffd84e'});
                }
            }
        }
        else if(b.state==='hold') {
            if(b.stateT>b.data.hold/diff()) {
                b.state='outbound';b[v]=-dir*b.data.speed*.78;b.stateT=0;
            }
        }
        else b[p]+=b[v]*dt;
    }
    else if (b.kind === "noReplyCore") {
        if (b.state === "main") {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.stateT > .65 / diff()) {
                b.state = "silence";
                b.stateT = 0;
            }
        }
        else {
            b.vx *= Math.pow(.004, dt);
            b.vy *= Math.pow(.004, dt);
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (!b.data.pulse && b.stateT > .22 / diff()) {
                b.data.pulse = true;
                addEffect("pulse", b.x, b.y, { life: .46, r: 62, color: "#75d3ff" });
            }
            if (b.stateT > .56 / diff()) {
                const base = aim(b.x, b.y);
                for (let i = -2; i <= 2; i++)
                    spawnBullet("miniShard", b.x, b.y, base + i * .22, 240 * diff(), { r: 10, scale: .82 });
                if (Math.hypot(player.x - b.x, player.y - b.y) < 180) {
                    for (let i = 0; i < 8; i++)
                        spawnBullet("miniShard", b.x, b.y, i * Math.PI / 4, 190 * diff(), { r: 8, scale: .62 });
                }
                for (let i = 0; i < 12; i++)
                    addEffect("spark", b.x, b.y, { life: .55, vx: rnd(-190, 190), vy: rnd(-190, 190), r: rnd(3, 6), color: "#7fd6ff" });
                vanishBullet(b, 1.15);
                b.dead = true;
            }
        }
    }
    else if (b.kind === "miniShard" || b.kind === "noReplyShard") {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.spin += .2 * dt;
        b.a += .2 * dt;
    }
    else if (b.kind === "boomerangPage") {
        const a = Math.atan2(b.vy, b.vx), speed = len(b.vx, b.vy), curve = b.data.curve || 1, na = a + curve * 1.25 * dt;
        b.vx = Math.cos(na) * speed;
        b.vy = Math.sin(na) * speed;
        b.a = na;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.t > 1.5 && !b.data.returned) {
            b.data.returned = true;
            const ra = aim(b.x, b.y);
            b.vx = Math.cos(ra) * speed * .9;
            b.vy = Math.sin(ra) * speed * .9;
            b.a = ra;
        }
    }
    else if (!b.dormant) {
        if (b.curve)
            b.a += b.curve * .9 * dt;
        if (b.turnAt && b.t > b.turnAt && !b.turned) {
            b.turned = true;
            b.a = aim(b.x, b.y);
            const sp = len(b.vx, b.vy);
            b.vx = Math.cos(b.a) * sp;
            b.vy = Math.sin(b.a) * sp;
        }
        if (b.curve) {
            const sp = len(b.vx, b.vy);
            b.vx = Math.cos(b.a) * sp;
            b.vy = Math.sin(b.a) * sp;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
    }
    if (b.data && b.data.maxLife != null && b.t >= b.data.maxLife) {
        vanishBullet(b, .8);
        b.dead = true;
    }
    if (b.x < -180 || b.x > W + 180 || b.y < -180 || b.y > H + 180)
        b.dead = true;
}
function updateEffects(dt) { for (const e of effects) {
    e.t += dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.vx *= Math.pow(.12, dt);
    e.vy *= Math.pow(.12, dt);
} compactAlive(effects, e => e.t < e.life); for (const t of trails)
    t.t += dt; compactAlive(trails, t => t.t < t.life); for (const p of particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(.2, dt);
    p.vy *= Math.pow(.2, dt);
} compactAlive(particles, p => p.age < p.life); for (const v of vanishes)
    v.age += dt; compactAlive(vanishes, v => v.age < v.life); }
function currentWaveEnemies() {
    return enemies.filter((enemy) => !enemy.dead && enemy.waveRunId === currentWaveRunId);
}
function updateRuntimeProgress(engine) {
    const runtime = engine.chapter2Wave;
    const wave = hardWaveDefs[currentWaveIndex];
    if (!runtime || !wave)
        return;
    const living = currentWaveEnemies();
    const remainingHp = living.reduce((sum, enemy) => sum + Math.max(0, enemy.hp), 0);
    const eventRatio = wave.events.length ? waveEventState.size / wave.events.length : 1;
    const combatRatio = waveTargetMaxHp > 0 ? clamp(1 - remainingHp / waveTargetMaxHp, 0, 1) : 0;
    let progress = eventRatio * 0.42 + combatRatio * 0.58;
    if (eventRatio >= 1 && living.length === 0)
        progress = 1;
    runtime.running = waveRunning || waveGap > 0;
    runtime.selectedWave = currentWaveIndex;
    runtime.nextWave = Math.min(hardWaveDefs.length - 1, currentWaveIndex + (waveGap > 0 ? 1 : 0));
    runtime.elapsed = waveTime;
    runtime.waveCount = hardWaveDefs.length;
    runtime.title = wave.title;
    runtime.section = wave.section;
    runtime.description = wave.desc;
    runtime.progress = clamp(progress, 0, 1);
    runtime.remainingEnemies = living.length;
    runtime.totalDefeated = scenarioKills;
    runtime.totalSpawned = scenarioEnemiesSpawned;
    runtime.formation = scenarioWaveMode === 'rehearsal' ? scenarioLastShape : scenarioWaveMode;
    runtime.eventStage = scenarioStageLabel;
    runtime.hazardCount = scenarioObjects.length;
}
function clearChapter2Field() {
    enemies = [];
    bullets = [];
    effects = [];
    trails = [];
    particles = [];
    vanishes = [];
    shake = 0;
    waveEventState.clear();
    waveTargetSpawned = 0;
    waveTargetMaxHp = 0;
}
function beginWave(engine, index, preserveField = false) {
    if (!preserveField)
        clearChapter2Field();
    currentWaveIndex = clamp(Math.floor(index), 0, hardWaveDefs.length - 1);
    currentWaveRunId = ++waveRunCounter;
    waveTargetSpawned = 0;
    waveTargetMaxHp = 0;
    resetScenario(currentWaveIndex);
    waveRunning = true;
    waveGap = 0;
    waveTime = 0;
    waveEventState.clear();
    engine.chapter2Wave.allWavesCleared = false;
    updateRuntimeProgress(engine);
}
function finishWave(engine) {
    if (!waveRunning)
        return;
    waveRunning = false;
    updateRuntimeProgress(engine);
    engine.chapter2Wave.progress = 1;
    if (currentWaveIndex < hardWaveDefs.length - 1) {
        waveGap = 0.83;
        return;
    }
    engine.chapter2Wave.running = false;
    engine.chapter2Wave.allWavesCleared = true;
    if (!completionNotified) {
        completionNotified = true;
        engine.onChapter2WavesComplete?.();
    }
}
function updateWaveSequence(engine, dt) {
    if (waveGap > 0) {
        waveGap -= dt;
        updateRuntimeProgress(engine);
        if (waveGap <= 0)
            beginWave(engine, currentWaveIndex + 1, true);
        return;
    }
    if (!waveRunning)
        return;
    const wave = hardWaveDefs[currentWaveIndex];
    if (!wave)
        return;
    waveTime += dt;
    for (const event of wave.events) {
        if (waveEventState.has(event.key))
            continue;
        let ready = false;
        try {
            ready = !!event.condition(waveTime);
        }
        catch (error) {
            console.error("[Chapter2Wave] event condition failed", error);
        }
        if (!ready)
            continue;
        waveEventState.add(event.key);
        event.action();
    }
    updateRuntimeProgress(engine);
    if (waveEventState.size >= wave.events.length && currentWaveEnemies().length === 0)
        finishWave(engine);
}
function enemyCanBeHit(enemy) {
    if (!enemy || enemy.dead)
        return false;
    if (enemy.type === "ghost" && (enemy.state === "vanish" || enemy.state === "appear" || enemy.state === 'huntWait' || enemy.state === 'huntVanish' || enemy.state === 'huntAppear'))
        return false;
    if (enemy.type === "submarine" && enemy.state === "dive")
        return false;
    return true;
}
function destroyEnemy(enemy) {
    if (!enemy || enemy.dead)
        return;
    const wasLastSupport=(enemy.type==='energy'||enemy.type==='noreply') &&
       getScenarioSupports().length===1 && ['network','teams','final'].includes(scenarioWaveMode);
    if (scenarioWaveMode==='submit' && enemy.data.submitIndex!=null) {
        const badge=scenarioObjects.find(o=>o.kind==='submit' && o.owner===enemy && o.alive);
        if (badge && badge.notice!=='failed') {badge.notice='success';badge.displayTime=1.3;badge.t=0;}
    }
    enemy.dead = true;
    // Chapter 2 enemies use their own death routine (not generic collision cleanup).
    // Match the Chapter 1 ordinary enemy drop rate and type distribution.
    if (activeEngine?.powerups && Math.random()<0.16) {
        const pickup=new PowerUp();
        pickup.x=enemy.x*virtualScaleX(activeEngine)-8;
        pickup.y=enemy.y*virtualScaleY(activeEngine)-8;
        pickup.width=16;pickup.height=16;pickup.vy=120;
        pickup.type=Math.random()<0.34?'heal':'power';
        activeEngine.powerups.push(pickup);
    }
    if (wasLastSupport) {
        for(const x of currentWaveEnemies()) if(!x.dead && x!==enemy) {
            addEffect('pulse',x.x,x.y,{r:x.r*1.4,life:.55,color:'#9ad5ff'});
            burstParticles(x.x,x.y,'#bca5ff',7,90);
        }
    }
    if (enemy.waveRunId === currentWaveRunId)
        scenarioKills += 1;
    const color = monsterAuraColors[enemy.type] || "#ffffff";
    burstParticles(enemy.x, enemy.y, color, enemy.clearTarget ? 22 : 14, enemy.clearTarget ? 260 : 190);
    addEffect("pulse", enemy.x, enemy.y, { life: 0.48, r: enemy.r * 0.75, color });
    shake = Math.max(shake, enemy.clearTarget ? 9 : 5);
    if (enemy.type === "highlighter") {
        for (const trail of trails) {
            if (trail.kind === "highlightStroke" && trail.batchId === enemy.data.batchId) {
                trail.fadeStart = trail.t;
                trail.life = Math.min(trail.life, trail.t + 1.65);
            }
        }
    }
}
function damageChapter2Player(engine: any) {
  if (Number(engine.player?.invulnTimer) > 0 || engine.player?.isDead) return;
  shake = Math.max(shake, 18);
  for (let i = 0; i < 20; i += 1) {
    addEffect("spark", player.x, player.y, {
      life: 0.5,
      vx: rnd(-220, 220),
      vy: rnd(-220, 220),
      r: rnd(3, 7),
      color: "#ff555d",
    });
  }
  engine.triggerPlayerHit?.();
}

function checkChapter2PlayerHazards(engine: any) {
  if (Number(engine.player?.invulnTimer) > 0 || engine.player?.isDead) return;
  for (const enemy of enemies) {
    let active = true;
    if (enemy.type === "ghost" && ["vanish", "appear", "huntWait", "huntVanish", "huntAppear"].includes(enemy.state)) active = false;
    if (enemy.type === "submarine" && enemy.state === "dive") active = false;
    if (active && Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.r + player.r * 0.55) {
      damageChapter2Player(engine);
      return;
    }
  }
  for (const bullet of bullets) {
    if (bullet.dead || !bullet.active || bullet.dormant) continue;
    if (bullet.kind === "eliteWall") {
      if (bullet.data.axis === "vertical") {
        if (Math.abs(bullet.x - player.x) < 42) {
          const edge = bullet.data.side === "top" ? bullet.y + 68 : bullet.y - 68;
          if ((bullet.data.side === "top" && player.y < edge) || (bullet.data.side === "bottom" && player.y > edge)) {
            damageChapter2Player(engine);
            return;
          }
        }
      } else if (Math.abs(bullet.y - player.y) < 42) {
        const edge = bullet.data.side === "left" ? bullet.x + 68 : bullet.x - 68;
        if ((bullet.data.side === "left" && player.x < edge) || (bullet.data.side === "right" && player.x > edge)) {
          damageChapter2Player(engine);
          return;
        }
      }
    } else if (bullet.wall) {
      if (
        Math.abs(bullet.y - player.y) < 42 &&
        ((bullet.vx > 0 && player.x < bullet.x + bullet.w) || (bullet.vx < 0 && player.x > bullet.x - bullet.w))
      ) {
        damageChapter2Player(engine);
        return;
      }
    } else if (Math.hypot(bullet.x - player.x, bullet.y - player.y) < bullet.r + player.r * 0.55) {
      vanishBullet(bullet, bullet.kind === "energyBomb" || bullet.kind === "block" ? 1.65 : 1);
      bullet.dead = true;
      damageChapter2Player(engine);
      return;
    }
  }
  for (const trail of trails) {
    if (trail.kind === "highlightStroke") {
      if (trail.fadeStart !== null && trail.fadeStart !== undefined) continue;
      const vx = trail.x2 - trail.x1;
      const vy = trail.y2 - trail.y1;
      const wx = player.x - trail.x1;
      const wy = player.y - trail.y1;
      const c2 = vx * vx + vy * vy || 1;
      const u = clamp((wx * vx + wy * vy) / c2, 0, 1);
      const px = trail.x1 + u * vx;
      const py = trail.y1 + u * vy;
      if (Math.hypot(player.x - px, player.y - py) < trail.r + player.r * 0.42) {
        damageChapter2Player(engine);
        return;
      }
    } else if (Math.hypot(trail.x - player.x, trail.y - player.y) < trail.r + player.r * 0.5) {
      damageChapter2Player(engine);
      return;
    }
  }
}

function processRealPlayerBullets(engine: any) {
  const sx = virtualScaleX(engine);
  const sy = virtualScaleY(engine);
  for (const shot of engine.bullets || []) {
    if (!shot.active || shot.isEnemy) continue;
    const shotX = (shot.x + Math.max(2, shot.width || 0) / 2) / sx;
    const shotY = (shot.y + Math.max(2, shot.height || 0) / 2) / sy;
    const shotRadius = Math.max(4, Math.min((shot.width || 8) / sx, (shot.height || 14) / sy) * 0.45);
    // The projectile remains the project's original shot. Only wave-specific
    // destructible objects and conditional support shields modify the target.
    if (scenarioProcessShot(shot, sx, sy)) continue;
    for (const enemy of enemies) {
      if (!enemyCanBeHit(enemy)) continue;
      if (Math.hypot(shotX - enemy.x, shotY - enemy.y) >= shotRadius + enemy.r * 0.72) continue;
      shot.active = false;
      enemy.hp -= Math.max(1, Number(shot.damage) || 1) * scenarioDamageScale(enemy);
      enemy.hitFlash = 1;
      const impactCanvasX = shot.x + Math.max(2, shot.width || 0) / 2;
      const impactCanvasY = shot.y + Math.max(2, shot.height || 0) / 2;
      spawnChapter1EnemyHitEffectSystem(engine, impactCanvasX, impactCanvasY);
      sfx.enemyHit();
      if (enemy.hp <= 0) destroyEnemy(enemy);
      break;
    }
  }
}

function processRealBomb(engine: any) {
  const active = !!engine.bombActive;
  if (!active) {
    lastBombActive = false;
    return;
  }
  const sx = virtualScaleX(engine);
  const sy = virtualScaleY(engine);
  const originX = Number(engine.bombOriginX || 0) / sx;
  const originY = Number(engine.bombOriginY || 0) / sy;
  const radius = Number(engine.bombRadius || 0) / Math.max(0.001, (sx + sy) * 0.5);
  const band = Math.max(34, radius * 0.09);
  for (const bullet of bullets) {
    if (bullet.dead || bullet.dormant) continue;
    const d = Math.hypot(bullet.x - originX, bullet.y - originY);
    if (d <= radius + band) {
      vanishBullet(bullet, 1.1);
      bullet.dead = true;
    }
  }
  for (const enemy of enemies) {
    if (enemy.dead || !enemyCanBeHit(enemy)) continue;
    const d = Math.hypot(enemy.x - originX, enemy.y - originY);
    if (d > radius + enemy.r + band) continue;
    // Chapter 1 smart-bomb semantics: the instant the purification wave reaches
    // an ordinary monster, remove it in that same frame instead of chipping HP
    // for several frames after the ring has already passed.
    enemy.bombConsumed = true;
    enemy.hp = 0;
    destroyEnemy(enemy);
  }
  lastBombActive = true;
}

function startChapter2WaveSystem(engine, startIndex = 0) {
    getCombatParallax(engine,"wave12").reset();
    activeEngine = engine;
    completionNotified = false;
    lastBombActive = false;
    time = 0;
    clearChapter2Field();
    engine.chapter2Wave.enabled = true;
    engine.chapter2Wave.allWavesCleared = false;
    engine.stage = 2;
    // GameEngine.start() always boots with phase 1 BGM first.
    // Explicitly switch here so Chapter 2 waves always use the former Chapter 1 wave track.
    sfx.startBgmForPhase(2);
    beginWave(engine, startIndex, false);
}
function stopChapter2WaveSystem(engine) {
    clearChapter2Field();
    waveRunning = false;
    waveGap = 0;
    if (engine?.chapter2Wave) {
        engine.chapter2Wave.enabled = false;
        engine.chapter2Wave.running = false;
    }
    if (activeEngine === engine)
        activeEngine = null;
}
function getChapter2WaveProgressSystem(engine) {
    updateRuntimeProgress(engine);
    return {
        waveIndex: currentWaveIndex,
        waveCount: hardWaveDefs.length,
        progress: engine.chapter2Wave?.progress || 0,
        title: hardWaveDefs[currentWaveIndex]?.title || "",
    };
}
function skipCurrentChapter2WaveSystem(engine) {
    if (!engine?.chapter2Wave?.enabled || engine.chapter2Wave.allWavesCleared)
        return false;
    const nextWaveIndex = currentWaveIndex + 1;
    clearChapter2Field();
    waveRunning = false;
    waveGap = 0;
    if (nextWaveIndex < hardWaveDefs.length) {
        // 테스트 스킵은 일반 웨이브 종료의 1.45초 간격을 사용하지 않는다.
        // 잔여 탄막/이펙트도 함께 지운 뒤 바로 다음 웨이브를 시작한다.
        beginWave(engine, nextWaveIndex, false);
        return true;
    }
    engine.chapter2Wave.running = false;
    engine.chapter2Wave.progress = 1;
    engine.chapter2Wave.selectedWave = hardWaveDefs.length - 1;
    engine.chapter2Wave.nextWave = hardWaveDefs.length - 1;
    engine.chapter2Wave.allWavesCleared = true;
    if (!completionNotified) {
        completionNotified = true;
        engine.onChapter2WavesComplete?.();
    }
    return true;
}
function updateChapter2WaveSystem(engine, dt) {
    if (!engine?.chapter2Wave?.enabled)
        return;
    activeEngine = engine;
    time += dt;
    const beforeX = player.x;
    const beforeY = player.y;
    syncPlayerFromEngine(engine);
    updateWaveSequence(engine, dt);
    for (const enemy of enemies) {
        spawnContextWaveRunId = enemy.waveRunId;
        enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - dt * 7.5);
        updateEnemy(enemy, dt);
    }
    for (const bullet of bullets) {
        spawnContextWaveRunId = bullet.waveRunId;
        updateBullet(bullet, dt);
        scenarioProcessEnemyBullet(bullet);
    }
    spawnContextWaveRunId = null;
    applyScenarioFormation(dt);
    updateScenarioEnvironment(engine, dt);
    applyVirtualPlayerPullToEngine(engine, beforeX, beforeY);
    syncPlayerFromEngine(engine);
    processRealPlayerBullets(engine);
    processRealBomb(engine);
    compactAlive(enemies, (enemy) => !enemy.dead);
    compactAlive(bullets, (bullet) => !bullet.dead);
    updateEffects(dt);
    shake *= Math.pow(0.03, dt);
    checkChapter2PlayerHazards(engine);
    scenarioHitsPlayer(engine);
    updateRuntimeProgress(engine);
}
function line(x1, y1, x2, y2, color, w, alpha = 1, dash = []) { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function strokeFill(fill, lineWidth = 6) { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lineWidth; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }
function highlight(x, y, rx, ry, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = "rgba(255,255,255,.93)"; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
function monsterColor(type) { return monsterAuraColors[type] || "#9fd8ff"; }
function bulletColor(kind) { return bulletEffectColors[kind] || "#a6dfff"; }
function drawMonsterAura(e, x, y, w, h, color) { const pulse = .78 + Math.sin(time * 4.2 + e.seed) * .16, r = Math.max(w, h) * .7; ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = pulse; ctx.translate(x, y); ctx.scale(1, .76); const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r); g.addColorStop(0, rgba(color, .22)); g.addColorStop(.55, rgba(color, .09)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
function drawMonsterExhaust(e, x, y, w, h, color) { if (e.type === "compressor" || e.state === "fade" || e.state === "vanish")
    return; const tail = 12 + Math.sin(time * 11 + e.seed) * 3, sy = y + h * .28; ctx.save(); ctx.globalCompositeOperation = "screen"; const g = ctx.createLinearGradient(x, sy, x, sy + tail); g.addColorStop(0, rgba(color, .48)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 7, sy); ctx.lineTo(x + 7, sy); ctx.lineTo(x, sy + tail); ctx.closePath(); ctx.fill(); ctx.restore(); }
function drawMonsterDataSparks(e, x, y, w, h, color) { ctx.save(); ctx.globalCompositeOperation = "screen"; for (let i = 0; i < 2; i++) {
    const a = time * (1.4 + i * .35) + e.seed + i * Math.PI, px = x + Math.cos(a) * w * .46, py = y + Math.sin(a) * h * .31, blink = .35 + .55 * Math.abs(Math.sin(time * 5.2 + e.seed + i));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + Math.PI * .25);
    ctx.globalAlpha = blink;
    ctx.fillStyle = color;
    ctx.fillRect(-1.8, -1.8, 3.6, 3.6);
    ctx.restore();
} ctx.restore(); }
function drawSpawnScan(e, x, y, w, h, color) { if (e.t >= .55)
    return; const t = e.t / .55; ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = (1 - t) * .72; ctx.fillStyle = color; ctx.fillRect(x - w * .62, y - h * .58 + t * h * 1.1, w * 1.24, 5); ctx.restore(); }
function attackCueValue(e) { const q = diff(); let rem = 99; if (e.type === "anxiety" && e.state === "stop")
    rem = .22 / q - e.stateT;
else if (e.type === "noreply" && e.state === "attack" && !e.data.fired)
    rem = .34 / q - e.stateT;
else if (e.type === "format" && e.state === "warn")
    rem = .62 / q - e.stateT;
else if (e.type === "energy" && e.state === "overcharge")
    rem = .48 / q - e.stateT;
else if (e.type === "reference" && e.state === "build" && !e.data.anchorMade)
    rem = .22 / q + (e.data.index || 0) * .13 - e.stateT;
else if (e.type === "countdown" && e.state === "count")
    rem = .82 / q - e.stateT;
else if (e.type === "countdown" && e.state === "zero")
    rem = .72 / q - e.stateT;
else if (e.type === "countdown" && e.state === "beamAim")
    rem = .42 / q - e.stateT;
else if (e.type === "compressor" && e.state === "charge") {
    const p = e.data.phase || 1;
    rem = (p === 1 ? .88 : p === 2 ? .72 : .62) / q - e.stateT;
}
else if (e.type === "drone" && e.state === "hover")
    rem = e.cool; return rem > 0 && rem < .28 ? 1 - rem / .28 : 0; }
function drawAttackCue(e, x, y, w, h, color) { const k = attackCueValue(e); if (k <= 0)
    return; const off = w * .56 + k * 16, yy = y, alpha = .25 + .7 * k; ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.globalAlpha = alpha; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x - off - 13, yy - 12); ctx.lineTo(x - off, yy); ctx.lineTo(x - off - 13, yy + 12); ctx.moveTo(x + off + 13, yy - 12); ctx.lineTo(x + off, yy); ctx.lineTo(x + off + 13, yy + 12); ctx.stroke(); ctx.restore(); }
function drawBulletTrail(b, color) { if (b.dormant || b.wall || b.kind === "eliteWall")
    return; const speed = Math.hypot(b.vx, b.vy); if (speed < 8)
    return; const dx = b.vx / speed, dy = b.vy / speed, L = clamp(speed * .055, 8, 24), x2 = b.x - dx * L, y2 = b.y - dy * L; ctx.save(); ctx.globalCompositeOperation = "screen"; const g = ctx.createLinearGradient(b.x, b.y, x2, y2); g.addColorStop(0, rgba(color, .67)); g.addColorStop(.55, rgba(color, .26)); g.addColorStop(1, rgba(color, 0)); ctx.strokeStyle = g; ctx.lineWidth = Math.max(3, b.r * .42) * ENEMY_BULLET_VISUAL_SCALE; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function drawBulletDataSparks(b, color) { if (b.dormant || b.wall || b.kind === "eliteWall")
    return; const speed = Math.hypot(b.vx, b.vy); if (speed < 8)
    return; const dx = b.vx / speed, dy = b.vy / speed, nx = -dy, ny = dx, phase = Math.floor((b.t * 24 + b.seed) % 3); ctx.save(); ctx.globalCompositeOperation = "screen"; for (let i = 0; i < 2; i++) {
    const back = 9 + i * 8, side = (i ? 1 : -1) * (2 + phase * .55), x = b.x - dx * back + nx * side, y = b.y - dy * back + ny * side;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI * .25 + b.t * 5 + i);
    ctx.globalAlpha = .3 + .18 * ((phase + i) % 3);
    ctx.fillStyle = color;
    ctx.fillRect(-1.4, -1.4, 2.8, 2.8);
    ctx.restore();
} ctx.restore(); }
function glowColorEnemy(type) { return ({ ghost: "#c7f5ff", pointer: "#5fd2ff", submarine: "#5bd7ff", anxiety: "#b97cff", noreply: "#8fe6ff", format: "#ff8a78", energy: "#ae8dff", reference: "#7fd8ff", highlighter: "#d6ff31", countdown: "#ffb95a", compressor: "#ffd65b", drone: "#fff0a5" }[type] || "#9fd8ff"); }
function glowColorBullet(kind) { return ({ paper: "#ffe58a", drop: "#c88cff", x: "#ff7d7d", energy: "#b18cff", energyWisp: "#b18cff", energyBomb: "#b18cff", citation: "#92dcff", citationAnchor: "#92dcff", ink: "#d8ff33", timer: "#ffb25d", block: "#e8edf5", miniShard: "#8fe6ff", noReplyShard: "#8fe6ff", noReplyCore: "#8fe6ff", boomerangPage: "#ffe8a9", eliteWall: "#ffd45e" }[kind] || "#a6dfff"); }
function drawSoftGlow(x, y, r, color, alpha = .22, sx = 1, sy = 1, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, r * sx, r * sy, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = alpha * .58; ctx.beginPath(); ctx.ellipse(0, 0, r * .62 * sx, r * .62 * sy, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
function drawMotionStreak(x1, y1, x2, y2, color, w, alpha = .24) { ctx.save(); ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.globalAlpha = alpha; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = alpha * .9; ctx.lineWidth = Math.max(2, w * .45); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function drawPointerTelegraph(e) {
    const a = e.data.aim ?? aim(e.x, e.y);
    const pulse = .5 + .5 * Math.sin(e.t * 24);
    const muzzleX = e.x + Math.cos(a) * 82;
    const muzzleY = e.y + Math.sin(a) * 82;
    const endX = muzzleX + Math.cos(a) * 1400;
    const endY = muzzleY + Math.sin(a) * 1400;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.globalAlpha = .10 + pulse * .09;
    ctx.strokeStyle = "#ff2f42";
    ctx.lineWidth = 13 + pulse * 5;
    ctx.beginPath();
    ctx.moveTo(muzzleX, muzzleY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalAlpha = .45 + pulse * .25;
    ctx.strokeStyle = "#ff6570";
    ctx.lineWidth = 5 + pulse * 2;
    ctx.beginPath();
    ctx.moveTo(muzzleX, muzzleY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalAlpha = .82 + pulse * .15;
    ctx.strokeStyle = "#ffe7e9";
    ctx.lineWidth = 1.5 + pulse;
    ctx.beginPath();
    ctx.moveTo(muzzleX, muzzleY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
}
function drawSubmarineReferenceShape() {
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#ffd84d";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-30, -8);
    ctx.lineTo(-48, 0);
    ctx.lineTo(-30, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#536486";
    ctx.beginPath();
    ctx.moveTo(-18, -13);
    ctx.lineTo(-28, -27);
    ctx.lineTo(-2, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18, 13);
    ctx.lineTo(-28, 27);
    ctx.lineTo(-2, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 19, 0, 0, Math.PI * 2);
    strokeFill("#314568", 6);
    ctx.fillStyle = "#7688a7";
    ctx.beginPath();
    ctx.ellipse(4, 6, 25, 8, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#52c9ef";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(12, -3, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    highlight(9, -7, 3, 2, -.3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-5, -17);
    ctx.lineTo(-5, -27);
    ctx.lineTo(4, -27);
    ctx.stroke();
    ctx.strokeStyle = "#7f91ad";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-5, -17);
    ctx.lineTo(-5, -27);
    ctx.lineTo(4, -27);
    ctx.stroke();
    ctx.restore();
}
function drawSubmarine(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const moveAngle = Math.atan2(e.vy, e.vx);
    ctx.rotate(moveAngle + Math.PI / 2);
    ctx.scale(MONSTER_SCALE, MONSTER_SCALE);
    ctx.globalAlpha = e.state === "dive" ? .22 : 1;
    drawSubmarineReferenceShape();
    ctx.restore();
}
function drawReportDroneReferenceShape(t) {
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    for (const sy of [-1, 1]) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-8, sy * 19);
        ctx.lineTo(-8, sy * 33);
        ctx.stroke();
        ctx.save();
        ctx.translate(-8, sy * 36);
        ctx.rotate(t * 11 * sy);
        ctx.strokeStyle = "#d8e0ec";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    ctx.fillStyle = "#f6eedc";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-24, -22);
    ctx.lineTo(12, -22);
    ctx.lineTo(24, -10);
    ctx.lineTo(24, 22);
    ctx.lineTo(-24, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff8e9";
    ctx.beginPath();
    ctx.moveTo(12, -22);
    ctx.lineTo(24, -10);
    ctx.lineTo(12, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(12, -22);
    ctx.lineTo(24, -10);
    ctx.lineTo(12, -10);
    ctx.stroke();
    ctx.fillStyle = "#ea5055";
    ctx.fillRect(-18, -17, 22, 5);
    ctx.fillStyle = "#8ab2ff";
    ctx.fillRect(-18, -8, 16, 3);
    ctx.strokeStyle = "#7f8ba2";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-18, i * 7);
        ctx.lineTo(12, i * 7);
        ctx.stroke();
    }
    ctx.fillStyle = "#ffd84e";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-14, 17, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    highlight(-10, -15, 5, 2, -.2);
    ctx.restore();
}
function drawDrone(e) { ctx.save(); ctx.translate(e.x, e.y); ctx.scale(MONSTER_SCALE, MONSTER_SCALE); drawReportDroneReferenceShape(e.t); ctx.restore(); }
function drawHighlighterFallback(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.data.bodyAngle ?? 0);
    ctx.scale(MONSTER_SCALE, MONSTER_SCALE);
    ctx.fillStyle = "#cfff24";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(-64, -22, 105, 44, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ecff9a";
    ctx.beginPath();
    ctx.roundRect(-48, -13, 64, 26, 8);
    ctx.fill();
    ctx.fillStyle = "#1b2530";
    ctx.beginPath();
    ctx.moveTo(38, -20);
    ctx.lineTo(67, -13);
    ctx.lineTo(67, 13);
    ctx.lineTo(38, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#baff1c";
    ctx.beginPath();
    ctx.moveTo(64, -11);
    ctx.lineTo(76, -7);
    ctx.lineTo(76, 7);
    ctx.lineTo(64, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}
function drawEnemy(e) {
    const [baseW, baseH] = monsterBox(e.type), color = monsterColor(e.type), bob = Math.sin(e.t * 3.5 + e.seed) * 3, ry = e.y + bob;
    let im = null, w = baseW, h = baseH, rot = 0, alpha = 1;
    if (e.state === 'huntWait' || e.state === 'huntVanish') return;
    if (e.data.visualScale) { w *= e.data.visualScale; h *= e.data.visualScale; }
    if (e.type === "ghost") {
        im = images.ghost;
        const vanishP = e.state === "vanish" ? clamp(e.stateT / (.46 / diff()), 0, 1) : 0, appearP = e.state === "appear" ? clamp(e.stateT / (.68 / diff()), 0, 1) : 1, signalPulse = e.state === "signal" ? Math.abs(Math.sin(e.stateT * 23)) : 1;
        alpha = e.state === "vanish" ? 1 - vanishP : e.state === "appear" ? .12 + .88 * appearP : e.state === "signal" ? .42 + .58 * signalPulse : 1;
        const sc = e.state === "vanish" ? 1 - vanishP * .58 : e.state === "appear" ? .40 + .60 * appearP : e.state === "signal" ? .94 + .10 * signalPulse : 1;
        w *= sc;
        h *= sc;
        rot = e.state === "signal" ? Math.sin(e.stateT * 38) * .065 : 0;
    }
    else if (e.type === "pointer") {
        im = images.pointer;
        rot = (e.state === "dash" ? Math.atan2(e.vy, e.vx) : (e.data.bodyAngle ?? Math.PI / 2)) + Math.PI;
    }
    else if (e.type === "anxiety")
        im = images.anxiety;
    else if (e.type === "noreply")
        im = images.noreply;
    else if (e.type === "format")
        im = images.format;
    else if (e.type === "energy")
        im = images.energy;
    else if (e.type === "reference")
        im = images.reference;
    else if (e.type === "highlighter") {
        im = images.highlighter;
        rot = e.data.bodyAngle ?? 0;
    }
    else if (e.type === "countdown")
        im = images.countdown;
    else if (e.type === "compressor")
        im = images.compressor;
    const oriented = e.type === "pointer" || e.type === "highlighter" || e.type === "submarine";
    if (!oriented && e.type !== "compressor")
        rot += Math.sin(e.t * 2) * .025;
    if (!oriented && e.type !== "compressor" && Math.hypot(e.motionX || 0, e.motionY || 0) > 30)
        rot += clamp((e.motionX || 0) / 900, -.13, .13) + Math.sin(e.t * 3.2) * .035;
    drawMonsterAura(e, e.x, ry, w, h, color);
    drawMonsterExhaust(e, e.x, ry, w, h, color);
    const speed = Math.hypot(e.motionX || 0, e.motionY || 0), nx = speed > 1 ? (e.motionX / speed) : 0, ny = speed > 1 ? (e.motionY / speed) : 0, after = speed > 180 && (e.state === "dash" || e.type === "format" || e.type === "highlighter" || e.type === "ghost" || e.type === "reference" || e.type === "submarine");
    const drawSpecial = (x, y, a = 1) => { ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = a < 1 ? "screen" : "source-over"; const ox = e.x, oy = e.y; e.x = x; e.y = y; if (e.type === "submarine")
        drawSubmarine(e);
    else if (e.type === "drone")
        drawDrone(e);
    else if (e.type === "highlighter" && (!im || !im.complete || !im.naturalWidth))
        drawHighlighterFallback(e); e.x = ox; e.y = oy; ctx.restore(); };
    if (after) {
        for (let i = 2; i >= 1; i--) {
            const ax = e.x - nx * (10 + i * 10), ay = ry - ny * (10 + i * 10), aa = i === 1 ? .18 : .1;
            if (e.type === "submarine" || e.type === "drone" || (e.type === "highlighter" && (!im || !im.complete || !im.naturalWidth)))
                drawSpecial(ax, ay, aa);
            else
                drawImageFit(im, ax, ay, w, h, rot, aa);
        }
    }
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    if (e.type === "submarine" || e.type === "drone" || (e.type === "highlighter" && (!im || !im.complete || !im.naturalWidth)))
        drawSpecial(e.x, ry, 1);
    else
        drawImageFit(im, e.x, ry, w, h, rot, alpha);
    ctx.restore();
    const hitFlashAlpha = clamp(e.hitFlash || 0, 0, 1) * .62;
    if (hitFlashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = hitFlashAlpha;
        ctx.filter = "brightness(4) saturate(0)";
        if (e.type === "submarine" || e.type === "drone" || (e.type === "highlighter" && (!im || !im.complete || !im.naturalWidth)))
            drawSpecial(e.x, ry, 1);
        else
            drawImageFit(im, e.x, ry, w, h, rot, alpha);
        ctx.restore();
    }
    drawMonsterDataSparks(e, e.x, ry, w, h, color);
    drawSpawnScan(e, e.x, ry, w, h, color);
    drawAttackCue(e, e.x, ry, w, h, color);
    if (e.type === "pointer" && (e.state === "aim" || e.state === "flash" || e.state === 'starAim' || e.state === 'starFlash')) {
        const oy = e.y;
        e.y = ry;
        drawPointerTelegraph(e);
        e.y = oy;
    }
    if (e.type === "energy" && (e.state === "summon" || e.state === "recall" || e.state === "overcharge")) {
        ctx.save();
        ctx.translate(e.x, ry);
        ctx.strokeStyle = "#a87cff";
        ctx.lineWidth = e.state === "overcharge" ? 9 : 6;
        ctx.globalAlpha = .38 + .24 * Math.sin(time * 12);
        const rr = e.state === "recall" ? 112 : e.state === "overcharge" ? 86 : 100;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, rr - i * 15, time * (1.3 + i * .35) + i, time * (1.3 + i * .35) + i + Math.PI * .9);
            ctx.stroke();
        }
        ctx.restore();
    }
    if (e.type === "countdown" && e.state === "count") {
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5;
        ctx.font = "900 64px Arial";
        ctx.textAlign = "center";
        ctx.strokeText(String(e.data.n || 3), e.x, ry + 18);
        ctx.fillText(String(e.data.n || 3), e.x, ry + 18);
        ctx.restore();
    }
    if (e.type === "countdown" && e.state === "beamAim") {
        const ang = e.data.lockAngle ?? aim(e.x, e.y);
        const edge = scenarioBeamToEdge(e.x, ry, ang, 24);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        ctx.setLineDash([18, 14]);
        ctx.lineDashOffset = -time * 58;
        ctx.strokeStyle = 'rgba(255,219,128,.92)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(e.x, ry);
        ctx.lineTo(edge.x, edge.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, ry);
        ctx.lineTo(edge.x, edge.y);
        ctx.stroke();
        ctx.restore();
    }
    if (e.type === "compressor") {
        const phase = e.data.phase || 1;
        ctx.save();
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < phase ? "#ff565d" : "#59647a";
            ctx.strokeStyle = INK;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(e.x - 32 + i * 32, ry - 96);
            ctx.lineTo(e.x - 22 + i * 32, ry - 86);
            ctx.lineTo(e.x - 32 + i * 32, ry - 76);
            ctx.lineTo(e.x - 42 + i * 32, ry - 86);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
        if (e.state === "charge") {
            const vertical=e.data.clampAxis==='vertical';
            const half=vertical?(phase===1?170:phase===2?153:140):(phase===1?125:phase===2?102:82);
            const g=vertical?(e.data.verticalGapCurrent??e.data.verticalGapTarget??H*.65):(e.data.gapCurrent??e.data.gapTarget??W*.5);
            const pulse=.48+.28*Math.abs(Math.sin(e.stateT*8.5));
            // 압축 방향과 직교하는 축 전체가 안전 통로가 되도록 표시.
            const xRatio = renderWorldWidth / W;
            const safeHalfX = half * xRatio;
            const sx=vertical?0:g-safeHalfX, sy=vertical?g-half:0;
            const sw=vertical?renderWorldWidth:safeHalfX*2, sh=vertical?half*2:H;
            ctx.save();
            ctx.fillStyle=`rgba(135,255,200,${pulse*.13})`;
            ctx.fillRect(sx,sy,sw,sh);
            ctx.strokeStyle=`rgba(181,255,215,${pulse*.95})`;
            ctx.lineWidth=phase===3?8:6;
            ctx.setLineDash([18,12]);ctx.lineDashOffset=-time*34;
            ctx.strokeRect(sx,sy,sw,sh);ctx.setLineDash([]);
            ctx.strokeStyle=`rgba(255,255,255,${pulse*.55})`;
            ctx.lineWidth=2;
            ctx.strokeRect(sx+8,sy+8,Math.max(0,sw-16),Math.max(0,sh-16));
            // 상하 방향이 바뀌어도 가로형과 동일한 청록색 안전 통로 예고.
            ctx.restore();
        }
    }
    if (scenarioIsLinked(e)) drawScenarioProtectiveShield(e, w, h, ry);

}
function drawNoReplyShard() {
    ctx.save();
    ctx.rotate(Math.PI / 8);
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(11, -4);
    ctx.lineTo(5, 13);
    ctx.lineTo(-12, 7);
    ctx.closePath();
    strokeFill("#74cfff", 4);
    ctx.fillStyle = "#dff7ff";
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.lineTo(5, -2);
    ctx.lineTo(1, 7);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
function drawNoReplyCore(b) {
    ctx.save();
    ctx.rotate(Math.sin(b.t * 7) * .08);
    ctx.beginPath();
    ctx.moveTo(-24, -14);
    ctx.lineTo(12, -18);
    ctx.lineTo(26, -6);
    ctx.lineTo(20, 16);
    ctx.lineTo(-4, 18);
    ctx.lineTo(-16, 28);
    ctx.lineTo(-14, 16);
    ctx.lineTo(-26, 6);
    ctx.closePath();
    strokeFill("#7bcdf7", 6);
    ctx.fillStyle = "#dff7ff";
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(8, -11);
    ctx.lineTo(17, -2);
    ctx.lineTo(13, 10);
    ctx.lineTo(-2, 12);
    ctx.lineTo(-10, 18);
    ctx.lineTo(-9, 10);
    ctx.lineTo(-19, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4b93c7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(-5, -1);
    ctx.lineTo(4, 4);
    ctx.lineTo(-1, 12);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-9, -1, 3.1, 0, Math.PI * 2);
    ctx.arc(1, -1, 3.1, 0, Math.PI * 2);
    ctx.arc(11, -1, 3.1, 0, Math.PI * 2);
    ctx.fill();
    highlight(-10, -8, 4, 2, -.3);
    if (b.state === "silence") {
        ctx.strokeStyle = "#dff8ff";
        ctx.lineWidth = 3;
        ctx.globalAlpha = .45 + .2 * Math.sin(b.stateT * 18);
        ctx.beginPath();
        ctx.arc(0, 0, 34 + Math.sin(b.stateT * 10) * 4, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}
function drawBoomerangPage() {
    ctx.fillStyle = "#fff2c6";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-15, -8);
    ctx.lineTo(8, -13);
    ctx.lineTo(15, -3);
    ctx.lineTo(-5, 11);
    ctx.lineTo(-16, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e25a5c";
    ctx.fillRect(-10, -7, 10, 3);
}
function drawEliteWall(b,railWidth=renderWorldWidth) {
    const side = b.data.side;
    const preview = b.dormant === true;
    // Horizontal bullet x positions are stretched for rendering; the leading-edge offset must be too.
    // The rotated (vertical) rails use the un-stretched y axis and keep the raw 68px offset.
    const frontMargin = b.data.axis === 'vertical' ? 68 : 68 * (renderWorldWidth / W);
    const front = preview ? (side === "left" ? b.data.stopX + frontMargin : b.data.stopX - frontMargin) : (side === "left" ? b.x + frontMargin : b.x - frontMargin);
    const bodyStart = side === "left" ? 0 : front;
    const bodyWidth = side === "left" ? Math.max(0, front) : Math.max(0, railWidth - front);
    const bodyTop = b.y - 34;
    const bodyH = 68;
    const dir = side === "left" ? 1 : -1;
    ctx.save();
    ctx.globalAlpha = preview ? .95 : 1;
    if (preview) {
        ctx.save();
        // 압축 전 예고는 안전 통로를 기준으로 단순하게 표시
        ctx.strokeStyle = "rgba(255,223,97,0.82)";
        ctx.lineWidth = 3;
        ctx.setLineDash([9, 7]);
        ctx.beginPath();
        ctx.moveTo(front, bodyTop - 5);
        ctx.lineTo(front, bodyTop + bodyH + 5);
        ctx.stroke();
        ctx.setLineDash([]);
        const headX = b.data.stopX;
        const headY = b.y;
        const headW = 96, headH = 82;
        ctx.translate(headX, headY);
        ctx.globalAlpha = .22 + .08 * Math.sin(time * 8 + b.y * .01);
        ctx.fillStyle = "rgba(220,228,238,0.26)";
        ctx.strokeStyle = "rgba(240,246,255,0.55)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        ctx.roundRect(-headW / 2, -headH / 2, headW, headH, 18);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        return;
    }
    // 메인 압축 레일 본체
    ctx.fillStyle = "rgba(64,76,98,0.92)";
    ctx.fillRect(bodyStart, bodyTop, bodyWidth, bodyH);
    ctx.strokeStyle = "#0f1928";
    ctx.lineWidth = 4;
    ctx.strokeRect(bodyStart, bodyTop, bodyWidth, bodyH);
    // 상하 금속 레일
    ctx.fillStyle = "rgba(18,28,44,0.95)";
    ctx.fillRect(bodyStart, bodyTop, bodyWidth, 8);
    ctx.fillRect(bodyStart, bodyTop + bodyH - 8, bodyWidth, 8);
    // 내부 패널 구획
    ctx.strokeStyle = "rgba(136,155,183,0.55)";
    ctx.lineWidth = 2;
    for (let x = bodyStart + 42; x < bodyStart + bodyWidth - 20; x += 68) {
        ctx.beginPath();
        ctx.moveTo(x, bodyTop + 11);
        ctx.lineTo(x, bodyTop + bodyH - 11);
        ctx.stroke();
    }
    // 압축 전면의 경고 패널
    const stripeX = side === "left" ? front - 34 : front;
    ctx.fillStyle = "rgba(214,223,235,0.97)";
    ctx.fillRect(stripeX, bodyTop - 2, 34, bodyH + 4);
    ctx.strokeStyle = "#152132";
    ctx.lineWidth = 3;
    ctx.strokeRect(stripeX, bodyTop - 2, 34, bodyH + 4);
    ctx.save();
    ctx.beginPath();
    ctx.rect(stripeX + 2, bodyTop, 30, bodyH);
    ctx.clip();
    ctx.strokeStyle = "#f5c73a";
    ctx.lineWidth = 7;
    for (let yy = bodyTop - 16; yy < bodyTop + bodyH + 20; yy += 18) {
        ctx.beginPath();
        if (side === "left") {
            ctx.moveTo(stripeX + 2, yy);
            ctx.lineTo(stripeX + 34, yy + 22);
        }
        else {
            ctx.moveTo(stripeX + 34, yy);
            ctx.lineTo(stripeX + 2, yy + 22);
        }
        ctx.stroke();
    }
    ctx.restore();
    // 이동하는 압축 헤드
    const headX = b.x;
    const headY = b.y;
    const headW = 96;
    const headH = 82;
    ctx.save();
    ctx.translate(headX, headY);
    // 바깥 프레임
    ctx.fillStyle = "#d8dee9";
    ctx.strokeStyle = "#111a27";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-headW / 2, -headH / 2, headW, headH, 18);
    ctx.fill();
    ctx.stroke();
    // 내부 압축 드럼
    ctx.fillStyle = "#f3f5f8";
    ctx.beginPath();
    ctx.roundRect(-34, -26, 68, 52, 15);
    ctx.fill();
    ctx.stroke();
    // 균열/주름
    ctx.strokeStyle = "rgba(126,137,154,0.75)";
    ctx.lineWidth = 2;
    const crack = (x1, y1, x2, y2, x3, y3) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke(); };
    crack(-26, -16, -10, -9, -20, 4);
    crack(8, -20, 19, -8, 6, 3);
    // 중앙 경고 띠
    ctx.fillStyle = "#f8d347";
    ctx.beginPath();
    ctx.roundRect(-38, -9, 76, 18, 7);
    ctx.fill();
    ctx.strokeStyle = "#1a2433";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-36, -8, 72, 16, 6);
    ctx.clip();
    ctx.strokeStyle = "#1a2433";
    ctx.lineWidth = 5;
    for (let xx = -48; xx < 52; xx += 18) {
        ctx.beginPath();
        ctx.moveTo(xx, -12);
        ctx.lineTo(xx + 18, 12);
        ctx.stroke();
    }
    ctx.restore();
    // 측면 암/클램프
    ctx.fillStyle = "#bec8d7";
    ctx.strokeStyle = "#121d2b";
    ctx.lineWidth = 4;
    const armDir = side === "left" ? -1 : 1;
    ctx.beginPath();
    ctx.roundRect(armDir * 26 - 10, -31, armDir * 18, 62, 9);
    ctx.fill();
    ctx.stroke();
    // 상단 캡
    ctx.fillStyle = "#e7ebf1";
    ctx.beginPath();
    ctx.ellipse(0, -headH / 2 + 4, 31, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // 전면 충돌선 강조
    ctx.strokeStyle = "rgba(255,216,78,0.92)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(front, bodyTop - 4);
    ctx.lineTo(front, bodyTop + bodyH + 4);
    ctx.stroke();
    ctx.restore();
}
function drawReferenceLinks() {
    const nodes = bullets.filter(b => b.kind === "citationAnchor" && b.state === "anchor" && !b.dead).sort((a, b) => (a.data.index || 0) - (b.data.index || 0));
    if (nodes.length < 2)
        return;
    ctx.save();
    ctx.strokeStyle = "#9bd8ff";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 9]);
    ctx.globalAlpha = .42 + .18 * Math.sin(time * 10);
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++)
        ctx.lineTo(nodes[i].x, nodes[i].y);
    if (nodes.length === 4)
        ctx.closePath();
    ctx.stroke();
    ctx.restore();
}
function drawBullet(b) {
    if (b.kind === "eliteWall" && b.dormant)
        return;
    const color = bulletColor(b.kind);
    drawBulletTrail(b, color);
    drawBulletDataSparks(b, color);
    ctx.save();
    if (b.kind === "eliteWall") {
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
    }
    else {
        ctx.shadowColor = color;
        ctx.shadowBlur = (b.kind === "energyBomb" || b.kind === "block") ? 11 : 7;
    }
    if (b.kind === "noReplyCore") {
        ctx.globalAlpha = b.alpha;
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a + Math.PI / 2);
        ctx.scale(b.scale * ENEMY_BULLET_VISUAL_SCALE, b.scale * ENEMY_BULLET_VISUAL_SCALE);
        drawNoReplyCore(b);
    }
    else if (b.kind === "miniShard" || b.kind === "noReplyShard") {
        ctx.globalAlpha = b.dormant ? .55 : 1;
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a + Math.PI / 2);
        ctx.scale(b.scale * ENEMY_BULLET_VISUAL_SCALE, b.scale * ENEMY_BULLET_VISUAL_SCALE);
        drawNoReplyShard();
    }
    else if (b.kind === "boomerangPage") {
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a + Math.PI / 2);
        ctx.scale(b.scale * ENEMY_BULLET_VISUAL_SCALE, b.scale * ENEMY_BULLET_VISUAL_SCALE);
        drawBoomerangPage();
    }
    else if (b.kind === "eliteWall") {
        if(b.data.axis==='vertical') {
            ctx.save();
            ctx.translate(renderWorldWidth,0);
            ctx.rotate(Math.PI/2);
            // The horizontal aspect-correction stretches x. Rotate around the actual rendered width.
            const rotated={...b,x:b.y,y:renderWorldWidth-b.x,
                data:{...b.data,side:b.data.side==='top'?'left':'right',stopX:b.data.stopY}};
            drawEliteWall(rotated,H);
            ctx.restore();
        } else drawEliteWall(b);
    }
    else {
        const map = { paper: "paper", drop: "drop", x: "x", energy: "energyOrb", energyWisp: "energyOrb", energyBomb: "energyOrb", citation: "citation", citationAnchor: "citation", ink: "ink", timer: "timer", block: "block" }, im = images[map[b.kind]];
        if (b.wall) {
            const dir = b.vx > 0 ? 1 : -1;
            drawImageFit(im, b.x, b.y, Math.min(160, Math.max(75, b.w * .32)) * ENEMY_BULLET_VISUAL_SCALE, 66 * ENEMY_BULLET_VISUAL_SCALE, dir > 0 ? 0 : Math.PI, b.dormant ? .5 : 1);
        }
        else
            drawImageFit(im, b.x, b.y, 90 * b.scale * ENEMY_BULLET_VISUAL_SCALE, 90 * b.scale * ENEMY_BULLET_VISUAL_SCALE, b.a + Math.PI / 2, b.dormant ? .55 : 1);
    }
    ctx.restore();
}
function drawEffects() {
    for (const t of trails) {
        ctx.save();
        const fade = t.kind === "highlightStroke"
            ? (t.fadeStart == null ? 1 : clamp(1 - (t.t - t.fadeStart) / Math.max(.001, t.life - t.fadeStart), 0, 1))
            : clamp(1 - t.t / t.life, 0, 1);
        if (t.kind === "highlightStroke") {
            ctx.lineCap = "butt";
            ctx.lineJoin = "round";
            ctx.globalAlpha = fade * (t.alpha || .7) * .28;
            ctx.strokeStyle = "#dfff35";
            ctx.lineWidth = t.r * 2.8;
            ctx.beginPath();
            ctx.moveTo(t.x1, t.y1);
            ctx.lineTo(t.x2, t.y2);
            ctx.stroke();
            ctx.globalAlpha = fade * (t.alpha || .7);
            ctx.strokeStyle = "#c8ff20";
            ctx.lineWidth = t.r * 2;
            ctx.beginPath();
            ctx.moveTo(t.x1, t.y1);
            ctx.lineTo(t.x2, t.y2);
            ctx.stroke();
            ctx.globalAlpha = fade * .25;
            ctx.strokeStyle = "#f3ff9a";
            ctx.lineWidth = Math.max(3, t.r * .48);
            ctx.beginPath();
            ctx.moveTo(t.x1, t.y1 - t.r * .35);
            ctx.lineTo(t.x2, t.y2 - t.r * .35);
            ctx.stroke();
        }
        else {
            ctx.globalAlpha = fade * .5;
            ctx.fillStyle = "#baff26";
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    for (const e of effects) {
        const p = clamp(e.t / e.life, 0, 1), k = 1 - p;
        ctx.save();
        ctx.globalAlpha = k * e.alpha;
        if (e.type === "bubble") {
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r * (1 + e.t * 1.4), 0, Math.PI * 2);
            ctx.stroke();
        }
        else if (e.type === "pulse") {
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r + e.t * 90, 0, Math.PI * 2);
            ctx.stroke();
        }
        else if (e.type === "ghostWarning") {
            ctx.translate(e.x, e.y);
            const flash = .45 + .55 * Math.abs(Math.sin(p * Math.PI * 6));
            ctx.globalAlpha = k * flash;
            ctx.strokeStyle = e.color;
            ctx.fillStyle = e.color;
            ctx.lineWidth = 5;
            const rr = e.r * (.72 + .26 * Math.sin(p * Math.PI * 3));
            ctx.beginPath();
            ctx.arc(0, 0, rr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, rr * .52, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
                ctx.save();
                ctx.rotate(i * Math.PI / 4 + time * 1.6);
                ctx.beginPath();
                ctx.moveTo(0, -rr - 16);
                ctx.lineTo(-5, -rr - 4);
                ctx.lineTo(5, -rr - 4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.font = "900 42px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.strokeStyle = INK;
            ctx.lineWidth = 7;
            ctx.strokeText("!", 0, 2);
            ctx.fillText("!", 0, 2);
        }
        else if (e.type === "ghostMarker") {
            ctx.translate(e.x, e.y);
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 4;
            ctx.setLineDash([12, 9]);
            const rr = e.r * (1 - .42 * p) + 8 * Math.sin(p * Math.PI * 4);
            ctx.beginPath();
            ctx.arc(0, 0, rr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = k * .65;
            ctx.beginPath();
            ctx.arc(0, 0, rr * .58, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 4; i++) {
                ctx.save();
                ctx.rotate(i * Math.PI / 2 + time * .8);
                ctx.beginPath();
                ctx.moveTo(0, -rr - 12);
                ctx.lineTo(-7, -rr + 2);
                ctx.lineTo(7, -rr + 2);
                ctx.closePath();
                ctx.fillStyle = e.color;
                ctx.fill();
                ctx.restore();
            }
        }
        else if (e.type === "ghostVanish") {
            ctx.translate(e.x, e.y);
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 4;
            for (let i = -2; i <= 2; i++) {
                ctx.globalAlpha = k * (.18 + .12 * (2 - Math.abs(i)));
                ctx.beginPath();
                ctx.ellipse(i * 10, 0, e.r * (.65 - p * .35), e.r * (1 - p * .72), 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        else if (e.type === "ghostArrival") {
            ctx.translate(e.x, e.y);
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 5;
            ctx.globalAlpha = Math.sin(Math.min(1, p) * Math.PI) * .9;
            ctx.beginPath();
            ctx.ellipse(0, 0, e.r * (.35 + p * .85), e.r * (1.4 - p * .55), 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-e.r, 0);
            ctx.lineTo(e.r, 0);
            ctx.stroke();
        }
        else {
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r * k, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
function drawParticles() { for (const p of particles) {
    const k = clamp(1 - p.age / p.life, 0, 1), speed = Math.hypot(p.vx, p.vy);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = k;
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    if (p.shape === "streak" || speed > 120) {
        const d = speed || 1, dx = p.vx / d, dy = p.vy / d, L = clamp(speed * .035, 5, 18);
        ctx.lineWidth = Math.max(1, p.size);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - dx * L, p.y - dy * L);
        ctx.stroke();
    }
    else {
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.PI * .25 + p.age * p.spin + p.phase);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
} }
function drawVanishes() { for (const v of vanishes) {
    const p = clamp(v.age / v.life, 0, 1), k = 1 - p, size = v.size * (1 + p * .75);
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(Math.PI * .25 + v.phase + p * 1.6);
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = v.color;
    ctx.fillStyle = rgba(v.color, .12 * k);
    ctx.globalAlpha = k;
    ctx.lineWidth = 3 * v.strength;
    ctx.strokeRect(-size * .28, -size * .28, size * .56, size * .56);
    ctx.fillRect(-size * .12, -size * .12, size * .24, size * .24);
    ctx.rotate(-Math.PI * .25 - v.phase - p * 1.6);
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(size * .18, 0);
        ctx.lineTo(size * .68, 0);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
} }
function renderChapter2WaveSystem(engine) {
    if (!engine?.chapter2Wave?.enabled)
        return;
    activeEngine = engine;
    ctx = engine.ctx;
    const sx = virtualScaleX(engine);
    const sy = virtualScaleY(engine);
    const scaleShakeX = shake * sx;
    const scaleShakeY = shake * sy;
    engine.ctx.save();
    drawChapter2WaveBackground(engine);
    if (shake > 0.2)
        engine.ctx.translate(rnd(-scaleShakeX, scaleShakeX), rnd(-scaleShakeY, scaleShakeY));
    drawScenarioBefore();
    withOriginalAspectRenderState(engine, () => {
        drawEffects();
        drawParticles();
        drawReferenceLinks();
        for (const enemy of enemies)
            drawEnemy(enemy);
        for (const bullet of bullets)
            drawBullet(bullet);
        drawVanishes();
    });
    drawScenarioAfter();
    engine.ctx.restore();
    ctx = null;
}
export function renderChapter2WaveHudSystem(engine: any) {
  if (!engine?.chapter2Wave?.enabled) return;
  const runtime: Chapter2WaveRuntime = engine.chapter2Wave;
  const waveCount = Math.max(1, runtime.waveCount || hardWaveDefs.length);
  const completedWaves = runtime.allWavesCleared ? waveCount : Math.max(0, runtime.selectedWave);
  const currentWaveRatio = runtime.allWavesCleared ? 1 : clamp(runtime.progress || 0, 0, 0.985);
  const purificationRatio = clamp((completedWaves + currentWaveRatio) / waveCount, 0, 1);
  const percent = Math.round(purificationRatio * 100);

  // Chapter 1의 스토리 전투 HUD 디자인을 그대로 사용한다.
  const ctx = engine.ctx as CanvasRenderingContext2D;
  const centerX = engine.canvas.width / 2;
  const panelWidth = Math.min(330, engine.canvas.width * 0.42);
  const panelHeight = 48;
  const panelX = centerX - panelWidth / 2;
  const panelY = 15;
  const barX = panelX + 14;
  const barY = panelY + 27;
  const barWidth = panelWidth - 28;
  const barHeight = 9;

  ctx.save();
  ctx.shadowColor = "rgba(246,195,74,.34)";
  ctx.shadowBlur = 13;
  ctx.fillStyle = "rgba(4,8,15,.88)";
  ctx.strokeStyle = "rgba(246,195,74,.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textBaseline = "middle";
  ctx.font = "900 12px 'Noto Sans KR', Noto Sans KR, sans-serif";
  ctx.fillStyle = "#fff1b5";
  ctx.textAlign = "left";
  ctx.fillText("정화 에너지", panelX + 14, panelY + 15);
  ctx.textAlign = "right";
  ctx.fillStyle = percent >= 100 ? "#fff7cf" : "#9de9ff";
  ctx.fillText(`${percent}%`, panelX + panelWidth - 14, panelY + 15);

  ctx.fillStyle = "rgba(2,6,13,.95)";
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 5);
  ctx.fill();
  ctx.stroke();

  const fillWidth = Math.max(0, barWidth * purificationRatio);
  if (fillWidth > 0) {
    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, "#38d8e8");
    gradient.addColorStop(0.62, "#f6c34a");
    gradient.addColorStop(1, "#fff4a8");
    ctx.shadowColor = percent >= 100 ? "#fff3a8" : "#38d8e8";
    ctx.shadowBlur = percent >= 100 ? 14 : 7;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillWidth, barHeight, 5);
    ctx.fill();
  }
  ctx.restore();
}

function areChapter2WaveVisualsReadySystem() {
    const required = Object.values(monsterImagePaths).filter(Boolean);
    if (required.length === 0)
        return true;
    return Object.entries(monsterImagePaths).every(([key, src]) => {
        if (!src)
            return true;
        const image = images[key];
        return !!image && image.complete && image.naturalWidth > 0;
    });
}


export {
  createChapter2WaveRuntime,
  startChapter2WaveSystem,
  stopChapter2WaveSystem,
  getChapter2WaveProgressSystem,
  skipCurrentChapter2WaveSystem,
  updateChapter2WaveSystem,
  renderChapter2WaveSystem,
  areChapter2WaveVisualsReadySystem,
};
