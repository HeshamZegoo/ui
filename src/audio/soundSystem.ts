// Sound System for Apex Humanoid
// Handles Web Audio API context, sound synthesis, and microphone input

import { AUDIO, AUDIO_CONTEXT_STATE } from '../constants';

type SoundCallback = () => void;

interface AudioContextState {
  context: AudioContext | null;
  analyser: AnalyserNode | null;
  microphone: MediaStreamAudioSourceNode | null;
  stream: MediaStream | null;
  animationFrame: number | null;
  callbacks: Set<SoundCallback>;
  audioLevel: number;
  enabled: boolean;
}

const state: AudioContextState = {
  context: null,
  analyser: null,
  microphone: null,
  stream: null,
  animationFrame: null,
  callbacks: new Set(),
  audioLevel: 0,
  enabled: true,
};

// Initialize audio context
export async function initAudio(): Promise<AudioContext> {
  if (state.context) return state.context;

  try {
    state.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: AUDIO.SAMPLE_RATE,
    });
    
    // Create analyser for visualization
    state.analyser = state.context.createAnalyser();
    state.analyser.fftSize = AUDIO.FFT_SIZE;
    state.analyser.smoothingTimeConstant = AUDIO.SMOOTHING;
    
    // Connect to destination for monitoring
    state.analyser.connect(state.context.destination);
    
    return state.context;
  } catch (error) {
    console.error('Failed to initialize audio context:', error);
    throw error;
  }
}

// Resume audio context (required by browser policy)
export async function resumeAudio(): Promise<void> {
  if (state.context && state.context.state === AUDIO_CONTEXT_STATE.SUSPENDED) {
    await state.context.resume();
  }
}

// Get current audio context
export function getAudioContext(): AudioContext | null {
  return state.context;
}

// Check if audio is available
export function isAudioAvailable(): boolean {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctx.close();
    return true;
  } catch {
    return false;
  }
}

// Start microphone input
export async function startMicrophone(): Promise<number> {
  if (!state.context) await initAudio();
  if (!state.context) throw new Error('Audio context not available');

  await resumeAudio();

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    state.microphone = state.context.createMediaStreamSource(state.stream);
    state.microphone.connect(state.analyser!);

    // Start analysis loop
    analyzeAudio();

    return state.analyser!.fftSize;
  } catch (error) {
    console.error('Failed to start microphone:', error);
    throw error;
  }
}

// Stop microphone input
export function stopMicrophone(): void {
  if (state.animationFrame) {
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
  }

  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }

  if (state.microphone) {
    state.microphone.disconnect();
    state.microphone = null;
  }

  state.audioLevel = 0;
  notifyCallbacks();
}

// Audio analysis loop
function analyzeAudio(): void {
  if (!state.analyser || !state.enabled) return;

  const buffer = new Uint8Array(state.analyser.fftSize);
  state.analyser.getByteTimeDomainData(buffer);

  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const value = (buffer[i] - 128) / 128;
    sum += value * value;
  }

  const rms = Math.sqrt(sum / buffer.length);
  state.audioLevel = Math.min(1, rms * 6); // Scale for visibility

  notifyCallbacks();

  state.animationFrame = requestAnimationFrame(analyzeAudio);
}

// Get current audio level (0-1)
export function getAudioLevel(): number {
  return state.audioLevel;
}

// Subscribe to audio level changes
export function onAudioLevelChange(callback: SoundCallback): () => void {
  state.callbacks.add(callback);
  return () => state.callbacks.delete(callback);
}

function notifyCallbacks(): void {
  state.callbacks.forEach(cb => cb());
}

// Set audio enabled state
export function setAudioEnabled(enabled: boolean): void {
  state.enabled = enabled;
  if (!enabled) {
    state.audioLevel = 0;
    notifyCallbacks();
  }
}

// Sound synthesis functions
// These create the various UI sounds (assembly, ready, working, etc.)

// Assembly/birth sound - complex evolving tone
export function playAssemblySound(): void {
  if (!state.context || !state.enabled) return;
  const ctx = state.context;
  const now = ctx.currentTime;

  // Base drone
  const baseOsc = ctx.createOscillator();
  const baseGain = ctx.createGain();
  baseOsc.type = 'sine';
  baseOsc.frequency.value = 49; // G1
  baseGain.gain.setValueAtTime(0, now);
  baseGain.gain.linearRampToValueAtTime(0.05, now + 0.5);
  baseGain.gain.exponentialRampToValueAtTime(0.001, now + 3);
  baseOsc.connect(baseGain);
  baseGain.connect(ctx.destination);
  baseOsc.start(now);
  baseOsc.stop(now + 3.5);

  // Rising harmonic series
  for (let i = 0; i < 12; i++) {
    const delay = 0.1 + i * 0.25 + Math.random() * 0.05;
    const freq = 260 + i * 60;
    
    setTimeout(() => {
      if (!state.enabled) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      filter.type = 'bandpass';
      filter.frequency.value = 800 + i * 100;
      filter.Q.value = 10;
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02 + i * 0.005, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    }, delay * 1000);
  }

  // Ignition impact
  setTimeout(() => {
    if (!state.enabled) return;
    playIgnitionSound();
  }, 3200);
}

// Ignition/activation sound
export function playIgnitionSound(): void {
  if (!state.context || !state.enabled) return;
  const ctx = state.context;
  const now = ctx.currentTime;

  // Low thump
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(55, now);
  thump.frequency.exponentialRampToValueAtTime(30, now + 0.3);
  thumpGain.gain.setValueAtTime(0.3, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.6);

  // High shimmer
  for (let i = 0; i < 5; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.value = 880 * Math.pow(1.5, i);
    
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    
    gain.gain.setValueAtTime(0, now + i * 0.05);
    gain.gain.linearRampToValueAtTime(0.03, now + i * 0.05 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.4);
  }
}

// Ready/complete sound
export function playReadySound(): void {
  if (!state.context || !state.enabled) return;
  const ctx = state.context;
  const now = ctx.currentTime;

  // Ascending triad
  const notes = [880, 1108, 1320]; // A5, C#6, E6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 2;
    
    gain.gain.setValueAtTime(0, now + i * 0.07);
    gain.gain.linearRampToValueAtTime(0.08, now + i * 0.07 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.6);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + i * 0.07);
    osc.stop(now + i * 0.07 + 0.7);
  });
}

// Working/processing sound (looping)
let workingInterval: number | null = null;
export function startWorkingSound(): void {
  if (!state.context || !state.enabled) return;
  
  const play = () => {
    if (!state.enabled) return;
    const ctx = state.context!;
    const now = ctx.currentTime;
    
    // Low pulse
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.value = 52;
    
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 5;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.6);
    
    // Formant sweep
    setTimeout(() => {
      if (!state.enabled) return;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const filter2 = ctx.createBiquadFilter();
      
      osc2.type = 'sawtooth';
      osc2.frequency.value = 120;
      
      filter2.type = 'bandpass';
      filter2.frequency.setValueAtTime(300, ctx.currentTime);
      filter2.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.4);
      filter2.Q.value = 8;
      
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.start();
      osc2.stop(ctx.currentTime + 0.6);
    }, 100);
  };

  play();
  workingInterval = window.setInterval(play, 2600);
}

export function stopWorkingSound(): void {
  if (workingInterval) {
    clearInterval(workingInterval);
    workingInterval = null;
  }
}

// Failed/error sound
export function playFailedSound(): void {
  if (!state.context || !state.enabled) return;
  const ctx = state.context;
  const now = ctx.currentTime;

  // Descending dissonant tones
  const notes = [41, 36, 46]; // Low, dissonant
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 10;
    
    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.6);
  });
}

// Needs attention sound
export function playNeedsYouSound(): void {
  if (!state.context || !state.enabled) return;
  const ctx = state.context;
  const now = ctx.currentTime;

  // Two-tone call
  for (let repeat = 0; repeat < 2; repeat++) {
    const baseDelay = repeat * 0.19;
    
    [330, 467].forEach((freq, _i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      filter.type = 'bandpass';
      filter.frequency.value = freq * 1.5;
      filter.Q.value = 5;
      
      gain.gain.setValueAtTime(0, now + baseDelay);
      gain.gain.linearRampToValueAtTime(0.08, now + baseDelay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + baseDelay + 0.15);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + baseDelay);
      osc.stop(now + baseDelay + 0.2);
    });
  }
}

// Alert sound
export function playAlertSound(): void {
  if (!state.context || !state.enabled) return;
  const ctx = state.context;
  const now = ctx.currentTime;

  // Double ping with vibrato
  for (let repeat = 0; repeat < 2; repeat++) {
    const delay = repeat * 0.62;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 392;
    
    vibrato.type = 'sine';
    vibrato.frequency.value = 6.5;
    vibratoGain.gain.value = 0.04;
    
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.44);
    
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + delay);
    vibrato.start(now + delay);
    osc.stop(now + delay + 0.5);
    vibrato.stop(now + delay + 0.5);
  }
}

// Button click sound
export function playClickSound(): void {
  if (!state.context || !state.enabled) return;
  const ctx = state.context;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
  
  filter.type = 'highpass';
  filter.frequency.value = 500;
  
  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.15);
}

// Toggle sound
export function playToggleSound(on: boolean): void {
  if (!state.context || !state.enabled) return;
  const ctx = state.context;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.value = on ? 660 : 440;
  
  gain.gain.setValueAtTime(0.02, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.2);
}

// Cleanup
export function cleanupAudio(): void {
  stopMicrophone();
  stopWorkingSound();
  
  if (state.context) {
    state.context.close();
    state.context = null;
  }
  state.analyser = null;
  state.callbacks.clear();
}