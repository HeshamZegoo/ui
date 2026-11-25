// Face Animation Hook
// Manages animation state, timing, and transitions for the humanoid face

import { useRef, useEffect, useCallback, useState } from 'react';
import { FACE_STATES, type FaceState, ANIMATION } from '../constants';

// Simple clamp utility
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface FaceAnimationState {
  currentState: FaceState;
  assemblyProgress: number;
  breathingPhase: number;
  headRotation: [number, number, number];
  mouseInfluence: [number, number];
  isAssembled: boolean;
  assemblyStartTime: number | null;
}

interface UseFaceAnimationOptions {
  onAssemblyComplete?: () => void;
  onStateChange?: (state: FaceState) => void;
  skipAssembly?: boolean;
  initialState?: FaceState;
}

interface UseFaceAnimationReturn {
  currentState: FaceState;
  assemblyProgress: number;
  breathingPhase: number;
  headRotation: [number, number, number];
  mouseInfluence: [number, number];
  isAssembled: boolean;
  assemblyStartTime: number | null;
  setState: (state: FaceState) => void;
  setMousePosition: (x: number, y: number) => void;
  replayAssembly: () => void;
  FACE_STATES: typeof FACE_STATES;
}

export function useFaceAnimation({
  onAssemblyComplete,
  onStateChange,
  skipAssembly = false,
  initialState = FACE_STATES.IDLE,
}: UseFaceAnimationOptions = {}): UseFaceAnimationReturn {
  const [animationState, setAnimationState] = useState<FaceAnimationState>({
    currentState: initialState,
    assemblyProgress: skipAssembly ? 1 : 0,
    breathingPhase: 0,
    headRotation: [0, 0, 0],
    mouseInfluence: [0, 0],
    isAssembled: skipAssembly,
    assemblyStartTime: skipAssembly ? null : performance.now(),
  });

  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const stateStartTimeRef = useRef<number>(performance.now());
  const targetHeadRotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const mousePositionRef = useRef<[number, number]>([0, 0]);

  // Assembly animation
  useEffect(() => {
    if (skipAssembly) return;

    const animateAssembly = (time: number) => {
      const startTime = animationState.assemblyStartTime || time;
      const elapsed = (time - startTime) / 1000; // seconds
      const progress = Math.min(elapsed / ANIMATION.ASSEMBLY_DURATION, 1);

      setAnimationState(prev => ({
        ...prev,
        assemblyProgress: progress,
        isAssembled: progress >= 1,
      }));

      if (progress >= 1) {
        onAssemblyComplete?.();
      } else {
        frameRef.current = requestAnimationFrame(animateAssembly);
      }
    };

    frameRef.current = requestAnimationFrame(animateAssembly);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [skipAssembly, onAssemblyComplete, animationState.assemblyStartTime]);

  // Main animation loop (breathing, head movement, state transitions)
  useEffect(() => {
    const animate = (time: number) => {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setAnimationState(prev => {
        // Breathing phase (continuous)
        const breathingPhase = prev.breathingPhase + deltaTime * (2 * Math.PI / ANIMATION.BREATHING_CYCLE);

        // Head rotation - smooth interpolation to target
        const rotationSpeed = ANIMATION.HEAD_ROTATION_SPEED;
        const headRotation: [number, number, number] = [
          prev.headRotation[0] + (targetHeadRotationRef.current[0] - prev.headRotation[0]) * rotationSpeed * deltaTime * 60,
          prev.headRotation[1] + (targetHeadRotationRef.current[1] - prev.headRotation[1]) * rotationSpeed * deltaTime * 60,
          prev.headRotation[2] + (targetHeadRotationRef.current[2] - prev.headRotation[2]) * rotationSpeed * deltaTime * 60,
        ];

        // Mouse influence - smooth follow
        const mouseInfluence: [number, number] = [
          prev.mouseInfluence[0] + (mousePositionRef.current[0] - prev.mouseInfluence[0]) * 0.05 * deltaTime * 60,
          prev.mouseInfluence[1] + (mousePositionRef.current[1] - prev.mouseInfluence[1]) * 0.05 * deltaTime * 60,
        ];

        // State-specific behaviors
        const stateElapsed = (time - stateStartTimeRef.current) / 1000;

        switch (prev.currentState) {
          case FACE_STATES.IDLE:
            // Subtle random head movement
            if (stateElapsed > 3 + Math.random() * 5) {
              targetHeadRotationRef.current = [
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.1,
              ];
              stateStartTimeRef.current = time;
            }
            break;

          case FACE_STATES.LISTENING:
            // Slight forward tilt, subtle pulse
            targetHeadRotationRef.current = [
              -0.05 + Math.sin(time * 0.001) * 0.02,
              Math.sin(time * 0.0005) * 0.1,
              0,
            ];
            break;

          case FACE_STATES.THINKING:
            // Slow thoughtful movement
            targetHeadRotationRef.current = [
              Math.sin(time * 0.0003) * 0.15,
              Math.sin(time * 0.0002) * 0.2,
              Math.sin(time * 0.0001) * 0.05,
            ];
            break;

          case FACE_STATES.SPEAKING:
            // Audio-reactive handled externally via audio level
            // Slight jaw movement hint in rotation
            targetHeadRotationRef.current = [
              Math.sin(time * 0.002) * 0.03,
              Math.sin(time * 0.0015) * 0.05,
              0,
            ];
            break;
        }

        return {
          ...prev,
          breathingPhase: breathingPhase % (Math.PI * 2),
          headRotation,
          mouseInfluence,
        };
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Set face state
  const setState = useCallback((state: FaceState) => {
    setAnimationState(prev => {
      if (prev.currentState === state) return prev;
      stateStartTimeRef.current = performance.now();
      onStateChange?.(state);
      return { ...prev, currentState: state };
    });
  }, [onStateChange]);

  // Update mouse position (normalized -1 to 1)
  const setMousePosition = useCallback((x: number, y: number) => {
    mousePositionRef.current = [
      clamp(x, -1, 1),
      clamp(y, -1, 1),
    ];
  }, []);

  // Trigger assembly replay
  const replayAssembly = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      assemblyProgress: 0,
      isAssembled: false,
      assemblyStartTime: performance.now(),
      currentState: FACE_STATES.IDLE,
    }));
    stateStartTimeRef.current = performance.now();
    targetHeadRotationRef.current = [0, 0, 0];
  }, []);

  return {
    currentState: animationState.currentState,
    assemblyProgress: animationState.assemblyProgress,
    breathingPhase: animationState.breathingPhase,
    headRotation: animationState.headRotation,
    mouseInfluence: animationState.mouseInfluence,
    isAssembled: animationState.isAssembled,
    assemblyStartTime: animationState.assemblyStartTime,
    setState,
    setMousePosition,
    replayAssembly,
    FACE_STATES,
  };
}