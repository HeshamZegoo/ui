// Humanoid Scene Component
// Main Three.js scene containing face particles, background particles, and camera

import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Color } from 'three';
import FaceParticles from './FaceParticles';
import BGParticles from './BGParticles';
import { useFaceAnimation } from '../hooks/useFaceAnimation';
import { getAudioLevel, onAudioLevelChange } from '../audio/soundSystem';
import { RENDER, Z_INDEX, FACE_STATES, type FaceState } from '../constants';

interface HumanoidSceneProps {
  isActive: boolean;
  onAssemblyComplete?: () => void;
  skipAssembly?: boolean;
  noBackground?: boolean;
  currentState: FaceState;
  setState: (state: FaceState) => void;
  replayAssembly: () => void;
  onMicrophoneToggle: () => void;
  isMicrophoneActive: boolean;
  onSoundToggle: () => void;
  isSoundEnabled: boolean;
}

export const HumanoidScene = ({ 
  isActive, 
  onAssemblyComplete,
  skipAssembly = false,
  noBackground = false,
  currentState,
  setState: _setState,
  replayAssembly: _replayAssembly,
  onMicrophoneToggle: _onMicrophoneToggle,
  isMicrophoneActive: _isMicrophoneActive,
  onSoundToggle: _onSoundToggle,
  isSoundEnabled: _isSoundEnabled,
}: HumanoidSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1920, height: 1080 });
  const birthTimeRef = useRef<number | null>(null);
  const audioLevelRef = useRef<number>(0);
  const audioUnsubscribeRef = useRef<(() => void) | null>(null);

  // Face animation state
  const faceAnimation = useFaceAnimation({
    onAssemblyComplete: () => {
      birthTimeRef.current = performance.now();
      onAssemblyComplete?.();
    },
    skipAssembly,
    initialState: currentState,
  });

  const assemblyProgress = faceAnimation.assemblyProgress;
  const breathingPhase = faceAnimation.breathingPhase;
  const headRotation: [number, number, number] = faceAnimation.headRotation;
  const mouseInfluence: [number, number] = faceAnimation.mouseInfluence;
  const setMousePosition = faceAnimation.setMousePosition;
  const FaceStatesEnum = faceAnimation.FACE_STATES;

  // Handle container resize
  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Subscribe to audio level
  useEffect(() => {
    audioUnsubscribeRef.current = onAudioLevelChange(() => {
      audioLevelRef.current = getAudioLevel();
    });
    return () => audioUnsubscribeRef.current?.();
  }, []);

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      setMousePosition(x, y);
    };

    const handleMouseLeave = () => {
      setMousePosition(0, 0);
    };

    containerRef.current?.addEventListener('mousemove', handleMouseMove);
    containerRef.current?.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
      containerRef.current?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [setMousePosition]);

  // Camera position for shaders
  const cameraPosition = useMemo(() => [0, 0, 3] as [number, number, number], []);

  // Uniforms for face particles
  const faceUniforms = useMemo(() => ({
    uTime: performance.now() / 1000,
    uState: Object.values(FaceStatesEnum).indexOf(currentState),
    uAudioLevel: audioLevelRef.current,
    uAssemblyProgress: assemblyProgress,
    uBreathingPhase: breathingPhase,
    uHeadRotation: headRotation,
    uMouseInfluence: mouseInfluence,
    uPixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, RENDER.MAX_DPR),
    uSizeK: Math.max(0.6, containerSize.height / 1020),
  }), [
    currentState, 
    assemblyProgress, 
    breathingPhase, 
    headRotation, 
    mouseInfluence,
    containerSize.height,
    FaceStatesEnum
  ]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_INDEX.CANVAS,
        background: '#000',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45, near: 0.1, far: 100 }}
        gl={{ 
          alpha: true, 
          antialias: false,
          preserveDrawingBuffer: false,
        }}
        frameloop="always"
        style={{ 
          position: 'absolute', 
          inset: 0, 
          opacity: 1,
          pointerEvents: 'none',
        }}
        onCreated={({ gl, setFrameloop }) => {
          const canvas = gl.domElement;
          let contextLostTimeout: number | null = null;
          
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            try { setFrameloop('never'); } catch {}
            contextLostTimeout = window.setTimeout(() => {
              try { setFrameloop('always'); } catch {}
            }, 4000);
          }, false);
          
          canvas.addEventListener('webglcontextrestored', () => {
            if (contextLostTimeout) clearTimeout(contextLostTimeout);
            try { setFrameloop('always'); } catch {}
          }, false);
        }}
      >
        <scene background={new Color('#000')} />
        
        {/* Background particles */}
        {!noBackground && (
          <BGParticles
            visible={isActive}
            birthTime={birthTimeRef.current}
            containerSize={containerSize}
          />
        )}
        
        {/* Face particles */}
        <FaceParticles
          uniforms={faceUniforms}
          cameraPosition={cameraPosition}
        />
      </Canvas>
    </div>
  );
};

// Control panel for testing states
export const ControlPanel = ({ 
  currentState, 
  setState, 
  replayAssembly,
  onMicrophoneToggle,
  isMicrophoneActive,
  onSoundToggle,
  isSoundEnabled,
}: {
  currentState: FaceState;
  setState: (state: FaceState) => void;
  replayAssembly: () => void;
  onMicrophoneToggle: () => void;
  isMicrophoneActive: boolean;
  onSoundToggle: () => void;
  isSoundEnabled: boolean;
}) => {
  const ACCENT = '#22d3ee';
  const MIC_COLOR = '#f5a623';
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: Z_INDEX.UI_CONTROLS,
        display: 'flex',
        gap: 6,
        fontFamily: '"Share Tech Mono", monospace',
        pointerEvents: 'auto',
      }}
    >
      {Object.values(FACE_STATES).map((state) => (
        <button
          key={state}
          onClick={() => setState(state)}
          style={{
            padding: '5px 11px',
            background: currentState === state ? `${ACCENT}33` : '#0a0f12',
            color: '#9fd8e8',
            border: `1px solid ${ACCENT}55`,
            borderRadius: 6,
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: '"Share Tech Mono", monospace',
          }}
        >
          {state.toUpperCase()}
        </button>
      ))}
      
      <button
        onClick={onMicrophoneToggle}
        title="Drive the speaking face from your microphone"
        style={{
          padding: '5px 11px',
          background: isMicrophoneActive ? `${MIC_COLOR}33` : '#0a0f12',
          color: isMicrophoneActive ? MIC_COLOR : '#9fd8e8',
          border: `1px solid ${isMicrophoneActive ? MIC_COLOR : ACCENT}55`,
          borderRadius: 6,
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: '"Share Tech Mono", monospace',
        }}
      >
        🎙 MIC {isMicrophoneActive ? 'ON' : 'OFF'}
      </button>
      
      <button
        onClick={replayAssembly}
        title="Run the birth again"
        style={{
          padding: '5px 11px',
          background: '#0a0f12',
          color: '#9fd8e8',
          border: `1px solid ${ACCENT}55`,
          borderRadius: 6,
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: '"Share Tech Mono", monospace',
        }}
      >
        ↻ REPLAY
      </button>
      
      <button
        onClick={onSoundToggle}
        style={{
          padding: '5px 11px',
          background: '#0a0f12',
          color: isSoundEnabled ? '#9fd8e8' : '#4a6b75',
          border: `1px solid ${ACCENT}55`,
          borderRadius: 6,
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: '"Share Tech Mono", monospace',
        }}
      >
        ♪ SOUND {isSoundEnabled ? 'ON' : 'OFF'}
      </button>
    </div>
  );
};
