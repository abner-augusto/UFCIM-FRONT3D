import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';
import Stats from 'stats.js';

import { World } from './World.js';
import { ModelManager } from './ModelManager.js';
import { UIManager } from './UIManager.js';
import { InteractionManager } from './InteractionManager.js';
import { PopupManager } from './PopUpManager.js';
import { CameraManager } from './CameraManager.js';
import { CAMERA_CONFIG, CONTROLS_CONFIG } from './config.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { logger } from '../utils/logger.ts';

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
        this.enableStats = false;

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
        this.debugGui = null;

        // Bind 'this' to methods
        this.animate = this.animate.bind(this);
        this._onResize = this._onResize.bind(this);
    }

    async init() {
        this.world.setup();
        this._setupEventListeners();

        const modelsLoaded = await this._loadModels();
        if (modelsLoaded) {
            await this._initializeUI();
        }

        this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();

        this.statsPanels = [];

        if (this.enableStats) {
            this._createStatsPanels();
        }
        this._createDebugMenu();
        window.addEventListener('resize', this._onResize);
        this.animate();
    }


    _setupEventListeners() {
        this.interactionManager.addEventListener('pinClick', (e) => {
            this.popupManager.show(e.pin, e.event);
        });
    }

    async _loadModels() {
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
            return true;
        } catch (error) {
            logger.error('failed to init models from manifest:', error);
            return false;
        }
    }

    async _initializeUI() {
        this.uiManager.createFloorUI(
            this.modelManager,
            this.interactionManager,
            this.cameraManager
        );
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
        
        controls.touches = {
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_ROTATE,
        };

        controls.update();
        return controls;
    }

    _createDebugMenu() {
        if (this.debugGui) {
            this.debugGui.destroy();
        }
        this.debugGui = new GUI({ title: 'Debug', closeFolders: true, width: 140 });

        // --- Stats toggle ---
        this.debugGui.add(this, 'enableStats').name('Stats').onChange((value) => {
            if (value) {
                this._createStatsPanels();
                this._setStatsVisibility(true);
            } else {
                this._setStatsVisibility(false);
            }
        });

        // --- Camera folder ---
        const cameraFolder = this.debugGui.addFolder('Câmera');
        const cameraActions = {
            copy: () => {
                const data = {
                    position: this.camera.position.toArray(),
                    target: this.controls.target.toArray(),
                    fov: this.camera.fov,
                };
                const json = JSON.stringify(data, null, 2);
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(json);
                } else {
                    window.prompt('Copy camera JSON:', json);
                }
            },
            log: () => {
                logger.log('[UFCIM Camera]', {
                    position: this.camera.position.clone(),
                    target: this.controls.target.clone(),
                    fov: this.camera.fov,
                });
            },
        };
        cameraFolder.add(cameraActions, 'copy').name('Copiar JSON');
        cameraFolder.add(cameraActions, 'log').name('Log console');
        cameraFolder.close();

        // --- Hide button ---
        this.debugGui.add({ hide: () => { this.debugGui.domElement.style.display = 'none'; } }, 'hide').name('Ocultar');

        // Start collapsed and position bottom-right, clear of the mobile bottom bar
        this.debugGui.close();
        const el = this.debugGui.domElement;
        el.style.position = 'fixed';
        el.style.bottom = 'calc(var(--bottom-bar-h, 0px) + var(--safe-bottom, 0px) + 12px)';
        el.style.right = '12px';
        el.style.top = 'auto';
        el.style.left = 'auto';
        el.style.opacity = '0.55';
        el.style.transition = 'opacity 0.2s ease';
        el.addEventListener('mouseenter', () => { el.style.opacity = '1'; });
        el.addEventListener('mouseleave', () => { el.style.opacity = '0.55'; });
    }

    _updateRendererSize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    _createStatsPanels() {
        if (this.statsPanels && this.statsPanels.length > 0) return;
        this.statsPanels = [];
        for (let i = 0; i < 3; i++) {
            const panel = new Stats();
            panel.showPanel(i); // 0: fps, 1: ms, 2: mb
            panel.dom.classList.add('stats-panel');
            panel.dom.style.left = `${i * 80}px`;
            panel.dom.style.display = 'block';
            document.body.appendChild(panel.dom);
            this.statsPanels.push(panel);
        }
    }

    _setStatsVisibility(show) {
        if (!this.statsPanels) return;
        this.statsPanels.forEach((panel) => {
            panel.dom.style.display = show ? 'block' : 'none';
        });
    }

    animate() {
        if (this.enableStats && this.statsPanels) {
            this.statsPanels.forEach(p => p.begin());
        }

        this._animationFrameId = requestAnimationFrame(this.animate);
        this.controls.update();
        TWEEN.update();

        this.renderer.render(this.scene, this.camera);
        if (this.enableStats && this.statsPanels) {
            this.statsPanels.forEach(p => p.end());
        }
    }

    dispose() {
        // Stop animation loop
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }

        // Remove resize listener
        window.removeEventListener('resize', this._onResize);

        // Dispose sub-managers
        this.popupManager?.dispose();
        this.interactionManager?.dispose();
        this.uiManager?.dispose?.();

        // Destroy debug GUI
        if (this.debugGui) {
            this.debugGui.destroy();
            this.debugGui = null;
        }

        // Remove stats panels
        if (this.statsPanels) {
            this.statsPanels.forEach((panel) => panel.dom.remove());
            this.statsPanels = [];
        }

        // Dispose all Three.js scene objects
        this.scene?.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                materials.forEach((m) => {
                    m.map?.dispose();
                    m.normalMap?.dispose();
                    m.roughnessMap?.dispose();
                    m.metalnessMap?.dispose();
                    m.dispose();
                });
            }
        });

        // Dispose controls
        this.controls?.dispose();

        // Dispose renderer (releases WebGL context)
        this.renderer?.dispose();
        this.renderer = null;

        // Clear scene
        while (this.scene?.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
    }
}
