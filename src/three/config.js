// -- CAMERA & CONTROLS ----------------------------------
export const CAMERA_CONFIG = {
    fov: 75,
    near: 1,
    far: 300,
    position: { x: 110, y: 68, z: -1.6 },
};

export const CONTROLS_CONFIG = {
    enableDamping: true,
    polarAngle: { min: 0, max: 1.45 },
    distance: { min: 20, max: 150 },
    target: { x: 8, y: -10, z: -1.8 },
    minCameraHeight: 3, // Camera cannot go below this Y value
};


// Minimum zoom distance when focusing a single block/floor to avoid getting too close
export const BLOCK_FOCUS_MIN_DISTANCE = 35;

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
export const PIN_FOCUS_TILT_DEG = 35;
export const PIN_FOCUS_DISTANCE_FACTOR = 0.4;
export const PIN_FOCUS_TARGET_Y_OFFSET = -14;
