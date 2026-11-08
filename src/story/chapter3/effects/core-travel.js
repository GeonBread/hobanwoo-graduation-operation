
(() => {
  /* Final override V42: Chapter 3 uses an angular spatial fracture + architectural depth tunnel,
     then a white hold -> slow blackout -> two-second black hold before the core reveal.
     It remains intentionally distinct from Chapter 1/2 circular portal travel. */
  window.STORY_CUSTOM_EFFECTS['teleport-core'] = ({ layer, api }) => c3Mount(layer, `
    <div class="c3-core-rift-029">
      <div class="rift-space"></div>
      <div class="coord-grid"></div>
      <div class="axis-lock"></div>
      <div class="rift-aura"></div>
      <div class="space-slabs" aria-hidden="true">
        <i style="--x:2%;--y:8%;--w:28%;--h:22%;--tx:-18vw;--ty:-13vh;--r:-7deg"></i>
        <i style="--x:31%;--y:3%;--w:18%;--h:28%;--tx:-7vw;--ty:-22vh;--r:4deg"></i>
        <i style="--x:52%;--y:4%;--w:19%;--h:24%;--tx:8vw;--ty:-20vh;--r:-5deg"></i>
        <i style="--x:72%;--y:10%;--w:27%;--h:25%;--tx:18vw;--ty:-14vh;--r:8deg"></i>
        <i style="--x:0%;--y:34%;--w:31%;--h:25%;--tx:-24vw;--ty:-2vh;--r:5deg"></i>
        <i style="--x:70%;--y:36%;--w:30%;--h:24%;--tx:24vw;--ty:1vh;--r:-6deg"></i>
        <i style="--x:1%;--y:62%;--w:29%;--h:28%;--tx:-20vw;--ty:15vh;--r:-8deg"></i>
        <i style="--x:30%;--y:70%;--w:19%;--h:27%;--tx:-7vw;--ty:20vh;--r:6deg"></i>
        <i style="--x:52%;--y:69%;--w:18%;--h:29%;--tx:8vw;--ty:21vh;--r:-5deg"></i>
        <i style="--x:71%;--y:61%;--w:28%;--h:30%;--tx:20vw;--ty:16vh;--r:7deg"></i>
      </div>
      <div class="rift-gate" aria-hidden="true"><img src="/assets/chapter3/story/backgrounds/digrion_core.png" alt=""></div>
      <div class="depth-tunnel" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i style="--s:${(.18+i*.065).toFixed(3)};--o:${(.26+i*.065).toFixed(3)};--rot:${((i-4)*1.7).toFixed(2)}deg;--rot-end:${((i-4)*-.7).toFixed(2)}deg;--d:${(i*.055).toFixed(3)}s"></i>`).join('')}</div>
      <div class="rift-labels" aria-hidden="true"><span class="l1">COORDINATE // UNBOUND</span><span class="l2">CORE VECTOR // LOCKED</span><span class="l3">STAR LINK // 4 OF 6</span><span class="l4">DOMAIN // GRADUATION</span></div>
      <div class="breach-flash"></div>
      <div class="arrival-camera"><img src="/assets/chapter3/story/backgrounds/digrion_core.png" alt="첨성대 코어 졸업 영역"></div>
      <div class="arrival-vignette"></div>
      <div class="core-domain-title"><small>FINAL DOMAIN</small><strong>첨성대 코어 · 졸업 영역</strong><span>CHEOMSEONGDAE CORE · GRADUATION DOMAIN</span></div>
      <div class="core-transition-black" aria-hidden="true"></div>
      <div class="core-transition-white" aria-hidden="true"></div>
    </div>`, (root, later) => {
      const scene = root.querySelector('.c3-core-rift-029');
      const arrival = root.querySelector('.arrival-camera img');
      const stage = document.getElementById('storyStage');
      let raf = 0;

      const startArrivalCamera = () => {
        /* PATCH061:
           The CSS-only climb was being collapsed to an effectively fixed frame on some systems.
           Move only object-position + transform from JS so the lower corridor -> upper core travel
           is guaranteed to happen, while avoiding the old per-frame filter work that caused lag. */
        if (!arrival || !scene) return;
        if (raf) cancelAnimationFrame(raf);

        scene.classList.remove('camera-run-058');

        const started = performance.now();
        const duration = 2800;
        const ease = t => t < .5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const frame = now => {
          const raw = Math.max(0, Math.min(1, (now - started) / duration));
          const p = ease(raw);

          /* Start at the absolute bottom of the image and travel to the absolute top edge. */
          const objectY = 100 + (0 - 100) * p;
          const shift = 6 + (0 - 6) * p;
          const scale = 1.025 + (1.075 - 1.025) * p;

          arrival.style.setProperty('object-position', `50% ${objectY.toFixed(2)}%`, 'important');
          arrival.style.setProperty(
            'transform',
            `translate3d(0,${shift.toFixed(2)}vh,0) scale(${scale.toFixed(4)})`,
            'important'
          );
          arrival.style.setProperty('opacity', `${(.78 + .22 * p).toFixed(3)}`, 'important');

          if (raw < 1) {
            raf = requestAnimationFrame(frame);
          } else {
            raf = 0;
          }
        };

        raf = requestAnimationFrame(frame);
      };

      const prepareHandoff = () => {
        api?.updateScene?.('graduation_core', { force: true, suppressFlash: true });
        const rect = stage?.getBoundingClientRect?.();
        if (!scene || !rect) return;
        scene.style.setProperty('--target-left', `${Math.max(0,rect.left)}px`);
        scene.style.setProperty('--target-top', `${Math.max(0,rect.top)}px`);
        scene.style.setProperty('--target-width', `${Math.max(1,rect.width)}px`);
        scene.style.setProperty('--target-height', `${Math.max(1,rect.height)}px`);
      };

      /* 0.2s: coordinate axis appears. 0.7s: the world fractures open. */
      later(() => scene?.classList.add('gate-form'), 180);
      later(() => scene?.classList.add('gate-open'), 720);
      /* The fractured slabs separate and the angular gate becomes a depth tunnel. */
      later(() => scene?.classList.add('transit'), 1900);
      /* PATCH057: after entering, the entire spatial frame accelerates toward the gate so it feels like the player is being sucked in. */
      later(() => scene?.classList.add('suction'), 2480);

      /* Slowly wash the whole viewport to pure white while the suction is still accelerating. */
      later(() => scene?.classList.add('white-in'), 3500);
      /* Once the white cover is opaque, stop painting the heavy rift layers behind it. */
      later(() => scene?.classList.add('perf-hide-058'), 4850);
      /* White is fully opaque at about 4.7 s and is held as a completely blank white screen for ~2 s. */
      later(() => scene?.classList.add('fade-to-black'), 6700);
      /* Black fades ON TOP of the still-solid white layer, so the portal can never show through the crossfade. */
      later(() => scene?.classList.add('black-hold'), 8200);
      /* Hold pure black for ~2 s, then reveal the arrival background first. */
      later(() => {
        scene?.classList.add('arrived');
        scene?.classList.add('reveal-core');
        // Start the final-space BGM on the same frame the core background begins to appear.
        window.STORY_HOOKS?._emit?.('final-space-bgm-start');
      }, 10200);

      /* PATCH059: wait until the blackout has almost completely cleared, then perform
         a long, obvious lower-corridor -> upper-core climb. This keeps the v58 GPU
         optimization but restores the missing camera travel. */
      later(() => startArrivalCamera(), 11050);
      later(() => scene?.classList.add('show-title'), 13900);
      later(() => scene?.classList.add('hide-title'), 16900);
      later(prepareHandoff, 17150);
      later(() => scene?.classList.add('handoff'), 17350);

      return () => { if (raf) cancelAnimationFrame(raf); };
    });
})();
