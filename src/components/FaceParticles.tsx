// Face Particles Component
// Renders the humanoid face as a GPU particle system

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BufferGeometry, ShaderMaterial, AdditiveBlending, BufferAttribute, Vector3 } from 'three';
import { generateFaceParticlesFast } from '../utils/faceGeometry';
import { PARTICLE_COUNT, RENDER } from '../constants';
import faceVertexShader from '../shaders/faceVertex.glsl?raw';
import faceFragmentShader from '../shaders/faceFragment.glsl?raw';

interface FaceParticlesProps {
  uniforms: {
    uTime: number;
    uState: number;
    uAudioLevel: number;
    uAssemblyProgress: number;
    uBreathingPhase: number;
    uHeadRotation: [number, number, number];
    uMouseInfluence: [number, number];
    uPixelRatio: number;
    uSizeK: number;
  };
  cameraPosition: [number, number, number];
}

const FaceParticles = ({ uniforms, cameraPosition }: FaceParticlesProps) => {
  const geometryRef = useRef<BufferGeometry | null>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const cameraRef = useRef<Vector3 | null>(null);

  // Get camera reference
  const { camera } = useThree();
  cameraRef.current = camera.position;

  // Generate geometry once
  useMemo(() => {
    const data = generateFaceParticlesFast(PARTICLE_COUNT);
    
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
    geometry.setAttribute('aNormal', new BufferAttribute(data.normals, 3));
    geometry.setAttribute('aUv', new BufferAttribute(data.uvs, 2));
    geometry.setAttribute('aParticleId', new BufferAttribute(data.particleIds, 1));
    geometry.setAttribute('aSize', new BufferAttribute(data.sizes, 1));
    geometry.setAttribute('aColor', new BufferAttribute(data.colors, 3));
    
    geometry.computeBoundingSphere();
    geometryRef.current = geometry;
    
    const material = new ShaderMaterial({
      vertexShader: faceVertexShader,
      fragmentShader: faceFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: uniforms.uTime },
        uState: { value: uniforms.uState },
        uAudioLevel: { value: uniforms.uAudioLevel },
        uAssemblyProgress: { value: uniforms.uAssemblyProgress },
        uBreathingPhase: { value: uniforms.uBreathingPhase },
        uHeadRotation: { value: new Float32Array(uniforms.uHeadRotation) },
        uMouseInfluence: { value: new Float32Array(uniforms.uMouseInfluence) },
        uPixelRatio: { value: uniforms.uPixelRatio },
        uSizeK: { value: uniforms.uSizeK },
        uCameraPosition: { value: new Float32Array(cameraPosition) },
      },
    });
    
    materialRef.current = material;
  }, []);

  // Update uniforms each frame
  useFrame(() => {
    if (materialRef.current && cameraRef.current) {
      materialRef.current.uniforms.uTime.value = uniforms.uTime;
      materialRef.current.uniforms.uState.value = uniforms.uState;
      materialRef.current.uniforms.uAudioLevel.value = uniforms.uAudioLevel;
      materialRef.current.uniforms.uAssemblyProgress.value = uniforms.uAssemblyProgress;
      materialRef.current.uniforms.uBreathingPhase.value = uniforms.uBreathingPhase;
      materialRef.current.uniforms.uHeadRotation.value.set(uniforms.uHeadRotation);
      materialRef.current.uniforms.uMouseInfluence.value.set(uniforms.uMouseInfluence);
      materialRef.current.uniforms.uPixelRatio.value = uniforms.uPixelRatio;
      materialRef.current.uniforms.uSizeK.value = uniforms.uSizeK;
      materialRef.current.uniforms.uCameraPosition.value.set(cameraRef.current.toArray());
      
      // Optional window variable overrides (matches original implementation)
      if (typeof window !== 'undefined') {
        if ((window as any).__HUM_SPEAK_AMP != null) {
          materialRef.current.uniforms.uAudioLevel.value = Number((window as any).__HUM_SPEAK_AMP);
        }
        if ((window as any).__HUM_BOIL_AMP != null) {
          // Boil amplitude affects particle displacement (handled in shader via uAudioLevel)
        }
        if ((window as any).__HUM_RIM != null) {
          // Rim lighting (handled in shader)
        }
        if ((window as any).__HUM_DOT != null) {
          // Dot sharpness (handled in shader)
        }
        if ((window as any).__HUM_ENERGY != null) {
          // Energy level affects overall intensity
        }
        if ((window as any).__HUM_FREEZE_T != null) {
          materialRef.current.uniforms.uTime.value = Number((window as any).__HUM_FREEZE_T);
        }
        if ((window as any).__HUM_ATTN != null) {
          // Mouse attention factor
        }
        if ((window as any).__HUM_BLEND != null) {
          // Blend state
        }
        if ((window as any).__HUM_FORCE_2D != null) {
          // Force 2D mode
        }
        if ((window as any).__HUM_BG_T != null) {
          // Background time override
        }
        if ((window as any).__HUM_CLICK != null) {
          // Click timing
        }
      }
      
      materialRef.current.needsUpdate = true;
    }
  });

  if (!geometryRef.current || !materialRef.current) return null;

  return (
    <points
      geometry={geometryRef.current}
      material={materialRef.current}
      frustumCulled={RENDER.FRUSTUM_CULLED}
      renderOrder={10}
    />
  );
};

export default FaceParticles;