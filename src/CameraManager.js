import * as THREE from 'three';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';
import { 
  ANIMATION_DURATION, 
  CAMERA_CONFIG, 
  CONTROLS_CONFIG,
  PIN_FOCUS_TILT_DEG,
  PIN_FOCUS_DISTANCE_FACTOR,
  PIN_FOCUS_TARGET_Y_OFFSET,
} from './config.js';

export class CameraManager {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {OrbitControls} controls
   */
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    this.savedCameraState = null;
    this.verticalOffset = -5;
  }

  /**
   * Saves the current camera position and target.
   */
  saveCurrentState() {
    this.savedCameraState = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
  }

  /**
   * Animates the camera to focus on a specific pin.
   * @param {THREE.Object3D} pin The pin sprite to focus on.
   */
  focusOnPin(pin, tiltDegrees = PIN_FOCUS_TILT_DEG) {
    if (!pin) return;

    const pinPosition = pin.position.clone();
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    const minDistance = this.controls.minDistance ?? CONTROLS_CONFIG.distance.min ?? 20;
    const desiredRadius = Math.max(offset.length() * PIN_FOCUS_DISTANCE_FACTOR, minDistance);

    const spherical = new THREE.Spherical().setFromVector3(offset);
    const clampedTiltDeg = THREE.MathUtils.clamp(tiltDegrees, 0, 89.9);
    const tiltRad = THREE.MathUtils.degToRad(clampedTiltDeg);
    const epsilon = 0.0001;
    spherical.radius = desiredRadius;
    spherical.phi = Math.max(tiltRad, epsilon);

    const newOffset = new THREE.Vector3().setFromSpherical(spherical);
    const newTarget = pinPosition.clone();
    newTarget.y += PIN_FOCUS_TARGET_Y_OFFSET;
    const newCamPos = newTarget.clone().add(newOffset);

    new TWEEN.Tween(this.camera.position)
      .to(newCamPos, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onStart(() => {
        this.controls.enabled = false;
      })
      .start();

    new TWEEN.Tween(this.controls.target)
      .to(newTarget, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onComplete(() => {
        this.controls.enabled = true;
      })
      .start();
  }

  /**
   * Restores the camera to the last saved position and target.
   */
  restoreSavedState() {
    if (!this.savedCameraState) return;

    new TWEEN.Tween(this.camera.position)
      .to(this.savedCameraState.position, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onStart(() => {
        this.controls.enabled = false;
      })
      .start();

    new TWEEN.Tween(this.controls.target)
      .to(this.savedCameraState.target, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onComplete(() => {
        this.controls.enabled = true;
      })
      .start();

    this.savedCameraState = null; // Clear state after use
  }

  /**
   * Animates the camera to the default starting position and target
   * defined in the config file.
   */
  resetToDefaultState() {
    const newPos = CAMERA_CONFIG.position;
    const newTarget = CONTROLS_CONFIG.target;

    // Animate camera position
    new TWEEN.Tween(this.camera.position)
      .to({ x: newPos.x, y: newPos.y, z: newPos.z }, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onStart(() => {
        this.controls.enabled = false;
      })
      .start();

    // Animate controls target
    new TWEEN.Tween(this.controls.target)
      .to({ x: newTarget.x, y: newTarget.y, z: newTarget.z }, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onComplete(() => {
        this.controls.enabled = true;
      })
      .start();
    
    // Clear any saved state, since we're resetting
    this.savedCameraState = null;
  }

  /**
   * Calculates the center of a 3D object and animates the camera
   * to focus on it, while maintaining the current camera angle and distance.
   * @param {THREE.Object3D} targetObject The 3D object to focus on.
   */
  focusOnObjectAtCurrentDistance(targetObject) {
    if (!targetObject) {
      console.warn('CameraManager: focusOnObject was called with null target.');
      return;
    }

    const box = new THREE.Box3().setFromObject(targetObject);

    if (box.isEmpty()) {
      console.warn('CameraManager: Target object has no geometry to focus on.');
      return;
    }

    const newTarget = new THREE.Vector3();
    box.getCenter(newTarget);
    newTarget.y += this.verticalOffset;

    // Keep the same offset (angle and distance) from the target
    const offset = this.camera.position.clone().sub(this.controls.target);
    const newCamPos = newTarget.clone().add(offset);

    // Use TWEEN to animate
    new TWEEN.Tween(this.camera.position)
      .to(newCamPos, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onStart(() => {
        this.controls.enabled = false;
      })
      .start();

    new TWEEN.Tween(this.controls.target)
      .to(newTarget, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onComplete(() => {
        this.controls.enabled = true;
      })
      .start();
  }

    /**
   * Animates camera to frame a bounding box, zooming out or in as needed.
   * @param {THREE.Box3} box The box to frame.
   */
  fitCameraToBox(box) {
    if (!box || box.isEmpty()) {
      console.warn('CameraManager: fitCameraToBox called with invalid box.');
      return;
    }

    const PADDING = 1.1; // 10% padding

    const newTarget = box.getCenter(new THREE.Vector3());
    newTarget.y += this.verticalOffset;
    const boxSize = box.getSize(new THREE.Vector3());

    // Get the current camera direction
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();

    // Calculate distance needed to fit the box
    const fov = this.camera.fov * (Math.PI / 180);
    const horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect);
    
    // Calculate distance based on both height and width
    const distHeight = boxSize.y / (2 * Math.tan(fov / 2));
    const distWidth = boxSize.x / (2 * Math.tan(horizontalFov / 2));
    
    // Use the max distance, add padding, and ensure we don't get stuck in the model
    const newDistance = PADDING * Math.max(distHeight, distWidth, boxSize.z);
    
    const newCamPos = newTarget.clone().add(direction.multiplyScalar(newDistance));

    // Animate
    new TWEEN.Tween(this.camera.position)
      .to(newCamPos, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onStart(() => { this.controls.enabled = false; })
      .start();

    new TWEEN.Tween(this.controls.target)
      .to(newTarget, ANIMATION_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onComplete(() => { this.controls.enabled = true; })
      .start();
  }
}
