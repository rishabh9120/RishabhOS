export default function LifeVisual({ id }) {
  if (id === 'travel') {
    return (
      <div className="life-visual life-visual--travel" aria-hidden="true">
        <svg viewBox="0 0 400 250" className="life-svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#15101a" />
              <stop offset="60%" stopColor="#281726" />
              <stop offset="100%" stopColor="#45233b" />
            </linearGradient>
            <linearGradient id="m1Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5a2e46" />
              <stop offset="100%" stopColor="#251220" />
            </linearGradient>
            <linearGradient id="m2Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff9fbd" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#301524" />
            </linearGradient>
            <radialGradient id="moonGlow" cx="70%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#fff5f8" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#ff9fbd" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff9fbd" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="250" fill="url(#skyGrad)" />
          {/* Stars */}
          <circle cx="50" cy="40" r="1.2" fill="#fff" opacity="0.8" />
          <circle cx="120" cy="30" r="1.5" fill="#fff" opacity="0.9" />
          <circle cx="210" cy="55" r="1" fill="#fff" opacity="0.7" />
          <circle cx="280" cy="35" r="1.3" fill="#fff" opacity="0.85" />
          <circle cx="340" cy="65" r="1.1" fill="#fff" opacity="0.75" />
          {/* Moon */}
          <circle cx="310" cy="60" r="38" fill="url(#moonGlow)" />
          <circle cx="310" cy="60" r="16" fill="#fff5f8" />
          {/* Distant mountain ridge */}
          <polygon points="0,250 40,150 110,180 180,120 260,190 340,110 400,165 400,250" fill="url(#m1Grad)" opacity="0.6" />
          {/* Front mountain ridge */}
          <polygon points="0,250 80,160 160,210 240,135 320,205 380,150 400,175 400,250" fill="url(#m2Grad)" />
          {/* Subtle mist baseline */}
          <rect y="210" width="400" height="40" fill="color-mix(in srgb, var(--card) 60%, transparent)" opacity="0.7" />
        </svg>
      </div>
    );
  }

  if (id === 'photography') {
    return (
      <div className="life-visual life-visual--photo" aria-hidden="true">
        <svg viewBox="0 0 400 250" className="life-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="lensRing" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#1a141e" />
              <stop offset="90%" stopColor="#3d2232" />
              <stop offset="100%" stopColor="#ff9fbd" stopOpacity="0.7" />
            </radialGradient>
          </defs>
          <rect width="400" height="250" fill="#0d0a11" />
          {/* Bokeh discs */}
          <circle cx="100" cy="70" r="30" fill="#ff9fbd" opacity="0.12" />
          <circle cx="310" cy="180" r="45" fill="#e98eb0" opacity="0.08" />
          <circle cx="280" cy="60" r="22" fill="#fff" opacity="0.08" />
          {/* Lens Barrel */}
          <circle cx="200" cy="125" r="95" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <circle cx="200" cy="125" r="85" fill="url(#lensRing)" stroke="var(--line)" strokeWidth="2" />
          {/* Aperture blades */}
          <circle cx="200" cy="125" r="48" fill="#120c15" stroke="var(--pink)" strokeWidth="1.5" />
          <polygon points="175,95 225,95 240,135 210,155 170,140" fill="none" stroke="rgba(255,159,189,0.4)" strokeWidth="1.5" />
          {/* Focus target crosshair */}
          <line x1="185" y1="125" x2="215" y2="125" stroke="var(--pink)" strokeWidth="1.5" />
          <line x1="200" y1="110" x2="200" y2="140" stroke="var(--pink)" strokeWidth="1.5" />
          <circle cx="200" cy="125" r="3" fill="var(--pink)" />
          {/* Frame guides */}
          <path d="M 60,50 L 80,50 M 60,50 L 60,70" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" />
          <path d="M 340,50 L 320,50 M 340,50 L 340,70" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" />
          <path d="M 60,200 L 80,200 M 60,200 L 60,180" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" />
          <path d="M 340,200 L 320,200 M 340,200 L 340,180" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" />
        </svg>
      </div>
    );
  }

  if (id === 'hobbies') {
    return (
      <div className="life-visual life-visual--hobbies" aria-hidden="true">
        <svg viewBox="0 0 400 250" className="life-svg" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="250" fill="#100b14" />
          {/* Origami geometric tessellation mesh */}
          <g stroke="color-mix(in srgb, var(--pink) 40%, transparent)" strokeWidth="1.2" fill="none">
            <polygon points="200,30 270,95 240,180 160,180 130,95" fill="color-mix(in srgb, var(--pink) 8%, transparent)" />
            <line x1="200" y1="30" x2="200" y2="180" stroke="var(--pink)" opacity="0.6" />
            <line x1="200" y1="30" x2="160" y2="180" />
            <line x1="200" y1="30" x2="240" y2="180" />
            <line x1="130" y1="95" x2="270" y2="95" stroke="var(--pink)" opacity="0.5" />
            <polygon points="200,30 330,80 270,95" fill="color-mix(in srgb, var(--pink) 12%, transparent)" />
            <polygon points="200,30 70,80 130,95" fill="color-mix(in srgb, var(--pink) 12%, transparent)" />
            <polygon points="160,180 200,230 240,180" fill="color-mix(in srgb, var(--pink) 16%, transparent)" />
            <polygon points="70,80 130,95 160,180 100,200" fill="color-mix(in srgb, var(--pink) 6%, transparent)" />
            <polygon points="330,80 270,95 240,180 300,200" fill="color-mix(in srgb, var(--pink) 6%, transparent)" />
          </g>
          {/* Vertices */}
          {[[200,30], [270,95], [240,180], [160,180], [130,95], [330,80], [70,80], [200,230]].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="var(--pink)" />
          ))}
        </svg>
      </div>
    );
  }

  // Journal
  return (
    <div className="life-visual life-visual--journal" aria-hidden="true">
      <svg viewBox="0 0 400 250" className="life-svg" preserveAspectRatio="xMidYMid meet">
        <rect width="400" height="250" fill="#0f0c13" />
        {/* Knowledge & Ideas Constellation Graph */}
        <g stroke="color-mix(in srgb, var(--pink) 35%, transparent)" strokeWidth="1.2">
          <line x1="80" y1="90" x2="160" y2="60" />
          <line x1="160" y1="60" x2="260" y2="90" />
          <line x1="160" y1="60" x2="200" y2="150" />
          <line x1="260" y1="90" x2="330" y2="140" />
          <line x1="200" y1="150" x2="330" y2="140" />
          <line x1="200" y1="150" x2="120" y2="180" />
          <line x1="80" y1="90" x2="120" y2="180" />
          <line x1="260" y1="90" x2="280" y2="190" />
        </g>
        {/* Graph Nodes */}
        {[
          { x: 160, y: 60, r: 8, label: 'Systems' },
          { x: 260, y: 90, r: 6, label: 'Markets' },
          { x: 200, y: 150, r: 7, label: 'Curiosity' },
          { x: 80, y: 90, r: 5, label: 'Math' },
          { x: 330, y: 140, r: 5, label: 'Code' },
          { x: 120, y: 180, r: 5, label: 'Philosophy' },
          { x: 280, y: 190, r: 4, label: 'Zen' }
        ].map((node, i) => (
          <g key={i}>
            <circle cx={node.x} cy={node.y} r={node.r * 1.8} fill="var(--pink)" opacity="0.15" />
            <circle cx={node.x} cy={node.y} r={node.r} fill="var(--card)" stroke="var(--pink)" strokeWidth="1.5" />
            <circle cx={node.x} cy={node.y} r={node.r * 0.4} fill="var(--pink)" />
          </g>
        ))}
      </svg>
    </div>
  );
}
