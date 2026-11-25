// Background Particle Fragment Shader
// Subtle glowing particles for ambient atmosphere

precision highp float;

varying vec3 vColor;
varying float vAlpha;
varying float vSize;

void main() {
  // Circular particle with soft edge
  vec2 coord = gl_PointCoord - 0.5;
  float dist = length(coord);
  
  // Soft circular shape
  float shape = smoothstep(0.5, 0.0, dist);
  
  // Add subtle noise to edges
  // shape *= 1.0 - 0.05 * noise(coord * 20.0);
  
  if (shape <= 0.01) discard;
  
  // Color with alpha
  vec3 color = vColor * shape;
  float alpha = vAlpha * shape * shape; // Square for softer falloff
  
  // Add subtle glow
  float glow = smoothstep(0.5, 0.3, dist) * 0.3;
  color += vColor * glow;
  alpha += glow * 0.5;
  
  gl_FragColor = vec4(color, alpha);
  
  // Premultiply for additive blending
  gl_FragColor.rgb *= gl_FragColor.a;
}