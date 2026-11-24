import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildTree, createPetalTexture, createGlowTexture } from './tree.js';

/* Fixed full-screen canvas behind the site: the procedural cherry-blossom tree.
   `stage` (0 = home, 1-5 = sections) decides which limb the camera focuses on.

   What it animates:
   - GROW-IN: on load the tree grows from the roots (trunk, then limbs, then
     twigs), and the blossoms bloom as each twig finishes. Quick replay on later
     loads in the same session.
   - WIND: a slow breeze with occasional gusts ripples through the canopy.
   - ROUTE FLIGHT: the camera flies to the section's limb (dolly, FOV breathe,
     slight roll), the whole limb lights up outward from the trunk, and a burst
     of petals comes off it.
   - SCROLL + POINTER parallax, and a click sends a gust of petals.
   All motion is delta-time based (same speed at 60Hz and 144Hz). Under
   prefers-reduced-motion nothing idles: one still frame per route. */

/* ---- tuning knobs ------------------------------------------------------ */
const GROW = { trunk: 1.5, roots: .7, perDepth: [.7, .5, .4, .35] };   // seconds to grow each branch order
const BLOOM_SECONDS = .7;
const FLIGHT_SECONDS = 1.15;
const DIM_WOOD = .26, LIT_WOOD = .95, HOME_WOOD = .8;

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeOutQuad = x => 1 - (1 - x) * (1 - x);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x) - 1; return 1 + c3 * x * x * x + c1 * x * x; };
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
// Slow breeze plus gust windows (~every 48s) that ride on top of it.
const windAt = t => {
  const breeze = Math.sin(t * .31) * .45 + Math.sin(t * .77 + 1.3) * .25;
  const gust = Math.pow(Math.max(0, Math.sin(t * .13 + .8)), 3) * (.9 + Math.sin(t * 1.9) * .5);
  return breeze + gust;
};
// Pre-sampled curve tables: the signal dots used to call getPointAt ~90x per frame.
const sampleTable = (curve, n) => {
  const arr = new Float32Array((n + 1) * 3), p = new THREE.Vector3();
  for (let i = 0; i <= n; i++) { curve.getPointAt(i / n, p); arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; }
  return arr;
};
const lookup = (table, n, q, out) => {
  const f = clamp01(q) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i, a = i * 3;
  return out.set(table[a] + (table[a + 3] - table[a]) * k, table[a + 1] + (table[a + 4] - table[a + 1]) * k, table[a + 2] + (table[a + 5] - table[a + 2]) * k);
};
// Reveal a tube branch ring by ring (grow animation).
const setGrowth = (mesh, e) => {
  const g = mesh.geometry, { tubular, radial } = g.userData;
  g.setDrawRange(0, e <= 0 ? 0 : Math.min(g.index.count, Math.ceil(e * tubular) * radial * 6));
};

export default function Background3D({ stage }) {
  const ref = useRef(null), targetStage = useRef(stage);
  useEffect(() => { targetStage.current = stage; }, [stage]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
    const Q = { pixelRatio: coarse ? 1.4 : 1.7, blossoms: coarse ? 360 : 520, falling: coarse ? 90 : 170 };

    /* --- Renderer / scene / camera --- */
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
    catch { document.documentElement.dataset.webgl = 'off'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pixelRatio)); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 120);
    const world = new THREE.Group(); scene.add(world);

    /* --- Cinematic Lighting --- */
    const ambientLight = new THREE.AmbientLight(0xfff0f6, 1.35);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5fa, 1.8);
    mainLight.position.set(5, 7, 6);
    scene.add(mainLight);

    // Rose-gold rim light to catch the curves of the branches
    const rimLight = new THREE.DirectionalLight(0xff94b8, 2.6);
    rimLight.position.set(-6, 5, -5);
    scene.add(rimLight);

    // Dynamic point lights: focus limb glow and interactive pointer lantern
    const focusLight = new THREE.PointLight(0xff8fb1, 3.0, 16, 1.2);
    scene.add(focusLight);

    const pointerLight = new THREE.PointLight(0xffbcd2, 1.5, 8, 1.4);
    scene.add(pointerLight);

    /* --- Tree --- */
    const { tree, trunk, trunkCurve, branchCurves, branchMeshes, terminalTwigs, terminalIndices, focusIndices, primaryStarts, primaryAttach, branchDepths, branchParents, materials } = buildTree();
    world.add(tree); tree.position.set(2.25, -.65, 0);
    const n = branchCurves.length, meshOffset = branchMeshes.length - n;   // trunk + roots come first in branchMeshes
    const branchMats = branchCurves.map((_, b) => branchMeshes[meshOffset + b].material);

    // Which primary limb each branch belongs to (branches are created depth-first, so limbs are contiguous ranges).
    const rootOf = new Int16Array(n); { let r = -1; for (let b = 0; b < n; b++) { if (r + 1 < primaryStarts.length && b === primaryStarts[r + 1]) r++; rootOf[b] = r; } }
    // One focus limb per section; stage 0 (home) has none.
    const stageRoot = [-1, ...focusIndices.map(i => primaryStarts.indexOf(i))];

    // Camera targets and signal-dot tables, computed once (no per-frame getPointAt / allocation).
    const stagePt = [new THREE.Vector3()], stageTip = [new THREE.Vector3()], stageTable = [sampleTable(branchCurves[0], 64)];
    for (let s = 1; s <= 5; s++) {
      const c = branchCurves[focusIndices[s - 1]] || branchCurves[0];
      stagePt.push(c.getPointAt(.82)); stageTip.push(c.getPointAt(.95)); stageTable.push(sampleTable(c, 64));
    }
    const trunkTable = sampleTable(trunkCurve, 160);

    /* --- Grow schedule: each branch starts when its parent is nearly at the tip --- */
    const start = new Float32Array(n), dur = new Float32Array(n);
    for (let b = 0; b < n; b++) {
      dur[b] = GROW.perDepth[branchDepths[b]] ?? .35;
      start[b] = branchParents[b] < 0
        ? GROW.trunk * primaryAttach[primaryStarts.indexOf(b)] * .92
        : start[branchParents[b]] + dur[branchParents[b]] * .88;
    }
    let introEnd = 0; for (let b = 0; b < n; b++) introEnd = Math.max(introEnd, start[b] + dur[b]);
    introEnd += BLOOM_SECONDS + .45;
    let seen = false; try { seen = sessionStorage.getItem('rishabhos-grown') === '1'; sessionStorage.setItem('rishabhos-grown', '1'); } catch { /* storage blocked: always play the full intro */ }
    const introSpeed = seen ? 2.2 : 1;

    /* --- Blossoms along the finest twigs. Each knows which twig it sits on, so it blooms when that twig is grown. --- */
    const palette = [0xff9fbd, 0xffb6cd, 0xffc8da, 0xe98eb0];
    const blossomMeta = [];
    const blossomCount = Math.min(Q.blossoms, Math.max(320, terminalTwigs.length * 2));
    const petalTexture = createPetalTexture();
    const blossomMaterial = new THREE.SpriteMaterial({ map: petalTexture, transparent: true, depthWrite: false, opacity: .88, color: 0xffb6cd });
    const blossoms = new THREE.Group(); tree.add(blossoms);
    for (let i = 0; i < blossomCount; i++) {
      const ti = i % terminalTwigs.length, bi = terminalIndices[ti], twig = terminalTwigs[ti];
      const u = .48 + Math.random() * .52;
      const p = twig.getPointAt(u);
      const s = .075 + Math.random() * .095;
      const sprite = new THREE.Sprite(blossomMaterial.clone());
      sprite.material.color.setHex(palette[Math.floor(Math.random() * palette.length)]);
      sprite.position.copy(p).add(new THREE.Vector3((Math.random() - .5) * .16, (Math.random() - .5) * .16, (Math.random() - .5) * .18));
      const sx = s * (.8 + Math.random() * .5), sy = s * (1.05 + Math.random() * .45);
      sprite.scale.set(0, 0, 1); sprite.visible = false;
      sprite.userData = { phase: Math.random() * Math.PI * 2, base: sprite.position.clone(), sx, sy, o: .88, mix: 1, root: rootOf[bi], bloomAt: start[bi] + dur[bi] * u * .9 + Math.random() * .35 };
      blossoms.add(sprite); blossomMeta.push(sprite);
    }

    /* --- Flower tips: rosettes at the very ends of twigs --- */
    const flowerTipGroup = new THREE.Group(); tree.add(flowerTipGroup);
    const tipMeta = [];
    for (let i = 0; i < Math.min(80, terminalTwigs.length); i++) {
      const p = terminalTwigs[i].getPointAt(.92), bi = terminalIndices[i];
      const s = .13 + Math.random() * .06, bloomAt = start[bi] + dur[bi] + .1 + Math.random() * .3;
      for (let j = 0; j < 5; j++) {
        const petal = new THREE.Sprite(blossomMaterial.clone());
        petal.material.opacity = .55;
        petal.material.color.setHex(palette[(i + j) % palette.length]);
        const a = (j / 5) * Math.PI * 2;
        petal.position.copy(p).add(new THREE.Vector3(Math.cos(a) * s * .45, Math.sin(a) * s * .45, .01));
        petal.scale.set(0, 0, 1); petal.visible = false;
        petal.userData = { sx: s, sy: s * .72, bloomAt, o: .55, mix: 1, root: rootOf[bi] };
        flowerTipGroup.add(petal); tipMeta.push(petal);
      }
    }

    /* --- Falling petals (scene space). Integrated per frame so wind can push them with 3D tumble. --- */
    const falling = [];
    const fallingGroup = new THREE.Group(); scene.add(fallingGroup);
    for (let i = 0; i < Q.falling; i++) {
      const s = new THREE.Sprite(blossomMaterial.clone()); const o = .42 + Math.random() * .25; s.material.opacity = 0; s.material.color.setHex(palette[i % palette.length]);
      const scale = .045 + Math.random() * .06; s.scale.set(scale, scale * 1.45, 1); fallingGroup.add(s);
      falling.push({
        sprite: s, o, x: -2.8 + Math.random() * 6.8, y: -5.2 + Math.random() * 10.5, z: -1.8 + Math.random() * 3.4,
        wo: 0, phase: Math.random() * 6.28, speed: .10 + Math.random() * .20, drift: .18 + Math.random() * .5,
        spin: Math.random() * 6.28, baseScale: scale, tumbleSpeed: 1.4 + Math.random() * 2.2
      });
    }

    /* --- Bioluminescent Fireflies / Spores --- */
    const glowTexture = createGlowTexture();
    const fireflyCount = coarse ? 40 : 75;
    const fireflyGroup = new THREE.Group(); scene.add(fireflyGroup);
    const fireflies = [];
    const fireflyMat = new THREE.SpriteMaterial({
      map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75, color: 0xffd1e1
    });
    const fireflyColors = [0xfff0f6, 0xffbcd4, 0xffe2bc, 0xffa4c0];
    for (let i = 0; i < fireflyCount; i++) {
      const sp = new THREE.Sprite(fireflyMat.clone());
      const s = 0.045 + Math.random() * 0.065;
      sp.scale.set(s, s, 1);
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.0 + Math.random() * 3.8;
      const x = 2.25 + Math.cos(angle) * radius;
      const y = -1.5 + Math.random() * 6.2;
      const z = -2.0 + Math.random() * 4.0;
      sp.position.set(x, y, z);
      sp.material.color.setHex(fireflyColors[i % fireflyColors.length]);
      fireflyGroup.add(sp);
      fireflies.push({
        sp, baseX: x, baseY: y, baseZ: z, phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.65, radius, baseScale: s
      });
    }

    /* --- Interactive Cursor Stardust Sparks --- */
    const STARDUST_MAX = 36;
    const stardustPool = [];
    const stardustGroup = new THREE.Group(); scene.add(stardustGroup);
    const stardustMat = new THREE.SpriteMaterial({
      map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, color: 0xffeef7
    });
    for (let i = 0; i < STARDUST_MAX; i++) {
      const sp = new THREE.Sprite(stardustMat.clone());
      sp.visible = false;
      stardustGroup.add(sp);
      stardustPool.push({ sp, vx: 0, vy: 0, life: 1, age: 0, on: false, baseScale: 0.04 });
    }
    let stardustIdx = 0;
    const emitStardust = (pos, count = 2) => {
      for (let k = 0; k < count; k++) {
        const p = stardustPool[stardustIdx];
        stardustIdx = (stardustIdx + 1) % STARDUST_MAX;
        p.sp.position.set(pos.x + (Math.random() - .5) * .2, pos.y + (Math.random() - .5) * .2, pos.z + (Math.random() - .5) * .15);
        p.vx = (Math.random() - .5) * .35;
        p.vy = -.12 - Math.random() * .28;
        p.life = 0.8 + Math.random() * 0.6;
        p.age = 0;
        p.baseScale = 0.035 + Math.random() * 0.04;
        p.sp.scale.set(p.baseScale, p.baseScale, 1);
        p.sp.visible = true;
        p.on = true;
      }
    };

    /* --- Petal bursts: a small ring buffer, emitted on route change and on click --- */
    const BURST = 64, bursts = [], burstGroup = new THREE.Group(); scene.add(burstGroup);
    for (let i = 0; i < BURST; i++) { const sp = new THREE.Sprite(blossomMaterial.clone()); sp.material.opacity = 0; sp.visible = false; burstGroup.add(sp); bursts.push({ sp, vx: 0, vy: 0, vz: 0, age: 0, life: 1, spin: 0, spinV: 0, on: false }); }
    let burstCursor = 0;
    const emit = (origin, count, power = 1) => {
      for (let k = 0; k < count; k++) {
        const b = bursts[burstCursor]; burstCursor = (burstCursor + 1) % BURST;
        b.sp.position.set(origin.x + (Math.random() - .5) * .3, origin.y + (Math.random() - .5) * .3, origin.z + (Math.random() - .5) * .3);
        b.vx = (Math.random() - .35) * 1.1 * power; b.vy = (.15 + Math.random() * .9) * power; b.vz = (Math.random() - .5) * .8 * power;
        b.life = 1.8 + Math.random() * 1.4; b.age = 0; b.spin = Math.random() * 6.28; b.spinV = (Math.random() - .5) * 3;
        const sc = .05 + Math.random() * .06; b.sp.scale.set(sc, sc * 1.45, 1);
        b.sp.material.color.setHex(palette[Math.floor(Math.random() * palette.length)]);
        b.on = true; b.sp.visible = true;
      }
    };

    /* --- Signal dots + glow --- */
    const signalCount = 44, signalPos = new Float32Array(signalCount * 3), signalGeo = new THREE.BufferGeometry(); signalGeo.setAttribute('position', new THREE.BufferAttribute(signalPos, 3));
    const signalMat = new THREE.PointsMaterial({ color: 0xffeef4, size: .052, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const signals = new THREE.Points(signalGeo, signalMat); tree.add(signals);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.72, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff9fbe, transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false })); tree.add(glow);

    /* --- Pointer: parallax + blossoms/petals pushed away from the cursor --- */
    const pointer = new THREE.Vector2(), pointerSpring = new THREE.Vector2(), pointerWorld = new THREE.Vector3();
    const raycaster = new THREE.Raycaster(), mouseNdc = new THREE.Vector2();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const treePlanePoint = new THREE.Vector3(99, 99, 0);   // starts far away so nothing is pushed before the pointer moves
    const aim = e => { mouseNdc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); raycaster.setFromCamera(mouseNdc, camera); return raycaster.ray.intersectPlane(interactionPlane, pointerWorld); };
    const onPointer = e => {
      if (aim(e)) {
        tree.worldToLocal(treePlanePoint.copy(pointerWorld));
        pointer.x = THREE.MathUtils.clamp(treePlanePoint.x / 4.6, -1, 1);
        pointer.y = THREE.MathUtils.clamp(treePlanePoint.y / 5.6, -1, 1);
        if (!reduce.matches && Math.random() < 0.35) emitStardust(pointerWorld, 1);
      }
    };
    const S = { time: 0, intro: reduce.matches ? 1e6 : 0, grown: false, lastStage: targetStage.current, transFrom: targetStage.current, transStart: 0, stageT0: 0, dir: 0, focusRoot: stageRoot[targetStage.current] ?? -1,
      pulse: 0, gust: 0, click: 0, lastClick: 0, scroll: 0, maxScroll: 1, renderedStage: -1 };
    // Click on empty page space: a gust and a handful of petals (never on links, buttons, inputs).
    const onDown = e => {
      if (reduce.matches || e.target.closest?.('a,button,input,textarea,select,summary,[role="button"]')) return;
      const now = performance.now(); if (now - S.lastClick < 220) return; S.lastClick = now;
      if (aim(e)) { emit(pointerWorld, 12, .9); emitStardust(pointerWorld, 5); S.click = 1; S.gust += 1.1; }
    };
    const measureScroll = () => { S.maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
    const onResize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); measureScroll(); };
    const onGustEvent = () => {
      const centerTarget = new THREE.Vector3(2.25, 1.5, 0);
      emit(centerTarget, 22, 1.4);
      emitStardust(centerTarget, 10);
      S.click = 1;
      S.gust += 1.8;
      S.pulse = 1;
    };
    addEventListener('pointermove', onPointer, { passive: true });
    addEventListener('pointerdown', onDown, { passive: true });
    addEventListener('resize', onResize);
    window.addEventListener('rishabhos-gust', onGustEvent);
    // Page height changes on every route; only the cached scroll range needs refreshing (NOT the canvas size).
    const ro = new ResizeObserver(measureScroll); ro.observe(document.body);

    /* --- Growth helpers --- */
    const applyGrowth = it => {
      setGrowth(trunk, easeOutQuad(clamp01(it / GROW.trunk)));
      for (let r = 1; r < meshOffset; r++) setGrowth(branchMeshes[r], easeOutQuad(clamp01((it - .15 - r * .03) / GROW.roots)));
      for (let b = 0; b < n; b++) setGrowth(branchMeshes[meshOffset + b], easeOutQuad(clamp01((it - start[b]) / dur[b])));
    };
    const finalizeGrowth = () => {
      branchMeshes.forEach(m => m.geometry.setDrawRange(0, Infinity));
      for (const s of blossomMeta) { s.visible = true; s.scale.set(s.userData.sx, s.userData.sy, 1); }
      for (const s of tipMeta) { s.visible = true; s.scale.set(s.userData.sx, s.userData.sy, 1); }
      S.grown = true; canvas.dataset.state = 'grown';
    };
    canvas.dataset.state = 'growing'; applyGrowth(0);
    // Start far back; the intro dollies in.
    camera.position.set(0, -.5, (S.lastStage === 0 ? 11.5 : 7.0) + (reduce.matches ? 0 : 3.2));

    /* --- Main update (dt in seconds). `still` = reduced motion: settle everything, freeze time, no wind. --- */
    const focus = new THREE.Vector3(), vFrom = new THREE.Vector3(), vTo = new THREE.Vector3(), vRoute = new THREE.Vector3(), vTmp = new THREE.Vector3(), vWorld = new THREE.Vector3();
    const update = (dt, still = false) => {
      if (!still) { S.time += dt; S.intro += dt * introSpeed; }
      const t = S.time, desired = targetStage.current;

      // Route change: remember where we came from, restart the flight and the limb light-up, burst petals.
      if (desired !== S.lastStage) {
        S.transFrom = S.lastStage; S.dir = Math.sign(desired - S.lastStage); S.lastStage = desired;
        S.transStart = S.stageT0 = still ? t - 10 : t; S.focusRoot = stageRoot[desired] ?? -1;
        if (!still && desired > 0 && S.intro > introEnd * .35) { tree.localToWorld(vWorld.copy(stageTip[desired])); emit(vWorld, 22, 1); S.pulse = 1; }
      }

      // Grow-in
      if (!S.grown) { if (still || S.intro >= introEnd) finalizeGrowth(); else applyGrowth(S.intro); }
      const introK = S.grown ? 0 : 1 - easeOutQuad(clamp01(S.intro / (introEnd * .8)));
      const introMix = S.grown ? 1 : smooth((S.intro - introEnd * .7) / (introEnd * .3));

      // Wind (a gentle breeze with gusts) and the click impulse
      const w = still ? 0 : windAt(t) + S.gust, wz = still ? 0 : Math.sin(t * .43 + 2.1) * .4;
      if (!still) { S.gust = damp(S.gust, 0, 2.2, dt); S.click = damp(S.click, 0, 2.8, dt); S.pulse = Math.max(0, S.pulse - dt * 1.2); }
      tree.rotation.z = -w * .0075; tree.rotation.x = wz * .004;
      const sway = 1 + Math.abs(w) * .9;

      // Scroll parallax: reading scrollY (not listening) keeps this off the event loop
      S.scroll = still ? 0 : damp(S.scroll, clamp01(scrollY / S.maxScroll), 3.2, dt);
      const sc = S.scroll;

      // Camera flight: focus point eases to the section's limb, with dolly, FOV breathe and a touch of roll
      const raw = clamp01((t - S.transStart) / FLIGHT_SECONDS), trans = raw * raw * (3 - 2 * raw);
      vFrom.copy(stagePt[S.transFrom]); vTo.copy(stagePt[desired]); vRoute.lerpVectors(vFrom, vTo, trans);
      if (desired === 0) vRoute.set(0, 0, 0);
      const kf = 1 - Math.exp(-4.0 * dt);
      focus.x += (vRoute.x - focus.x) * kf; focus.y += (vRoute.y - focus.y) * kf; focus.z += (vRoute.z - focus.z) * kf;
      const kp = 1 - Math.exp(-4.7 * dt);
      pointerSpring.x += (pointer.x - pointerSpring.x) * kp; pointerSpring.y += (pointer.y - pointerSpring.y) * kp;
      const kw = 1 - Math.exp(-1.5 * dt);
      world.rotation.y += (pointerSpring.x * .10 + sc * .2 - world.rotation.y) * kw; world.rotation.x += (-pointerSpring.y * .06 - world.rotation.x) * kw;
      const flight = Math.sin(Math.PI * trans), focusZ = desired === 0 ? 11.5 : 7.0, kc = 1 - Math.exp(-2.77 * dt);
      camera.position.z += (focusZ + flight * 1.9 + introK * 3.2 - camera.position.z) * kc;
      camera.position.x += (focus.x * .20 + pointerSpring.x * .22 - camera.position.x) * kc;
      camera.position.y += (focus.y * .10 - pointerSpring.y * .14 - sc * .9 - introK * .5 - camera.position.y) * kc;
      const fov = 34 + flight * 2; if (Math.abs(fov - camera.fov) > .005) { camera.fov = fov; camera.updateProjectionMatrix(); }
      const roll = flight * .02 * S.dir; camera.up.set(Math.sin(roll), Math.cos(roll), 0);
      camera.lookAt(focus.x * .68, focus.y * .62 - sc * .35, focus.z);

      // Branch light-up: the WHOLE focused limb brightens outward from the trunk (inner branches first); everything else dims.
      const elapsed = t - S.stageT0, kb = 1 - Math.exp(-5 * dt);
      for (let b = 0; b < n; b++) {
        const m = branchMats[b]; let target;
        if (desired === 0) target = HOME_WOOD;
        else if (rootOf[b] === S.focusRoot) target = DIM_WOOD + (LIT_WOOD - DIM_WOOD) * smooth((elapsed - branchDepths[b] * .16) / .55);
        else target = DIM_WOOD;
        m.opacity += (target - m.opacity) * kb;
      }
      trunk.material.opacity = damp(trunk.material.opacity, desired === 0 ? .94 : .52, 2.45, dt);

      // Glow follows the focused limb tip and pulses on arrival
      vTmp.copy(stageTip[desired]); glow.position.lerp(desired === 0 ? vTo.set(0, 0, 0) : vTmp, 1 - Math.exp(-4.2 * dt));
      glow.material.opacity = (desired === 0 ? .035 : .07 + .025 * Math.sin(t * 1.6)) * introMix + S.pulse * .12; glow.scale.setScalar(1 + Math.sin(t * 1.4) * .08 + S.pulse * .9);

      // Blossoms: bloom in, sway with the wind (stronger toward the crown, rippling across), push away from the pointer, dim off the focus limb
      const mx = treePlanePoint.x, my = treePlanePoint.y, km = 1 - Math.exp(-3 * dt), radius = 1.35 * (1 + S.click * .8), boost = 1 + S.click * 1.5;
      for (let i = 0; i < blossomMeta.length; i++) {
        const s = blossomMeta[i], u = s.userData, b = u.base;
        if (!S.grown) { const k = easeOutBack((S.intro - u.bloomAt) / BLOOM_SECONDS); s.visible = S.intro > u.bloomAt; s.scale.set(u.sx * k, u.sy * k, 1); }
        const dx = b.x - mx, dy = b.y - my, d = Math.sqrt(dx * dx + dy * dy) + .001, force = Math.max(0, 1 - d / radius), eased = force * force * boost;
        const crown = .35 + clamp01((b.y + 4) / 8), ripple = w * (.5 + .5 * Math.sin(t * 1.3 - b.x * .8 + u.phase * .2)) * .03 * crown;
        s.position.x = b.x + Math.sin(t * .55 + u.phase) * .018 * sway + ripple + (dx / d) * eased * .20;
        s.position.y = b.y + Math.cos(t * .48 + u.phase) * .014 * sway + (dy / d) * eased * .17;
        s.position.z = b.z + Math.sin(t * .35 + u.phase) * .025 * sway + wz * .02 * crown + eased * .05;
        u.mix += ((desired === 0 || u.root === S.focusRoot ? 1 : .45) - u.mix) * km;
        s.material.opacity = u.o * u.mix;
      }
      if (!S.grown) for (let i = 0; i < tipMeta.length; i++) { const s = tipMeta[i], u = s.userData, k = easeOutBack((S.intro - u.bloomAt) / BLOOM_SECONDS); s.visible = S.intro > u.bloomAt; s.scale.set(u.sx * k, u.sy * k, 1); }
      else for (let i = 0; i < tipMeta.length; i++) { const u = tipMeta[i].userData; u.mix += ((desired === 0 || u.root === S.focusRoot ? 1 : .45) - u.mix) * km; tipMeta[i].material.opacity = u.o * u.mix; }

      // Falling petals: integrated so wind can push them sideways; they fade in once the tree is mostly grown
      const fallMix = introMix;
      for (let i = 0; i < falling.length; i++) {
        const d = falling[i];
        if (!still) {
          d.y -= d.speed * dt * (1 + Math.max(0, w) * .35);
          d.wo += w * dt * (.25 + d.drift * .5);
          if (d.y < -5.5) { d.y += 11; d.x = -2.8 + Math.random() * 6.8; d.wo = 0; }
          if (d.wo > 5 || d.wo < -5) d.wo = 0;
        }
        let x = d.x + Math.sin(t * .42 + d.phase) * d.drift + pointerSpring.x * .32 + d.wo;
        const z2 = d.z + Math.cos(t * .33 + d.phase) * .28;
        const dx = x - mx, dy = d.y - my, dist = Math.sqrt(dx * dx + dy * dy) + .001, force = Math.max(0, 1 - dist / 1.25);
        x += (dx / dist) * force * .38; const fy = (dy / dist) * force * .20;
        d.sprite.position.set(x, d.y + fy, z2 + force * .08);
        d.sprite.material.rotation = (d.spin + t * .35) % 6.28;
        const tumble = Math.cos(t * d.tumbleSpeed + d.phase);
        const tumbleScale = Math.abs(tumble) * 0.72 + 0.28;
        d.sprite.scale.set(d.baseScale * tumbleScale, d.baseScale * 1.45, 1);
        d.sprite.material.opacity = d.o * fallMix;
      }

      // Dynamic cinematic lighting
      focusLight.position.lerp(desired === 0 ? vTo.set(2.25, 0.5, 2.0) : vTmp, 1 - Math.exp(-4.2 * dt));
      focusLight.intensity = (desired === 0 ? 1.6 : 3.4) * introMix + S.pulse * 1.5;
      pointerLight.position.set(pointerWorld.x, pointerWorld.y, 1.8);
      pointerLight.intensity = 1.4 + S.click * 1.6;

      // Fireflies & Stardust updates
      if (!still) {
        for (let i = 0; i < fireflies.length; i++) {
          const f = fireflies[i];
          const pt = t * f.speed + f.phase;
          const ox = Math.sin(pt * 0.75) * 0.5 + w * 0.2;
          const oy = Math.cos(pt * 0.95) * 0.35;
          const oz = Math.sin(pt * 0.6) * 0.35;
          const dx = (f.baseX + ox) - mx, dy = (f.baseY + oy) - my;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const repel = Math.max(0, 1 - dist / 1.7);
          f.sp.position.set(f.baseX + ox + (dx / dist) * repel * 0.45, f.baseY + oy + (dy / dist) * repel * 0.35, f.baseZ + oz + repel * 0.25);
          const pulse = 0.5 + 0.5 * Math.sin(pt * 2.3);
          f.sp.material.opacity = (0.28 + pulse * 0.55) * introMix;
          const sc = f.baseScale * (0.8 + pulse * 0.4);
          f.sp.scale.set(sc, sc, 1);
        }

        for (let i = 0; i < STARDUST_MAX; i++) {
          const p = stardustPool[i];
          if (!p.on) continue;
          p.age += dt;
          if (p.age >= p.life) { p.on = false; p.sp.visible = false; continue; }
          p.sp.position.x += p.vx * dt + w * 0.15 * dt;
          p.sp.position.y += p.vy * dt;
          const k = p.age / p.life;
          const alpha = (1 - k) * Math.sin(k * Math.PI);
          p.sp.material.opacity = alpha * 0.85;
          const sc = p.baseScale * (1 - k * 0.35);
          p.sp.scale.set(sc, sc, 1);
        }
      }

      // Bursts: light gravity, drag, wind drift, spin; fade in fast and out slowly
      if (!still) for (let i = 0; i < BURST; i++) {
        const b = bursts[i]; if (!b.on) continue;
        b.age += dt; if (b.age >= b.life) { b.on = false; b.sp.visible = false; continue; }
        b.vy -= .9 * dt; const drag = Math.exp(-.8 * dt); b.vx = b.vx * drag + w * .25 * dt; b.vy *= drag; b.vz *= drag;
        b.sp.position.x += b.vx * dt; b.sp.position.y += b.vy * dt; b.sp.position.z += b.vz * dt;
        b.spin += b.spinV * dt; b.sp.material.rotation = b.spin;
        b.sp.material.opacity = .9 * Math.min(1, b.age / .15) * Math.min(1, (b.life - b.age) / (b.life * .45));
      }

      // Signal dots travel trunk -> focused limb (table lookups, no allocation)
      const sp = signalGeo.attributes.position.array;
      for (let i = 0; i < signalCount; i++) {
        const q = (i / signalCount + t * .075) % 1;
        if (q < .58) lookup(trunkTable, 160, q / .58, vTmp); else lookup(stageTable[desired], 64, (q - .58) / .42, vTmp);
        sp[i * 3] = vTmp.x; sp[i * 3 + 1] = vTmp.y; sp[i * 3 + 2] = vTmp.z;
      }
      signalGeo.attributes.position.needsUpdate = true; signalMat.opacity = (desired === 0 ? .18 : .7) * introMix;
    };
    /* --- Loop: pause when hidden; adaptive pixel ratio; reduced motion draws one still frame per route --- */
    let frame, last = performance.now();
    const perf = { acc: 0, n: 0, windows: 0 };
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now(), rawDt = (now - last) / 1000; last = now;
      if (document.hidden) return;
      const dt = Math.min(.05, rawDt);
      if (reduce.matches) {
        if (S.renderedStage === targetStage.current) return;
        S.renderedStage = targetStage.current;
        S.intro = 1e6;
        for (let k = 0; k < 160; k++) update(1 / 60, true);
        renderer.render(scene, camera);
        return;
      }
      S.renderedStage = -1;
      // If the device can't hold ~33fps over a 150-frame window, drop to 1x pixel ratio (checked 3 times, then left alone).
      if (perf.windows < 3 && S.grown) { perf.acc += rawDt; if (++perf.n === 150) { if (perf.acc / 150 > .03 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); } perf.acc = 0; perf.n = 0; perf.windows++; } }
      update(dt); renderer.render(scene, camera);
    };
    measureScroll();
    animate();

    // Full teardown: loop, listeners, and every GPU resource.
    return () => {
      cancelAnimationFrame(frame); ro.disconnect();
      removeEventListener('pointermove', onPointer);
      removeEventListener('pointerdown', onDown);
      removeEventListener('resize', onResize);
      window.removeEventListener('rishabhos-gust', onGustEvent);
      renderer.dispose(); petalTexture.dispose(); glowTexture.dispose(); signalGeo.dispose(); signalMat.dispose(); glow.geometry.dispose(); glow.material.dispose();
      ambientLight.dispose?.(); mainLight.dispose?.(); rimLight.dispose?.(); focusLight.dispose?.(); pointerLight.dispose?.();
      branchMeshes.forEach(m => m.geometry.dispose());
      materials.forEach(m => m.dispose());
      blossoms.children.forEach(s => s.material.dispose()); flowerTipGroup.children.forEach(s => s.material.dispose());
      falling.forEach(d => d.sprite.material.dispose()); bursts.forEach(b => b.sp.material.dispose());
      fireflies.forEach(f => f.sp.material.dispose()); stardustPool.forEach(p => p.sp.material.dispose());
    };
  }, []);

  return <canvas ref={ref} className="idea-canvas" aria-hidden="true" />;
}
