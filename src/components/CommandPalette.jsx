import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlass,
  ArrowRight,
  Briefcase,
  Flask,
  Heart,
  Clock,
  House,
  LockKey,
  Sun,
  Moon,
  Sparkle,
  Wind,
  EnvelopeSimple,
  GithubLogo,
  LinkedinLogo
} from '@phosphor-icons/react';
import { profile } from '../data/index.js';

export default function CommandPalette({ isOpen, onClose, theme, setTheme, onTriggerGust }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const commands = [
    {
      id: 'nav-home',
      group: 'Navigation',
      title: 'Home',
      subtitle: 'Landing page and 3D Sakura view',
      icon: House,
      action: () => navigate('/')
    },
    {
      id: 'nav-work',
      group: 'Navigation',
      title: 'Work & Experience',
      subtitle: 'Goldman Sachs, metrics and career timeline',
      icon: Briefcase,
      action: () => navigate('/work')
    },
    {
      id: 'nav-lab',
      group: 'Navigation',
      title: 'The Lab',
      subtitle: 'Quant models, Python, ML experiments',
      icon: Flask,
      action: () => navigate('/lab')
    },
    {
      id: 'nav-life',
      group: 'Navigation',
      title: 'Life & Interests',
      subtitle: 'Photography, travel, hobbies and curiosity',
      icon: Heart,
      action: () => navigate('/life')
    },
    {
      id: 'nav-now',
      group: 'Navigation',
      title: 'Now',
      subtitle: 'Current projects, active reading and focus',
      icon: Clock,
      action: () => navigate('/now')
    },
    {
      id: 'nav-private',
      group: 'Navigation',
      title: 'Private / Finance Calculator',
      subtitle: 'Interactive wealth & FIRE projection engine',
      icon: LockKey,
      action: () => navigate('/private')
    },
    {
      id: 'act-theme',
      group: 'Actions',
      title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      subtitle: 'Toggle site appearance mode',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark')
    },
    {
      id: 'act-wind',
      group: 'Actions',
      title: 'Summon Sakura Wind Gust',
      subtitle: 'Trigger a burst of petals across the screen',
      icon: Wind,
      action: () => {
        if (onTriggerGust) onTriggerGust();
        else window.dispatchEvent(new CustomEvent('rishabhos-gust'));
      }
    },
    {
      id: 'act-email',
      group: 'Contact',
      title: 'Send Email',
      subtitle: profile.email,
      icon: EnvelopeSimple,
      action: () => { window.location.href = `mailto:${profile.email}`; }
    },
    {
      id: 'act-github',
      group: 'Contact',
      title: 'Open GitHub Profile',
      subtitle: profile.github,
      icon: GithubLogo,
      action: () => window.open(profile.github, '_blank', 'noreferrer')
    },
    {
      id: 'act-linkedin',
      group: 'Contact',
      title: 'Open LinkedIn Profile',
      subtitle: profile.linkedin,
      icon: LinkedinLogo,
      action: () => window.open(profile.linkedin, '_blank', 'noreferrer')
    }
  ];

  const filtered = commands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    c.group.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command Palette">
      <div className="cmd-window" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="cmd-header">
          <MagnifyingGlass className="cmd-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input mono"
            placeholder="Type a command or jump to page... (ESC to close)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="cmd-badge mono">ESC</span>
        </div>

        <div className="cmd-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="cmd-empty mono">No matching commands found.</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`cmd-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="cmd-item-icon">
                    <Icon weight={isSelected ? 'fill' : 'regular'} />
                  </div>
                  <div className="cmd-item-content">
                    <div className="cmd-item-title">{item.title}</div>
                    <div className="cmd-item-subtitle">{item.subtitle}</div>
                  </div>
                  <div className="cmd-item-meta mono">
                    <span className="cmd-group-tag">{item.group}</span>
                    <ArrowRight className="cmd-item-arrow" aria-hidden="true" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cmd-footer mono">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to select</span>
          <span><kbd>esc</kbd> to dismiss</span>
        </div>
      </div>
    </div>
  );
}
