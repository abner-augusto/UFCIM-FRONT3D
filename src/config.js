// -- CAMERA & CONTROLS ----------------------------------
export const CAMERA_CONFIG = {
    fov: 75,
    near: 0.1,
    far: 1000,
    position: { x: 96, y: 60, z: -1 },
};

export const CONTROLS_CONFIG = {
    enableDamping: true,
    polarAngle: { min: 0, max: Math.PI / 2 },
    distance: { min: 20, max: 150 },
    target: { x: 0, y: 0, z: 0 },
};

// -- INTERACTION -----------------------------------------
export const PIN_ASSET_PATH = '/assets/pin.png';

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

// -- CAMERA BEHAVIOR ---------------------------------------
export const PIN_FOCUS_TILT_DEG = 45;
export const PIN_FOCUS_DISTANCE_FACTOR = 0.75;
export const PIN_FOCUS_TARGET_Y_OFFSET = -6;
