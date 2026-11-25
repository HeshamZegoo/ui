// Face Particle Fragment Shader
// Renders glowing particles for the humanoid face

precision highp float;

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

// Uniforms
uniform float uTime;
uniform vec3 uCameraPosition;
uniform float uPixelRatio;

// Constants
#define PI 3.14159265359
#define ACCENT_COLOR vec3(0.13, 0.83, 0.93)  // #22d3ee
#define ACCENT_WARM vec3(0.96, 0.65, 0.14)   // #f5a623
#define WHITE vec3(1.0, 1.0, 1.0)

// Noise functions (same as vertex)
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

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// Circular particle shape with soft edges
float particleShape(vec2 coord) {
  float dist = length(coord);
  float edge = 0.02;
  float shape = smoothstep(0.5, 0.5 - edge, dist);
  // Add subtle noise to edge for organic feel
  shape *= 1.0 - 0.1 * snoise(vec3(coord * 10.0, uTime * 0.5));
  return shape;
}

// Glow effect
float glow(vec2 coord, float intensity) {
  float dist = length(coord);
  return intensity * smoothstep(0.5, 0.0, dist) * smoothstep(0.5, 0.0, dist);
}

// Face feature detection from UV
vec3 getFaceFeatureColor(vec2 uv) {
  // UV layout: x=horizontal (-0.5 to 0.5), y=vertical (0 to 1, top to bottom)
  float x = uv.x - 0.5;
  float y = uv.y;
  
  // Eyes region
  float eyeL = length(vec2(x + 0.32, y - 0.25)) - 0.12;
  float eyeR = length(vec2(x - 0.32, y - 0.25)) - 0.12;
  float eyes = min(eyeL, eyeR);
  
  // Nose region
  float nose = length(vec2(x, y - 0.55)) - 0.15;
  
  // Mouth region
  float mouth = length(vec2(x / 0.25, (y - 0.8) / 0.08)) - 1.0;
  
  // Forehead (top)
  float forehead = smoothstep(0.0, 0.15, 0.15 - y);
  
  // Cheeks
  float cheekL = length(vec2(x + 0.4, y - 0.5)) - 0.25;
  float cheekR = length(vec2(x - 0.4, y - 0.5)) - 0.25;
  float cheeks = min(cheekL, cheekR);
  
  // Jawline
  float jaw = length(vec2(x / 0.8, (y - 1.0) / 0.6)) - 1.0;
  
  // Determine feature
  vec3 color = ACCENT_COLOR;
  
  if (eyes < 0.0) {
    // Eyes - brighter, more intense
    color = mix(ACCENT_COLOR, WHITE, 0.7);
  } else if (nose < 0.0) {
    // Nose - slightly warmer
    color = mix(ACCENT_COLOR, ACCENT_WARM, 0.3);
  } else if (mouth < 0.0) {
    // Mouth - warmer
    color = mix(ACCENT_COLOR, ACCENT_WARM, 0.5);
  } else if (forehead > 0.5) {
    // Forehead - slightly dimmer
    color = ACCENT_COLOR * 0.8;
  } else if (cheeks < 0.0) {
    // Cheeks - warm glow
    color = mix(ACCENT_COLOR, ACCENT_WARM, 0.2);
  } else if (jaw < 0.0) {
    // Jawline - defined edge
    color = ACCENT_COLOR * 1.1;
  }
  
  return color;
}

void main() {
  // Particle coordinate (center at 0.5, 0.5)
  vec2 coord = gl_PointCoord - 0.5;
  
  // Base particle shape
  float shape = particleShape(coord * 2.0);
  
  if (shape <= 0.0) discard;
  
  // Assembly progress affects opacity
  float assemblyAlpha = smoothstep(0.0, 1.0, vAssemblyProgress);
  assemblyAlpha = assemblyAlpha * assemblyAlpha * (3.0 - 2.0 * assemblyAlpha);
  
  // Get face feature color based on UV
  vec3 featureColor = getFaceFeatureColor(vUv);
  
  // Base color with particle variation
  vec3 baseColor = featureColor * vColor;
  
  // State-based color modulation
  if (vState == 1.0) { // LISTENING - pulsing cyan
    float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + vParticleId * 10.0);
    baseColor = mix(baseColor, WHITE, 0.3 * pulse);
  } else if (vState == 2.0) { // THINKING - slightly dimmer, cooler
    baseColor *= 0.8 + 0.2 * sin(uTime * 0.7 + vParticleId * 5.0);
  } else if (vState == 3.0) { // SPEAKING - audio reactive warmth
    float audioGlow = vAudioLevel * (0.5 + 0.5 * snoise(vec3(vParticleId * 0.01, uTime * 2.0, 0.0)));
    baseColor = mix(baseColor, ACCENT_WARM, audioGlow * 0.5);
    baseColor = mix(baseColor, WHITE, audioGlow * 0.3);
  }
  
  // Depth-based brightness (particles facing camera are brighter)
  vec3 viewDir = normalize(uCameraPosition - vPosition);
  float facing = max(dot(vNormal, viewDir), 0.0);
  float depthBrightness = 0.5 + 0.5 * facing;
  
  // Distance fade
  float dist = length(vPosition - uCameraPosition);
  float distFade = smoothstep(5.0, 2.0, dist);
  
  // Glow layer
  float glowIntensity = 0.3 * shape;
  if (vState == 3.0) {
    glowIntensity *= 1.0 + vAudioLevel * 2.0;
  }
  float glowVal = glow(coord * 2.0, glowIntensity);
  
  // Combine shape and glow
  float alpha = shape * assemblyAlpha * depthBrightness * distFade;
  vec3 finalColor = baseColor * alpha + featureColor * glowVal * assemblyAlpha;
  
  // Additive blending for glow
  gl_FragColor = vec4(finalColor, alpha);
  
  // Premultiply alpha for additive blending
  gl_FragColor.rgb *= gl_FragColor.a;
}