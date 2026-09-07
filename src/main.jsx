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
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8)); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 120); camera.position.set(0, 0, 12);
    const world = new THREE.Group(); scene.add(world); const tree = new THREE.Group(); world.add(tree);

    const trunkPts = []; for (let i = 0; i < 120; i++) { const t = i / 119; trunkPts.push(new THREE.Vector3(Math.sin(t * 5) * .34 + (t - .5) * .25, (t - .5) * 8.8, Math.cos(t * 2.8) * .22)); }
    const trunkCurve = new THREE.CatmullRomCurve3(trunkPts, false, 'catmullrom', .5);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 220, .095, 8, false), new THREE.MeshBasicMaterial({ color: 0x5b3540, transparent: true, opacity: .78 })); tree.add(trunk);

    const branches = [], branchCurves = []; const branchCount = 24;
    for (let i = 0; i < branchCount; i++) {
      const u = .09 + i / (branchCount - 1) * .82, o = trunkCurve.getPointAt(u), side = i % 2 ? -1 : 1, len = 1.1 + (i % 6) * .32;
      const e = o.clone().add(new THREE.Vector3(side * len, .35 + (i % 4) * .18, .14 * Math.sin(i)));
      const m = o.clone().lerp(e, .52).add(new THREE.Vector3(side * .24, .18, .08));
      const curve = new THREE.CatmullRomCurve3([o, m, e], false, 'catmullrom', .45); branchCurves.push(curve);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 70, .035 + (i % 3) * .012, 6, false), new THREE.MeshBasicMaterial({ color: 0x6f3f4b, transparent: true, opacity: .62 }));
      tree.add(mesh); branches.push(mesh);
      if (i % 2 === 0) {
        const subEnd = e.clone().add(new THREE.Vector3(side * .55, .48, .02));
        const sub = new THREE.CatmullRomCurve3([e, e.clone().lerp(subEnd, .45).add(new THREE.Vector3(side * .1, .12, 0)), subEnd], false, 'catmullrom', .5);
        const sm = new THREE.Mesh(new THREE.TubeGeometry(sub, 38, .018, 5, false), new THREE.MeshBasicMaterial({ color: 0x7b4a54, transparent: true, opacity: .55 })); tree.add(sm); branches.push(sm);
      }
    }

    const bloomCount = 1450, bloomPos = new Float32Array(bloomCount * 3), bloomMeta = [];
    for (let i = 0; i < bloomCount; i++) {
      const b = branchCurves[Math.floor(Math.random() * branchCurves.length)], u = .45 + Math.random() * .55, p = b.getPointAt(u);
      const spread = (Math.random() ** 1.7) * .22, a = Math.random() * Math.PI * 2;
      bloomPos[i * 3] = p.x + Math.cos(a) * spread; bloomPos[i * 3 + 1] = p.y + Math.sin(a) * spread; bloomPos[i * 3 + 2] = p.z + (Math.random() - .5) * .34;
      bloomMeta.push({ baseX: bloomPos[i * 3], baseY: bloomPos[i * 3 + 1], baseZ: bloomPos[i * 3 + 2], phase: Math.random() * Math.PI * 2, amp: .025 + Math.random() * .07, branch: b });
    }
    const bloomGeo = new THREE.BufferGeometry(); bloomGeo.setAttribute('position', new THREE.BufferAttribute(bloomPos, 3));
    const bloomMat = new THREE.PointsMaterial({ color: 0xffb9cf, size: .075, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const blooms = new THREE.Points(bloomGeo, bloomMat); tree.add(blooms);

    const petalCount = 180, petalPos = new Float32Array(petalCount * 3), petalMeta = [];
    for (let i = 0; i < petalCount; i++) { petalPos[i * 3] = (Math.random() - .5) * 8; petalPos[i * 3 + 1] = 3.8 + Math.random() * 8; petalPos[i * 3 + 2] = (Math.random() - .5) * 4; petalMeta.push({ x: petalPos[i * 3], y: petalPos[i * 3 + 1], z: petalPos[i * 3 + 2], phase: Math.random() * 6.28, speed: .15 + Math.random() * .25 }); }
    const petalGeo = new THREE.BufferGeometry(); petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
    const petalMat = new THREE.PointsMaterial({ color: 0xffc8d8, size: .045, transparent: true, opacity: .48, blending: THREE.AdditiveBlending, depthWrite: false }); const petals = new THREE.Points(petalGeo, petalMat); scene.add(petals);

    const signalCount = 38, signalPos = new Float32Array(signalCount * 3), signalGeo = new THREE.BufferGeometry(); signalGeo.setAttribute('position', new THREE.BufferAttribute(signalPos, 3));
    const signalMat = new THREE.PointsMaterial({ color: 0xffeef4, size: .06, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }); const signals = new THREE.Points(signalGeo, signalMat); tree.add(signals);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.65, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff9fbe, transparent: true, opacity: .06, blending: THREE.AdditiveBlending, depthWrite: false })); tree.add(glow);

    const branchTargets = { 0: 0, 1: 14, 2: 9, 3: 4, 4: 20, 5: 12 };
    const pointer = { x: 0, y: 0 }, pointerSpring = { x: 0, y: 0 }, previousPointer = { x: 0, y: 0 };
    const onPointer = e => { pointer.x = (e.clientX / innerWidth - .5) * 2; pointer.y = (e.clientY / innerHeight - .5) * 2 };
    const onResize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() };
    addEventListener('pointermove', onPointer, { passive: true }); addEventListener('resize', onResize);
    const clock = new THREE.Clock(); let frame, currentStage = targetStage.current, lastStage = targetStage.current, transitionStart = performance.now(), transitionFrom = targetStage.current;
    let focus = new THREE.Vector3();
    const branchPoint = s => s === 0 ? new THREE.Vector3(0, 0, 0) : branchCurves[branchTargets[s]].getPointAt(.74);

    const animate = () => {
      frame = requestAnimationFrame(animate); const t = clock.getElapsedTime(); const desired = targetStage.current;
      if (desired !== lastStage) { transitionFrom = lastStage; lastStage = desired; transitionStart = performance.now() }
      currentStage += (desired - currentStage) * .045;
      const raw = Math.min(1, (performance.now() - transitionStart) / 1150), trans = raw * raw * (3 - 2 * raw);
      const from = branchPoint(transitionFrom), to = branchPoint(desired);
      let routeFocus;
      if (raw < 1) { const arcA = from.clone().multiplyScalar(1 - trans), arcB = to.clone().multiplyScalar(trans); routeFocus = arcA.add(arcB); routeFocus.multiplyScalar(Math.sin(Math.PI * trans) * .15 + 1); }
      else routeFocus = to;
      if (desired === 0) routeFocus.set(0, 0, 0);
      focus.lerp(routeFocus, .065);
      pointerSpring.x += (pointer.x - pointerSpring.x) * .055; pointerSpring.y += (pointer.y - pointerSpring.y) * .055;
      const windX = pointerSpring.x * .12, windY = -pointerSpring.y * .08;
      world.rotation.y += (windX - world.rotation.y) * .025; world.rotation.x += (windY - world.rotation.x) * .025;
      const focusZ = desired === 0 ? 11.6 : 7.5, z = focusZ + Math.sin(Math.PI * trans) * 2.2;
      camera.position.z += (z - camera.position.z) * .045;
      camera.position.x += (focus.x * .28 + pointerSpring.x * .34 - camera.position.x) * .045;
      camera.position.y += (focus.y * .12 - pointerSpring.y * .20 - camera.position.y) * .045;
      camera.lookAt(focus.x * .75, focus.y * .72, focus.z);

      const selected = branchTargets[desired];
      branches.forEach((b, i) => { const active = desired === 0 || i === selected; const target = desired === 0 ? .54 : active ? .95 : .10; b.material.opacity += (target - b.material.opacity) * .045; });
      trunk.material.opacity += ((desired === 0 ? .88 : .42) - trunk.material.opacity) * .04;
      glow.position.lerp(desired === 0 ? new THREE.Vector3(0, 0, 0) : branchCurves[selected].getPoint(1), .07); glow.material.opacity = desired === 0 ? .035 : .08 + .025 * Math.sin(t * 1.6); glow.scale.setScalar(1 + Math.sin(t * 1.4) * .08);

      const bp = bloomGeo.attributes.position.array;
      for (let i = 0; i < bloomMeta.length; i++) { const d = bloomMeta[i]; const dx = d.baseX - (pointerSpring.x * 2.1), dy = d.baseY - (-pointerSpring.y * 1.8), dist = Math.sqrt(dx * dx + dy * dy) + .001; const force = Math.max(0, 1 - dist / 2.6); const fx = force * (dx / dist) * .45, fy = force * (dy / dist) * .35; bp[i * 3] = d.baseX + Math.sin(t * .45 + d.phase) * d.amp + fx; bp[i * 3 + 1] = d.baseY + Math.cos(t * .38 + d.phase) * d.amp + fy; bp[i * 3 + 2] = d.baseZ + Math.sin(t * .31 + d.phase) * .04 + force * .10; }
      bloomGeo.attributes.position.needsUpdate = true;
      const pp = petalGeo.attributes.position.array;
      for (let i = 0; i < petalMeta.length; i++) { const d = petalMeta[i]; let y = d.y - (t * d.speed) % 12; if (y < -5) y += 12; pp[i * 3] = d.x + Math.sin(t * .45 + d.phase) * .65 + pointerSpring.x * .22; pp[i * 3 + 1] = y; pp[i * 3 + 2] = d.z + Math.cos(t * .33 + d.phase) * .35; }
      petalGeo.attributes.position.needsUpdate = true;
      const sp = signalGeo.attributes.position.array, curve = branchCurves[selected];
      for (let i = 0; i < signalCount; i++) { const q = (i / signalCount + t * .075) % 1; const p = q < .56 ? trunkCurve.getPointAt(q / .56) : curve.getPointAt((q - .56) / .44); sp[i * 3] = p.x; sp[i * 3 + 1] = p.y; sp[i * 3 + 2] = p.z; }
      signalGeo.attributes.position.needsUpdate = true; signalMat.opacity = desired === 0 ? .28 : .8;
      previousPointer.x = pointerSpring.x; previousPointer.y = pointerSpring.y;
      renderer.render(scene, camera);
    };
    animate();
    return () => { cancelAnimationFrame(frame); removeEventListener('pointermove', onPointer); removeEventListener('resize', onResize); renderer.dispose();[trunk.geometry, ...branches.map(b => b.geometry), bloomGeo, petalGeo, signalGeo, glow.geometry].forEach(g => g.dispose());[trunk.material, ...branches.map(b => b.material), bloomMat, petalMat, signalMat, glow.material].forEach(m => m.dispose()); };
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
