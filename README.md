# UFCIM Front 3D

UFCIM Front 3D is a comprehensive 3D Space Management System for campus environments, built with **Vue 3**, **Vite**, and **Three.js**. It provides an interactive 3D viewer for the IAUD campus, allowing users to browse spaces, check availability, and manage reservations.

## 🚀 Features

- **Interactive 3D Viewer**: Explore the campus in 3D with modular GLB files loaded per building/floor.
- **Space Management**: Browse spaces, view details, and check real-time availability.
- **Reservations & Blockings**: Secure reservation system for rooms and spaces, including administrative blocking features.
- **Role-based Access**: Authentication system with different access levels (Student, Professor, Admin).
- **PWA Support**: Installable as a Progressive Web App for a native-like experience on mobile and desktop.
- **Responsive Design**: Optimized for both desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: Vue 3 (Composition API), TypeScript, Pinia (State Management), Vue Router.
- **3D Engine**: Three.js for scene orchestration, asset management, and interaction.
- **Build Tool**: Vite for fast development and optimized production builds.
- **Data Handling**: Excel-to-JSON conversion for room metadata and asset manifest generation.

## 📦 Project Structure

```
.
├── public/                 # Static assets
│   ├── assets/
│   │   ├── models/IAUD/    # GLB models and manifest.json
│   │   └── pins_db_popup.json # Generated room metadata
│   └── styles.css          # Global 3D-related styles
├── src/
│   ├── components/         # Reusable Vue components
│   ├── composables/        # Shared logic (API, availability, etc.)
│   ├── router/             # Vue Router configuration
│   ├── services/           # API communication layer
│   ├── stores/             # Pinia state stores (Auth, Campus, Reservation)
│   ├── three/              # Core 3D Viewer logic (Three.js)
│   │   ├── App.js          # Main 3D entry point
│   │   ├── ModelManager.js # Asset and floor management
│   │   └── InteractionManager.js # Raycasting and events
│   ├── views/              # Page components (Login, Viewer, Reservations)
│   └── main.ts             # App entry point
├── tools/                  # Automation scripts (manifest & pin generation)
└── data/                   # Source data files (Excel)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ recommended.

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Data & Asset Preparation
Ensure the 3D models and metadata are up to date:

| Command | Purpose |
| --- | --- |
| `npm run build:manifest` | Regenerate `public/assets/models/IAUD/manifest.json` from GLB files. |
| `npm run build:pins` | Convert `data/qt.Ativos.xlsx` into `public/assets/pins_db_popup.json`. |

### Production Build
```bash
npm run build
```

## 🏗️ 3D Viewer Architecture

The 3D viewer is decoupled from the Vue components to ensure performance and maintainability.

- **Scene Orchestration**: Managed by `src/three/App.js`, handling the renderer, scene, and animation loop.
- **Model Management**: `ModelManager` streams GLB assets, controls floor visibility, and extracts pin locations from model nodes.
- **Interaction**: `InteractionManager` handles raycasting for pin clicks and hovering, while `CameraManager` manages smooth transitions and focus.
- **Popups**: `PopupManager` bridges the 3D scene and metadata, rendering rich information when a space is selected.

## 📄 License
This project is licensed under the ISC License.
