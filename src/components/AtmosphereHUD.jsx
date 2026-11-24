import { useEffect, useState } from 'react';
import {
  Wind,
  SpeakerHigh,
  SpeakerSimpleSlash,
  MagnifyingGlass,
  Sparkle
} from '@phosphor-icons/react';
import { toggleAudio, getAudioState, playPetalBurstSound } from '../utils/sound.js';

export default function AtmosphereHUD({ onOpenCmd, onTriggerGust }) {
  const [audioActive, setAudioActive] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const [gusting, setGusting] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAudioToggle = () => {
    const state = toggleAudio();
    setAudioActive(state);
  };

  const handleGustClick = () => {
    setGusting(true);
    playPetalBurstSound();
    if (onTriggerGust) onTriggerGust();
    else window.dispatchEvent(new CustomEvent('rishabhos-gust'));
    setTimeout(() => setGusting(false), 900);
  };

  return (
    <div className="hud-wrap mono" role="toolbar" aria-label="System environment controls">
      <div className="hud-status">
        <span className="hud-beacon" aria-hidden="true" />
        <span className="hud-label">RishabhOS <span>v2.4</span></span>
        <span className="hud-sep" aria-hidden="true">/</span>
        <span className="hud-time">{timeStr}</span>
      </div>

      <div className="hud-actions">
        <button
          type="button"
          className="hud-btn hud-search-btn"
          onClick={onOpenCmd}
          title="Open Command Palette (Cmd+K)"
          aria-label="Open Command Palette"
        >
          <MagnifyingGlass className="hud-icon" aria-hidden="true" />
          <span className="hud-key">⌘K</span>
        </button>

        <button
          type="button"
          className={`hud-btn hud-gust-btn ${gusting ? 'active' : ''}`}
          onClick={handleGustClick}
          title="Summon Sakura Gust & Petal Cascade"
          aria-label="Summon Sakura Gust"
        >
          <Wind className={`hud-icon ${gusting ? 'anim-spin' : ''}`} aria-hidden="true" />
          <span className="hud-btn-text">Gust</span>
        </button>

        <button
          type="button"
          className={`hud-btn hud-audio-btn ${audioActive ? 'active' : ''}`}
          onClick={handleAudioToggle}
          title={audioActive ? 'Mute Zen Ambiance' : 'Enable Zen Audio Chimes'}
          aria-label={audioActive ? 'Mute audio' : 'Enable audio'}
        >
          {audioActive ? (
            <>
              <SpeakerHigh className="hud-icon" aria-hidden="true" />
              <span className="sound-wave" aria-hidden="true">
                <span /><span /><span />
              </span>
            </>
          ) : (
            <>
              <SpeakerSimpleSlash className="hud-icon" aria-hidden="true" />
              <span className="hud-btn-text">Zen</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
