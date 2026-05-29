import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';

import { World } from './World.js';
import { ModelManager } from './ModelManager.js';
import { UIManager } from './UIManager.js';
import { InteractionManager } from './InteractionManager.js';
import { PopupManager } from './PopUpManager.js';
import { CameraManager } from './CameraManager.js';
import { CAMERA_CONFIG, CONTROLS_CONFIG } from './config.js';
import { logger } from '../utils/logger.ts';

export class App {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderConfig = this._getPerformanceConfiguration();

        // Core Three.js components
        this.scene = new THREE.Scene();
        this.camera = this._createCamera();
        
        // Create the renderer first, then set its initial size.
        this.renderer = this._createRenderer(); 
        this._updateRendererSize();

        this.controls = this._createControls();
        this.cameraManager = new CameraManager(this.camera, this.controls);
        this.devTools = null;

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

    async init() {
        this.world.setup();
        this._setupEventListeners();

        const modelsLoaded = await this._loadModels();
        if (modelsLoaded) {
            await this._initializeUI();
        }

        this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
        if (import.meta.env.DEV) {
            const { installDebugTools } = await import('./debugTools.js');
            installDebugTools(this);
        }
        window.addEventListener('resize', this._onResize);
        this.animate();
    }


    _setupEventListeners() {
        this.interactionManager.addEventListener('pinClick', (e) => {
            this.popupManager.show(e.pin, e.event);
        });
    }

    async _loadModels() {
        // Parallelize initial asset/manifest loading
        await Promise.all([
            this.interactionManager.init(),
            this.modelManager.initFromManifest()
        ]);

        this.modelManager.onPinsLoaded = (pins) => {
            this.interactionManager.addPins(pins);
        };
        this.modelManager.onPinsVisibilityChange = (building, floor, visible) => {
            this.interactionManager.setPinsVisibility(building, floor, visible);
        };
      
        try {
            // Manifest already loaded in the Promise.all above; callbacks are now
            // registered, so go straight to loading the floors.
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
        const renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: this.renderConfig.antialias,
            powerPreference: 'high-performance',
        });
        renderer.setClearColor(0xeeeeee);
        return renderer;
    }

    _getPerformanceConfiguration() {
        const dpr = window.devicePixelRatio || 1;
        const cores = navigator.hardwareConcurrency || 4;
        const memory = navigator.deviceMemory || 8;
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const screenArea = window.innerWidth * window.innerHeight;

        // Heuristics for performance tiering
        const isLowPowerHardware = cores <= 4 || (navigator.deviceMemory && memory <= 4);
        const isHighResMobile = isMobile && dpr >= 2;
        const isLowResScreen = screenArea < 1024 * 768;

        // 1. Determine Anti-Aliasing
        // Disable AA if low power, or if it's a low-res mobile device
        const antialias = !isLowPowerHardware && !(isMobile && isLowResScreen);

        // 2. Determine Smart Pixel Ratio
        let targetDPR = dpr;
        
        if (isLowPowerHardware) {
            targetDPR = 1.0;
        } else if (isHighResMobile) {
            // High-res mobile: 1.5 is usually the sweet spot for performance vs quality
            targetDPR = Math.min(dpr, 1.5);
        } else if (isMobile) {
            targetDPR = Math.min(dpr, 1.5);
        } else {
            // Desktop scaling based on screen size
            if (screenArea > 2560 * 1440) { // 1440p+
                targetDPR = Math.min(dpr, 1.25);
            } else if (screenArea > 1920 * 1080) { // 1080p+
                targetDPR = Math.min(dpr, 1.5);
            } else {
                targetDPR = Math.min(dpr, 2.0);
            }
        }

        return { targetDPR, antialias };
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
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
        };

        controls.update();
        return controls;
    }

    _updateRendererSize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this.renderConfig.targetDPR);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this.renderConfig.targetDPR);
    }

    animate() {
        this.devTools?.beginFrame?.();

        this._animationFrameId = requestAnimationFrame(this.animate);
        this.controls.update();

        // Enforce minimum camera height
        if (this.camera.position.y < CONTROLS_CONFIG.minCameraHeight) {
            this.camera.position.y = CONTROLS_CONFIG.minCameraHeight;
        }

        TWEEN.update();

        this.renderer.render(this.scene, this.camera);
        this.devTools?.endFrame?.();
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

        this.devTools?.dispose?.();
        this.devTools = null;

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
