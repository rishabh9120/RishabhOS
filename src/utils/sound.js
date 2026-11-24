// Serene pentatonic chime & ambient wind synthesizer via Web Audio API.
// Zero external files, fully offline, completely CSP safe.

let audioCtx = null;
let zenNode = null;
let isMuted = true;

const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];

function getContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playChime(freq = null, vol = 0.08) {
  if (isMuted) return;
  try {
    const ctx = getContext();
    if (!ctx) return;

    const chosenFreq = freq || PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(chosenFreq, ctx.currentTime);

    // Warm harmonics
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.45);
  } catch (err) {
    // Ignore audio error if not permitted
  }
}

export function playPetalBurstSound() {
  if (isMuted) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    
    // Play a gentle cascade of 3 ascending pentatonic chimes
    const baseIndex = Math.floor(Math.random() * (PENTATONIC.length - 3));
    [0, 1, 2].forEach((offset, idx) => {
      setTimeout(() => {
        playChime(PENTATONIC[baseIndex + offset], 0.06);
      }, idx * 60);
    });
  } catch {}
}

export function toggleAudio() {
  const ctx = getContext();
  isMuted = !isMuted;
  if (!isMuted) {
    playChime(523.25, 0.09);
  }
  return !isMuted;
}

export function getAudioState() {
  return !isMuted;
}
