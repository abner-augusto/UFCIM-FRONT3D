import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';
import Stats from 'stats.js';

// Imports for post-processing
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { CustomOutlinePass } from './postprocessing/CustomOutlinePass.js';

import { World } from './World.js';
import { ModelManager } from './ModelManager.js';
import { UIManager } from './UIManager.js';
import { InteractionManager } from './InteractionManager.js';
import { PopupManager } from './PopUpManager.js';
import { CameraManager } from './CameraManager.js';
import { CAMERA_CONFIG, CONTROLS_CONFIG } from './config.js';

export class App {
    constructor(canvas) {
        this.canvas = canvas;

        // Core Three.js components
        this.scene = new THREE.Scene();
        this.camera = this._createCamera();
        
        // Create the renderer first, then set its initial size.
        this.renderer = this._createRenderer(); 
        this._updateRendererSize();

        this.controls = this._createControls();
        this.cameraManager = new CameraManager(this.camera, this.controls);
        this.enableStats = true;

        // App Composer and Post-processing
        this.usePostprocessing = false;
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.outlinePass = new CustomOutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.scene,
            this.camera
        );
        // configure outline pass to only see meshes marked on layer 1
        this.outlinePass.outlineLayer = 1;
        this.composer.addPass(this.outlinePass);

        // App components
        this.world = new World(this.scene);
        this.modelManager = new ModelManager(this.scene);
        this.uiManager = new UIManager();
        this.interactionManager = new InteractionManager(this.camera, this.scene, this.canvas);
        this.popupManager = new PopupManager(
            this.camera,
            this.controls,
            this.uiManager,
            this.cameraManager,
            this.interactionManager
            );

        // Bind 'this' to methods
        this.animate = this.animate.bind(this);
        this._onResize = this._onResize.bind(this);
    }

    getAPI() {
        return {
            focusOnPin: (pinId, options) => this._apiFocusOnPin(pinId, options),
            focusOnFloor: (buildingId, floorLevel, options) =>
                this._apiFocusOnFloor(buildingId, floorLevel, options),
            focusOnBuilding: (buildingId, options) =>
                this._apiFocusOnBuilding(buildingId, options),
            setPinColor: (pinId, color) => this._apiSetPinColor(pinId, color),
            setPinColorPreset: (pinId, presetIndex) =>
                this._apiSetPinColorPreset(pinId, presetIndex),
            resetCamera: () => this.cameraManager?.resetToDefaultState?.(),
        };
    }

    async init() {
        this.world.setup();

        this.interactionManager.addEventListener('pinClick', (e) => {
            this.popupManager.show(e.pin, e.event);
        });
        
        await this.interactionManager.init();

        this.modelManager.onPinsLoaded = (pins) => {
            this.interactionManager.addPins(pins);
        };
        this.modelManager.onPinsVisibilityChange = (building, floor, visible) => {
            this.interactionManager.setPinsVisibility(building, floor, visible);
        };
      
        try {
            await this.modelManager.initFromManifest();

            await this.modelManager.showAllBlocks();
            this.interactionManager.clearFloorSelections(true);

            this.uiManager.createFloorUI(
                this.modelManager,
                this.interactionManager,
                this.cameraManager
            );
        } catch (error) {
            console.error('failed to init models from manifest:', error);
        }

        this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();

        this.statsPanels = [];

        if (this.enableStats) {
            for (let i = 0; i < 3; i++) {
            const panel = new Stats();
            panel.showPanel(i); // 0: fps, 1: ms, 2: mb
            panel.dom.style.cssText = `
                position: absolute;
                top: 0;
                left: ${i * 80}px;
                z-index: 10000;
            `;
            document.body.appendChild(panel.dom);
            this.statsPanels.push(panel);
            }
        }
        this._createDebugMenu();
        this.controls.addEventListener('change', () => this._updateCameraDebugUI());
        window.addEventListener('resize', this._onResize);
        this.animate();
    }

    _createCamera() {
        const camera = new THREE.PerspectiveCamera(
            CAMERA_CONFIG.fov,
            window.innerWidth / window.innerHeight,
            CAMERA_CONFIG.near,
            CAMERA_CONFIG.far
        );
        camera.position.set(CAMERA_CONFIG.position.x, CAMERA_CONFIG.position.y, CAMERA_CONFIG.position.z);
        this.scene.add(camera);
        return camera;
    }

    _createRenderer() {
        const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        renderer.setClearColor(0xeeeeee);
        return renderer;
    }

    _createControls() {
        const controls = new OrbitControls(this.camera, this.canvas);
        controls.enableDamping = CONTROLS_CONFIG.enableDamping;
        controls.minPolarAngle = CONTROLS_CONFIG.polarAngle.min;
        controls.maxPolarAngle = CONTROLS_CONFIG.polarAngle.max;
        controls.maxDistance = CONTROLS_CONFIG.distance.max;
        controls.minDistance = CONTROLS_CONFIG.distance.min;
        controls.target.set(CONTROLS_CONFIG.target.x, CONTROLS_CONFIG.target.y, CONTROLS_CONFIG.target.z);
        controls.update();
        return controls;
    }

    _updateCameraDebugUI() {
        if (!this._camUI) return;
        const fmt = (v) => `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`;
        this._camUI.pos.textContent = `pos: ${fmt(this.camera.position)}`;
        this._camUI.rot.textContent = `rot (rad): ${this.camera.rotation.x.toFixed(3)}, ${this.camera.rotation.y.toFixed(3)}, ${this.camera.rotation.z.toFixed(3)}`;
        this._camUI.tgt.textContent = `target: ${fmt(this.controls.target)}`;
        this._camUI.info.textContent = `fov: ${this.camera.fov} near: ${this.camera.near} far: ${this.camera.far}`;
    }

    _createDebugMenu() {
        const container = document.createElement('div');
        container.id = 'debug-menu-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            font: 12px sans-serif;
        `;

        const toggleButton = document.createElement('button');
        toggleButton.textContent = '☰';
        toggleButton.style.cssText = `
            background: #222;
            color: white;
            border: none;
            padding: 6px 10px;
            cursor: pointer;
            font-size: 16px;
            border-bottom-left-radius: 4px;
        `;

        const panel = document.createElement('div');
        panel.style.cssText = `
            background: rgba(0, 0, 0, 0.85);
            color: #fff;
            padding: 8px;
            display: none;
            flex-direction: column;
            gap: 6px;
            border-bottom-left-radius: 6px;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
            margin-top: 4px;
            min-width: 240px;
        `;

        const statsToggle = document.createElement('button');
        statsToggle.textContent = 'Stats';
        statsToggle.style.cssText = 'padding: 4px; cursor: pointer;';
        statsToggle.onclick = () => {
            this.enableStats = !this.enableStats;
            if (this.statsPanels) {
                this.statsPanels.forEach(panel => {
                    panel.dom.style.display = this.enableStats ? 'block' : 'none';
                });
            }
        };

        const postToggle = document.createElement('button');
        postToggle.textContent = `Post: ${this.usePostprocessing ? 'ON' : 'OFF'}`;
        postToggle.style.cssText = 'padding: 4px; cursor: pointer;';
        postToggle.onclick = () => {
            this.usePostprocessing = !this.usePostprocessing;
            postToggle.textContent = `Post: ${this.usePostprocessing ? 'ON' : 'OFF'}`;
        };

        // --- new: camera debug block ---
        const camBox = document.createElement('div');
        camBox.style.cssText = `
            border-top: 1px solid rgba(255,255,255,0.15);
            margin-top: 6px;
            padding-top: 6px;
            font-family: monospace;
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
        const camTitle = document.createElement('div');
        camTitle.innerHTML = '<strong>Camera</strong>';

        const pos = document.createElement('div'); pos.textContent = 'pos: -';
        const rot = document.createElement('div'); rot.textContent = 'rot: -';
        const tgt = document.createElement('div'); tgt.textContent = 'target: -';
        const info = document.createElement('div'); info.textContent = 'fov/near/far: -';

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:6px; margin-top:4px;';
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        copyBtn.style.cssText = 'flex:1; padding:4px; cursor:pointer;';
        const logBtn = document.createElement('button');
        logBtn.textContent = 'Log';
        logBtn.style.cssText = 'flex:1; padding:4px; cursor:pointer;';

        copyBtn.onclick = () => {
            const data = {
                position: this.camera.position.toArray(),
                rotation: [this.camera.rotation.x, this.camera.rotation.y, this.camera.rotation.z],
                quaternion: this.camera.quaternion.toArray(),
                target: this.controls.target.toArray(),
                fov: this.camera.fov, near: this.camera.near, far: this.camera.far
            };
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            } else {
                // fallback prompt for older browsers
                window.prompt('Copy camera JSON:', JSON.stringify(data));
            }
        };

        logBtn.onclick = () => {
            console.log('CAMERA DEBUG:', {
                position: this.camera.position.clone(),
                rotation: this.camera.rotation.clone(),
                quaternion: this.camera.quaternion.clone(),
                target: this.controls.target.clone(),
                fov: this.camera.fov,
                near: this.camera.near,
                far: this.camera.far
            });
        };

        btnRow.appendChild(copyBtn);
        btnRow.appendChild(logBtn);

        camBox.appendChild(camTitle);
        camBox.appendChild(pos);
        camBox.appendChild(rot);
        camBox.appendChild(tgt);
        camBox.appendChild(info);
        camBox.appendChild(btnRow);

        // store refs for the update loop
        this._camUI = { pos, rot, tgt, info };

        toggleButton.onclick = () => {
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        };

        panel.appendChild(statsToggle);
        panel.appendChild(postToggle);
        panel.appendChild(camBox);
        container.appendChild(toggleButton);
        container.appendChild(panel);
        document.body.appendChild(container);
    }

    _updateRendererSize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    animate() {
        if (this.enableStats && this.statsPanels) {
            this.statsPanels.forEach(p => p.begin());
        }

        requestAnimationFrame(this.animate);
        this.controls.update();
        TWEEN.update();

        if (this.usePostprocessing) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        if (this.enableStats && this.statsPanels) {
            this.statsPanels.forEach(p => p.end());
        }
    }


    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        this.outlinePass.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
    }

    _closePopupIfOpen(options = {}) {
        if (this.popupManager?._currentPopup) {
            this.popupManager.close({ restoreCamera: false, ...options });
        }
    }

    async _focusPinInternal(pin, options = {}) {
        const { openPopup = false } = options;

        if (!pin) {
            console.warn('UFCIM API: focusOnPin called with invalid pin');
            return false;
        }

        this._closePopupIfOpen({ restoreCamera: false });

        const building = pin.userData.building;
        const floorLevel = pin.userData.floorLevel;

        if (building && typeof floorLevel === 'number') {
            for (const b of Object.keys(this.modelManager.manifest || {})) {
                this.modelManager.enableBuilding(b, false);
            }
            this.modelManager.enableBuilding(building, true);

            if (this.modelManager.setFloorLevel) {
                await this.modelManager.setFloorLevel(building, floorLevel);
            }

            if (this.interactionManager.activateFloorPins) {
                this.interactionManager.activateFloorPins(building, floorLevel);
            }

            if (this.interactionManager.blockingMeshes !== undefined &&
                this.modelManager.getAllMeshes) {
                this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
            }

            if (this.modelManager.focusBuilding) {
                this.modelManager.focusBuilding(building);
            }

            this.uiManager?._updateBuildingFocus?.(building);
            this.uiManager?._renderFloorButtons?.(building);
            this.uiManager?._highlightActiveFloors?.(floorLevel);
        }

        if (openPopup && this.popupManager?.show) {
            await this.popupManager.show(pin, null);
        } else if (this.cameraManager.focusOnPin) {
            this.cameraManager.focusOnPin(pin);
        } else {
            console.warn('UFCIM API: cameraManager.focusOnPin not implemented');
        }

        return true;
    }

    async _apiFocusOnPin(pinId, options = {}) {
        const { openPopup = false } = options;

        if (!this.interactionManager || !this.modelManager || !this.cameraManager) {
            console.warn('UFCIM API: focusOnPin called before app initialized');
            return false;
        }

        const allPins = this.interactionManager.getAllPins
            ? this.interactionManager.getAllPins()
            : [];

        const pin = allPins.find((p) => p.userData?.id === pinId);
        if (!pin) {
            console.warn(`UFCIM API: pin not found: ${pinId}`);
            return false;
        }

        return this._focusPinInternal(pin, { openPopup });
    }

    async _apiFocusOnFloor(buildingId, floorLevel, options = {}) {
        if (!this.modelManager || !this.interactionManager || !this.cameraManager) {
            console.warn('UFCIM API: focusOnFloor called before app initialized');
            return false;
        }

        if (!this.modelManager.entries?.has(buildingId)) {
            console.warn(`UFCIM API: building not found: ${buildingId}`);
            return false;
        }

        const floorsMap = this.modelManager.entries.get(buildingId);
        if (!floorsMap?.has(floorLevel)) {
            console.warn(
                `UFCIM API: floor ${floorLevel} not found for building ${buildingId}`
            );
            return false;
        }

        this._closePopupIfOpen({ restoreCamera: false });

        for (const b of Object.keys(this.modelManager.manifest || {})) {
            this.modelManager.enableBuilding(b, false);
        }
        this.modelManager.enableBuilding(buildingId, true);

        if (this.modelManager.setFloorLevel) {
            await this.modelManager.setFloorLevel(buildingId, floorLevel);
        }

        if (this.interactionManager.activateFloorPins) {
            this.interactionManager.activateFloorPins(buildingId, floorLevel);
        }

        if (this.interactionManager.blockingMeshes !== undefined &&
            this.modelManager.getAllMeshes) {
            this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
        }

        if (this.modelManager.focusBuilding) {
            this.modelManager.focusBuilding(buildingId);
        }

        this.uiManager?._updateBuildingFocus?.(buildingId);
        this.uiManager?._renderFloorButtons?.(buildingId);
        this.uiManager?._highlightActiveFloors?.(floorLevel);

        const floorObj = this.modelManager.getFloorObject
            ? this.modelManager.getFloorObject(buildingId, floorLevel)
            : null;

        if (floorObj && this.cameraManager.focusOnObjectAtCurrentDistance) {
            this.cameraManager.focusOnObjectAtCurrentDistance(floorObj);
        } else if (this.modelManager.getBlockBoundingBox &&
                   this.cameraManager.fitCameraToBox) {
            const box = this.modelManager.getBlockBoundingBox(buildingId);
            if (!box.isEmpty()) {
                this.cameraManager.fitCameraToBox(box);
            }
        }

        return true;
    }

    async _apiFocusOnBuilding(buildingId, options = {}) {
        if (!this.modelManager || !this.cameraManager) {
            console.warn('UFCIM API: focusOnBuilding called before app initialized');
            return false;
        }

        if (!this.modelManager.entries?.has(buildingId)) {
            console.warn(`UFCIM API: building not found: ${buildingId}`);
            return false;
        }

        this._closePopupIfOpen({ restoreCamera: false });

        for (const b of Object.keys(this.modelManager.manifest || {})) {
            this.modelManager.enableBuilding(b, false);
        }
        this.modelManager.enableBuilding(buildingId, true);
        this.interactionManager?.clearFloorSelections?.(true);

        const floorsMap = this.modelManager.entries.get(buildingId);
        const floorIndices = floorsMap ? [...floorsMap.keys()] : [];
        if (floorIndices.length > 0 && this.modelManager.setFloorLevel) {
            const maxLevel = Math.max(...floorIndices);
            await this.modelManager.setFloorLevel(buildingId, maxLevel);
        }

        if (this.modelManager.getBlockBoundingBox &&
            this.cameraManager.fitCameraToBox) {
            const box = this.modelManager.getBlockBoundingBox(buildingId);
            if (!box.isEmpty()) {
                this.cameraManager.fitCameraToBox(box);
            }
        }

        if (this.modelManager.focusBuilding) {
            this.modelManager.focusBuilding(buildingId);
        }

        this.uiManager?._updateBuildingFocus?.(buildingId);
        this.uiManager?._renderFloorButtons?.(buildingId);

        return true;
    }

    _findPinById(pinId) {
        if (!this.interactionManager?.getAllPins) return null;
        const allPins = this.interactionManager.getAllPins();
        return allPins.find((p) => p.userData?.id === pinId) || null;
    }

    _applyPinColor(pin, color) {
        if (!pin || !this.interactionManager?.changePinColor) return false;
        this.interactionManager.changePinColor(pin.userData.id, color);
        return true;
    }

    _getPresetColor(presetIndex) {
        const presets = ['#00b050', '#f2c200', '#d32f2f']; // green, yellow, red
        return presets[presetIndex] ?? null;
    }

    _apiSetPinColor(pinId, color) {
        if (!this.interactionManager) {
            console.warn('UFCIM API: setPinColor called before app initialized');
            return false;
        }
        const pin = this._findPinById(pinId);
        if (!pin) {
            console.warn(`UFCIM API: pin not found: ${pinId}`);
            return false;
        }
        return this._applyPinColor(pin, color);
    }

    _apiSetPinColorPreset(pinId, presetIndex) {
        const color = this._getPresetColor(presetIndex);
        if (!color) {
            console.warn(`UFCIM API: invalid preset index ${presetIndex}`);
            return false;
        }
        return this._apiSetPinColor(pinId, color);
    }
    
    dispose() {
        window.removeEventListener('resize', this._onResize);
        this.interactionManager.dispose();
        this.popupManager.dispose();
    }
}
