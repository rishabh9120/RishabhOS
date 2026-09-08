/**
 * RishabhOS — single-file app.
 *
 * The file is organised top-to-bottom as:
 *   1. Route/nav config
 *   2. Theme system (light/dark, persisted + OS-aware)
 *   3. Procedural 3D tree generator (recursive branching, Three.js)
 *   4. Background3D — mounts the tree, animates it, reacts to route + pointer
 *   5. Page components (Home, Work, Lab, Life, Now, Private, NotFound)
 *   6. Layout + App root
 *
 * Kept intentionally as one file (matches the original project structure);
 * each section below is commented so the logic can be found and changed
 * without having to reverse-engineer it first.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import * as THREE from 'three';
import { projects, profile } from './data';
import './styles.css';

/* ============================================================================
 * 1. NAVIGATION
 * ==========================================================================*/

// Top nav links, in display order.
const nav = [
  { to: '/', label: 'Home' }, { to: '/work', label: 'Work' }, { to: '/lab', label: 'Lab' },
  { to: '/life', label: 'Life' }, { to: '/now', label: 'Now' }
];

// Maps the current URL to a "stage" number (0 = home, 1-5 = each section).
// The 3D background uses this to decide which part of the tree to focus the
// camera on and which branches to light up as the user navigates.
const stageFor = p => p.startsWith('/work') ? 1 : p.startsWith('/lab/') ? 2 : p.startsWith('/lab') ? 2 : p.startsWith('/life') ? 3 : p.startsWith('/now') ? 4 : p.startsWith('/private') ? 5 : 0;

/* ============================================================================
 * 2. THEME SYSTEM
 *
 * Goals of this rewrite (vs. the previous version):
 *  - No flash of the wrong theme on first paint (handled by an inline script
 *    in index.html that runs before React or CSS finish loading).
 *  - The very first visit follows the OS light/dark setting *live* - if the
 *    user has never explicitly toggled the button, changing their OS theme
 *    updates the site immediately, instead of silently locking in whatever
 *    the OS happened to say on the first visit.
 *  - Once the user *does* click the toggle, that explicit choice is
 *    remembered and takes priority over the OS setting from then on.
 *  - Multiple tabs of the site stay in sync (toggling in one tab updates the
 *    others via the `storage` event).
 * ==========================================================================*/

const THEME_KEY = 'rishabh-theme';

// Reads the last explicit choice from localStorage, falling back to the
// browser/OS preference if the user has never chosen one. Guarded for SSR
// (no `window`) even though this app is client-only, so it's safe to reuse.
function getPreferredTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Encapsulates all theme state + side effects so `App` just does
// `const [theme, setTheme] = useTheme()`.
function useTheme() {
  const [theme, setThemeState] = useState(getPreferredTheme);
  // Tracks whether the *user* has explicitly picked a theme (via the toggle,
  // or because a previous session already saved one to localStorage). While
  // this is false, the site keeps following OS theme changes live.
  const explicit = useRef(typeof window !== 'undefined' && window.localStorage.getItem(THEME_KEY) !== null);

  // Public setter used by the toggle button. Accepts either a value or an
  // updater function, mirroring React's normal setState API, and marks the
  // choice as explicit + persists it.
  const setTheme = useCallback((next) => {
    setThemeState(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      explicit.current = true;
      try { window.localStorage.setItem(THEME_KEY, value); } catch { /* storage may be unavailable (private mode, quota) - theme still works for this tab */ }
      return value;
    });
  }, []);

  // Applies the theme to the DOM before the browser paints, so switching
  // never flashes the previous colours. Kept in sync on <html> and <body>
  // (data-theme + class + color-scheme) so it doesn't matter which one the
  // CSS or any third-party widget happens to key off.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.dataset.theme = theme;
    body.dataset.theme = theme;
    body.classList.toggle('theme-light', theme === 'light');
    body.classList.toggle('theme-dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  // Live-follow the OS theme until the user makes an explicit choice.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = e => { if (!explicit.current) setThemeState(e.matches ? 'light' : 'dark'); };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Keep multiple open tabs in sync with each other.
  useEffect(() => {
    const onStorage = e => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        explicit.current = true;
        setThemeState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return [theme, setTheme];
}

// The sun/moon button in the nav bar. Purely presentational - all the theme
// logic lives in `useTheme` above.
function ThemeToggle({ theme, setTheme }) {
  const toggleTheme = () => setTheme(current => (current === 'dark' ? 'light' : 'dark'));
  return (
    <button
      className="theme-toggle"
      type="button"
      title={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
      aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
      aria-pressed={theme === 'dark'}
      onClick={toggleTheme}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span>
    </button>
  );
}

/* ============================================================================
 * 3. PROCEDURAL 3D TREE
 *
 * Rebuilt to grow branches recursively (parent -> children -> grandchildren)
 * instead of three hand-written nested loops with fixed counts. Compared to
 * the previous version this gives:
 *  - A golden-angle spiral placement of primary limbs around the trunk
 *    (the same packing pattern real plants use for leaves/branches), so
 *    limbs don't clump on one side.
 *  - Full 3D branching angles (any azimuth around the parent), instead of
 *    branches mostly alternating left/right in a near-flat plane.
 *  - An "apical leader" per fork - one child continues roughly the parent's
 *    direction while the others peel off wider, which is what makes real
 *    tree crowns look full rather than symmetric/mechanical.
 *  - A slight outward-drooping bias that increases with branch depth, i.e.
 *    a gentle weeping-cherry silhouette, which suits the blossom theme.
 *  - A seeded random generator, so the tree looks the same on every load
 *    (reproducible) instead of a different, possibly odd-looking shape each
 *    visit.
 * ==========================================================================*/

// ~137.5°, the angle that gives the most even possible spiral spacing
// (used by real plants for leaf/branch placement, hence "golden angle").
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Deterministic PRNG (mulberry32) so tree generation is reproducible across
// reloads without needing to store the generated geometry anywhere.
function createRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCurve(points) {
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.55);
}

// Builds a tapered tube mesh geometry that follows `curve`, going from
// `radiusStart` to `radiusEnd`. This is a hand-rolled tube (rather than
// THREE.TubeGeometry) so the radius can taper linearly along the branch -
// real branches get thinner towards the tip, which built-in TubeGeometry
// doesn't do on its own.
function makeBranchGeometry(curve, radiusStart, radiusEnd, radial = 7, tubular = 22) {
  const positions = [];
  const indices = [];
  const frames = [];
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  let previousNormal = new THREE.Vector3(0, 0, 1);

  // Walk along the curve, building a rotation-minimising frame at each step
  // (tangent/normal/binormal) so the ring of vertices we place around the
  // curve doesn't twist unpredictably.
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    const p = curve.getPointAt(u);
    curve.getTangentAt(u, tangent).normalize();
    if (Math.abs(tangent.dot(previousNormal)) > 0.92) previousNormal.set(0, 1, 0);
    normal.crossVectors(tangent, previousNormal).normalize();
    binormal.crossVectors(tangent, normal).normalize();
    previousNormal.copy(normal);
    frames.push({ p: p.clone(), n: normal.clone(), b: binormal.clone(), r: THREE.MathUtils.lerp(radiusStart, radiusEnd, u) });
  }

  // Place a ring of `radial` vertices around each frame.
  for (let i = 0; i <= tubular; i++) {
    const f = frames[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const v = f.p.clone().addScaledVector(f.n, c * f.r).addScaledVector(f.b, s * f.r);
      positions.push(v.x, v.y, v.z);
    }
  }
  // Stitch adjacent rings together into quads (as two triangles each).
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + (j + 1) % radial;
      const c = (i + 1) * radial + (j + 1) % radial;
      const d = (i + 1) * radial + j;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createPetalTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 28, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,235,243,1)'); g.addColorStop(.55, 'rgba(255,170,199,.95)'); g.addColorStop(1, 'rgba(226,110,151,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(32, 32, 20, 28, -.35, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

// Rotates `parentDir` by `angle` radians towards a random point on the cone
// around it, chosen by `azimuth`. This is what lets a child branch point
// "up and to the left, tilted slightly forward" instead of only ever left,
// right, or straight up - i.e. genuinely 3D branching.
function deviateDirection(parentDir, angle, azimuth) {
  const up = Math.abs(parentDir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, parentDir).normalize();
  const forward = new THREE.Vector3().crossVectors(parentDir, right).normalize();
  return parentDir.clone()
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(right, Math.sin(angle) * Math.cos(azimuth))
    .addScaledVector(forward, Math.sin(angle) * Math.sin(azimuth))
    .normalize();
}

// How many branching generations deep the canopy grows. 0 = the primary
// limbs themselves, up to MAX_DEPTH = the finest terminal twigs that carry
// blossoms. Raising this makes a fuller but heavier (more meshes) tree.
const MAX_DEPTH = 3;

/**
 * Builds the whole tree (trunk, roots, recursive canopy) and returns the
 * pieces `Background3D` needs to animate it.
 *
 *  - tree: THREE.Group containing every mesh, positioned/rotated as a unit.
 *  - trunk / trunkCurve: the central trunk mesh and its centerline curve.
 *  - branchCurves: every branch's centerline curve, in creation order -
 *    used to scatter blossoms and to draw the animated "signal" points.
 *  - branchMeshes: every branch's mesh, parallel to branchCurves plus the
 *    trunk and roots - used to fade branches in/out per route.
 *  - terminalTwigs: only the finest, outermost branch curves - blossoms and
 *    falling petals originate from these.
 *  - focusIndices: branchCurves index of one primary limb per site section
 *    (work/lab/life/now/private), so the camera has somewhere different and
 *    meaningful to look at on each page.
 */
function buildTree(seed = 20240517) {
  const rng = createRng(seed);
  const tree = new THREE.Group();
  const branchCurves = [];
  const branchMeshes = [];
  const terminalTwigs = [];
  const primaryStarts = [];
  const materials = [];
  const woodMain = new THREE.MeshBasicMaterial({ color: 0x432831, transparent: true, opacity: .92 });
  const woodLight = new THREE.MeshBasicMaterial({ color: 0x70404b, transparent: true, opacity: .82 });
  materials.push(woodMain, woodLight);

  /* --- Trunk: a gently S-curved column the whole canopy grows out of --- */
  const trunkSegments = 96;
  const trunkPts = [];
  for (let i = 0; i < trunkSegments; i++) {
    const t = i / (trunkSegments - 1);
    const bend = Math.sin(t * 4.0) * .28 + Math.sin(t * 8.7 + .8) * .075 + (t - .5) * .28;
    trunkPts.push(new THREE.Vector3(bend, (t - .5) * 8.8, Math.cos(t * 2.3) * .18));
  }
  const trunkCurve = makeCurve(trunkPts);
  const trunk = new THREE.Mesh(makeBranchGeometry(trunkCurve, .22, .075, 9, 72), woodMain);
  tree.add(trunk); branchMeshes.push(trunk);

  /* --- Roots: short flared curves fanning out at the base --- */
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + .15;
    const start = new THREE.Vector3(Math.cos(a) * .06, -4.36, Math.sin(a) * .06);
    const end = new THREE.Vector3(Math.cos(a) * (.65 + (i % 3) * .12), -4.65 + (i % 2) * .08, Math.sin(a) * (.38 + (i % 2) * .12));
    const mid = start.clone().lerp(end, .5).add(new THREE.Vector3(Math.cos(a) * .08, .12, Math.sin(a) * .05));
    const curve = makeCurve([start, mid, end]);
    const mesh = new THREE.Mesh(makeBranchGeometry(curve, .075, .012, 6, 20), woodLight);
    tree.add(mesh); branchMeshes.push(mesh);
  }

  /**
   * Grows one branch segment starting at `origin` pointing along
   * `direction`, then - unless we've hit MAX_DEPTH - recursively grows 2-3
   * children off its tip. Returns the branch's index in `branchCurves`.
   */
  function grow(origin, direction, length, radiusStart, radiusEnd, depth) {
    // Walk forward in a few steps rather than a single straight segment,
    // nudging direction with a small random wobble each step (plus a
    // depth-based downward "droop" bias) so every branch curves naturally
    // instead of being a perfectly straight rod.
    const dir = direction.clone();
    const points = [origin.clone()];
    let pos = origin.clone();
    const steps = 3;
    for (let s = 0; s < steps; s++) {
      const droop = -depth * .05;
      dir.x += (rng() - .5) * .5;
      dir.y += (rng() - .5) * .3 + .12 + droop;
      dir.z += (rng() - .5) * .5;
      dir.normalize();
      pos = pos.clone().addScaledVector(dir, length / steps);
      points.push(pos.clone());
    }

    const curve = makeCurve(points);
    branchCurves.push(curve);
    const branchIndex = branchCurves.length - 1;

    // Thinner/shorter branches need fewer polygons - keeps the whole tree
    // cheap to render despite the extra branching depth.
    const radial = Math.max(4, 9 - depth * 2);
    const tubular = Math.max(8, 26 - depth * 6);
    const mesh = new THREE.Mesh(makeBranchGeometry(curve, radiusStart, radiusEnd, radial, tubular), woodLight);
    tree.add(mesh); branchMeshes.push(mesh);

    if (depth >= MAX_DEPTH) {
      terminalTwigs.push(curve);
      return branchIndex;
    }

    // Fork into children. Child 0 is the "apical leader" and keeps close to
    // the parent's direction; the rest peel off at wider, fully-3D angles
    // (any azimuth around the parent) so the canopy fills out in every
    // direction rather than staying in one plane.
    const tipTangent = curve.getTangentAt(1).normalize();
    const tip = curve.getPointAt(1);
    const childCount = depth === 0 ? 2 + Math.floor(rng() * 2) : 2;
    for (let c = 0; c < childCount; c++) {
      const isLeader = c === 0;
      const angle = isLeader ? .18 + rng() * .22 : .55 + rng() * .55;
      const azimuth = rng() * Math.PI * 2;
      const childDir = deviateDirection(tipTangent, angle, azimuth);
      grow(tip, childDir, length * (.6 + rng() * .18), radiusEnd, radiusEnd * (.5 + rng() * .18), depth + 1);
    }
    return branchIndex;
  }

  // Spawn primary limbs from the trunk in a golden-angle spiral so they
  // don't bunch up on one side. Limbs lower on the trunk point more
  // outward/horizontal; limbs higher up point more vertical - giving the
  // whole canopy a natural dome/cone silhouette instead of a uniform poof.
  const primaryCount = 9;
  for (let i = 0; i < primaryCount; i++) {
    const u = .22 + (i / (primaryCount - 1)) * .70;
    const azimuth = i * GOLDEN_ANGLE;
    const origin = trunkCurve.getPointAt(u);
    const horizontalness = THREE.MathUtils.lerp(.92, .42, u);
    const outward = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
    const direction = outward.multiplyScalar(horizontalness).add(new THREE.Vector3(0, 1 - horizontalness, 0)).normalize();
    const length = 1.05 + rng() * .5;
    primaryStarts.push(grow(origin, direction, length, .105, .03, 0));
  }

  // Pick 5 primary limbs, spread across the crown, as camera-focus anchors
  // for the 5 non-home sections (work/lab/life/now/private) - generated
  // rather than hard-coded so they stay valid however the counts above
  // change.
  const focusIndices = [1, 3, 4, 6, 8].map(i => primaryStarts[i % primaryStarts.length]);

  return { tree, trunk, trunkCurve, branchCurves, branchMeshes, terminalTwigs, focusIndices, materials };
}

/* ============================================================================
 * 4. BACKGROUND3D - mounts the tree, drives the animation loop
 * ==========================================================================*/

function Background3D({ theme, pathname }) {
  const ref = useRef(null), targetStage = useRef(stageFor(pathname));
  useEffect(() => { targetStage.current = stageFor(pathname); }, [pathname]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;

    /* --- Renderer / scene / camera setup --- */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7)); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 120); camera.position.set(0, 0, 12);
    const world = new THREE.Group(); scene.add(world);

    /* --- Build the tree and position it slightly off-center --- */
    const { tree, trunk, trunkCurve, branchCurves, branchMeshes, terminalTwigs, focusIndices, materials } = buildTree();
    world.add(tree); tree.position.set(2.25, -.65, 0);

    /* --- Blossoms: small sprites scattered along the finest twigs --- */
    const palette = [0xff9fbd, 0xffb6cd, 0xffc8da, 0xe98eb0];
    const blossomMeta = [];
    const blossomCount = Math.min(520, Math.max(320, terminalTwigs.length * 2));
    const petalTexture = createPetalTexture();
    const blossomMaterial = new THREE.SpriteMaterial({ map: petalTexture, transparent: true, depthWrite: false, opacity: .88, color: 0xffb6cd });
    const blossoms = new THREE.Group(); tree.add(blossoms);
    for (let i = 0; i < blossomCount; i++) {
      const twig = terminalTwigs[i % terminalTwigs.length];
      const u = .48 + Math.random() * .52;
      const p = twig.getPointAt(u);
      const s = .075 + Math.random() * .095;
      const sprite = new THREE.Sprite(blossomMaterial.clone());
      sprite.material.color.setHex(palette[Math.floor(Math.random() * palette.length)]);
      sprite.position.copy(p).add(new THREE.Vector3((Math.random() - .5) * .16, (Math.random() - .5) * .16, (Math.random() - .5) * .18));
      sprite.scale.set(s * (0.8 + Math.random() * .5), s * (1.05 + Math.random() * .45), 1);
      sprite.userData.phase = Math.random() * Math.PI * 2;
      sprite.userData.base = sprite.position.clone();
      blossoms.add(sprite); blossomMeta.push(sprite);
    }

    /* --- Flower tips: little rosettes right at the very ends of twigs --- */
    const flowerTipGroup = new THREE.Group(); tree.add(flowerTipGroup);
    for (let i = 0; i < Math.min(80, terminalTwigs.length); i++) {
      const p = terminalTwigs[i].getPointAt(.92);
      const s = .13 + Math.random() * .06;
      for (let j = 0; j < 5; j++) {
        const petal = new THREE.Sprite(blossomMaterial.clone());
        petal.material.opacity = .55;
        petal.material.color.setHex(palette[(i + j) % palette.length]);
        const a = (j / 5) * Math.PI * 2;
        petal.position.copy(p).add(new THREE.Vector3(Math.cos(a) * s * .45, Math.sin(a) * s * .45, .01));
        petal.scale.set(s, s * .72, 1); flowerTipGroup.add(petal);
      }
    }

    /* --- Falling petals: an independent looping particle system --- */
    const fallingCount = 170;
    const falling = [];
    const fallingGroup = new THREE.Group(); scene.add(fallingGroup);
    for (let i = 0; i < fallingCount; i++) {
      const s = new THREE.Sprite(blossomMaterial.clone()); s.material.opacity = .42 + Math.random() * .25; s.material.color.setHex(palette[i % palette.length]);
      s.position.set(-2.8 + Math.random() * 6.8, -5.2 + Math.random() * 10.5, -1.8 + Math.random() * 3.4); const scale = .045 + Math.random() * .06; s.scale.set(scale, scale * 1.45, 1); fallingGroup.add(s);
      falling.push({ sprite: s, x: s.position.x, y: s.position.y, z: s.position.z, phase: Math.random() * 6.28, speed: .10 + Math.random() * .20, drift: .18 + Math.random() * .5, spin: Math.random() * 6.28 });
    }

    /* --- "Signal" points: little lights that travel trunk -> selected branch, showing data/attention flowing to whichever section is active --- */
    const signalCount = 44, signalPos = new Float32Array(signalCount * 3), signalGeo = new THREE.BufferGeometry(); signalGeo.setAttribute('position', new THREE.BufferAttribute(signalPos, 3));
    const signalMat = new THREE.PointsMaterial({ color: 0xffeef4, size: .052, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false });
    const signals = new THREE.Points(signalGeo, signalMat); tree.add(signals);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.72, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff9fbe, transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false })); tree.add(glow);

    /* --- Pointer interaction: project the mouse into the tree's local plane so blossoms/petals can react to it, and the camera can gently follow it --- */
    const pointer = new THREE.Vector2(), pointerSpring = new THREE.Vector2(), pointerWorld = new THREE.Vector3();
    const raycaster = new THREE.Raycaster(), mouseNdc = new THREE.Vector2();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const treePlanePoint = new THREE.Vector3();
    const onPointer = e => {
      mouseNdc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      raycaster.setFromCamera(mouseNdc, camera);
      if (raycaster.ray.intersectPlane(interactionPlane, pointerWorld)) {
        tree.worldToLocal(treePlanePoint.copy(pointerWorld));
        pointer.x = THREE.MathUtils.clamp(treePlanePoint.x / 4.6, -1, 1);
        pointer.y = THREE.MathUtils.clamp(treePlanePoint.y / 5.6, -1, 1);
      }
    };
    const onResize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
    addEventListener('pointermove', onPointer, { passive: true }); addEventListener('resize', onResize);

    /* --- Main animation loop --- */
    const clock = new THREE.Clock(); let frame, lastStage = targetStage.current, transitionStart = performance.now(), transitionFrom = targetStage.current;
    const focus = new THREE.Vector3();
    // Where the camera should look for a given stage: home (0) looks at the
    // trunk's origin, everything else looks at that section's focus branch
    // (see `focusIndices`, generated in buildTree).
    const branchPoint = s => s === 0 ? new THREE.Vector3(0, 0, 0) : (branchCurves[focusIndices[s - 1]] || branchCurves[0]).getPointAt(.82);
    const animate = () => {
      frame = requestAnimationFrame(animate); const t = clock.getElapsedTime(), desired = targetStage.current;

      // Smoothly interpolate the camera's focus point between the previous
      // and newly-desired stage whenever the route changes.
      if (desired !== lastStage) { transitionFrom = lastStage; lastStage = desired; transitionStart = performance.now(); }
      const raw = Math.min(1, (performance.now() - transitionStart) / 1150), trans = raw * raw * (3 - 2 * raw);
      const from = branchPoint(transitionFrom), to = branchPoint(desired); const routeFocus = raw < 1 ? from.clone().multiplyScalar(1 - trans).add(to.clone().multiplyScalar(trans)) : to;
      if (desired === 0) routeFocus.set(0, 0, 0); focus.lerp(routeFocus, .065);

      // Pointer-reactive parallax: the whole tree tilts slightly towards
      // the cursor, and the camera drifts a little too.
      pointerSpring.x += (pointer.x - pointerSpring.x) * .075; pointerSpring.y += (pointer.y - pointerSpring.y) * .075;
      world.rotation.y += (pointerSpring.x * .10 - world.rotation.y) * .025; world.rotation.x += (-pointerSpring.y * .06 - world.rotation.x) * .025;
      const focusZ = desired === 0 ? 11.5 : 7.0, z = focusZ + Math.sin(Math.PI * trans) * 1.9;
      camera.position.z += (z - camera.position.z) * .045; camera.position.x += (focus.x * .20 + pointerSpring.x * .22 - camera.position.x) * .045; camera.position.y += (focus.y * .10 - pointerSpring.y * .14 - camera.position.y) * .045;
      camera.lookAt(focus.x * .68, focus.y * .62, focus.z);

      // Fade the currently-relevant branch (and its immediate family, by
      // array proximity) brighter than the rest, and dim everything a
      // little less aggressively on the home page where the whole tree
      // should read as one shape.
      const selected = desired === 0 ? 0 : (focusIndices[desired - 1] ?? 0);
      branchMeshes.forEach((b, i) => { const active = desired === 0 || i === selected || i === selected + 1 || i === selected + 2 || i === selected + 3; const target = desired === 0 ? .80 : active ? .94 : .14; b.material.opacity += (target - b.material.opacity) * .045; });
      trunk.material.opacity += ((desired === 0 ? .94 : .52) - trunk.material.opacity) * .04;
      const selectedCurve = branchCurves[selected] || branchCurves[0];
      glow.position.lerp(desired === 0 ? new THREE.Vector3(0, 0, 0) : selectedCurve.getPointAt(.95), .07); glow.material.opacity = desired === 0 ? .035 : .07 + .025 * Math.sin(t * 1.6); glow.scale.setScalar(1 + Math.sin(t * 1.4) * .08);

      // Blossoms gently sway, and push away from the pointer when it gets
      // close (a soft repulsion field based on 2D distance in tree-local
      // space).
      const mx = treePlanePoint.x, my = treePlanePoint.y;
      blossomMeta.forEach((s, i) => {
        const b = s.userData.base, dx = b.x - mx, dy = b.y - my, d = Math.sqrt(dx * dx + dy * dy) + .001, force = Math.max(0, 1 - d / 1.35), eased = force * force;
        s.position.x = b.x + Math.sin(t * .55 + s.userData.phase) * .018 + (dx / d) * eased * .20;
        s.position.y = b.y + Math.cos(t * .48 + s.userData.phase) * .014 + (dy / d) * eased * .17;
        s.position.z = b.z + Math.sin(t * .35 + s.userData.phase) * .025 + eased * .05;
      });

      // Falling petals loop endlessly from top to bottom, drifting
      // sideways, and also get nudged away from the pointer.
      falling.forEach((d, i) => {
        const cycle = 11, y = d.y - (t * d.speed) % cycle; const yy = y < -5.5 ? y + cycle : y;
        let x = d.x + Math.sin(t * .42 + d.phase) * d.drift + pointerSpring.x * .32;
        let z2 = d.z + Math.cos(t * .33 + d.phase) * .28;
        const dx = x - mx, dy = yy - my, dist = Math.sqrt(dx * dx + dy * dy) + .001, force = Math.max(0, 1 - dist / 1.25);
        x += (dx / dist) * force * .38; const fy = (dy / dist) * force * .20;
        d.sprite.position.set(x, yy + fy, z2 + force * .08); d.sprite.material.rotation = (d.spin + t * .35) % 6.28;
      });

      // Signal points travel from the trunk base, up the trunk, then out
      // along the currently-selected branch - a visual "attention is here"
      // cue tying the route change to a specific place on the tree.
      const sp = signalGeo.attributes.position.array;
      for (let i = 0; i < signalCount; i++) { const q = (i / signalCount + t * .075) % 1; const p = q < .58 ? trunkCurve.getPointAt(q / .58) : selectedCurve.getPointAt((q - .58) / .42); sp[i * 3] = p.x; sp[i * 3 + 1] = p.y; sp[i * 3 + 2] = p.z; }
      signalGeo.attributes.position.needsUpdate = true; signalMat.opacity = desired === 0 ? .18 : .7;
      renderer.render(scene, camera);
    };
    animate();

    // Full teardown on unmount / route-driven remount: cancel the RAF loop,
    // remove listeners, and dispose every GPU resource we created so
    // navigating around the site doesn't leak WebGL memory.
    return () => {
      cancelAnimationFrame(frame); removeEventListener('pointermove', onPointer); removeEventListener('resize', onResize);
      renderer.dispose(); petalTexture.dispose(); signalGeo.dispose(); signalMat.dispose(); glow.geometry.dispose(); glow.material.dispose();
      // Every branch/trunk/root mesh has its own geometry but shares one of
      // the two `materials` returned by buildTree (woodMain/woodLight), so
      // geometries are disposed per-mesh while materials are disposed once.
      branchMeshes.forEach(m => m.geometry.dispose());
      materials.forEach(m => m.dispose());
      blossoms.children.forEach(s => s.material.dispose()); flowerTipGroup.children.forEach(s => s.material.dispose()); falling.forEach(d => d.sprite.material.dispose());
    };
  }, [theme]);

  return <canvas ref={ref} className="idea-canvas" aria-hidden="true" />;
}

/* ============================================================================
 * 5. PAGE COMPONENTS
 * ==========================================================================*/

// Resets scroll position to the top whenever the route changes.
function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]); return null; }
// Wraps page content in the fade/slide-in entrance animation (see .page-enter in styles.css).
function Page({ children }) { return <div className="page-enter">{children}</div> }
// Shared "eyebrow / title / note" heading block reused across sections.
function SectionIntro({ eyebrow, title, note }) { return <div className="section-head"><div><span className="kicker mono">{eyebrow}</span><h2 className="section-title">{title}</h2></div><p className="section-note">{note}</p></div> }
// Nav bar, background tree, route-progress bar, page outlet and footer - the persistent chrome around every route.
function Layout({ theme, setTheme }) { const location = useLocation(); const [menuOpen, setMenuOpen] = useState(false); useEffect(() => setMenuOpen(false), [location.pathname]); return <><Background3D theme={theme} pathname={location.pathname} /><div className="vignette" /><div className="noise" /><header className="nav-wrap"><nav className={menuOpen ? 'menu-open' : ''}><Link className="brand" to="/"><span>R</span>ishabh <i>Agrawal</i></Link><div className="navlinks">{nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>)}</div><div className="nav-right"><ThemeToggle theme={theme} setTheme={setTheme} /><a className="nav-cta" href={`mailto:${profile.email}`}>Contact</a><button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}><span /><span /><span /></button></div></nav></header><div className="route-progress"><span style={{ width: `${18 + stageFor(location.pathname) * 16}%` }} /></div><main><Routes><Route path="/" element={<Home />} /><Route path="/work" element={<Work />} /><Route path="/lab" element={<Lab />} /><Route path="/lab/:slug" element={<ProjectShowcase />} /><Route path="/life" element={<Life />} /><Route path="/now" element={<Now />} /><Route path="/private/*" element={<Private />} /><Route path="*" element={<NotFound />} /></Routes></main><footer><div className="container"><div className="footer-top"><div><span className="kicker mono">OPEN CHANNEL</span><h2>Let's build<br /><em>something.</em></h2></div><div className="footer-links"><a href={`mailto:${profile.email}`}>Email ↗</a><a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a><a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a><a href="/private">Private ↗</a></div></div><div className="copyright"><span>© {new Date().getFullYear()} Rishabh Agrawal</span><span className="mono">BUILT WITH CURIOSITY</span></div></div></footer></> }

// Landing page.
function Home() { return <Page><div className="container"><section className="hero"><div className="hero-grid"><div><span className="kicker mono">BUILDER · RESEARCHER · CURIOUS HUMAN</span><h1>I build<br /><em>systems</em><br />that matter.</h1><p className="hero-copy">A personal space for professional work, experiments, research, and the things I build simply because I want to understand them.</p><div className="hero-actions"><Link to="/work" className="button primary">Explore work ↗</Link><Link to="/lab" className="button">Enter the lab ↗</Link></div></div><div className="hero-side"><span className="side-index mono">THE LIVING TREE / 00</span><div className="big">1<span>→</span>∞</div><p>The tree is the navigation system.<br />Move through it, and the world changes with you.</p></div></div><div className="scroll mono">Scroll to explore <i /></div></section><section className="manifesto"><div className="manifesto-grid"><span className="kicker mono">THE IDEA</span><p>Credentials explain <em>where</em> I've been. <span>What I build explains what I can do.</span></p></div></section><section><SectionIntro eyebrow="01 / WORK" title="Capability, not credentials." note={'Professional experience is the trunk.\nThe Lab is where the evidence branches out.'} /><div className="feature-grid"><Link to="/work" className="feature-card"><span className="mono">EXPERIENCE</span><strong>Goldman Sachs</strong><p>23 months building and improving systems in a high-stakes engineering environment.</p><b>View experience ↗</b></Link><Link to="/lab" className="feature-card accent-card"><span className="mono">THE LAB</span><strong>Ideas → experiments</strong><p>Quant research, Python, automation, ML, apps and the random things worth building.</p><b>Explore the lab ↗</b></Link></div></section><section className="closing"><span className="kicker mono">THE SYSTEM</span><h2>One living tree.<br /><em>Many directions.</em></h2><p>Work, experiments and life don't need to live in separate universes.<br />They are different branches of the same curiosity.</p></section></div></Page> }
// Professional experience / education page.
function Work() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">WORK / 01</span><h1>Build proof.<br /><em>Not just a résumé.</em></h1><p>Professional experience, education and the evidence behind the way I work.</p></section><section><SectionIntro eyebrow="Experience" title="The professional path" note={'A deliberately compact version.\nThe deeper evidence belongs in the Lab and individual showcases.'} /><div className="timeline"><div className="row"><span className="year mono">2023—25</span><div><h3>Goldman Sachs</h3><p>Full-Time Analyst · Engineering</p></div><div><p>Maintained 15+ services, analyzed 20+ workflows, automated manual processes and worked across multiple teams.</p></div><span className="arrow">↗</span></div><div className="row"><span className="year mono">2024—26</span><div><h3>IIM Indore</h3><p>MBA / PGP</p></div><div><p>Business education layered on top of a computer science and engineering foundation.</p></div><span className="arrow">↗</span></div><div className="row"><span className="year mono">2018—22</span><div><h3>VNIT Nagpur</h3><p>B.Tech · Computer Science</p></div><div><p>Built the technical foundation through systems, algorithms, programming and experimentation.</p></div><span className="arrow">↗</span></div></div></section><section className="impact"><SectionIntro eyebrow="Impact" title="Numbers I care about" note="A few outcomes from professional engineering work." /><div className="metrics"><div><strong>5+</strong><span>hours saved on critical feed runtime</span></div><div><strong>50%</strong><span>efficiency improvement through automation</span></div><div><strong>20%</strong><span>reduction in production issue frequency</span></div><div><strong>15+</strong><span>services maintained</span></div></div></section><section><SectionIntro eyebrow="Evidence" title="Explore the work" note="Projects will appear here as full showcases once you publish them." /><div className="empty-work"><span className="mono">LAB READY</span><h3>No projects published yet.</h3><p>The structure is ready for your first quant research paper, Python experiment, app, website or ML project.</p><Link to="/lab" className="button">Open Lab ↗</Link></div></section></div></Page> }
// Project archive with category filtering; reads from `projects` in data.js.
function Lab() { const [filter, setFilter] = useState('all'); const categories = ['all', 'quant', 'python', 'ml', 'build', 'side quest']; const filtered = useMemo(() => filter === 'all' ? projects : projects.filter(p => p.category === filter), [filter]); return <Page><div className="container"><section className="page-hero lab-hero"><span className="kicker mono">WORK / 02 / THE LAB</span><h1>Things I build<br /><em>because I can.</em></h1><p>Quant research. Python scripts. Automation. ML. Apps.<br />Experiments.<br />Side quests.<br />If it starts with "I wonder if…", it belongs here.</p></section><section><div className="lab-meta"><div><span className="kicker mono">PROJECT ARCHIVE</span><h2>{projects.length ? `${projects.length} experiments` : 'The workbench is waiting.'}</h2></div><div className="filters">{categories.map(c => <button key={c} className={filter === c ? 'active' : ''} onClick={() => setFilter(c)}>{c}</button>)}</div></div>{filtered.length ? <div className="project-list">{filtered.map(p => <Link to={`/lab/${p.slug}`} className="project-row" key={p.slug}><span className="mono">{p.year}</span><div><span className="project-cat mono">{p.category}</span><h3>{p.title}</h3><p>{p.description}</p></div><span className="arrow">↗</span></Link>)}</div> : <div className="lab-empty"><div className="empty-tree"><span /><span /><span /></div><span className="kicker mono">READY FOR YOUR FIRST EXPERIMENT</span><h3>No projects published yet.</h3><p>Add them in <code>src/data.js</code>.<br />Each project automatically gets its own showcase route.</p><div className="lab-schema mono">title · category · year · description · tags · body · links</div></div>}</section></div></Page> }
// Individual project detail page, resolved by slug from the URL.
function ProjectShowcase() { const { slug } = useParams(); const navigate = useNavigate(); const p = projects.find(x => x.slug === slug); if (!p) return <Page><div className="container"><section className="page-hero"><span className="kicker mono">LAB / PROJECT</span><h1>This branch<br /><em>doesn't exist yet.</em></h1><p>The project archive is intentionally empty.</p><button className="button" onClick={() => navigate('/lab')}>Back to Lab ↗</button></section></div></Page>; return <Page><div className="container"><section className="project-showcase"><Link to="/lab" className="back mono">← ALL EXPERIMENTS</Link><span className="kicker mono">{p.category} · {p.year}</span><h1>{p.title}</h1><p className="lead">{p.description}</p><div className="showcase-grid"><aside>{(p.tags || []).map(t => <span key={t}>{t}</span>)}</aside><article>{p.body}</article></div></section></div></Page> }
// Personal/hobby page, static grid of interest cards.
function Life() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">LIFE / 03</span><h1>The branches<br /><em>outside work.</em></h1><p>Travel, photography, music, hobbies and the things that make the person behind the work.</p></section><section><div className="life-grid">{[['01 / ATLAS', 'Travel', 'Mountains, new cities and places that change the frame.', 'MOUNTAINS · ROADS · NEW PLACES'], ['02 / FRAME', 'Photography', 'Night skies, mountains and ordinary moments worth keeping.', 'STARS · LANDSCAPES · MOMENTS'], ['03 / PLAY', 'Hobbies', 'Origami, music, rabbit holes and things with no practical reason.', 'MUSIC · ORIGAMI · RABBIT HOLES'], ['04 / NOTES', 'Journal', "Notes on things I'm learning, thinking about and changing my mind about.", 'IDEAS · OBSERVATIONS · QUESTIONS']].map(([k, t, d, m]) => <div className="life-card" key={k}><span className="mono">{k}</span><h3>{t}</h3><p>{d}</p><div className="life-art"><i /><i /><i /></div><div className="life-meta mono">{m}</div></div>)}</div></section></div></Page> }
// "What I'm doing right now" snapshot page - meant to be edited often.
function Now() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">NOW / 04</span><h1>What the tree<br /><em>is growing today.</em></h1><p>A living snapshot.<br />This page is meant to change as interests, projects and priorities change.</p></section><section><div className="now-grid"><div><b>BUILDING</b><span>This website + future Lab projects</span></div><div><b>LEARNING</b><span>Quant research, markets and better ways to reason with data</span></div><div><b>EXPLORING</b><span>Ideas worth testing before deciding whether they are useful</span></div><div><b>LISTENING</b><span>Music while working</span></div></div></section></div></Page> }
// Placeholder shell for a future authenticated/private area. Deliberately
// has no real content or auth yet - see the README's security notes before
// putting anything sensitive behind this route.
function Private() { return <Page><div className="container"><section className="page-hero private-hero"><span className="kicker mono">PRIVATE / 05</span><h1>A private branch<br /><em>for later.</em></h1><p>This is the shell for personal tools such as Finance.<br />Keep this route behind Cloudflare Access before adding any sensitive data.</p><div className="private-panel"><span className="mono">RISHABHOS PRIVATE</span><strong>Authentication boundary ready.</strong><p>Next: add Finance, personal dashboards and other tools here without mixing private data into the public site.</p></div></section></div></Page> }
// Catch-all 404 page.
function NotFound() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">404</span><h1>Wrong branch.</h1><p>Let's get you back to the trunk.</p><Link to="/" className="button primary">Return home ↗</Link></section></div></Page> }

/* ============================================================================
 * 6. APP ROOT
 * ==========================================================================*/

function App() {
  const [theme, setTheme] = useTheme();
  return <BrowserRouter><ScrollToTop /><Layout theme={theme} setTheme={setTheme} /></BrowserRouter>
}
createRoot(document.getElementById('root')).render(<App />);
