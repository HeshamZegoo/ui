// Face Particle Vertex Shader
// Renders the humanoid face as a particle system

precision highp float;

// Constants for face geometry
#define FACE_WIDTH 1.0
#define FACE_HEIGHT 1.3
#define FACE_DEPTH 0.6
#define EYE_POSITION_Y 0.15
#define EYE_SEPARATION 0.32
#define EYE_SIZE 0.12
#define NOSE_POSITION_Y -0.05
#define NOSE_SIZE 0.15
#define MOUTH_POSITION_Y -0.35
#define MOUTH_WIDTH 0.25
#define MOUTH_HEIGHT 0.08
#define JAW_WIDTH 0.8
#define JAW_HEIGHT 0.6

// Attributes
attribute vec3 aNormal;       // Surface normal
attribute vec2 aUv;           // UV coordinates on face map
attribute float aParticleId;  // Unique particle ID for noise
attribute float aSize;        // Base particle size
attribute vec3 aColor;        // Base particle color

// Uniforms (position, modelViewMatrix, projectionMatrix, normalMatrix are auto-provided by Three.js)
uniform float uTime;              // Global time
uniform float uState;             // Face state (0=idle, 1=listening, 2=thinking, 3=speaking)
uniform float uAudioLevel;        // Microphone audio level (0-1)
uniform float uAssemblyProgress;  // Assembly animation progress (0-1)
uniform float uBreathingPhase;    // Breathing animation phase
uniform vec3 uHeadRotation;       // Head rotation (x, y, z)
uniform vec2 uMouseInfluence;     // Mouse influence on particles
uniform float uPixelRatio;        // Device pixel ratio
uniform float uSizeK;             // Size multiplier

// Varyings
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vParticleId;
varying float vBaseSize;
varying vec3 vColor;
varying float vAssemblyProgress;
varying float vState;
varying float vAudioLevel;

// Noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// Face geometry functions
float sdFace(vec3 p) {
  // Signed distance function for a human face
  // Returns negative inside the face volume
  float face = length(vec3(p.x / FACE_WIDTH, p.y / FACE_HEIGHT, p.z / FACE_DEPTH)) - 1.0;
  
  // Eyes sockets (subtract)
  vec2 eyePos = vec2(EYE_SEPARATION, EYE_POSITION_Y);
  float eyeL = length(vec3(p.x + eyePos.x, p.y - eyePos.y, p.z - 0.1)) - EYE_SIZE;
  float eyeR = length(vec3(p.x - eyePos.x, p.y - eyePos.y, p.z - 0.1)) - EYE_SIZE;
  face = max(face, max(-eyeL, -eyeR));
  
  // Nose (add)
  float nose = length(vec3(p.x, p.y - NOSE_POSITION_Y, p.z - NOSE_SIZE)) - NOSE_SIZE;
  face = min(face, nose);
  
  // Mouth (subtract)
  float mouth = length(vec3(p.x / MOUTH_WIDTH, (p.y - MOUTH_POSITION_Y) / MOUTH_HEIGHT, p.z - 0.05)) - 1.0;
  face = max(face, -mouth);
  
  // Jaw
  float jaw = length(vec3(p.x / JAW_WIDTH, (p.y + 0.3) / JAW_HEIGHT, p.z)) - 1.0;
  face = min(face, jaw);
  
  return face;
}

// Rotation matrices
mat3 rotationX(float angle) {
  float c = cos(angle), s = sin(angle);
  return mat3(1, 0, 0, 0, c, -s, 0, s, c);
}

mat3 rotationY(float angle) {
  float c = cos(angle), s = sin(angle);
  return mat3(c, 0, s, 0, 1, 0, -s, 0, c);
}

mat3 rotationZ(float angle) {
  float c = cos(angle), s = sin(angle);
  return mat3(c, -s, 0, s, c, 0, 0, 0, 1);
}

mat3 getRotationMatrix(vec3 rot) {
  return rotationZ(rot.z) * rotationY(rot.y) * rotationX(rot.x);
}

void main() {
  vParticleId = aParticleId;
  vBaseSize = aSize;
  vColor = aColor;
  vAssemblyProgress = uAssemblyProgress;
  vState = uState;
  vAudioLevel = uAudioLevel;
  vUv = aUv;
  
  // Apply head rotation
  vec3 rotatedPos = getRotationMatrix(uHeadRotation) * position;
  vec3 rotatedNormal = getRotationMatrix(uHeadRotation) * aNormal;
  
  // Breathing animation - subtle expansion/contraction
  float breathing = sin(uBreathingPhase) * 0.02;
  rotatedPos += rotatedNormal * breathing;
  
  // Assembly animation - particles assemble from sphere to face
  vec3 assemblyTarget = rotatedPos;
  vec3 assemblyStart = normalize(rotatedPos) * 1.5; // Start from sphere
  
  // Assembly easing
  float assemblyEased = smoothstep(0.0, 1.0, uAssemblyProgress);
  assemblyEased = assemblyEased * assemblyEased * (3.0 - 2.0 * assemblyEased); // Smoother step
  
  vec3 finalPos = mix(assemblyStart, assemblyTarget, assemblyEased);
  
  // State-specific animations
  float stateTime = uTime * 0.5;
  
  if (uState == 1.0) { // LISTENING - subtle pulse
    float pulse = sin(uTime * 3.0) * 0.01;
    finalPos += rotatedNormal * pulse;
  } else if (uState == 2.0) { // THINKING - slow sway
    float sway = sin(uTime * 0.7) * 0.015;
    finalPos.x += sway;
    finalPos.y += cos(uTime * 0.5) * 0.01;
  } else if (uState == 3.0) { // SPEAKING - audio reactive
    float audioDisplace = uAudioLevel * 0.05;
    finalPos += rotatedNormal * audioDisplace * (0.5 + 0.5 * snoise(vec3(aParticleId * 0.01, uTime * 2.0, 0.0)));
    
    // Mouth area opens more
    float mouthInfluence = smoothstep(0.0, 0.3, abs(aUv.y - 0.75)) * smoothstep(0.0, 0.4, abs(aUv.x - 0.5));
    finalPos.z += uAudioLevel * mouthInfluence * 0.1;
  }
  
  // Mouse influence - subtle parallax
  finalPos.x += uMouseInfluence.x * 0.05 * (1.0 - assemblyEased);
  finalPos.y += uMouseInfluence.y * 0.05 * (1.0 - assemblyEased);
  
  // Idle micro-movements
  if (uState == 0.0 && uAssemblyProgress >= 1.0) {
    vec3 noiseOffset = vec3(aParticleId * 0.001, uTime * 0.1, 0.0);
    float noise = snoise(noiseOffset) * 0.003;
    finalPos += rotatedNormal * noise;
  }
  
  vPosition = finalPos;
  vNormal = rotatedNormal;
  
  // Calculate particle size with perspective
  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  float pointSize = aSize * uSizeK * uPixelRatio * (100.0 / -mvPosition.z);
  
  // Size variation during assembly
  pointSize *= mix(0.1, 1.0, assemblyEased);
  
  // State-based size modulation
  if (uState == 3.0) { // Speaking
    pointSize *= 1.0 + uAudioLevel * 0.3;
  }
  
  gl_PointSize = max(pointSize, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}