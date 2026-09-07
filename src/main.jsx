import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import * as THREE from 'three';
import { projects, profile } from './data';
import './styles.css';

const nav = [
  { to: '/', label: 'Home' },
  { to: '/work', label: 'Work' },
  { to: '/lab', label: 'Lab' },
  { to: '/life', label: 'Life' },
  { to: '/now', label: 'Now' }
];

function ThemeToggle({ theme, setTheme }) {
  return <button className="theme-toggle" aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
    <span>{theme === 'dark' ? '☼' : '◐'}</span>
  </button>;
}

function routeStage(pathname) {
  if (pathname.startsWith('/work')) return 1;
  if (pathname.startsWith('/lab/')) return 3;
  if (pathname.startsWith('/lab')) return 2;
  if (pathname.startsWith('/life')) return 4;
  if (pathname.startsWith('/now')) return 5;
  return 0;
}

function Background3D({ theme, pathname }) {
  const ref = useRef(null);
  const stageRef = useRef(routeStage(pathname));
  useEffect(() => { stageRef.current = routeStage(pathname); }, [pathname]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 11);

    const world = new THREE.Group();
    scene.add(world);
    const tree = new THREE.Group();
    world.add(tree);

    // The homepage is the whole tree. Other routes are destinations on its branches.
    const trunkPoints = [];
    for (let i = 0; i < 90; i++) {
      const t = i / 89;
      trunkPoints.push(new THREE.Vector3(
        Math.sin(t * 5.2) * 0.28 + (t - 0.5) * 0.18,
        (t - 0.5) * 8.0,
        Math.cos(t * 3.0) * 0.22
      ));
    }
    const trunkCurve = new THREE.CatmullRomCurve3(trunkPoints);
    const trunkGeometry = new THREE.BufferGeometry().setFromPoints(trunkCurve.getPoints(300));
    const trunkMaterial = new THREE.LineBasicMaterial({ color: 0x70a7ff, transparent: true, opacity: 0.52 });
    const trunk = new THREE.Line(trunkGeometry, trunkMaterial);
    tree.add(trunk);

    const branches = [];
    const branchCurves = [];
    const branchCount = 19;
    for (let i = 0; i < branchCount; i++) {
      const u = 0.10 + (i / (branchCount - 1)) * 0.80;
      const origin = trunkCurve.getPointAt(u);
      const side = i % 2 === 0 ? 1 : -1;
      const len = 0.9 + (i % 5) * 0.30;
      const end = origin.clone().add(new THREE.Vector3(
        side * len,
        0.42 + (i % 4) * 0.12,
        0.16 * Math.sin(i)
      ));
      const mid = origin.clone().lerp(end, 0.48).add(new THREE.Vector3(side * 0.18, 0.18, 0.12));
      const curve = new THREE.CatmullRomCurve3([origin, mid, end]);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
      const material = new THREE.LineBasicMaterial({ color: 0x7ee5a6, transparent: true, opacity: 0.28 });
      const line = new THREE.Line(geometry, material);
      tree.add(line);
      branches.push(line);
      branchCurves.push(curve);
    }

    const nodePositions = [];
    branchCurves.forEach(curve => {
      const p = curve.getPoint(1);
      nodePositions.push(p.x, p.y, p.z);
    });
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    const nodeMaterial = new THREE.PointsMaterial({ color: 0x7ee5a6, size: 0.08, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
    tree.add(nodes);

    // Four intentional destination branches: Work, Lab, Life, Now.
    // Their indices are spread across the tree so navigation feels like choosing a direction.
    const destinationBranches = { 1: 14, 2: 9, 4: 4, 5: 16, 3: 9 };

    const particleCount = 900;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleMeta = [];
    for (let i = 0; i < particleCount; i++) {
      const r = Math.pow(Math.random(), 0.72);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * (2 + r * 5.5);
      const y = (Math.random() - 0.5) * 9;
      const z = (Math.random() - 0.5) * 5;
      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;
      particleMeta.push({ x, y, z, phase: Math.random() * 6.28, speed: 0.12 + Math.random() * 0.38 });
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0x75aaff, size: 0.018, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // A small stream of light runs from the trunk into the selected branch.
    const signalCount = 30;
    const signalPositions = new Float32Array(signalCount * 3);
    const signalGeometry = new THREE.BufferGeometry();
    signalGeometry.setAttribute('position', new THREE.BufferAttribute(signalPositions, 3));
    const signalMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.055, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false });
    const signals = new THREE.Points(signalGeometry, signalMaterial);
    tree.add(signals);

    const focusGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 28, 28),
      new THREE.MeshBasicMaterial({ color: 0x70a7ff, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    tree.add(focusGlow);

    const light = theme === 'light';
    trunkMaterial.color.set(light ? 0x1769aa : 0x70a7ff);
    branches.forEach(b => b.material.color.set(light ? 0x147d50 : 0x7ee5a6));
    nodeMaterial.color.set(light ? 0x147d50 : 0x7ee5a6);
    particleMaterial.color.set(light ? 0x2372a8 : 0x75aaff);
    focusGlow.material.color.set(light ? 0x2372a8 : 0x70a7ff);

    const pointer = { x: 0, y: 0 };
    const onPointer = e => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frame;
    let currentStage = stageRef.current;
    let currentFocus = new THREE.Vector3(0, 0, 0);
    const temp = new THREE.Vector3();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const stage = stageRef.current;
      currentStage += (stage - currentStage) * 0.018;

      // 0 = overview. 1/2/4/5 = travel toward a branch. 3 follows the Lab branch.
      const isHome = currentStage < 0.35;
      const destinationIndex = destinationBranches[Math.round(currentStage)] ?? 9;
      const destination = branchCurves[destinationIndex].getPoint(0.82);
      const branchEnd = branchCurves[destinationIndex].getPoint(1);

      // Camera and world move as one continuous shot: first reveal the tree, then fly into a branch.
      const travel = THREE.MathUtils.clamp((currentStage % 1) * 1.8, 0, 1);
      const focusAmount = isHome ? 0 : THREE.MathUtils.smoothstep(travel, 0, 1);
      const targetFocus = isHome ? new THREE.Vector3(0, 0, 0) : destination;
      currentFocus.lerp(targetFocus, 0.025);

      const overviewZ = 11.2;
      const focusZ = stage === 2 || stage === 3 ? 7.0 : 7.6;
      const targetZ = THREE.MathUtils.lerp(overviewZ, focusZ, focusAmount);
      camera.position.z += (targetZ - camera.position.z) * 0.025;
      camera.position.x += ((currentFocus.x * 0.24 + pointer.x * 0.28) - camera.position.x) * 0.025;
      camera.position.y += ((currentFocus.y * 0.10 - pointer.y * 0.18) - camera.position.y) * 0.025;
      camera.lookAt(currentFocus.x * 0.82, currentFocus.y * 0.82, currentFocus.z);

      tree.position.x += ((isHome ? 0 : -currentFocus.x * 0.22) + pointer.x * 0.12 - tree.position.x) * 0.02;
      tree.position.y += ((isHome ? 0 : -currentFocus.y * 0.16) - pointer.y * 0.08 - tree.position.y) * 0.02;
      world.rotation.y += ((pointer.x * 0.018) - world.rotation.y) * 0.02;
      world.rotation.x += ((-pointer.y * 0.012) - world.rotation.x) * 0.02;

      // Keep the full tree visible on Home; on inner pages, let the chosen branch become the hero.
      branches.forEach((branch, i) => {
        const isSelected = i === destinationIndex;
        const base = isHome ? 0.28 : (isSelected ? 0.64 : 0.10);
        branch.material.opacity += ((base + 0.08 * Math.sin(t * 0.55 + i)) - branch.material.opacity) * 0.04;
        branch.rotation.z = Math.sin(t * 0.24 + i * 0.72) * 0.014;
      });
      trunkMaterial.opacity += ((isHome ? 0.52 : 0.24) - trunkMaterial.opacity) * 0.035;
      nodeMaterial.opacity += ((isHome ? 0.86 : 0.34) - nodeMaterial.opacity) * 0.035;

      const pulse = 0.06 + 0.025 * Math.sin(t * 1.1);
      focusGlow.position.lerp(isHome ? new THREE.Vector3(0, 0, 0) : branchEnd, 0.035);
      focusGlow.material.opacity = isHome ? 0.025 : 0.055 + pulse * 0.25;
      focusGlow.scale.setScalar(isHome ? 1 : 1.0 + pulse * 2.4);

      const pa = particleGeometry.attributes.position.array;
      for (let i = 0; i < particleMeta.length; i++) {
        const d = particleMeta[i];
        pa[i * 3] = d.x + Math.sin(t * d.speed + d.phase) * 0.07;
        pa[i * 3 + 1] = d.y + Math.cos(t * d.speed * 0.8 + d.phase) * 0.07;
        pa[i * 3 + 2] = d.z + Math.sin(t * 0.12 + d.phase) * 0.05;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Signals originate at the trunk and progressively occupy the selected branch.
      const sa = signalGeometry.attributes.position.array;
      const destinationCurve = branchCurves[destinationIndex];
      for (let i = 0; i < signalCount; i++) {
        const phase = (i / signalCount + t * 0.055) % 1;
        let p;
        if (phase < 0.58) {
          p = trunkCurve.getPointAt(phase / 0.58);
        } else {
          p = destinationCurve.getPointAt((phase - 0.58) / 0.42);
        }
        sa[i * 3] = p.x;
        sa[i * 3 + 1] = p.y;
        sa[i * 3 + 2] = p.z + Math.sin(t * 1.4 + i) * 0.025;
      }
      signalGeometry.attributes.position.needsUpdate = true;
      signalMaterial.opacity = isHome ? 0.45 : 0.92;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      [trunkGeometry, nodeGeometry, particleGeometry, signalGeometry].forEach(g => g.dispose());
      [trunkMaterial, nodeMaterial, particleMaterial, signalMaterial, focusGlow.material].forEach(m => m.dispose());
      branches.forEach(b => { b.geometry.dispose(); b.material.dispose(); });
      focusGlow.geometry.dispose();
    };
  }, [theme]);

  return <canvas ref={ref} className="idea-canvas" aria-hidden="true" />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  // useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [pathname]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function Page({ children }) { return <div className="page-enter">{children}</div>; }
function SectionIntro({ eyebrow, title, note }) { return <div className="section-head"><div><span className="kicker mono">{eyebrow}</span><h2 className="section-title">{title}</h2></div><p className="section-note">{note}</p></div>; }

function Layout({ theme, setTheme }) {
  const location = useLocation();
  return <>
    <Background3D theme={theme} pathname={location.pathname} />
    <div className="vignette" /><div className="noise" />
    <header className="nav-wrap"><nav>
      <Link className="brand" to="/"><span>R</span>ishabh <i>Agrawal</i></Link>
      <div className="navlinks">{nav.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'}>{item.label}</NavLink>)}</div>
      <div className="nav-right"><ThemeToggle theme={theme} setTheme={setTheme} /><a className="nav-cta" href={`mailto:${profile.email}`}>Contact</a></div>
    </nav></header>
    <div className="route-progress"><span style={{ width: `${Math.min(100, 18 + routeStage(location.pathname) * 16)}%` }} /></div>
    <main><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/work" element={<Work />} />
      <Route path="/lab" element={<Lab />} />
      <Route path="/lab/:slug" element={<ProjectShowcase />} />
      <Route path="/life" element={<Life />} />
      <Route path="/now" element={<Now />} />
      <Route path="*" element={<NotFound />} />
    </Routes></main>
    <footer><div className="container"><div className="footer-top"><div><span className="kicker mono">OPEN CHANNEL</span><h2>Let's build<br/><em>something.</em></h2></div><div className="footer-links"><a href={`mailto:${profile.email}`}>Email ↗</a><a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a><a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a></div></div><div className="copyright"><span>© {new Date().getFullYear()} Rishabh Agrawal</span><span className="mono">BUILT WITH CURIOSITY</span></div></div></footer>
  </>;
}

function Home() {
  return <Page><div className="container"><section className="hero"><div className="hero-grid"><div><span className="kicker mono">BUILDER · RESEARCHER · CURIOUS HUMAN</span><h1>I build<br/><em>systems</em><br/>that matter.</h1><p className="hero-copy">A personal space for professional work, experiments, research, and the things I build simply because I want to understand them.</p><div className="hero-actions"><Link to="/work" className="button primary">Explore work ↗</Link><Link to="/lab" className="button">Enter the lab ↗</Link></div></div><div className="hero-side"><span className="side-index mono">THE IDEA TREE / 00</span><div className="big">1<span>→</span>∞</div><p>One curiosity can become a script, a model, an application, a research question—or something nobody asked for.</p></div></div><div className="scroll mono">Scroll to explore <i/></div></section>
    <section className="manifesto"><div className="manifesto-grid"><span className="kicker mono">THE IDEA</span><p>Credentials explain <em>where</em> I've been. <span>What I build explains what I can do.</span></p></div></section>
    <section><SectionIntro eyebrow="01 / WORK" title="Capability, not credentials." note="Professional experience is the trunk. The Lab is where the evidence branches out." /><div className="feature-grid"><Link to="/work" className="feature-card"><span className="mono">EXPERIENCE</span><strong>Goldman Sachs</strong><p>23 months building and improving systems in a high-stakes engineering environment.</p><b>View experience ↗</b></Link><Link to="/lab" className="feature-card accent-card"><span className="mono">THE LAB</span><strong>Ideas → experiments</strong><p>Quant research, Python, automation, ML, apps and the random things worth building.</p><b>Explore the lab ↗</b></Link></div></section>
    <section className="closing"><span className="kicker mono">THE SYSTEM</span><h2>One idea tree.<br/><em>Many directions.</em></h2><p>Work, experiments and life don't need to live in separate universes. They are different branches of the same curiosity.</p></section></div></Page>;
}

function Work() {
  return <Page><div className="container"><section className="page-hero"><span className="kicker mono">WORK / 01</span><h1>Build proof.<br/><em>Not just a résumé.</em></h1><p>Professional experience, education and the evidence behind the way I work.</p></section><section><SectionIntro eyebrow="Experience" title="The professional path" note="A deliberately compact version. The deeper evidence belongs in the Lab and individual project showcases." /><div className="timeline"><div className="row"><span className="year mono">2023—25</span><div><h3>Goldman Sachs</h3><p>Full-Time Analyst · Engineering</p></div><div><p>Maintained 15+ services, analyzed 20+ workflows, automated manual processes and worked across multiple teams.</p></div><span className="arrow">↗</span></div><div className="row"><span className="year mono">2024—26</span><div><h3>IIM Indore</h3><p>MBA / PGP</p></div><div><p>Business education layered on top of a computer science and engineering foundation.</p></div><span className="arrow">↗</span></div><div className="row"><span className="year mono">2018—22</span><div><h3>VNIT Nagpur</h3><p>B.Tech · Computer Science</p></div><div><p>Built the technical foundation through systems, algorithms, programming and experimentation.</p></div><span className="arrow">↗</span></div></div></section><section className="impact"><SectionIntro eyebrow="Impact" title="Numbers I care about" note="A few outcomes from professional engineering work." /><div className="metrics"><div><strong>5+</strong><span>hours saved on critical feed runtime</span></div><div><strong>50%</strong><span>efficiency improvement through automation</span></div><div><strong>20%</strong><span>reduction in production issue frequency</span></div><div><strong>15+</strong><span>services maintained</span></div></div></section><section><SectionIntro eyebrow="Evidence" title="Explore the work" note="Projects will appear here as full showcases once you publish them." /><div className="empty-work"><span className="mono">LAB READY</span><h3>No projects published yet.</h3><p>The structure is ready for your first quant research paper, Python experiment, app, website or ML project.</p><Link to="/lab" className="button">Open Lab ↗</Link></div></section></div></Page>;
}

function Lab() {
  const [filter, setFilter] = useState('all');
  const categories = ['all','quant','python','ml','build','side quest'];
  const filtered = useMemo(() => filter === 'all' ? projects : projects.filter(p => p.category === filter), [filter]);
  return <Page><div className="container"><section className="page-hero lab-hero"><span className="kicker mono">WORK / 02 / THE LAB</span><h1>Things I build<br/><em>because I can.</em></h1><p>Quant research. Python scripts. Automation. ML. Apps. Experiments. Side quests. If it starts with “I wonder if…”, it belongs here.</p></section><section><div className="lab-meta"><div><span className="kicker mono">PROJECT ARCHIVE</span><h2>{projects.length ? `${projects.length} experiments` : 'The workbench is waiting.'}</h2></div><div className="filters">{categories.map(c => <button key={c} className={filter === c ? 'active' : ''} onClick={() => setFilter(c)}>{c}</button>)}</div></div>{filtered.length ? <div className="project-list">{filtered.map(p => <Link to={`/lab/${p.slug}`} className="project-row" key={p.slug}><span className="mono">{p.year}</span><div><span className="project-cat mono">{p.category}</span><h3>{p.title}</h3><p>{p.description}</p></div><span className="arrow">↗</span></Link>)}</div> : <div className="lab-empty"><div className="empty-tree"><span/><span/><span/></div><span className="kicker mono">READY FOR YOUR FIRST EXPERIMENT</span><h3>No projects published yet.</h3><p>Add them in <code>src/data.js</code>. Each project automatically gets its own showcase route.</p><div className="lab-schema mono">title · category · year · description · tags · body · links</div></div>}</section></div></Page>;
}

function ProjectShowcase() {
  const { slug } = useParams(); const navigate = useNavigate(); const project = projects.find(p => p.slug === slug);
  if (!project) return <Page><div className="container"><section className="page-hero"><span className="kicker mono">LAB / PROJECT</span><h1>This branch<br/><em>doesn't exist yet.</em></h1><p>The project archive is intentionally empty. Add a project to <code>src/data.js</code> and this route will become its full showcase.</p><button className="button" onClick={() => navigate('/lab')}>Back to Lab ↗</button></section></div></Page>;
  return <Page><div className="container"><section className="project-showcase"><Link to="/lab" className="back mono">← ALL EXPERIMENTS</Link><span className="kicker mono">{project.category} · {project.year}</span><h1>{project.title}</h1><p className="lead">{project.description}</p><div className="showcase-grid"><aside>{(project.tags || []).map(t => <span key={t}>{t}</span>)}</aside><article>{project.body}</article></div></section></div></Page>;
}

function Life() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">LIFE / 03</span><h1>The branches<br/><em>outside work.</em></h1><p>Travel, photography, music, hobbies and the things that make the person behind the work.</p></section><section><div className="life-grid"><Link to="/life" className="life-card"><span className="mono">01</span><h3>Travel ↗</h3><p>Mountains, new cities and places that change the frame.</p><div className="life-art globe"/></Link><Link to="/life" className="life-card"><span className="mono">02</span><h3>Photography ↗</h3><p>Night skies, mountains and ordinary moments worth keeping.</p><div className="life-art lens"/></Link><Link to="/life" className="life-card"><span className="mono">03</span><h3>Hobbies ↗</h3><p>Origami, music, rabbit holes and things with no practical reason.</p><div className="life-art orbit"/></Link><Link to="/life" className="life-card"><span className="mono">04</span><h3>Journal ↗</h3><p>Notes on things I'm learning, thinking about and changing my mind about.</p><div className="life-art lines"/></Link></div></section></div></Page>; }
function Now() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">NOW / 04</span><h1>What the tree<br/><em>is growing today.</em></h1><p>A living snapshot. This page is meant to change as interests, projects and priorities change.</p></section><section><div className="now-grid"><div><b>BUILDING</b><span>This website + future Lab projects</span></div><div><b>LEARNING</b><span>Quant research, markets and better ways to reason with data</span></div><div><b>EXPLORING</b><span>Ideas worth testing before deciding whether they are useful</span></div><div><b>LISTENING</b><span>Music while working</span></div></div></section></div></Page>; }
function NotFound() { return <Page><div className="container"><section className="page-hero"><span className="kicker mono">404</span><h1>Wrong branch.</h1><p>Let's get you back to the trunk.</p><Link to="/" className="button primary">Return home ↗</Link></section></div></Page>; }

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('rishabh-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('rishabh-theme', theme); }, [theme]);
  return <BrowserRouter><ScrollToTop/><Layout theme={theme} setTheme={setTheme}/></BrowserRouter>;
}

createRoot(document.getElementById('root')).render(<App />);
