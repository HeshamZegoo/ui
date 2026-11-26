// Background Particle Vertex Shader
// Ambient particle field behind the humanoid

precision highp float;

attribute vec2 aUv;       // UV position in the particle grid
attribute vec3 aCol;      // Base color
attribute float aPh;      // Phase offset
attribute float aRate;    // Animation rate
attribute float aBase;    // Base intensity
attribute float aTw;      // Twinkle flag
attribute float aSz;      // Size multiplier

uniform float uTime;           // Global time
uniform float uPixelRatio;     // Device pixel ratio
uniform float uSizeK;          // Size multiplier
uniform float uRest;           // Rest intensity
uniform float uPulse;          // Pulse intensity
uniform vec4 uMap;             // Viewport mapping (scaleX, scaleY, offsetX, offsetY)
uniform vec4 uWave;            // Wave parameters (x, y, intensity, decay)
uniform vec2 uWaveK;           // Wave scale factors

varying vec3 vColor;
varying float vAlpha;
varying float vSize;

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 hash3(vec2 p) {
  return fract(sin(vec3(dot(p, vec2(127.1, 311.7)),
                        dot(p, vec2(269.5, 183.3)),
                        dot(p, vec2(419.2, 371.9)))) * 43758.5453);
}

float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash(i), hash(i + 1.0), u);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    value += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

void main() {
  vColor = aCol;
  
  // Calculate animated position
  float t = uTime * aRate + aPh;
  
  // Base position from UV
  vec2 pos = aUv * 2.0 - 1.0; // -1 to 1
  
  // Apply viewport mapping
  pos.x = pos.x * uMap.x + uMap.z;
  pos.y = pos.y * uMap.y + uMap.w;
  
  // Breathing/organic movement
  float breathe = sin(t * 0.5) * 0.02;
  float drift = sin(t * 0.3 + aPh * 10.0) * 0.03;
  pos.x += breathe + drift;
  pos.y += cos(t * 0.4 + aPh * 13.0) * 0.025;
  
  // Flow field noise
  vec2 flowPos = pos * 0.5 + vec2(uTime * 0.02, uTime * 0.015);
  float flowAngle = fbm(flowPos, 3) * 6.28318;
  vec2 flowDir = vec2(cos(flowAngle), sin(flowAngle)) * 0.01;
  pos += flowDir;
  
  // Wave distortion (from assembly surge)
  if (uWave.w > 0.0) {
    float waveDist = length(pos - vec2(uWave.x, uWave.y));
    float wavePhase = uWave.z - waveDist * uWaveK.x - uTime * uWaveK.y;
    float waveAmp = exp(-uWave.w * waveDist) * sin(wavePhase) * 0.1;
    pos += normalize(pos - vec2(uWave.x, uWave.y)) * waveAmp;
  }
  
  // Twinkle animation
  float twinkle = 1.0;
  if (aTw > 0.5) {
    twinkle = 0.5 + 0.5 * sin(t * 4.0 + aPh * 100.0);
  }
  
  // Pulse animation (global)
  float pulse = 1.0 + sin(uTime * uPulse + aPh * 20.0) * 0.1;
  
  // Calculate final alpha
  float alpha = aBase * twinkle * pulse * (uRest + 0.5);
  alpha *= smoothstep(-1.2, -1.0, pos.x) * smoothstep(1.2, 1.0, pos.x);
  alpha *= smoothstep(-1.2, -1.0, pos.y) * smoothstep(1.2, 1.0, pos.y);
  
  vAlpha = alpha;
  
  // Particle size (clamped to avoid huge blobs)
  float size = aSz * uSizeK * uPixelRatio * (1.0 + 2.0 * alpha);
  vSize = size;
  
  // 3D position for depth sorting
  vec3 worldPos = vec3(pos.x, pos.y, -1.0 - hash(aPh) * 2.0);
  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  
  gl_PointSize = clamp(size * (12.0 / -mvPosition.z), 0.5, 3.0);
  gl_Position = projectionMatrix * mvPosition;
}