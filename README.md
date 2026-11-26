# Apex Humanoid

A pixel-perfect recreation of the [Apex Humanoid](https://apex-humanoid.vercel.app) website — a humanoid face rendered as an interactive particle-based 3D system with hundreds of thousands of glowing particles.

## 🎯 Features

- **30k GPU-based particles** forming a detailed humanoid face (configurable, original used 200k+)
- **SDF-based face geometry** with stratified region sampling (eyes, nose, mouth, forehead, cheeks, jaw)
- **Custom GLSL shaders** for vertex/fragment particle rendering
- **Animations:**
  - Initial assembly (~4.5s particle birth sequence)
  - Idle breathing (continuous expansion/contraction)
  - Autonomous head movement (slow random drift)
  - State transitions: idle → listening → thinking → speaking
  - Audio-reactive particle movement (microphone input)
- **Interactions:**
  - Mouse parallax (face follows cursor smoothly)
  - Microphone-driven speaking animation
  - Sound effects for all UI states
  - State switching controls
  - Replay assembly animation
- **Performance:** GPU-based rendering (ShaderMaterial + AdditiveBlending), targets 60 FPS

## 🛠️ Tech Stack

- React 18 + TypeScript
- Vite
- Three.js + React Three Fiber (@react-three/fiber)
- Custom GLSL shaders (vertex/fragment)
- Web Audio API (sound synthesis + microphone analysis)
- Signed Distance Functions (SDF) for face geometry
- Poisson disk sampling for particle distribution

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/HeshamZegoo/ui.git
cd ui

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Usage

Open `http://localhost:3000` in your browser.

### URL Query Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `skip` | `true` | Skip assembly animation |
| `nobg` | `true` | Disable background particles |
| `state` | `idle`, `listening`, `thinking`, `speaking` | Initial face state |
| `auto` | `true` | Auto-advance through states |
| `surge` | number | Amplify assembly surge effect |
| `bgrest` | number | Background rest intensity |
| `bgpulse` | number | Background pulse speed |

**Example:** `http://localhost:3000/?skip=1&state=speaking&auto=1`

## 🎮 Controls

| Control | Action |
|---------|--------|
| **Mouse** | Parallax — face follows cursor |
| **IDLE / LISTENING / THINKING / SPEAKING** buttons | Switch face state |
| **🎙 MIC** | Toggle microphone input (audio-reactive speaking) |
| **↻ REPLAY** | Re-run assembly animation |
| **♪ SOUND** | Toggle all sound effects on/off |

## 📁 Project Structure

```
apex-humanoid/
├── src/
│   ├── App.tsx              # Main app: loading → entry → experience
│   ├── App.css              # Styles (Share Tech Mono, cyan theme)
│   ├── index.css            # Base styles
│   ├── main.tsx             # React entry point
│   ├── components/
│   │   ├── HumanoidScene.tsx     # Main 3D scene (canvas, particles, controls)
│   │   ├── FaceParticles.tsx     # Face particle system (GPU ShaderMaterial)
│   │   ├── BGParticles.tsx       # Background ambient particle field
│   │   └── ControlPanel.tsx      # UI control buttons
│   ├── hooks/
│   │   └── useFaceAnimation.ts   # Animation state (assembly, breathing, head, mouse)
│   ├── shaders/
│   │   ├── faceVertex.glsl       # Face particle vertex shader
│   │   ├── faceFragment.glsl     # Face particle fragment shader
│   │   ├── bgVertex.glsl         # Background particle vertex shader
│   │   └── bgFragment.glsl       # Background particle fragment shader
│   ├── utils/
│   │   ├── faceGeometry.ts       # SDF-based face particle generation
│   │   └── bgParticles.ts        # Background particle grid generation
│   ├── audio/
│   │   └── soundSystem.ts        # Web Audio API: synthesis + microphone
│   └── constants/
│       └── index.ts              # All configuration constants
├── index.html                # HTML entry point
├── vite.config.ts            # Vite config (React + GLSL plugins)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .gitignore                # Git ignore rules
└── README.md                 # This file
```

## 🎨 Design

- **Font:** Share Tech Mono (Google Fonts)
- **Color Theme:** Cyan accent (#22d3ee) on black background
- **UI Style:** Minimalist, monospace, control panel at bottom center
- **Particle Style:** Glowing additive-blended particles with feature-based coloring

## ⚡ Performance

| Setting | Default |
|---------|---------|
| Face particles | 200,000 |
| Background particles | 50,000 |
| Max DPR | 1.5 |
| Target FPS | 60 |

For lower-end GPUs, reduce `PARTICLE_COUNT` and `BG_PARTICLE_COUNT` in `src/constants/index.ts`.

## 📜 License

MIT License

## 🔗 Reference

Original: https://apex-humanoid.vercel.app
