'use strict';

const Music = {
  muted: (() => {
    try { return localStorage.getItem('temupoket-muted') === 'true'; }
    catch (_) { return false; }
  })(),
  context: null,
  timer: null,
  voices: new Set(),
  tracks: {
    title: { step: 220, notes: [523, 659, 784, 659, 698, 880, 784, 0, 659, 784, 1047, 988, 880, 784, 659, 587] },
    battle: { step: 140, notes: [220, 330, 440, 233, 220, 349, 440, 466, 220, 330, 415, 440, 349, 330, 247, 233] }
  },

  start(track) {
    if (this.muted) return;
    this.stop();
    try {
      const sequence = this.tracks[track];
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!sequence || !Audio) return;
      // Screen transitions may call start later, after the initial button gesture.
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
      if (!this.context) this.context = new Audio();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      let step = 0;
      const tick = () => {
        try {
          if (this.context.state !== 'running') return;
          const frequency = sequence.notes[step];
          step = (step + 1) % sequence.notes.length;
          if (!frequency) return;
          const oscillator = this.context.createOscillator();
          const gain = this.context.createGain();
          const start = this.context.currentTime;
          const duration = sequence.step / 1000 * .85;
          const voice = { oscillator, gain };
          this.voices.add(voice);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
            this.voices.delete(voice);
          };
          oscillator.type = 'square';
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(.025, start);
          gain.gain.exponentialRampToValueAtTime(.001, start + duration);
          oscillator.connect(gain);
          gain.connect(this.context.destination);
          oscillator.start(start);
          oscillator.stop(start + duration);
        } catch (_) { /* Audio failures must not interrupt gameplay. */ }
      };
      tick();
      this.timer = setInterval(tick, sequence.step);
    } catch (_) { /* The game also works without audio support. */ }
  },

  toggle() {
    if (this.muted) {
      this.muted = false;
      const screen = document.querySelector('section.screen[id$="-screen"]:not([hidden])');
      this.start(screen && screen.id === 'battle-screen' ? 'battle' : 'title');
    } else {
      this.stop();
      this.muted = true;
    }
    try { localStorage.setItem('temupoket-muted', String(this.muted)); }
    catch (_) { /* Storage failures must not interrupt gameplay. */ }
  },

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    for (const { oscillator, gain } of this.voices) {
      try { oscillator.stop(); } catch (_) { /* Already stopped. */ }
      try { oscillator.disconnect(); gain.disconnect(); } catch (_) { /* Already disconnected. */ }
    }
    this.voices.clear();
  }
};
