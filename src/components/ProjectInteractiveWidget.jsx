import { useState, useId } from 'react';
import { Play, ArrowClockwise, TrendUp, Cpu, Sliders } from '@phosphor-icons/react';

// Black-Scholes formula helper
function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function calcBlackScholesCall(S, K, T, r, sigma) {
  if (T <= 0 || sigma <= 0) return Math.max(0, S - K);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
}

// 1. Interactive Volatility Smile Simulator
export function VolatilitySimulator() {
  const [spot, setSpot] = useState(100);
  const [volBase, setVolBase] = useState(0.22);
  const [skew, setSkew] = useState(-0.18);
  const [days, setDays] = useState(45);
  const svgGradId = useId();

  const strikes = [80, 85, 90, 95, 100, 105, 110, 115, 120];
  const T = days / 365;

  const data = strikes.map(K => {
    const moneyness = Math.log(K / spot);
    // Quadratic implied volatility smile: sigma(K) = volBase + skew * m + 0.5 * m^2
    const iv = Math.max(0.08, volBase + skew * moneyness + 0.6 * moneyness * moneyness);
    const callPrice = calcBlackScholesCall(spot, K, T, 0.045, iv);
    return { K, iv: (iv * 100).toFixed(1), price: callPrice.toFixed(2), moneyness };
  });

  return (
    <div className="sim-widget spot">
      <div className="sim-header">
        <div className="sim-title">
          <Sliders className="sim-icon" aria-hidden="true" />
          <span>Interactive Implied Volatility & Smile Engine</span>
        </div>
        <span className="mono sim-badge">Black-Scholes & Quadratic Skew</span>
      </div>

      <div className="sim-controls">
        <label className="sim-control mono">
          <span>Spot Price (${spot})</span>
          <input type="range" min="80" max="120" value={spot} onChange={e => setSpot(Number(e.target.value))} />
        </label>
        <label className="sim-control mono">
          <span>Base Volatility ({(volBase * 100).toFixed(0)}%)</span>
          <input type="range" min="0.10" max="0.50" step="0.01" value={volBase} onChange={e => setVolBase(Number(e.target.value))} />
        </label>
        <label className="sim-control mono">
          <span>Skew Slope ({skew.toFixed(2)})</span>
          <input type="range" min="-0.40" max="0.10" step="0.02" value={skew} onChange={e => setSkew(Number(e.target.value))} />
        </label>
        <label className="sim-control mono">
          <span>Days to Exp ({days}d)</span>
          <input type="range" min="7" max="180" value={days} onChange={e => setDays(Number(e.target.value))} />
        </label>
      </div>

      <div className="sim-visual">
        <svg viewBox="0 0 500 200" className="sim-chart-svg">
          <defs>
            <linearGradient id={svgGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff9fbd" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff9fbd" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          <line x1="40" y1="160" x2="480" y2="160" stroke="var(--line)" />
          <line x1="40" y1="100" x2="480" y2="100" stroke="var(--line)" strokeDasharray="3 3" />
          <line x1="40" y1="40" x2="480" y2="40" stroke="var(--line)" strokeDasharray="3 3" />
          
          {/* Volatility curve points */}
          {(() => {
            const minIV = 10, maxIV = 45;
            const pts = data.map((d, i) => {
              const x = 50 + (i / (data.length - 1)) * 410;
              const y = 160 - ((Number(d.iv) - minIV) / (maxIV - minIV)) * 120;
              return { x, y, ...d };
            });
            const pathD = pts.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
            const areaD = `${pathD} L ${pts[pts.length - 1].x} 160 L ${pts[0].x} 160 Z`;
            return (
              <>
                <path d={areaD} fill={`url(#${svgGradId})`} />
                <path d={pathD} fill="none" stroke="var(--pink)" strokeWidth="2.5" />
                {pts.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill="var(--fg)" stroke="var(--pink)" strokeWidth="2" />
                    <text x={p.x} y="180" textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">${p.K}</text>
                    <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--fg)" fontSize="10" fontFamily="var(--font-mono)">{p.iv}%</text>
                  </g>
                ))}
              </>
            );
          })()}
        </svg>
      </div>

      <div className="sim-table-wrap mono">
        <table className="sim-table">
          <thead>
            <tr>
              <th>Strike</th>
              <th>Moneyness (ln K/S)</th>
              <th>Implied Vol</th>
              <th>Theoretical Call ($)</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.K} className={d.K === 100 ? 'is-atm' : ''}>
                <td>${d.K} {d.K === 100 ? '(ATM)' : ''}</td>
                <td>{d.moneyness.toFixed(3)}</td>
                <td className="sim-vol-val">{d.iv}%</td>
                <td>${d.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 2. Interactive Order Book Stream Simulator
export function OrderBookSimulator() {
  const [running, setRunning] = useState(true);

  const bids = [
    { price: '184.52', size: '1,420', total: '1,420', depth: 42 },
    { price: '184.51', size: '2,890', total: '4,310', depth: 68 },
    { price: '184.50', size: '5,100', total: '9,410', depth: 95 },
    { price: '184.49', size: '1,200', total: '10,610', depth: 35 },
    { price: '184.48', size: '3,450', total: '14,060', depth: 75 }
  ];

  const asks = [
    { price: '184.53', size: '1,120', total: '1,120', depth: 36 },
    { price: '184.54', size: '2,640', total: '3,760', depth: 64 },
    { price: '184.55', size: '4,800', total: '8,560', depth: 90 },
    { price: '184.56', size: '1,890', total: '10,450', depth: 48 },
    { price: '184.57', size: '3,110', total: '13,560', depth: 70 }
  ];

  return (
    <div className="sim-widget spot">
      <div className="sim-header">
        <div className="sim-title">
          <Cpu className="sim-icon" aria-hidden="true" />
          <span>AlphaFlow Real-Time L2 Order Book Pipeline</span>
        </div>
        <div className="sim-status-tag mono">
          <span className="live-dot" />
          <span>Latency: 380ns // Lock-free Ring Buffer</span>
        </div>
      </div>

      <div className="book-grid mono">
        <div className="book-col">
          <div className="book-col-title book-col-bid">Bids (Buy Orders)</div>
          <div className="book-rows">
            {bids.map(b => (
              <div key={b.price} className="book-row">
                <span className="book-depth bid-depth" style={{ width: `${b.depth}%` }} />
                <span className="book-price bid-price">${b.price}</span>
                <span className="book-size">{b.size}</span>
                <span className="book-total">{b.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="book-col">
          <div className="book-col-title book-col-ask">Asks (Sell Orders)</div>
          <div className="book-rows">
            {asks.map(a => (
              <div key={a.price} className="book-row">
                <span className="book-depth ask-depth" style={{ width: `${a.depth}%` }} />
                <span className="book-price ask-price">${a.price}</span>
                <span className="book-size">{a.size}</span>
                <span className="book-total">{a.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sim-footer mono">
        <span>Spread: $0.01 (0.54 bps)</span>
        <span>Matching Engine: Zero-allocation atomic CAS</span>
        <span>Throughput: 4.2M msgs/sec</span>
      </div>
    </div>
  );
}

// 3. Interactive Reinforcement Learning Portfolio Allocator
export function RLPortfolioSimulator() {
  const [riskAversion, setRiskAversion] = useState(2.5);

  const assets = [
    { name: 'Equities (Global)', weight: (38 - riskAversion * 4).toFixed(1), returnRate: '+11.4%', volatility: '16.2%' },
    { name: 'Fixed Income', weight: (24 + riskAversion * 6).toFixed(1), returnRate: '+4.8%', volatility: '5.1%' },
    { name: 'Commodities / Gold', weight: (18 - riskAversion * 1.5).toFixed(1), returnRate: '+8.2%', volatility: '14.0%' },
    { name: 'Quant Volatility Arb', weight: (20 - riskAversion * 0.5).toFixed(1), returnRate: '+9.6%', volatility: '7.8%' }
  ];

  const totalReturn = (9.2 - riskAversion * 0.8).toFixed(2);
  const totalSharpe = (1.42 + (3 - riskAversion) * 0.15).toFixed(2);

  return (
    <div className="sim-widget spot">
      <div className="sim-header">
        <div className="sim-title">
          <TrendUp className="sim-icon" aria-hidden="true" />
          <span>DeepPortfolio Multi-Agent PPO Allocator</span>
        </div>
        <span className="mono sim-badge">Actor-Critic Policy Network</span>
      </div>

      <div className="sim-controls">
        <label className="sim-control mono">
          <span>Agent Risk Aversion Parameter (λ = {riskAversion})</span>
          <input type="range" min="1.0" max="4.0" step="0.2" value={riskAversion} onChange={e => setRiskAversion(Number(e.target.value))} />
        </label>
      </div>

      <div className="alloc-bars mono">
        {assets.map(a => (
          <div key={a.name} className="alloc-bar-item">
            <div className="alloc-bar-label">
              <span>{a.name}</span>
              <strong>{a.weight}%</strong>
            </div>
            <div className="alloc-bar-track">
              <div className="alloc-bar-fill" style={{ width: `${Math.max(5, a.weight)}%` }} />
            </div>
            <div className="alloc-bar-meta">
              <span>Exp Ret: {a.returnRate}</span>
              <span>Vol: {a.volatility}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="sim-metrics-row mono">
        <div className="sim-stat-box">
          <span className="sim-stat-label">Expected Portfolio Return</span>
          <strong className="sim-stat-val">{totalReturn}%</strong>
        </div>
        <div className="sim-stat-box">
          <span className="sim-stat-label">Sharpe Ratio (Rf = 4.5%)</span>
          <strong className="sim-stat-val sim-pink">{totalSharpe}</strong>
        </div>
        <div className="sim-stat-box">
          <span className="sim-stat-label">Max Drawdown Constraint</span>
          <strong className="sim-stat-val">-6.4%</strong>
        </div>
      </div>
    </div>
  );
}

export default function ProjectInteractiveWidget({ slug }) {
  if (slug === 'volatility-surface-explorer') return <VolatilitySimulator />;
  if (slug === 'alphaflow-feed-engine') return <OrderBookSimulator />;
  if (slug === 'deep-portfolio-rl') return <RLPortfolioSimulator />;
  return null;
}
