// Background Particles Component
// Ambient particle field behind the humanoid

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BufferGeometry, ShaderMaterial, AdditiveBlending, BufferAttribute } from 'three';
import { generateBGParticles, type BGParticleData } from '../utils/bgParticles';
import { BG_PARTICLE_COUNT, RENDER } from '../constants';
import bgVertexShader from '../shaders/bgVertex.glsl?raw';
import bgFragmentShader from '../shaders/bgFragment.glsl?raw';

interface BGParticlesProps {
  visible: boolean;
  birthTime: number | null;
  containerSize: { width: number; height: number };
}

const BGParticles = ({ 
  visible, 
  birthTime, 
  containerSize 
}: BGParticlesProps) => {
  const geometryRef = useRef<BufferGeometry | null>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const particleDataRef = useRef<BGParticleData | null>(null);
  const { viewport } = useThree();

  // Generate geometry once
  useMemo(() => {
    const data = generateBGParticles(BG_PARTICLE_COUNT, containerSize.width, containerSize.height);
    particleDataRef.current = data;
    
    const geometry = new BufferGeometry();
    geometry.setAttribute('aUv', new BufferAttribute(data.uvs, 2));
    geometry.setAttribute('aCol', new BufferAttribute(data.colors, 3));
    geometry.setAttribute('aPh', new BufferAttribute(data.phases, 1));
    geometry.setAttribute('aRate', new BufferAttribute(data.rates, 1));
    geometry.setAttribute('aBase', new BufferAttribute(data.bases, 1));
    geometry.setAttribute('aTw', new BufferAttribute(data.twinkles, 1));
    geometry.setAttribute('aSz', new BufferAttribute(data.sizes, 1));
    
    geometry.computeBoundingSphere();
    geometryRef.current = geometry;
    
    const material = new ShaderMaterial({
      vertexShader: bgVertexShader,
      fragmentShader: bgFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSizeK: { value: 1 },
        uRest: { value: typeof window !== 'undefined' && (window as any).__HUM_BG_REST != null ? (window as any).__HUM_BG_REST : 0.22 },
        uPulse: { value: typeof window !== 'undefined' && (window as any).__HUM_BG_PULSE != null ? (window as any).__HUM_BG_PULSE : 2.6 },
        uMap: { value: new Float32Array([2, -2, -1, 1]) },
        uWave: { value: new Float32Array([0, 0, 0, 0]) },
        uWaveK: { value: new Float32Array([1.78, 0.4]) },
      },
    });
    
    materialRef.current = material;
  }, [containerSize.width, containerSize.height]);

  // Update uniforms each frame
  useFrame((state) => {
    if (!visible || !materialRef.current || !particleDataRef.current) return;

    const currentTime = state.clock.getElapsedTime();
    const birthElapsed = birthTime ? (currentTime - birthTime / 1000) : 99;
    
    // Check for surge parameter
    let surge = 0;
    if (typeof window !== 'undefined' && (window as any).__HUM_SURGE != null) {
      surge = Number((window as any).__HUM_SURGE);
    }
    
    const waveTime = birthElapsed >= 0 && birthElapsed < 4.5 ? birthElapsed + surge : 0;
    
    const width = viewport.width;
    const height = viewport.height;
    const data = particleDataRef.current;
    const d = Math.max(width / data.aspect, height);
    const p = d * data.aspect;
    const m = d;
    const g = (width - p) * 0.5;
    const v = (height - m) * 0.42;
    
    materialRef.current.uniforms.uTime.value = currentTime;
    materialRef.current.uniforms.uPixelRatio.value = Math.min(
      typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      RENDER.MAX_DPR
    );
    materialRef.current.uniforms.uSizeK.value = Math.max(0.6, height / 1020);
    materialRef.current.uniforms.uMap.value.set([
      p / width * 2,
      -(m / height) * 2,
      g / width * 2 - 1,
      1 - v / height * 2
    ]);
    
    const S = Math.min(width, height) / height;
    if (waveTime >= 0 && waveTime < 4.5) {
      materialRef.current.uniforms.uWave.value.set([0, 0.14 * S, waveTime * 1.5 * S, Math.exp(-waveTime / 1.8)]);
      materialRef.current.uniforms.uWaveK.value.set([width / height, 0.45 * S]);
    } else {
      materialRef.current.uniforms.uWave.value.set([0, 0, 0, 0]);
    }
    
    materialRef.current.needsUpdate = true;
  });

  if (!geometryRef.current || !materialRef.current) return null;

  return (
    <points
      geometry={geometryRef.current}
      material={materialRef.current}
      frustumCulled={false}
      renderOrder={1}
    />
  );
};

export default BGParticles;