import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import * as THREE from 'three';
import { projects, profile } from './data';
import './styles.css';

const nav = [
  { to: '/', label: 'Home' }, { to: '/work', label: 'Work' }, { to: '/lab', label: 'Lab' },
  { to: '/life', label: 'Life' }, { to: '/now', label: 'Now' }
];
const stageFor = p => p.startsWith('/work') ? 1 : p.startsWith('/lab/') ? 2 : p.startsWith('/lab') ? 2 : p.startsWith('/life') ? 3 : p.startsWith('/now') ? 4 : p.startsWith('/private') ? 5 : 0;

function ThemeToggle({ theme, setTheme }) {
  return <button className="theme-toggle" aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span>{theme === 'dark' ? '☼' : '◐'}</span></button>;
}

/* Procedural tree --------------------------------------------------------- */
function makeCurve(points) {
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.55);
}

function makeBranchGeometry(curve, radiusStart, radiusEnd, radial = 7, tubular = 22) {
  const positions = [];
  const indices = [];
  const frames = [];
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  let previousNormal = new THREE.Vector3(0, 0, 1);

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

  for (let i = 0; i <= tubular; i++) {
    const f = frames[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const v = f.p.clone().addScaledVector(f.n, c * f.r).addScaledVector(f.b, s * f.r);
      positions.push(v.x, v.y, v.z);
    }
  }
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

function buildTree() {
  const tree = new THREE.Group();
  const branchCurves = [];
  const branchMeshes = [];
  const terminalTwigs = [];
  const materials = [];
  const woodMain = new THREE.MeshBasicMaterial({ color: 0x432831, transparent: true, opacity: .92 });
  const woodLight = new THREE.MeshBasicMaterial({ color: 0x70404b, transparent: true, opacity: .82 });
  materials.push(woodMain, woodLight);

  const trunkPts = [];
  for (let i = 0; i < 96; i++) {
    const t = i / 95;
    const bend = Math.sin(t * 4.0) * .28 + Math.sin(t * 8.7 + .8) * .075 + (t - .5) * .28;
    trunkPts.push(new THREE.Vector3(bend, (t - .5) * 8.8, Math.cos(t * 2.3) * .18));
  }
  const trunkCurve = makeCurve(trunkPts);
  const trunk = new THREE.Mesh(makeBranchGeometry(trunkCurve, .22, .075, 9, 72), woodMain);
  tree.add(trunk); branchMeshes.push(trunk);

  const roots = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + .15;
    const start = new THREE.Vector3(Math.cos(a) * .06, -4.36, Math.sin(a) * .06);
    const end = new THREE.Vector3(Math.cos(a) * (.65 + (i % 3) * .12), -4.65 + (i % 2) * .08, Math.sin(a) * (.38 + (i % 2) * .12));
    const mid = start.clone().lerp(end, .5).add(new THREE.Vector3(Math.cos(a) * .08, .12, Math.sin(a) * .05));
    const curve = makeCurve([start, mid, end]);
    const mesh = new THREE.Mesh(makeBranchGeometry(curve, .075, .012, 6, 20), woodLight);
    tree.add(mesh); roots.push(mesh); branchMeshes.push(mesh);
  }

  const primaryCount = 11;
  for (let i = 0; i < primaryCount; i++) {
    const u = .16 + (i / (primaryCount - 1)) * .72;
    const side = i % 2 === 0 ? -1 : 1;
    const origin = trunkCurve.getPointAt(u);
    const lean = 1.0 + Math.sin(i * 1.7) * .18 + (u > .5 ? .3 : 0);
    const end = origin.clone().add(new THREE.Vector3(side * lean, .52 + (u - .45) * 1.55, (i % 3 - 1) * .10));
    const mid = origin.clone().lerp(end, .48).add(new THREE.Vector3(side * .18, .20, .05));
    const curve = makeCurve([origin, mid, end]);
    branchCurves.push(curve);
    const mesh = new THREE.Mesh(makeBranchGeometry(curve, .105, .028, 7, 28), woodLight);
    tree.add(mesh); branchMeshes.push(mesh);

    const secondaryCount = 3 + (i % 2);
    for (let j = 0; j < secondaryCount; j++) {
      const q = .42 + j * (.44 / Math.max(1, secondaryCount - 1));
      const p = curve.getPointAt(q);
      const tangent = curve.getTangentAt(q).normalize();
      const outward = new THREE.Vector3(side, .28 + j * .06, (j % 2 ? .28 : -.22)).normalize();
      const length = .58 + j * .16 + (i % 3) * .05;
      const e = p.clone().add(outward.multiplyScalar(length)).add(tangent.multiplyScalar(.18));
      const m = p.clone().lerp(e, .5).add(new THREE.Vector3(side * .06, .08, 0));
      const sub = makeCurve([p, m, e]);
      branchCurves.push(sub);
      const sm = new THREE.Mesh(makeBranchGeometry(sub, .045, .012, 6, 18), woodLight);
      tree.add(sm); branchMeshes.push(sm);

      const twigCount = 2 + ((i + j) % 2);
      for (let k = 0; k < twigCount; k++) {
        const tq = .55 + k * .19;
        const tp = sub.getPointAt(Math.min(.94, tq));
        const tt = sub.getTangentAt(Math.min(.94, tq)).normalize();
        const twSide = k % 2 === 0 ? 1 : -1;
        const te = tp.clone().add(new THREE.Vector3(side * .18 + twSide * .10, .20 + k * .06, (k - .5) * .12)).add(tt.multiplyScalar(.34));
        const twig = makeCurve([tp, tp.clone().lerp(te, .5).add(new THREE.Vector3(0, .04, 0)), te]);
        branchCurves.push(twig); terminalTwigs.push(twig);
        const tm = new THREE.Mesh(makeBranchGeometry(twig, .018, .003, 5, 12), woodLight);
        tree.add(tm); branchMeshes.push(tm);
      }
    }
  }

  return { tree, trunk, trunkCurve, branchCurves, branchMeshes, terminalTwigs, materials };
}

function createPetalTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 28, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,235,243,1)'); g.addColorStop(.55, 'rgba(255,170,199,.95)'); g.addColorStop(1, 'rgba(226,110,151,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(32, 32, 20, 28, -.35, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function Background3D({ theme, pathname }) {
  const ref = useRef(null), targetStage = useRef(stageFor(pathname));
  useEffect(() => { targetStage.current = stageFor(pathname); }, [pathname]);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7)); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 120); camera.position.set(0, 0, 12);
    const world = new THREE.Group(); scene.add(world);
    const { tree, trunk, trunkCurve, branchCurves, branchMeshes, terminalTwigs } = buildTree();
    world.add(tree); tree.position.set(2.25, -.65, 0);

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

    const fallingCount = 170;
    const falling = [];
    const fallingGroup = new THREE.Group(); scene.add(fallingGroup);
    for (let i = 0; i < fallingCount; i++) {
      const s = new THREE.Sprite(blossomMaterial.clone()); s.material.opacity = .42 + Math.random() * .25; s.material.color.setHex(palette[i % palette.length]);
      s.position.set(-2.8 + Math.random() * 6.8, -5.2 + Math.random() * 10.5, -1.8 + Math.random() * 3.4); const scale = .045 + Math.random() * .06; s.scale.set(scale, scale * 1.45, 1); fallingGroup.add(s);
      falling.push({ sprite: s, x: s.position.x, y: s.position.y, z: s.position.z, phase: Math.random() * 6.28, speed: .10 + Math.random() * .20, drift: .18 + Math.random() * .5, spin: Math.random() * 6.28 });
    }

    const signalCount = 44, signalPos = new Float32Array(signalCount * 3), signalGeo = new THREE.BufferGeometry(); signalGeo.setAttribute('position', new THREE.BufferAttribute(signalPos, 3));
    const signalMat = new THREE.PointsMaterial({ color: 0xffeef4, size: .052, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false });
    const signals = new THREE.Points(signalGeo, signalMat); tree.add(signals);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.72, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff9fbe, transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false })); tree.add(glow);

    const branchTargets = { 0: 0, 1: 3, 2: 11, 3: 22, 4: 34, 5: 45 };
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

    const clock = new THREE.Clock(); let frame, lastStage = targetStage.current, transitionStart = performance.now(), transitionFrom = targetStage.current;
    const focus = new THREE.Vector3();
    const branchPoint = s => s === 0 ? new THREE.Vector3(0, 0, 0) : (branchCurves[branchTargets[s] % branchCurves.length] || branchCurves[0]).getPointAt(.82);
    const animate = () => {
      frame = requestAnimationFrame(animate); const t = clock.getElapsedTime(), desired = targetStage.current;
      if (desired !== lastStage) { transitionFrom = lastStage; lastStage = desired; transitionStart = performance.now(); }
      const raw = Math.min(1, (performance.now() - transitionStart) / 1150), trans = raw * raw * (3 - 2 * raw);
      const from = branchPoint(transitionFrom), to = branchPoint(desired); const routeFocus = raw < 1 ? from.clone().multiplyScalar(1 - trans).add(to.clone().multiplyScalar(trans)) : to;
      if (desired === 0) routeFocus.set(0, 0, 0); focus.lerp(routeFocus, .065);
      pointerSpring.x += (pointer.x - pointerSpring.x) * .075; pointerSpring.y += (pointer.y - pointerSpring.y) * .075;
      world.rotation.y += (pointerSpring.x * .10 - world.rotation.y) * .025; world.rotation.x += (-pointerSpring.y * .06 - world.rotation.x) * .025;
      const focusZ = desired === 0 ? 11.5 : 7.0, z = focusZ + Math.sin(Math.PI * trans) * 1.9;
      camera.position.z += (z - camera.position.z) * .045; camera.position.x += (focus.x * .20 + pointerSpring.x * .22 - camera.position.x) * .045; camera.position.y += (focus.y * .10 - pointerSpring.y * .14 - camera.position.y) * .045;
      camera.lookAt(focus.x * .68, focus.y * .62, focus.z);

      const selected = branchTargets[desired] % branchCurves.length;
      branchMeshes.forEach((b, i) => { const active = desired === 0 || i === selected || i === selected + 1 || i === selected + 2 || i === selected + 3; const target = desired === 0 ? .80 : active ? .94 : .14; b.material.opacity += (target - b.material.opacity) * .045; });
      trunk.material.opacity += ((desired === 0 ? .94 : .52) - trunk.material.opacity) * .04;
      const selectedCurve = branchCurves[selected] || branchCurves[0];
      glow.position.lerp(desired === 0 ? new THREE.Vector3(0, 0, 0) : selectedCurve.getPointAt(.95), .07); glow.material.opacity = desired === 0 ? .035 : .07 + .025 * Math.sin(t * 1.6); glow.scale.setScalar(1 + Math.sin(t * 1.4) * .08);

      const mx = treePlanePoint.x, my = treePlanePoint.y;
      blossomMeta.forEach((s, i) => {
        const b = s.userData.base, dx = b.x - mx, dy = b.y - my, d = Math.sqrt(dx * dx + dy * dy) + .001, force = Math.max(0, 1 - d / 1.35), eased = force * force;
        s.position.x = b.x + Math.sin(t * .55 + s.userData.phase) * .018 + (dx / d) * eased * .20;
        s.position.y = b.y + Math.cos(t * .48 + s.userData.phase) * .014 + (dy / d) * eased * .17;
        s.position.z = b.z + Math.sin(t * .35 + s.userData.phase) * .025 + eased * .05;
      });

      falling.forEach((d, i) => {
        const cycle = 11, y = d.y - (t * d.speed) % cycle; const yy = y < -5.5 ? y + cycle : y;
        let x = d.x + Math.sin(t * .42 + d.phase) * d.drift + pointerSpring.x * .32;
        let z2 = d.z + Math.cos(t * .33 + d.phase) * .28;
        const dx = x - mx, dy = yy - my, dist = Math.sqrt(dx * dx + dy * dy) + .001, force = Math.max(0, 1 - dist / 1.25);
        x += (dx / dist) * force * .38; const fy = (dy / dist) * force * .20;
        d.sprite.position.set(x, yy + fy, z2 + force * .08); d.sprite.material.rotation = (d.spin + t * .35) % 6.28;
      });

      const sp = signalGeo.attributes.position.array;
      for (let i = 0; i < signalCount; i++) { const q = (i / signalCount + t * .075) % 1; const p = q < .58 ? trunkCurve.getPointAt(q / .58) : selectedCurve.getPointAt((q - .58) / .42); sp[i * 3] = p.x; sp[i * 3 + 1] = p.y; sp[i * 3 + 2] = p.z; }
      signalGeo.attributes.position.needsUpdate = true; signalMat.opacity = desired === 0 ? .18 : .7;
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame); removeEventListener('pointermove', onPointer); removeEventListener('resize', onResize);
      renderer.dispose(); petalTexture.dispose(); signalGeo.dispose(); signalMat.dispose(); glow.geometry.dispose(); glow.material.dispose();
      branchMeshes.forEach(m => { m.geometry.dispose(); if (m.material !== woodMain && m.material !== woodLight) m.material.dispose(); });
      blossoms.children.forEach(s => s.material.dispose()); flowerTipGroup.children.forEach(s => s.material.dispose()); falling.forEach(d => d.sprite.material.dispose()); woodMain.dispose(); woodLight.dispose();
    };
  }, [theme]);
  return <canvas ref={ref} className="idea-canvas" aria-hidden="true" />;
}

function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]); return null; }
function Page({ children }) { return <div className="page-enter">{children}</div> }
function SectionIntro({ eyebrow, title, note }) { return <div className="section-head"><div><span className="kicker mono">{eyebrow}</span><h2 className="section-title">{title}</h2></div><p className="section-note">{note}</p></div> }
function Layout({ theme, setTheme }) { const location = useLocation(); const [menuOpen, setMenuOpen] = useState(false); useEffect(() => setMenuOpen(false), [location.pathname]); return <><Background3D theme={theme} pathname={location.pathname} /><div className="vignette" /><div className="noise" /><header className="nav-wrap"><nav className={menuOpen ? 'menu-open' : ''}><Link className="brand" to="/"><span>R</span>ishabh <i>Agrawal</i></Link><div className="navlinks">{nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>)}</div><div className="nav-right"><ThemeToggle theme={theme} setTheme={setTheme} /><a className="nav-cta" href={`mailto:${profile.email}`}>Contact</a><button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}><span /><span /><span /></button></div></nav></header><div className="route-progress"><span style={{ width: `${18 + stageFor(location.pathname) * 16}%` }} /></div><main><Routes><Route path="/" element={<Home />} /><Route path="/work" element={<Work />} /><Route path="/lab" element={<Lab />} /><Route path="/lab/:slug" element={<ProjectShowcase />} /><Route path="/life" element={<Life />} /><Route path="/now" element={<Now />} /><Route path="/private/*" element={<Private />} /><Route path="*" element={<NotFound />} /></Routes></main><footer><div className="container"><div className="footer-top"><div><span className="kicker mono">OPEN CHANNEL</span><h2>Let's build<br /><em>something.</em></h2></div><div className="footer-links"><a href={`mailto:${profile.email}`}>Email ↗</a><a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a><a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a><a href="/private">Private ↗</a></div></div><div className="copyright"><span>© {new Date().getFullYear()} Rishabh Agrawal</span><span className="mono">BUILT WITH CURIOSITY</span></div></div></footer></> }

function Home() { return <Page><div className="container"><section className="hero"><div className="hero-grid"><div><span className="kicker mono">BUILDER · RESEARCHER · CURIOUS HUMAN</span><h1>I build<br /><em>systems</em><br />that matter.</h1><p className="hero-copy">A personal space for professional work, experiments, research, and the things I build simply because I want to understand them.</p><div className="hero-actions"><Link to="/work" className="button primary">Explore work ↗</Link><Link to="/lab" className="button">Enter the lab ↗</Link></div></div><div className="hero-side"><span className="side-index mono">THE LIVING TREE / 00</span><div className="big">1<span>→</span>∞</div><p>The tree is the navigation system.<br />Move through it, and the world changes with you.</p></div></div><div className="scroll mono">Scroll to explore <i /></div></section><section className="manifesto"><div className="manifesto-grid"><span className="kicker mono">THE IDEA</span><p>Credentials explain <em>where</em> I've been. <span>What I build explains what I can do.</span></p></div></section><section><SectionIntro eyebrow="01 / WORK" title="Capability, not credentials." note={'Professional experience is the trunk.\nThe Lab is where the evidence branches out.'} /><div className="feature-grid"><Link to="/work" className="feature-card"><span className="mono">EXPERIENCE</span><strong>Goldman Sachs</strong><p>23 months building and improving systems in a high-stakes engineering environment.</p><b>View experience ↗</b></Link><Link to="/lab" className="feature-card accent-card"><span className="mono">THE LAB</span><strong>Ideas → experiments</strong><p>Quant research, Python, automation, ML, apps and the random things worth building.</p><b>Explore the lab ↗</b></Link></div></section><section className="closing"><span className="kicker mono">THE SYSTEM</span><h2>One living tree.<br /><em>Many directions.</em></h2><p>Work, experiments and life don't need to live in separate universes.<br />They are different branches of the same curiosity.</p></section></div></Page> }
function Work() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">WORK / 01</span><h1>Build proof.<br /><em>Not just a résumé.</em></h1><p>Professional experience, education and the evidence behind the way I work.</p></section><section><SectionIntro eyebrow="Experience" title="The professional path" note={'A deliberately compact version.\nThe deeper evidence belongs in the Lab and individual showcases.'} /><div className="timeline"><div className="row"><span className="year mono">2023—25</span><div><h3>Goldman Sachs</h3><p>Full-Time Analyst · Engineering</p></div><div><p>Maintained 15+ services, analyzed 20+ workflows, automated manual processes and worked across multiple teams.</p></div><span className="arrow">↗</span></div><div className="row"><span className="year mono">2024—26</span><div><h3>IIM Indore</h3><p>MBA / PGP</p></div><div><p>Business education layered on top of a computer science and engineering foundation.</p></div><span className="arrow">↗</span></div><div className="row"><span className="year mono">2018—22</span><div><h3>VNIT Nagpur</h3><p>B.Tech · Computer Science</p></div><div><p>Built the technical foundation through systems, algorithms, programming and experimentation.</p></div><span className="arrow">↗</span></div></div></section><section className="impact"><SectionIntro eyebrow="Impact" title="Numbers I care about" note="A few outcomes from professional engineering work." /><div className="metrics"><div><strong>5+</strong><span>hours saved on critical feed runtime</span></div><div><strong>50%</strong><span>efficiency improvement through automation</span></div><div><strong>20%</strong><span>reduction in production issue frequency</span></div><div><strong>15+</strong><span>services maintained</span></div></div></section><section><SectionIntro eyebrow="Evidence" title="Explore the work" note="Projects will appear here as full showcases once you publish them." /><div className="empty-work"><span className="mono">LAB READY</span><h3>No projects published yet.</h3><p>The structure is ready for your first quant research paper, Python experiment, app, website or ML project.</p><Link to="/lab" className="button">Open Lab ↗</Link></div></section></div></Page> }
function Lab() { const [filter, setFilter] = useState('all'); const categories = ['all', 'quant', 'python', 'ml', 'build', 'side quest']; const filtered = useMemo(() => filter === 'all' ? projects : projects.filter(p => p.category === filter), [filter]); return <Page><div className="container"><section className="page-hero lab-hero"><span className="kicker mono">WORK / 02 / THE LAB</span><h1>Things I build<br /><em>because I can.</em></h1><p>Quant research. Python scripts. Automation. ML. Apps.<br />Experiments.<br />Side quests.<br />If it starts with “I wonder if…”, it belongs here.</p></section><section><div className="lab-meta"><div><span className="kicker mono">PROJECT ARCHIVE</span><h2>{projects.length ? `${projects.length} experiments` : 'The workbench is waiting.'}</h2></div><div className="filters">{categories.map(c => <button key={c} className={filter === c ? 'active' : ''} onClick={() => setFilter(c)}>{c}</button>)}</div></div>{filtered.length ? <div className="project-list">{filtered.map(p => <Link to={`/lab/${p.slug}`} className="project-row" key={p.slug}><span className="mono">{p.year}</span><div><span className="project-cat mono">{p.category}</span><h3>{p.title}</h3><p>{p.description}</p></div><span className="arrow">↗</span></Link>)}</div> : <div className="lab-empty"><div className="empty-tree"><span /><span /><span /></div><span className="kicker mono">READY FOR YOUR FIRST EXPERIMENT</span><h3>No projects published yet.</h3><p>Add them in <code>src/data.js</code>.<br />Each project automatically gets its own showcase route.</p><div className="lab-schema mono">title · category · year · description · tags · body · links</div></div>}</section></div></Page> }
function ProjectShowcase() { const { slug } = useParams(); const navigate = useNavigate(); const p = projects.find(x => x.slug === slug); if (!p) return <Page><div className="container"><section className="page-hero"><span className="kicker mono">LAB / PROJECT</span><h1>This branch<br /><em>doesn't exist yet.</em></h1><p>The project archive is intentionally empty.</p><button className="button" onClick={() => navigate('/lab')}>Back to Lab ↗</button></section></div></Page>; return <Page><div className="container"><section className="project-showcase"><Link to="/lab" className="back mono">← ALL EXPERIMENTS</Link><span className="kicker mono">{p.category} · {p.year}</span><h1>{p.title}</h1><p className="lead">{p.description}</p><div className="showcase-grid"><aside>{(p.tags || []).map(t => <span key={t}>{t}</span>)}</aside><article>{p.body}</article></div></section></div></Page> }
function Life() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">LIFE / 03</span><h1>The branches<br /><em>outside work.</em></h1><p>Travel, photography, music, hobbies and the things that make the person behind the work.</p></section><section><div className="life-grid">{[['01 / ATLAS', 'Travel', 'Mountains, new cities and places that change the frame.', 'MOUNTAINS · ROADS · NEW PLACES'], ['02 / FRAME', 'Photography', 'Night skies, mountains and ordinary moments worth keeping.', 'STARS · LANDSCAPES · MOMENTS'], ['03 / PLAY', 'Hobbies', 'Origami, music, rabbit holes and things with no practical reason.', 'MUSIC · ORIGAMI · RABBIT HOLES'], ['04 / NOTES', 'Journal', "Notes on things I'm learning, thinking about and changing my mind about.", 'IDEAS · OBSERVATIONS · QUESTIONS']].map(([k, t, d, m]) => <div className="life-card" key={k}><span className="mono">{k}</span><h3>{t}</h3><p>{d}</p><div className="life-art"><i /><i /><i /></div><div className="life-meta mono">{m}</div></div>)}</div></section></div></Page> }
function Now() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">NOW / 04</span><h1>What the tree<br /><em>is growing today.</em></h1><p>A living snapshot.<br />This page is meant to change as interests, projects and priorities change.</p></section><section><div className="now-grid"><div><b>BUILDING</b><span>This website + future Lab projects</span></div><div><b>LEARNING</b><span>Quant research, markets and better ways to reason with data</span></div><div><b>EXPLORING</b><span>Ideas worth testing before deciding whether they are useful</span></div><div><b>LISTENING</b><span>Music while working</span></div></div></section></div></Page> }
function Private() { return <Page><div className="container"><section className="page-hero private-hero"><span className="kicker mono">PRIVATE / 05</span><h1>A private branch<br /><em>for later.</em></h1><p>This is the shell for personal tools such as Finance.<br />Keep this route behind Cloudflare Access before adding any sensitive data.</p><div className="private-panel"><span className="mono">RISHABHOS PRIVATE</span><strong>Authentication boundary ready.</strong><p>Next: add Finance, personal dashboards and other tools here without mixing private data into the public site.</p></div></section></div></Page> }
function NotFound() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">404</span><h1>Wrong branch.</h1><p>Let's get you back to the trunk.</p><Link to="/" className="button primary">Return home ↗</Link></section></div></Page> }
function App() { const [theme, setTheme] = useState(() => localStorage.getItem('rishabh-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')); useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('rishabh-theme', theme) }, [theme]); return <BrowserRouter><ScrollToTop /><Layout theme={theme} setTheme={setTheme} /></BrowserRouter> }
createRoot(document.getElementById('root')).render(<App />);
