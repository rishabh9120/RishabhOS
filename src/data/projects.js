/**
 * Lab projects.
 */
export const projects = [
  {
    slug: 'volatility-surface-explorer',
    title: 'Volatility Surface Explorer',
    status: 'shipped',
    category: 'quant',
    year: '2026',
    description: 'Interactive implied volatility surface generator & smile modeler calibrated to live equity options chain data.',
    tags: ['Quantitative Finance', 'Python', 'Black-Scholes', 'NumPy', 'Three.js'],
    links: [
      { label: 'GitHub', href: 'https://github.com/rishabh9120' }
    ],
    body: 'An analytical and visual tool for pricing equity derivatives, examining volatility smiles, skew dynamics, and term structures. Uses Black-Scholes inversion via Brent root-finding to extract implied volatilities from options chain bid-ask quotes, fitting quadratic parametric smiles and SVI models to project continuous volatility surfaces across arbitrary strikes and maturities.'
  },
  {
    slug: 'alphaflow-feed-engine',
    title: 'AlphaFlow Low-Latency Market Feed',
    status: 'shipped',
    category: 'build',
    year: '2025',
    description: 'High-throughput, sub-microsecond order book reconstruction and normalized tick distribution engine.',
    tags: ['Systems Architecture', 'C++', 'Distributed Systems', 'Lock-Free', 'High Throughput'],
    links: [
      { label: 'GitHub', href: 'https://github.com/rishabh9120' }
    ],
    body: 'Engineered for high-frequency market data processing, AlphaFlow processes multicast UDP market data feeds, decodes binary exchange protocols, and reconstructs Level 2 and Level 3 limit order books with deterministic sub-microsecond latency. Employs cache-aligned lock-free ring buffers, zero-copy packet parsing, and SIMD-accelerated delta patching.'
  },
  {
    slug: 'deep-portfolio-rl',
    title: 'DeepPortfolio Multi-Agent Allocator',
    status: 'shipped',
    category: 'ml',
    year: '2025',
    description: 'Multi-agent Proximal Policy Optimization (PPO) reinforcement learning engine for dynamic asset allocation.',
    tags: ['Machine Learning', 'PyTorch', 'Reinforcement Learning', 'Portfolio Optimization', 'Python'],
    links: [
      { label: 'GitHub', href: 'https://github.com/rishabh9120' }
    ],
    body: 'Combines actor-critic reinforcement learning architectures with convex risk budgeting to optimize cross-asset portfolio rebalancing. The policy network learns to navigate non-linear transaction costs, regime transitions, and covariance estimation errors, consistently outperforming traditional mean-variance and risk-parity benchmarks.'
  },
  {
    slug: 'nexus-automata',
    title: 'Nexus Automata Self-Healing Engine',
    status: 'building',
    category: 'python',
    year: '2026',
    description: 'Autonomous telemetry sentinel with real-time anomaly forecasting and self-healing service remediation.',
    tags: ['Automation', 'Python', 'DevOps', 'Telemetry', 'Distributed Systems'],
    links: [
      { label: 'GitHub', href: 'https://github.com/rishabh9120' }
    ],
    body: 'An intelligent operational watcher engineered to monitor distributed service fleets. Evaluates sliding-window metrics, detects memory leaks and network socket saturation before outages occur, and executes automated canary restarts, traffic shedding, and diagnostic heap dumps.'
  },
  {
    slug: 'harmonic-chopin',
    title: 'Chopin Harmonic Lattice',
    status: 'building',
    category: 'side quest',
    year: '2026',
    description: 'Generative counterpoint and MIDI voice leading visualizer mapped onto a 3D Tonnetz geometric lattice.',
    tags: ['Algorithmic Music', 'Web Audio', 'Mathematics', 'Geometry', 'Tonnetz'],
    links: [
      { label: 'GitHub', href: 'https://github.com/rishabh9120' }
    ],
    body: 'Explores harmonic voice leading and modal interchange by mapping musical chords onto Euler Tonnetz geometric manifolds in 3D space. Generates polyphonic counterpoint following strict Renaissance voice-leading constraints while allowing dynamic tonal modulation.'
  }
];
