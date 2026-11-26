// Apex Humanoid Constants

export const PARTICLE_COUNT = 60000; // Number of particles for the face
export const BG_PARTICLE_COUNT = 10000; // Number of background particles

export const FACE_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
} as const;

export type FaceState = typeof FACE_STATES[keyof typeof FACE_STATES];

export const COLORS = {
  BACKGROUND: '#000000',
  ACCENT: '#22d3ee',
  ACCENT_DIM: '#9fd8e8',
  ACCENT_MUTED: '#4a6b75',
  UI_BG: '#0a0f12',
  UI_BORDER: 'rgba(34, 211, 238, 0.33)',
  UI_BORDER_HOVER: 'rgba(34, 211, 238, 0.5)',
  MIC_ACTIVE: '#f5a623',
  MIC_INACTIVE: '#22d3ee',
  TEXT_PRIMARY: '#22d3ee',
  TEXT_SECONDARY: '#9fd8e8',
  TEXT_MUTED: '#4a6b75',
  SOUND_ON: '#9fd8e8',
  SOUND_OFF: '#4a6b75',
} as const;

export const FONT = {
  UI: '"Share Tech Mono", monospace',
} as const;

export const ANIMATION = {
  ASSEMBLY_DURATION: 4.5, // seconds
  BREATHING_CYCLE: 4.0, // seconds
  HEAD_ROTATION_SPEED: 0.15,
  PARTICLE_TRANSITION_DURATION: 1.5,
  STATE_TRANSITION_DURATION: 0.8,
} as const;

export const AUDIO = {
  SAMPLE_RATE: 44100,
  FFT_SIZE: 512,
  SMOOTHING: 0.8,
} as const;

export const RENDER = {
  MAX_DPR: 1.5,
  MIN_DPR: 1.0,
  FRUSTUM_CULLED: false,
} as const;

export const SHADER_UNIFORMS = {
  // Face shader uniforms
  uTime: { value: 0 },
  uState: { value: 0 }, // 0=idle, 1=listening, 2=thinking, 3=speaking
  uAudioLevel: { value: 0 },
  uAssemblyProgress: { value: 0 },
  uBreathingPhase: { value: 0 },
  uHeadRotation: { value: [0, 0, 0] },
  uMouseInfluence: { value: [0, 0] },
  uPixelRatio: { value: 1 },
  uSizeK: { value: 1 },
  uRest: { value: 0.22 },
  uPulse: { value: 2.6 },
  uWave: { value: [0, 0, 0, 0] },
  uWaveK: { value: [1.78, 0.4] },
} as const;export const FACE_GEOMETRY = {
  // Approximate face proportions
  FACE_WIDTH: 1.0,
  FACE_HEIGHT: 1.3,
  FACE_DEPTH: 0.6,
  EYE_POSITION_Y: 0.15,
  EYE_SEPARATION: 0.32,
  EYE_SIZE: 0.12,
  NOSE_POSITION_Y: -0.05,
  NOSE_SIZE: 0.15,
  MOUTH_POSITION_Y: -0.35,
  MOUTH_WIDTH: 0.25,
  MOUTH_HEIGHT: 0.08,
  JAW_WIDTH: 0.8,
  JAW_HEIGHT: 0.6,
  FOREHEAD_HEIGHT: 0.4,
  CHEEK_WIDTH: 0.5,
  CHEEK_HEIGHT: 0.3,
} as const;export const MICROPHONE = {
  ANALYSER_FFT_SIZE: 512,
  SMOOTHING_TIME_CONSTANT: 0.8,
  MIN_DB: -100,
  MAX_DB: -30,
} as const;export const HAND_TRACKING = {
  MODEL_URL: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  WASM_URL: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  MAX_HANDS: 2,
  CONFIDENCE_THRESHOLD: 0.5,
} as const;export const QUERY_PARAMS = {
  SKIP_ASSEMBLY: 'skip',
  NO_BG: 'nobg',
  ASM_OFF: 'asmoff',
  ASM_EL: 'asmel',
  SURGE: 'surge',
  BG_REST: 'bgrest',
  BG_PULSE: 'bgpulse',
  STATE: 'state',
  AUTO: 'auto',
} as const;export const Z_INDEX = {
  CANVAS: 0,
  BG_PARTICLES: 1,
  FACE_PARTICLES: 10,
  UI_CONTROLS: 100,
  LOADING_SCREEN: 200,
} as const;export const TRANSITIONS = {
  OPACITY_DURATION: 900, // ms
  CONTEXT_LOST_RECOVERY: 4000, // ms
} as const;export const PERFORMANCE = {
  TARGET_FPS: 60,
  FRAME_BUDGET: 16.67, // ms
  MAX_PARTICLES_HIGH_END: 300000,
  MAX_PARTICLES_LOW_END: 100000,
  PARTICLE_SIZE_MULTIPLIER: 1.0,
} as const;export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';export const AUDIO_CONTEXT_STATE = {
  SUSPENDED: 'suspended',
  RUNNING: 'running',
  CLOSED: 'closed',
} as const;