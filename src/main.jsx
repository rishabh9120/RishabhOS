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

function ThemeToggle({ theme, setTheme }) { return <button className="theme-toggle" aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span>{theme === 'dark' ? '☼' : '◐'}</span></button>; }

function Background3D({ theme, pathname }) {
  const ref = useRef(null), targetStage = useRef(stageFor(pathname));
  useEffect(() => { targetStage.current = stageFor(pathname) }, [pathname]);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight); renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, .1, 120); camera.position.set(0, 0, 12);
    const world = new THREE.Group(); scene.add(world);
    const tree = new THREE.Group(); world.add(tree); tree.position.set(2.45, -.65, 0);

    const trunkPts = [];
    for (let i = 0; i < 110; i++) { const t = i / 109; trunkPts.push(new THREE.Vector3(Math.sin(t * 4.8) * .30 + Math.sin(t * 10) * .06 + (t - .5) * .30, (t - .5) * 8.8, Math.cos(t * 2.7) * .18)); }
    const trunkCurve = new THREE.CatmullRomCurve3(trunkPts, false, 'catmullrom', .5);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 220, .15, 9, false), new THREE.MeshBasicMaterial({ color: 0x51303a, transparent: true, opacity: .9 })); tree.add(trunk);

    const branchCurves = [], branchMeshes = [];
    const mainBranches = [[.12, -1, .92], [.20, 1, .98], [.29, -1, 1.38], [.38, 1, 1.65], [.47, -1, 1.75], [.55, 1, 1.92], [.63, -1, 1.72], [.71, 1, 1.55], [.79, -1, 1.42], [.86, 1, 1.18]];
    mainBranches.forEach(([u, side, len]) => {
      const o = trunkCurve.getPointAt(u), e = o.clone().add(new THREE.Vector3(side * len, .62 + (u - .5) * 1.2, .05)), m = o.clone().lerp(e, .48).add(new THREE.Vector3(side * .20, .22, .03));
      const curve = new THREE.CatmullRomCurve3([o, m, e], false, 'catmullrom', .45); branchCurves.push(curve);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, .065 + (u < .4 ? .018 : 0), 7, false), new THREE.MeshBasicMaterial({ color: 0x6b3e47, transparent: true, opacity: .84 })); tree.add(mesh); branchMeshes.push(mesh);
      for (let j = 0; j < 3; j++) {
        const q = .48 + j * .18, p = curve.getPointAt(q), end = p.clone().add(new THREE.Vector3(side * (.55 + j * .14), .35 + j * .13, .02));
        const sub = new THREE.CatmullRomCurve3([p, p.clone().lerp(end, .5).add(new THREE.Vector3(side * .08, .08, 0)), end], false, 'catmullrom', .5); branchCurves.push(sub);
        const sm = new THREE.Mesh(new THREE.TubeGeometry(sub, 48, .024 + (2 - j) * .006, 6, false), new THREE.MeshBasicMaterial({ color: 0x75464f, transparent: true, opacity: .7 })); tree.add(sm); branchMeshes.push(sm);
      }
    });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, side = i % 2 ? 1 : -1, start = new THREE.Vector3(Math.cos(a) * .10, -4.1, Math.sin(a) * .08), end = new THREE.Vector3(Math.cos(a) * (.55 + .12 * (i % 3)), -4.55 + .15 * (i % 2), Math.sin(a) * .25);
      const root = new THREE.CatmullRomCurve3([start, start.clone().lerp(end, .5).add(new THREE.Vector3(side * .1, .08, 0)), end], false, 'catmullrom', .5);
      tree.add(new THREE.Mesh(new THREE.TubeGeometry(root, 32, .035, 6, false), new THREE.MeshBasicMaterial({ color: 0x6a3d46, transparent: true, opacity: .7 })));
    }

    const bloomCount = 1750, bloomPos = new Float32Array(bloomCount * 3), bloomColor = new Float32Array(bloomCount * 3), bloomMeta = [];
    const palette = [new THREE.Color(0xff9fbd), new THREE.Color(0xffb6cd), new THREE.Color(0xffc8da), new THREE.Color(0xe98eb0)];
    for (let i = 0; i < bloomCount; i++) {
      const branch = branchCurves[Math.floor(Math.random() * branchCurves.length)], u = .68 + Math.random() * .32, p = branch.getPointAt(u), spread = (Math.random() ** 1.8) * (.30 + Math.random() * .34), a = Math.random() * Math.PI * 2;
      const x = p.x + Math.cos(a) * spread, y = p.y + Math.sin(a) * spread * (.72 + Math.random() * .4), z = p.z + (Math.random() - .5) * .46;
      bloomPos[i * 3] = x; bloomPos[i * 3 + 1] = y; bloomPos[i * 3 + 2] = z;
      const c = palette[Math.floor(Math.random() * palette.length)]; bloomColor[i * 3] = c.r; bloomColor[i * 3 + 1] = c.g; bloomColor[i * 3 + 2] = c.b;
      bloomMeta.push({ baseX: x, baseY: y, baseZ: z, phase: Math.random() * Math.PI * 2, amp: .018 + Math.random() * .055 });
    }
    const bloomGeo = new THREE.BufferGeometry(); bloomGeo.setAttribute('position', new THREE.BufferAttribute(bloomPos, 3)); bloomGeo.setAttribute('color', new THREE.BufferAttribute(bloomColor, 3));
    const bloomMat = new THREE.PointsMaterial({ size: .082, transparent: true, opacity: .92, vertexColors: true, depthWrite: false, sizeAttenuation: true }); const blooms = new THREE.Points(bloomGeo, bloomMat); tree.add(blooms);

    const flowerCount = 115, flowerPos = new Float32Array(flowerCount * 3), flowerColor = new Float32Array(flowerCount * 3);
    for (let i = 0; i < flowerCount; i++) {
      const b = branchCurves[(i * 7) % branchCurves.length], p = b.getPointAt(.88 + (i % 5) * .02); flowerPos[i * 3] = p.x + (Math.random() - .5) * .20; flowerPos[i * 3 + 1] = p.y + (Math.random() - .5) * .20; flowerPos[i * 3 + 2] = p.z + .03;
      const c = palette[(i * 3) % palette.length]; flowerColor[i * 3] = c.r; flowerColor[i * 3 + 1] = c.g; flowerColor[i * 3 + 2] = c.b;
    }
    const flowerGeo = new THREE.BufferGeometry(); flowerGeo.setAttribute('position', new THREE.BufferAttribute(flowerPos, 3)); flowerGeo.setAttribute('color', new THREE.BufferAttribute(flowerColor, 3));
    const flowerMat = new THREE.PointsMaterial({ size: .19, transparent: true, opacity: .45, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }); const flowers = new THREE.Points(flowerGeo, flowerMat); tree.add(flowers);

    const petalCount = 240, petalPos = new Float32Array(petalCount * 3), petalMeta = [];
    for (let i = 0; i < petalCount; i++) { petalPos[i * 3] = -2.6 + Math.random() * 6.4; petalPos[i * 3 + 1] = -4.8 + Math.random() * 10.8; petalPos[i * 3 + 2] = -1.4 + Math.random() * 2.8; petalMeta.push({ x: petalPos[i * 3], y: petalPos[i * 3 + 1], z: petalPos[i * 3 + 2], phase: Math.random() * 6.28, speed: .12 + Math.random() * .22, drift: .35 + Math.random() * .55 }); }
    const petalGeo = new THREE.BufferGeometry(); petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
    const petalMat = new THREE.PointsMaterial({ color: 0xffb6cc, size: .065, transparent: true, opacity: .62, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }); const petals = new THREE.Points(petalGeo, petalMat); scene.add(petals);

    const signalCount = 46, signalPos = new Float32Array(signalCount * 3), signalGeo = new THREE.BufferGeometry(); signalGeo.setAttribute('position', new THREE.BufferAttribute(signalPos, 3));
    const signalMat = new THREE.PointsMaterial({ color: 0xffeef4, size: .055, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }); const signals = new THREE.Points(signalGeo, signalMat); tree.add(signals);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.72, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff9fbe, transparent: true, opacity: .055, blending: THREE.AdditiveBlending, depthWrite: false })); tree.add(glow);

    const branchTargets = { 0: 0, 1: 4, 2: 8, 3: 16, 4: 24, 5: 12 };
    const pointer = { x: 0, y: 0 }, pointerSpring = { x: 0, y: 0 }, pointerWorld = new THREE.Vector3(), raycaster = new THREE.Raycaster(), mouseNdc = new THREE.Vector2(), interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const onPointer = e => {
      mouseNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); raycaster.setFromCamera(mouseNdc, camera); raycaster.ray.intersectPlane(interactionPlane, pointerWorld);
      tree.worldToLocal(pointerWorld); pointer.x = THREE.MathUtils.clamp(pointerWorld.x / 4.7, -1, 1); pointer.y = THREE.MathUtils.clamp(pointerWorld.y / 5.7, -1, 1);
    };
    const onResize = () => { renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix() };
    addEventListener('pointermove', onPointer, { passive: true }); addEventListener('resize', onResize);

    const clock = new THREE.Clock(); let frame, lastStage = targetStage.current, transitionStart = performance.now(), transitionFrom = targetStage.current;
    const focus = new THREE.Vector3();
    const branchPoint = s => s === 0 ? new THREE.Vector3(0, 0, 0) : branchCurves[branchTargets[s]].getPointAt(.84);
    const animate = () => {
      frame = requestAnimationFrame(animate); const t = clock.getElapsedTime(), desired = targetStage.current;
      if (desired !== lastStage) { transitionFrom = lastStage; lastStage = desired; transitionStart = performance.now() }
      const raw = Math.min(1, (performance.now() - transitionStart) / 1150), trans = raw * raw * (3 - 2 * raw), from = branchPoint(transitionFrom), to = branchPoint(desired);
      const routeFocus = raw < 1 ? from.clone().multiplyScalar(1 - trans).add(to.clone().multiplyScalar(trans)) : to; if (desired === 0) routeFocus.set(0, 0, 0); focus.lerp(routeFocus, .065);
      pointerSpring.x += (pointer.x - pointerSpring.x) * .075; pointerSpring.y += (pointer.y - pointerSpring.y) * .075;
      world.rotation.y += (pointerSpring.x * .095 - world.rotation.y) * .025; world.rotation.x += (-pointerSpring.y * .055 - world.rotation.x) * .025;
      const focusZ = desired === 0 ? 11.4 : 7.15, z = focusZ + Math.sin(Math.PI * trans) * 2.0; camera.position.z += (z - camera.position.z) * .045; camera.position.x += (focus.x * .22 + pointerSpring.x * .20 - camera.position.x) * .045; camera.position.y += (focus.y * .10 - pointerSpring.y * .13 - camera.position.y) * .045; camera.lookAt(focus.x * .68, focus.y * .62, focus.z);

      const selected = branchTargets[desired];
      branchMeshes.forEach((b, i) => { const active = desired === 0 || i === selected || i === selected + 1 || i === selected + 2; const target = desired === 0 ? .78 : active ? .92 : .16; b.material.opacity += (target - b.material.opacity) * .045; });
      trunk.material.opacity += ((desired === 0 ? .92 : .50) - trunk.material.opacity) * .04; flowers.material.opacity += (.38 + .10 * Math.sin(t * 1.2) - flowers.material.opacity) * .04;
      glow.position.lerp(desired === 0 ? new THREE.Vector3(0, 0, 0) : branchCurves[selected].getPoint(1), .07); glow.material.opacity = desired === 0 ? .035 : .075 + .025 * Math.sin(t * 1.6); glow.scale.setScalar(1 + Math.sin(t * 1.4) * .08);

      const bp = bloomGeo.attributes.position.array, mx = pointerWorld.x, my = pointerWorld.y;
      for (let i = 0; i < bloomMeta.length; i++) { const d = bloomMeta[i], dx = d.baseX - mx, dy = d.baseY - my, dist = Math.sqrt(dx * dx + dy * dy) + .0001, force = Math.max(0, 1 - dist / 1.75), eased = force * force; bp[i * 3] = d.baseX + Math.sin(t * .55 + d.phase) * d.amp + (dx / dist) * eased * .34; bp[i * 3 + 1] = d.baseY + Math.cos(t * .48 + d.phase) * d.amp + (dy / dist) * eased * .30; bp[i * 3 + 2] = d.baseZ + Math.sin(t * .35 + d.phase) * .035 + eased * .08; }
      bloomGeo.attributes.position.needsUpdate = true;

      const pp = petalGeo.attributes.position.array;
      for (let i = 0; i < petalMeta.length; i++) { const d = petalMeta[i]; let y = d.y - (t * d.speed) % 11; if (y < -5.2) y += 11; let x = d.x + Math.sin(t * .45 + d.phase) * d.drift + pointerSpring.x * .30, zp = d.z + Math.cos(t * .35 + d.phase) * .32; const dx = x - mx, dy = y - my, dist = Math.sqrt(dx * dx + dy * dy) + .001, force = Math.max(0, 1 - dist / 1.35); x += (dx / dist) * force * .45; y += (dy / dist) * force * .25; zp += force * .10; pp[i * 3] = x; pp[i * 3 + 1] = y; pp[i * 3 + 2] = zp; }
      petalGeo.attributes.position.needsUpdate = true;

      const sp = signalGeo.attributes.position.array, curve = branchCurves[selected];
      for (let i = 0; i < signalCount; i++) { const q = (i / signalCount + t * .075) % 1, p = q < .56 ? trunkCurve.getPointAt(q / .56) : curve.getPointAt((q - .56) / .44); sp[i * 3] = p.x; sp[i * 3 + 1] = p.y; sp[i * 3 + 2] = p.z; }
      signalGeo.attributes.position.needsUpdate = true; signalMat.opacity = desired === 0 ? .22 : .72; renderer.render(scene, camera);
    };
    animate();
    return () => { cancelAnimationFrame(frame); removeEventListener('pointermove', onPointer); removeEventListener('resize', onResize); renderer.dispose();[trunk.geometry, ...branchMeshes.map(b => b.geometry), bloomGeo, flowerGeo, petalGeo, signalGeo, glow.geometry].forEach(g => g.dispose());[trunk.material, ...branchMeshes.map(b => b.material), bloomMat, flowerMat, petalMat, signalMat, glow.material].forEach(m => m.dispose()); };
  }, [theme]);
  return <canvas ref={ref} className="idea-canvas" aria-hidden="true" />;
}
function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname]); return null; }
function Page({ children }) { return <div className="page-enter">{children}</div> }
function SectionIntro({ eyebrow, title, note }) { return <div className="section-head"><div><span className="kicker mono">{eyebrow}</span><h2 className="section-title">{title}</h2></div><p className="section-note">{note}</p></div> }

function Layout({ theme, setTheme }) { const location = useLocation(); const [menuOpen, setMenuOpen] = useState(false); useEffect(() => { setMenuOpen(false) }, [location.pathname]); return <><Background3D theme={theme} pathname={location.pathname} /><div className="vignette" /><div className="noise" /><header className="nav-wrap"><nav className={menuOpen ? 'menu-open' : ''}><Link className="brand" to="/"><span>R</span>ishabh <i>Agrawal</i></Link><div className="navlinks">{nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>)}</div><div className="nav-right"><ThemeToggle theme={theme} setTheme={setTheme} /><a className="nav-cta" href={`mailto:${profile.email}`}>Contact</a><button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}><span /><span /><span /></button></div></nav></header><div className="route-progress"><span style={{ width: `${18 + stageFor(location.pathname) * 16}%` }} /></div><main><Routes><Route path="/" element={<Home />} /><Route path="/work" element={<Work />} /><Route path="/lab" element={<Lab />} /><Route path="/lab/:slug" element={<ProjectShowcase />} /><Route path="/life" element={<Life />} /><Route path="/now" element={<Now />} /><Route path="/private/*" element={<Private />} /><Route path="*" element={<NotFound />} /></Routes></main><footer><div className="container"><div className="footer-top"><div><span className="kicker mono">OPEN CHANNEL</span><h2>Let's build<br /><em>something.</em></h2></div><div className="footer-links"><a href={`mailto:${profile.email}`}>Email ↗</a><a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a><a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a><a href="/private">Private ↗</a></div></div><div className="copyright"><span>© {new Date().getFullYear()} Rishabh Agrawal</span><span className="mono">BUILT WITH CURIOSITY</span></div></div></footer></> }

function Home() { return <Page><div className="container"><section className="hero"><div className="hero-grid"><div><span className="kicker mono">BUILDER · RESEARCHER · CURIOUS HUMAN</span><h1>I build<br /><em>systems</em><br />that matter.</h1><p className="hero-copy">A personal space for professional work, experiments, research, and the things I build simply because I want to understand them.</p><div className="hero-actions"><Link to="/work" className="button primary">Explore work ↗</Link><Link to="/lab" className="button">Enter the lab ↗</Link></div></div><div className="hero-side"><span className="side-index mono">THE LIVING TREE / 00</span><div className="big">1<span>→</span>∞</div><p>The tree is the navigation system. Move through it, and the world changes with you.</p></div></div><div className="scroll mono">Scroll to explore <i /></div></section><section className="manifesto"><div className="manifesto-grid"><span className="kicker mono">THE IDEA</span><p>Credentials explain <em>where</em> I've been. <span>What I build explains what I can do.</span></p></div></section><section><SectionIntro eyebrow="01 / WORK" title="Capability, not credentials." note="Professional experience is the trunk. The Lab is where the evidence branches out." /><div className="feature-grid"><Link to="/work" className="feature-card"><span className="mono">EXPERIENCE</span><strong>Goldman Sachs</strong><p>23 months building and improving systems in a high-stakes engineering environment.</p><b>View experience ↗</b></Link><Link to="/lab" className="feature-card accent-card"><span className="mono">THE LAB</span><strong>Ideas → experiments</strong><p>Quant research, Python, automation, ML, apps and the random things worth building.</p><b>Explore the lab ↗</b></Link></div></section><section className="closing"><span className="kicker mono">THE SYSTEM</span><h2>One living tree.<br /><em>Many directions.</em></h2><p>Work, experiments and life don't need to live in separate universes. They are different branches of the same curiosity.</p></section></div></Page> }
function Work() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">WORK / 01</span><h1>Build proof.<br /><em>Not just a résumé.</em></h1><p>Professional experience, education and the evidence behind the way I work.</p></section><section><SectionIntro eyebrow="Experience" title="The professional path" note="A deliberately compact version. The deeper evidence belongs in the Lab and individual showcases." /><div className="timeline"><div className="row"><span className="year mono">2023—25</span><div><h3>Goldman Sachs</h3><p>Full-Time Analyst · Engineering</p></div><div><p>Maintained 15+ services, analyzed 20+ workflows, automated manual processes and worked across multiple teams.</p></div><span className="arrow">↗</span></div><div className="row"><span className="year mono">2024—26</span><div><h3>IIM Indore</h3><p>MBA / PGP</p></div><div><p>Business education layered on top of a computer science and engineering foundation.</p></div><span className="arrow">↗</span></div><div className="row"><span className="year mono">2018—22</span><div><h3>VNIT Nagpur</h3><p>B.Tech · Computer Science</p></div><div><p>Built the technical foundation through systems, algorithms, programming and experimentation.</p></div><span className="arrow">↗</span></div></div></section><section className="impact"><SectionIntro eyebrow="Impact" title="Numbers I care about" note="A few outcomes from professional engineering work." /><div className="metrics"><div><strong>5+</strong><span>hours saved on critical feed runtime</span></div><div><strong>50%</strong><span>efficiency improvement through automation</span></div><div><strong>20%</strong><span>reduction in production issue frequency</span></div><div><strong>15+</strong><span>services maintained</span></div></div></section><section><SectionIntro eyebrow="Evidence" title="Explore the work" note="Projects will appear here as full showcases once you publish them." /><div className="empty-work"><span className="mono">LAB READY</span><h3>No projects published yet.</h3><p>The structure is ready for your first quant research paper, Python experiment, app, website or ML project.</p><Link to="/lab" className="button">Open Lab ↗</Link></div></section></div></Page> }
function Lab() { const [filter, setFilter] = useState('all'); const categories = ['all', 'quant', 'python', 'ml', 'build', 'side quest']; const filtered = useMemo(() => filter === 'all' ? projects : projects.filter(p => p.category === filter), [filter]); return <Page><div className="container"><section className="page-hero lab-hero"><span className="kicker mono">WORK / 02 / THE LAB</span><h1>Things I build<br /><em>because I can.</em></h1><p>Quant research. Python scripts. Automation. ML. Apps. Experiments. Side quests.<br />If it starts with “I wonder if…”, it belongs here.</p></section><section><div className="lab-meta"><div><span className="kicker mono">PROJECT ARCHIVE</span><h2>{projects.length ? `${projects.length} experiments` : 'The workbench is waiting.'}</h2></div><div className="filters">{categories.map(c => <button key={c} className={filter === c ? 'active' : ''} onClick={() => setFilter(c)}>{c}</button>)}</div></div>{filtered.length ? <div className="project-list">{filtered.map(p => <Link to={`/lab/${p.slug}`} className="project-row" key={p.slug}><span className="mono">{p.year}</span><div><span className="project-cat mono">{p.category}</span><h3>{p.title}</h3><p>{p.description}</p></div><span className="arrow">↗</span></Link>)}</div> : <div className="lab-empty"><div className="empty-tree"><span /><span /><span /></div><span className="kicker mono">READY FOR YOUR FIRST EXPERIMENT</span><h3>No projects published yet.</h3><p>Add them in <code>src/data.js</code>. Each project automatically gets its own showcase route.</p><div className="lab-schema mono">title · category · year · description · tags · body · links</div></div>}</section></div></Page> }
function ProjectShowcase() { const { slug } = useParams(); const navigate = useNavigate(); const p = projects.find(x => x.slug === slug); if (!p) return <Page><div className="container"><section className="page-hero"><span className="kicker mono">LAB / PROJECT</span><h1>This branch<br /><em>doesn't exist yet.</em></h1><p>The project archive is intentionally empty.</p><button className="button" onClick={() => navigate('/lab')}>Back to Lab ↗</button></section></div></Page>; return <Page><div className="container"><section className="project-showcase"><Link to="/lab" className="back mono">← ALL EXPERIMENTS</Link><span className="kicker mono">{p.category} · {p.year}</span><h1>{p.title}</h1><p className="lead">{p.description}</p><div className="showcase-grid"><aside>{(p.tags || []).map(t => <span key={t}>{t}</span>)}</aside><article>{p.body}</article></div></section></div></Page> }
function Life() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">LIFE / 03</span><h1>The branches<br /><em>outside work.</em></h1><p>Travel, photography, music, hobbies and the things that make the person behind the work.</p></section><section><div className="life-grid"><div className="life-card life-travel"><span className="mono">01 / ATLAS</span><h3>Travel</h3><p>Mountains, new cities and places that change the frame.</p><div className="life-art map-art"><i /><i /><i /><i /></div><div className="life-meta mono">MOUNTAINS · ROADS · NEW PLACES</div></div><div className="life-card"><span className="mono">02 / FRAME</span><h3>Photography</h3><p>Night skies, mountains and ordinary moments worth keeping.</p><div className="life-art photo-art"><i /><i /><i /></div><div className="life-meta mono">STARS · LANDSCAPES · MOMENTS</div></div><div className="life-card"><span className="mono">03 / PLAY</span><h3>Hobbies</h3><p>Origami, music, rabbit holes and things with no practical reason.</p><div className="life-art orbit-art"><i /><i /></div><div className="life-meta mono">MUSIC · ORIGAMI · RABBIT HOLES</div></div><div className="life-card"><span className="mono">04 / NOTES</span><h3>Journal</h3><p>Notes on things I'm learning, thinking about and changing my mind about.</p><div className="life-art note-art"><i /><i /><i /><i /></div><div className="life-meta mono">IDEAS · OBSERVATIONS · QUESTIONS</div></div></div></section></div></Page> }
function Now() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">NOW / 04</span><h1>What the tree<br /><em>is growing today.</em></h1><p>A living snapshot. This page is meant to change as interests, projects and priorities change.</p></section><section><div className="now-grid"><div><b>BUILDING</b><span>This website + future Lab projects</span></div><div><b>LEARNING</b><span>Quant research, markets and better ways to reason with data</span></div><div><b>EXPLORING</b><span>Ideas worth testing before deciding whether they are useful</span></div><div><b>LISTENING</b><span>Music while working</span></div></div></section></div></Page> }
function Private() { return <Page><div className="container"><section className="page-hero private-hero"><span className="kicker mono">PRIVATE / 05</span><h1>A private branch<br /><em>for later.</em></h1><p>This is the shell for personal tools such as Finance. Keep this route behind Cloudflare Access before adding any sensitive data.</p><div className="private-panel"><span className="mono">RISHABHOS PRIVATE</span><strong>Authentication boundary ready.</strong><p>Next: add Finance, personal dashboards and other tools here without mixing private data into the public site.</p></div></section></div></Page> }
function NotFound() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">404</span><h1>Wrong branch.</h1><p>Let's get you back to the trunk.</p><Link to="/" className="button primary">Return home ↗</Link></section></div></Page> }
function App() { const [theme, setTheme] = useState(() => localStorage.getItem('rishabh-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')); useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('rishabh-theme', theme) }, [theme]); return <BrowserRouter><ScrollToTop /><Layout theme={theme} setTheme={setTheme} /></BrowserRouter> }
createRoot(document.getElementById('root')).render(<App />);
