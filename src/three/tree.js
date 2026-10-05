import * as THREE from 'three';

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
  geo.userData = { tubular, radial };   // lets Background3D grow the branch ring by ring
  return geo;
}

export function createPetalTexture() {
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
 *  - branchDepths / branchParents / primaryStarts / primaryAttach / terminalIndices:
 *    tree topology, used to schedule the grow-in animation and to light up
 *    a whole limb (a primary branch and everything that grows from it).
 *  - focusIndices: branchCurves index of one primary limb per site section
 *    (work/lab/life/now/private), so the camera has somewhere different and
 *    meaningful to look at on each page.
 */
export function buildTree(seed = 20240517) {
  const rng = createRng(seed);
  const tree = new THREE.Group();
  const branchCurves = [];
  const branchMeshes = [];
  const terminalTwigs = [];
  const primaryStarts = [];
  const primaryAttach = [];   // where along the trunk (0-1) each primary limb attaches
  const branchDepths = [];    // depth of every branch, parallel to branchCurves
  const branchParents = [];   // parent branch index (-1 = grows from the trunk)
  const terminalIndices = [];  // branch index of each entry in terminalTwigs
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
  function grow(origin, direction, length, radiusStart, radiusEnd, depth, parent) {
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
    branchDepths.push(depth); branchParents.push(parent);

    // Thinner/shorter branches need fewer polygons - keeps the whole tree
    // cheap to render despite the extra branching depth.
    const radial = Math.max(4, 9 - depth * 2);
    const tubular = Math.max(8, 26 - depth * 6);
    // Own material per branch (was one shared material), so each branch can fade independently.
    const branchMat = woodLight.clone();
    materials.push(branchMat);
    const mesh = new THREE.Mesh(makeBranchGeometry(curve, radiusStart, radiusEnd, radial, tubular), branchMat);
    tree.add(mesh); branchMeshes.push(mesh);

    if (depth >= MAX_DEPTH) {
      terminalTwigs.push(curve); terminalIndices.push(branchIndex);
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
      grow(tip, childDir, length * (.6 + rng() * .18), radiusEnd, radiusEnd * (.5 + rng() * .18), depth + 1, branchIndex);
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
    primaryAttach.push(u);
    primaryStarts.push(grow(origin, direction, length, .105, .03, 0, -1));
  }

  // Pick 5 primary limbs, spread across the crown, as camera-focus anchors
  // for the 5 non-home sections (work/lab/life/now/private) - generated
  // rather than hard-coded so they stay valid however the counts above
  // change.
  const focusIndices = [1, 3, 4, 6, 8].map(i => primaryStarts[i % primaryStarts.length]);

  return { tree, trunk, trunkCurve, branchCurves, branchMeshes, terminalTwigs, terminalIndices, focusIndices, primaryStarts, primaryAttach, branchDepths, branchParents, materials };
}

