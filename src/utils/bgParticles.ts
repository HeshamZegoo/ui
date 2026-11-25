// Background Particle Generation Utilities
// Generates ambient particle field data

import { BG_PARTICLE_COUNT } from '../constants';

export interface BGParticleData {
  uvs: Float32Array;
  colors: Float32Array;
  phases: Float32Array;
  rates: Float32Array;
  bases: Float32Array;
  twinkles: Float32Array;
  sizes: Float32Array;
  aspect: number;
}

function hash(n: number): number {
  return Math.abs(Math.sin(n) * 43758.5453) % 1;
}

export function generateBGParticles(
  count: number = BG_PARTICLE_COUNT,
  width: number = 1920,
  height: number = 1080
): BGParticleData {
  const aspect = width / height;
  const gridW = Math.ceil(Math.sqrt(count / aspect));
  const gridH = Math.ceil(count / gridW);
  const actualCount = gridW * gridH;

  const uvs = new Float32Array(actualCount * 2);
  const colors = new Float32Array(actualCount * 3);
  const phases = new Float32Array(actualCount);
  const rates = new Float32Array(actualCount);
  const bases = new Float32Array(actualCount);
  const twinkles = new Float32Array(actualCount);
  const sizes = new Float32Array(actualCount);

  // Accent color palette
  const accent = { r: 0.13, g: 0.83, b: 0.93 }; // #22d3ee
  const warm = { r: 0.96, g: 0.65, b: 0.14 };   // #f5a623
  const dim = { r: 0.05, g: 0.3, b: 0.35 };     // Dark cyan

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const i = y * gridW + x;
      if (i >= actualCount) break;

      // UV position (0-1)
      const u = (x + 0.5) / gridW;
      const v = (y + 0.5) / gridH;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;

      // Pseudo-random properties based on grid position
      const seed = i * 1.37;
      const seed2 = i * 2.71;
      const seed3 = i * 4.33;

      // Color - mostly cyan with occasional warm particles
      const colorRoll = hash(seed);
      let r, g, b;
      if (colorRoll < 0.85) {
        // Cyan variations
        const intensity = 0.3 + hash(seed2) * 0.7;
        r = accent.r * intensity;
        g = accent.g * intensity;
        b = accent.b * intensity;
      } else if (colorRoll < 0.95) {
        // Warm accent
        const intensity = 0.2 + hash(seed2) * 0.5;
        r = warm.r * intensity;
        g = warm.g * intensity;
        b = warm.b * intensity;
      } else {
        // Very dim
        const intensity = 0.1 + hash(seed2) * 0.3;
        r = dim.r * intensity;
        g = dim.g * intensity;
        b = dim.b * intensity;
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Phase offset for animation
      phases[i] = hash(seed) * Math.PI * 2;

      // Animation rate (slow organic movement)
      rates[i] = 0.3 + hash(seed2) * 0.5;

      // Base intensity
      bases[i] = 0.15 + hash(seed3) * 0.35;

      // Twinkle flag (some particles twinkle)
      twinkles[i] = hash(seed + 100) < 0.3 ? 1.0 : 0.0;

      // Size variation
      sizes[i] = 1.0 + hash(seed + 200) * 2.0;
    }
  }

  return {
    uvs,
    colors,
    phases,
    rates,
    bases,
    twinkles,
    sizes,
    aspect,
  };
}

// Generate a simpler random distribution (alternative)
export function generateBGParticlesRandom(
  count: number = BG_PARTICLE_COUNT,
  width: number = 1920,
  height: number = 1080
): BGParticleData {
  const aspect = width / height;
  const actualCount = count;

  const uvs = new Float32Array(actualCount * 2);
  const colors = new Float32Array(actualCount * 3);
  const phases = new Float32Array(actualCount);
  const rates = new Float32Array(actualCount);
  const bases = new Float32Array(actualCount);
  const twinkles = new Float32Array(actualCount);
  const sizes = new Float32Array(actualCount);

  const accent = { r: 0.13, g: 0.83, b: 0.93 };
  const warm = { r: 0.96, g: 0.65, b: 0.14 };

  for (let i = 0; i < actualCount; i++) {
    // Random UV with slight clustering
    const cluster = Math.random() < 0.3;
    if (cluster) {
      // Cluster around center-ish
      uvs[i * 2] = 0.3 + Math.random() * 0.4;
      uvs[i * 2 + 1] = 0.2 + Math.random() * 0.6;
    } else {
      uvs[i * 2] = Math.random();
      uvs[i * 2 + 1] = Math.random();
    }

    // Color
    const colorRoll = Math.random();
    if (colorRoll < 0.8) {
      const intensity = 0.2 + Math.random() * 0.6;
      colors[i * 3] = accent.r * intensity;
      colors[i * 3 + 1] = accent.g * intensity;
      colors[i * 3 + 2] = accent.b * intensity;
    } else if (colorRoll < 0.95) {
      const intensity = 0.15 + Math.random() * 0.4;
      colors[i * 3] = warm.r * intensity;
      colors[i * 3 + 1] = warm.g * intensity;
      colors[i * 3 + 2] = warm.b * intensity;
    } else {
      colors[i * 3] = 0.02;
      colors[i * 3 + 1] = 0.1;
      colors[i * 3 + 2] = 0.12;
    }

    phases[i] = Math.random() * Math.PI * 2;
    rates[i] = 0.2 + Math.random() * 0.6;
    bases[i] = 0.1 + Math.random() * 0.4;
    twinkles[i] = Math.random() < 0.25 ? 1.0 : 0.0;
    sizes[i] = 0.8 + Math.random() * 2.5;
  }

  return {
    uvs,
    colors,
    phases,
    rates,
    bases,
    twinkles,
    sizes,
    aspect,
  };
}