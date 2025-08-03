// -- CAMERA & CONTROLS ----------------------------------
export const CAMERA_CONFIG = {
    fov: 75,
    near: 0.1,
    far: 1000,
    position: { x: 30, y: 20, z: 30 },
};

export const CONTROLS_CONFIG = {
    enableDamping: true,
    polarAngle: { min: 0, max: Math.PI / 2 },
    distance: { min: 30, max: 100 },
    target: { x: 0, y: 0, z: 0 },
};

// -- INTERACTION -----------------------------------------
export const PIN_ASSET_PATH = '/assets/pin.png';

// -- MODELS ----------------------------------------------
export const MODEL_DEFINITIONS = {
    'Térreo': { path: '/assets/iaud-terreo.glb' },
    '1º Pavimento': { path: '/assets/iaud-1opav.glb' },
    'Coberta': { path: '/assets/iaud-coberta.glb' },
};

// -- UI & STYLING -----------------------------------------
export const UI_IDS = {
    floorUI: 'floor-ui',
    popup: 'info-popup',
};

export const UI_CLASSES = {
    floorUIContainer: 'floor-ui-container',
    popup: 'info-popup',
    popupCloseButton: 'popup-close',
};

// -- ANIMATION -------------------------------------------
export const ANIMATION_DURATION = 700; // in milliseconds

// -- WORLD -------------------------------------------------
export const GROUND_PLANE_SIZE = 2000.0;