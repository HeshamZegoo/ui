// Apex Humanoid - Main App Component
// Entry point that manages the complete experience

import { useState, useEffect, useCallback, useRef } from 'react';
import { HumanoidScene, ControlPanel } from './components/HumanoidScene';
import { 
  initAudio, 
  resumeAudio, 
  startMicrophone, 
  stopMicrophone, 
  setAudioEnabled,
  playAssemblySound,
  playReadySound,
  playFailedSound,
  playClickSound,
  playToggleSound,
} from './audio/soundSystem';
import { 
  FACE_STATES, 
  type FaceState, 
  QUERY_PARAMS,
} from './constants';
import './App.css';

// Parse URL query parameters
function parseQueryParams(): {
  skipAssembly: boolean;
  noBackground: boolean;
  initialState: FaceState;
  autoStart: boolean;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    skipAssembly: params.get(QUERY_PARAMS.SKIP_ASSEMBLY) === 'true',
    noBackground: params.get(QUERY_PARAMS.NO_BG) === 'true',
    initialState: (params.get(QUERY_PARAMS.STATE) as FaceState) || FACE_STATES.IDLE,
    autoStart: params.get(QUERY_PARAMS.AUTO) === 'true',
  };
}

function App() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentState, setCurrentState] = useState<FaceState>(FACE_STATES.IDLE);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [audioContextReady, setAudioContextReady] = useState(false);
  const assemblyPlayedRef = useRef(false);
  const initialStateRef = useRef<FaceState>(FACE_STATES.IDLE);
  const skipAssemblyRef = useRef(false);

  // Initialize audio context
  useEffect(() => {
    const init = async () => {
      try {
        await initAudio();
        setAudioContextReady(true);
      } catch (error) {
        console.warn('Audio initialization failed:', error);
        setAudioContextReady(false);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  // Parse query params on mount
  useEffect(() => {
    const params = parseQueryParams();
    skipAssemblyRef.current = params.skipAssembly;
    initialStateRef.current = params.initialState;
    
    if (params.autoStart) {
      handleEnter();
    }
  }, []);

  // Handle assembly complete
  const handleAssemblyComplete = useCallback(() => {
    if (!assemblyPlayedRef.current && isSoundEnabled) {
      assemblyPlayedRef.current = true;
      playReadySound();
    }
    setCurrentState(initialStateRef.current);
  }, [isSoundEnabled]);

  // Enter the experience
  const handleEnter = useCallback(async () => {
    if (isActive) return;
    
    await resumeAudio();
    
    if (isSoundEnabled && !assemblyPlayedRef.current) {
      playAssemblySound();
      assemblyPlayedRef.current = true;
    }
    
    setIsActive(true);
    setCurrentState(FACE_STATES.IDLE);
  }, [isSoundEnabled]);

  // Handle state change
  const handleStateChange = useCallback((state: FaceState) => {
    setCurrentState(state);
    if (isSoundEnabled) {
      playClickSound();
    }
  }, [isSoundEnabled]);

  // Handle microphone toggle
  const handleMicrophoneToggle = useCallback(async () => {
    if (isMicrophoneActive) {
      stopMicrophone();
      setIsMicrophoneActive(false);
      if (currentState === FACE_STATES.SPEAKING) {
        setCurrentState(FACE_STATES.IDLE);
      }
      if (isSoundEnabled) playToggleSound(false);
    } else {
      try {
        await startMicrophone();
        setIsMicrophoneActive(true);
        setCurrentState(FACE_STATES.SPEAKING);
        if (isSoundEnabled) playToggleSound(true);
      } catch (error) {
        console.error('Microphone access denied:', error);
        if (isSoundEnabled) playFailedSound();
      }
    }
  }, [isMicrophoneActive, currentState, isSoundEnabled]);

  // Handle sound toggle
  const handleSoundToggle = useCallback(() => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    setAudioEnabled(newState);
    if (isSoundEnabled) {
      playToggleSound(false);
    } else {
      playToggleSound(true);
    }
  }, [isSoundEnabled]);

  // Handle replay assembly
  const handleReplayAssembly = useCallback(() => {
    assemblyPlayedRef.current = false;
    if (isSoundEnabled) {
      playAssemblySound();
      assemblyPlayedRef.current = true;
    }
    // The HumanoidScene will handle the actual replay via its internal replayAssembly
  }, [isSoundEnabled]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner" />
          <p className="loading-text">INITIALIZING APEX HUMANOID</p>
          <p className="loading-subtext">Preparing audio context and particle systems...</p>
        </div>
      </div>
    );
  }

  // Pre-entry screen
  if (!isActive) {
    return (
      <div className="entry-screen">
        <div className="entry-content">
          <h1 className="entry-title">APEX HUMANOID</h1>
          <p className="entry-subtitle">a figure of light that assembles itself</p>
          <button 
            className="entry-button"
            onClick={handleEnter}
            disabled={!audioContextReady}
          >
            {audioContextReady ? 'ENTER' : 'INITIALIZING AUDIO...'}
          </button>
          <p className="entry-hint">
            the click opens the audio - the birth has a sound
          </p>
          {!audioContextReady && (
            <p className="entry-warning">
              Audio context unavailable - experience will be silent
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main experience
  return (
    <div className="app-container">
      <HumanoidScene
        isActive={isActive}
        onAssemblyComplete={handleAssemblyComplete}
        skipAssembly={skipAssemblyRef.current}
        noBackground={false}
        currentState={currentState}
        setState={handleStateChange}
        replayAssembly={handleReplayAssembly}
        onMicrophoneToggle={handleMicrophoneToggle}
        isMicrophoneActive={isMicrophoneActive}
        onSoundToggle={handleSoundToggle}
        isSoundEnabled={isSoundEnabled}
      />
      
      <ControlPanel
        currentState={currentState}
        setState={handleStateChange}
        replayAssembly={handleReplayAssembly}
        onMicrophoneToggle={handleMicrophoneToggle}
        isMicrophoneActive={isMicrophoneActive}
        onSoundToggle={handleSoundToggle}
        isSoundEnabled={isSoundEnabled}
      />
    </div>
  );
}

export default App;