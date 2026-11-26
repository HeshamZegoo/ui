// Face Geometry Generation Utilities
// Generates particle positions, normals, UVs for a realistic human face

import * as THREE from 'three';
import { PARTICLE_COUNT, FACE_GEOMETRY } from '../constants';

export interface FaceParticleData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  particleIds: Float32Array;
  sizes: Float32Array;
  colors: Float32Array;
}

const {
  FACE_WIDTH,
  FACE_HEIGHT,
  FACE_DEPTH,
  EYE_POSITION_Y,
  EYE_SEPARATION,
  EYE_SIZE,
  NOSE_POSITION_Y,
  NOSE_SIZE,
  MOUTH_POSITION_Y,
  MOUTH_WIDTH,
  MOUTH_HEIGHT,
  JAW_WIDTH,
  JAW_HEIGHT,
  CHEEK_WIDTH,
  CHEEK_HEIGHT,
} = FACE_GEOMETRY;

// Signed distance function for face geometry
function sdFace(p: THREE.Vector3): number {
  // Main face ellipsoid
  let d = new THREE.Vector3(
    p.x / FACE_WIDTH,
    p.y / FACE_HEIGHT,
    p.z / FACE_DEPTH
  ).length() - 1.0;

  // Eye sockets (subtract - create cavities)
  const eyeL = new THREE.Vector3(p.x + EYE_SEPARATION, p.y - EYE_POSITION_Y, p.z - 0.1).length() - EYE_SIZE;
  const eyeR = new THREE.Vector3(p.x - EYE_SEPARATION, p.y - EYE_POSITION_Y, p.z - 0.1).length() - EYE_SIZE;
  d = Math.max(d, Math.max(-eyeL, -eyeR));

  // Nose (add - protruding)
  const nose = new THREE.Vector3(p.x, p.y - NOSE_POSITION_Y, p.z - NOSE_SIZE).length() - NOSE_SIZE;
  d = Math.min(d, nose);

  // Mouth (subtract - cavity)
  const mouth = new THREE.Vector3(
    p.x / MOUTH_WIDTH,
    (p.y - MOUTH_POSITION_Y) / MOUTH_HEIGHT,
    p.z - 0.05
  ).length() - 1.0;
  d = Math.max(d, -mouth);

  // Jaw
  const jaw = new THREE.Vector3(
    p.x / JAW_WIDTH,
    (p.y + 0.3) / JAW_HEIGHT,
    p.z
  ).length() - 1.0;
  d = Math.min(d, jaw);

  return d;
}

// Gradient of SDF for normal calculation
function calcNormal(p: THREE.Vector3, eps = 0.001): THREE.Vector3 {
  return new THREE.Vector3(
    sdFace(new THREE.Vector3(p.x + eps, p.y, p.z)) - sdFace(new THREE.Vector3(p.x - eps, p.y, p.z)),
    sdFace(new THREE.Vector3(p.x, p.y + eps, p.z)) - sdFace(new THREE.Vector3(p.x, p.y - eps, p.z)),
    sdFace(new THREE.Vector3(p.x, p.y, p.z + eps)) - sdFace(new THREE.Vector3(p.x, p.y, p.z - eps))
  ).normalize();
}

// Generate UV coordinates for face mapping
function getFaceUV(p: THREE.Vector3): THREE.Vector2 {
  // Project onto face plane and normalize to 0-1
  // Using a simple planar projection from front
  const u = (p.x / FACE_WIDTH) * 0.5 + 0.5;
  const v = 1.0 - ((p.y / FACE_HEIGHT) * 0.5 + 0.5); // Flip Y so top=0
  return new THREE.Vector2(
    THREE.MathUtils.clamp(u, 0.0, 1.0),
    THREE.MathUtils.clamp(v, 0.0, 1.0)
  );
}

// Determine particle color based on face region
function getParticleColor(uv: THREE.Vector2): THREE.Color {
  const color = new THREE.Color();
  const x = uv.x - 0.5;
  const y = uv.y;

  // Eye regions
  const eyeL = new THREE.Vector2(x + EYE_SEPARATION / FACE_WIDTH, y - (1.0 - EYE_POSITION_Y / FACE_HEIGHT) * 0.5 - 0.5).length();
  const eyeR = new THREE.Vector2(x - EYE_SEPARATION / FACE_WIDTH, y - (1.0 - EYE_POSITION_Y / FACE_HEIGHT) * 0.5 - 0.5).length();
  const eyeRadius = EYE_SIZE / Math.max(FACE_WIDTH, FACE_HEIGHT);

  // Nose region
  const noseDist = new THREE.Vector2(x, y - (1.0 - NOSE_POSITION_Y / FACE_HEIGHT) * 0.5 - 0.5).length();
  const noseRadius = NOSE_SIZE / Math.max(FACE_WIDTH, FACE_HEIGHT);

  // Mouth region
  const mouthX = x / (MOUTH_WIDTH / FACE_WIDTH);
  const mouthY = (y - (1.0 - MOUTH_POSITION_Y / FACE_HEIGHT) * 0.5 - 0.5) / (MOUTH_HEIGHT / FACE_HEIGHT);
  const mouthDist = new THREE.Vector2(mouthX, mouthY).length();

  // Forehead (top)
  const forehead = y < 0.2 ? 1.0 - y / 0.2 : 0.0;

  // Cheeks
  const cheekL = new THREE.Vector2(x + CHEEK_WIDTH / FACE_WIDTH, y - 0.5).length();
  const cheekR = new THREE.Vector2(x - CHEEK_WIDTH / FACE_WIDTH, y - 0.5).length();
  const cheekRadius = CHEEK_HEIGHT / FACE_HEIGHT;

  // Jawline
  const jawX = x / (JAW_WIDTH / FACE_WIDTH);
  const jawY = (y - 1.0) / (JAW_HEIGHT / FACE_HEIGHT);
  const jawDist = new THREE.Vector2(jawX, jawY).length();

  // Base accent color
  const accent = new THREE.Color(0x22d3ee);
  const warm = new THREE.Color(0xf5a623);
  const white = new THREE.Color(0xffffff);

  if (eyeL < eyeRadius || eyeR < eyeRadius) {
    // Eyes - bright cyan/white
    color.copy(accent).lerp(white, 0.6);
  } else if (noseDist < noseRadius) {
    // Nose - slightly warm
    color.copy(accent).lerp(warm, 0.3);
  } else if (mouthDist < 1.0) {
    // Mouth - warm
    color.copy(accent).lerp(warm, 0.5);
  } else if (forehead > 0.5) {
    // Forehead - dimmer
    color.copy(accent).multiplyScalar(0.7);
  } else if (cheekL < cheekRadius || cheekR < cheekRadius) {
    // Cheeks - warm glow
    color.copy(accent).lerp(warm, 0.2);
  } else if (jawDist < 1.0) {
    // Jawline - defined
    color.copy(accent).multiplyScalar(1.1);
  } else {
    // Default face surface
    color.copy(accent);
  }

  return color;
}

// Poisson disk sampling for even distribution
function poissonDiskSampling(
  radius: number,
  bounds: THREE.Box3,
  maxAttempts: number = 30
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const active: THREE.Vector3[] = [];
  const cellSize = radius / Math.sqrt(2);
  const gridWidth = Math.ceil((bounds.max.x - bounds.min.x) / cellSize);
  const gridHeight = Math.ceil((bounds.max.y - bounds.min.y) / cellSize);
  const gridDepth = Math.ceil((bounds.max.z - bounds.min.z) / cellSize);
  const grid: (THREE.Vector3 | null)[][][] = new Array(gridWidth)
    .fill(null)
    .map(() => new Array(gridHeight).fill(null).map(() => new Array(gridDepth).fill(null)));

  function gridCoords(p: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      Math.floor((p.x - bounds.min.x) / cellSize),
      Math.floor((p.y - bounds.min.y) / cellSize),
      Math.floor((p.z - bounds.min.z) / cellSize)
    );
  }

  function canPlace(p: THREE.Vector3): boolean {
    const coords = gridCoords(p);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const gx = coords.x + dx;
          const gy = coords.y + dy;
          const gz = coords.z + dz;
          if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight && gz >= 0 && gz < gridDepth) {
            const existing = grid[gx][gy][gz];
            if (existing && p.distanceTo(existing) < radius) return false;
          }
        }
      }
    }
    return true;
  }

  function addPoint(p: THREE.Vector3) {
    points.push(p);
    active.push(p);
    const coords = gridCoords(p);
    grid[coords.x][coords.y][coords.z] = p;
  }

  // Start with center point
  addPoint(new THREE.Vector3(0, 0, 0));

  while (active.length > 0 && points.length < PARTICLE_COUNT) {
    const idx = Math.floor(Math.random() * active.length);
    const base = active[idx];
    let found = false;

    for (let i = 0; i < maxAttempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (1 + Math.random());
      const candidate = new THREE.Vector3(
        base.x + r * Math.sin(phi) * Math.cos(angle),
        base.y + r * Math.sin(phi) * Math.sin(angle),
        base.z + r * Math.cos(phi)
      );

      if (candidate.x < bounds.min.x || candidate.x > bounds.max.x ||
          candidate.y < bounds.min.y || candidate.y > bounds.max.y ||
          candidate.z < bounds.min.z || candidate.z > bounds.max.z) continue;

      if (sdFace(candidate) > 0.02) continue; // Outside face surface

      if (canPlace(candidate)) {
        addPoint(candidate);
        found = true;
        break;
      }
    }

    if (!found) {
      active.splice(idx, 1);
    }
  }

  return points;
}

// Main generation function
export function generateFaceParticles(count: number = PARTICLE_COUNT): FaceParticleData {
  console.log(`Generating ${count} face particles...`);
  const startTime = performance.now();

  const bounds = new THREE.Box3(
    new THREE.Vector3(-FACE_WIDTH, -FACE_HEIGHT, -FACE_DEPTH),
    new THREE.Vector3(FACE_WIDTH, FACE_HEIGHT, FACE_DEPTH)
  );

  // Use rejection sampling for better distribution on surface
  const positions: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  const uvs: THREE.Vector2[] = [];
  const colors: THREE.Color[] = [];

  // Generate more candidates than needed, then pick best
  const candidates: THREE.Vector3[] = [];
  const targetCandidates = count * 3;

  // Stratified sampling across face regions
  const regions = [
    { name: 'face', weight: 0.4, yRange: [-0.8, 0.4] },
    { name: 'forehead', weight: 0.15, yRange: [0.4, 1.0] },
    { name: 'eyes', weight: 0.15, yRange: [0.0, 0.4], xBias: 0.3 },
    { name: 'nose', weight: 0.1, yRange: [-0.2, 0.2], xBias: 0.0 },
    { name: 'mouth', weight: 0.1, yRange: [-0.6, -0.2], xBias: 0.0 },
    { name: 'jaw', weight: 0.1, yRange: [-1.0, -0.6] },
  ];

  for (const region of regions) {
    const regionCount = Math.floor(targetCandidates * region.weight);
    const [yMin, yMax] = region.yRange;
    
    for (let i = 0; i < regionCount; i++) {
      // Sample on face surface using parametric approach
      const u = (Math.random() - 0.5) * 2;
      const v = Math.random();
      const phi = u * Math.PI;
      const theta = v * Math.PI * 0.5; // Only front hemisphere
      
      let px = Math.sin(theta) * Math.cos(phi) * FACE_WIDTH;
      let py = Math.cos(theta) * FACE_HEIGHT * (yMin + (yMax - yMin) * v);
      let pz = Math.sin(theta) * Math.sin(phi) * FACE_DEPTH * 0.5;
      
      // Apply region bias
      if (region.xBias !== undefined) {
        px += (Math.random() - 0.5) * region.xBias * FACE_WIDTH;
      }
      
      const p = new THREE.Vector3(px, py, pz);
      
      // Project to surface
      const d = sdFace(p);
      if (Math.abs(d) < 0.15) {
        candidates.push(p);
      }
    }
  }

  // Also add uniform random sampling
  while (candidates.length < targetCandidates) {
    const p = new THREE.Vector3(
      (Math.random() - 0.5) * 2 * FACE_WIDTH,
      (Math.random() - 0.5) * 2 * FACE_HEIGHT,
      (Math.random() - 0.5) * 2 * FACE_DEPTH * 0.5
    );
    if (Math.abs(sdFace(p)) < 0.15) {
      candidates.push(p);
    }
  }

  // Select best distributed points using Poisson disk
  const finalPoints = poissonDiskSampling(0.025, bounds, 20);
  
  // If we don't have enough, fill with candidates
  if (finalPoints.length < count) {
    for (const p of candidates) {
      if (finalPoints.length >= count) break;
      // Check distance to existing points
      let tooClose = false;
      for (const existing of finalPoints) {
        if (p.distanceTo(existing) < 0.02) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        finalPoints.push(p);
      }
    }
  }

  // Trim to exact count
  const selectedPoints = finalPoints.slice(0, count);

  // Generate data for selected points
  for (const p of selectedPoints) {
    const normal = calcNormal(p);
    const uv = getFaceUV(p);
    const color = getParticleColor(uv);

    positions.push(p);
    normals.push(normal);
    uvs.push(uv);
    colors.push(color);
  }

  // Convert to typed arrays
  const positionsArray = new Float32Array(count * 3);
  const normalsArray = new Float32Array(count * 3);
  const uvsArray = new Float32Array(count * 2);
  const particleIdsArray = new Float32Array(count);
  const sizesArray = new Float32Array(count);
  const colorsArray = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const p = positions[i];
    const n = normals[i];
    const uv = uvs[i];
    const c = colors[i];

    positionsArray[i * 3] = p.x;
    positionsArray[i * 3 + 1] = p.y;
    positionsArray[i * 3 + 2] = p.z;

    normalsArray[i * 3] = n.x;
    normalsArray[i * 3 + 1] = n.y;
    normalsArray[i * 3 + 2] = n.z;

    uvsArray[i * 2] = uv.x;
    uvsArray[i * 2 + 1] = uv.y;

    particleIdsArray[i] = i;
    sizesArray[i] = 0.8 + Math.random() * 0.4; // Varied base sizes

    colorsArray[i * 3] = c.r;
    colorsArray[i * 3 + 1] = c.g;
    colorsArray[i * 3 + 2] = c.b;
  }

  console.log(`Generated ${count} particles in ${(performance.now() - startTime).toFixed(2)}ms`);

  return {
    positions: positionsArray,
    normals: normalsArray,
    uvs: uvsArray,
    particleIds: particleIdsArray,
    sizes: sizesArray,
    colors: colorsArray,
  };
}

// Fast generation using rejection sampling on face surface for even full-face distribution
export function generateFaceParticlesFast(count: number = PARTICLE_COUNT): FaceParticleData {
  const positionsArray = new Float32Array(count * 3);
  const normalsArray = new Float32Array(count * 3);
  const uvsArray = new Float32Array(count * 2);
  const particleIdsArray = new Float32Array(count);
  const sizesArray = new Float32Array(count);
  const colorsArray = new Float32Array(count * 3);

  let generated = 0;
  let attempts = 0;
  const maxAttempts = count * 50; // Increased safety limit

  while (generated < count && attempts < maxAttempts) {
    attempts++;
    
    // Sample uniformly in face bounding box
    const px = (Math.random() - 0.5) * 2 * FACE_WIDTH;
    const py = (Math.random() - 0.5) * 2 * FACE_HEIGHT;
    const pz = (Math.random() - 0.5) * 2 * FACE_DEPTH * 0.5;

    const p = new THREE.Vector3(px, py, pz);
    const d = sdFace(p);

    // Keep points inside or near the surface to fill the face volume
    // d <= 0 means inside the face, d > 0.08 means too far outside
    if (d > 0.08) continue;

    // Normal via finite differences
    const normal = calcNormal(p);

    // UV from planar projection
    const uvX = (px / FACE_WIDTH) * 0.5 + 0.5;
    const uvY = 1.0 - ((py / FACE_HEIGHT) * 0.5 + 0.5);
    const uv = new THREE.Vector2(
      THREE.MathUtils.clamp(uvX, 0.0, 1.0),
      THREE.MathUtils.clamp(uvY, 0.0, 1.0)
    );

    // Color based on region
    const color = getParticleColor(uv);

    positionsArray[generated * 3] = px;
    positionsArray[generated * 3 + 1] = py;
    positionsArray[generated * 3 + 2] = pz;

    normalsArray[generated * 3] = normal.x;
    normalsArray[generated * 3 + 1] = normal.y;
    normalsArray[generated * 3 + 2] = normal.z;

    uvsArray[generated * 2] = uv.x;
    uvsArray[generated * 2 + 1] = uv.y;

    particleIdsArray[generated] = generated;
    sizesArray[generated] = 0.8 + Math.random() * 0.4;

    colorsArray[generated * 3] = color.r;
    colorsArray[generated * 3 + 1] = color.g;
    colorsArray[generated * 3 + 2] = color.b;

    generated++;
  }

  console.log(`[faceGeometry] Rejection sampling generated ${generated}/${count} points after ${attempts} attempts`);

  // If rejection sampling produced too few points, use full generator as fallback
  if (generated < count * 0.5) {
    console.warn(`[faceGeometry] Rejection sampling too sparse (${generated}/${count}), falling back to full generator`);
    return generateFaceParticles(count);
  }

  // If we didn't get enough points (rare), fill remainder with fallback spherical sampling
  if (generated < count) {
    for (let i = generated; i < count; i++) {
      const theta = Math.PI * (0.15 + Math.random() * 0.7);
      const phi = (Math.random() - 0.5) * 1.6;
      const r = 1.0 + (Math.random() - 0.5) * 0.05;
      const px = r * Math.sin(theta) * Math.cos(phi) * FACE_WIDTH;
      const py = r * Math.cos(theta) * FACE_HEIGHT;
      const pz = r * Math.sin(theta) * Math.sin(phi) * FACE_DEPTH * 0.5;

      positionsArray[i * 3] = px;
      positionsArray[i * 3 + 1] = py;
      positionsArray[i * 3 + 2] = pz;

      const normal = new THREE.Vector3(px, py, pz).normalize();
      normalsArray[i * 3] = normal.x;
      normalsArray[i * 3 + 1] = normal.y;
      normalsArray[i * 3 + 2] = normal.z;

      const uvX = (px / FACE_WIDTH) * 0.5 + 0.5;
      const uvY = 1.0 - ((py / FACE_HEIGHT) * 0.5 + 0.5);
      uvsArray[i * 2] = THREE.MathUtils.clamp(uvX, 0.0, 1.0);
      uvsArray[i * 2 + 1] = THREE.MathUtils.clamp(uvY, 0.0, 1.0);

      particleIdsArray[i] = i;
      sizesArray[i] = 0.8 + Math.random() * 0.4;

      const uv = new THREE.Vector2(uvX, uvY);
      const color = getParticleColor(uv);
      colorsArray[i * 3] = color.r;
      colorsArray[i * 3 + 1] = color.g;
      colorsArray[i * 3 + 2] = color.b;
    }
  }

  return {
    positions: positionsArray,
    normals: normalsArray,
    uvs: uvsArray,
    particleIds: particleIdsArray,
    sizes: sizesArray,
    colors: colorsArray,
  };
}