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
import { UFCIMAPI } from './UFCIMAPI.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

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
        this._uiControlsEnabled = false;
        this.api = null;
        this.debugGui = null;

        // Bind 'this' to methods
        this.animate = this.animate.bind(this);
        this._onResize = this._onResize.bind(this);
    }

    getAPI() {
        return this.api?.getAPI?.();
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
            this.uiManager?.setControlsEnabled?.(this._uiControlsEnabled);
            this.api = new UFCIMAPI({
                modelManager: this.modelManager,
                interactionManager: this.interactionManager,
                cameraManager: this.cameraManager,
                uiManager: this.uiManager,
                popupManager: this.popupManager,
            });
        } catch (error) {
            console.error('failed to init models from manifest:', error);
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

    _createDebugMenu() {
        if (this.debugGui) {
            this.debugGui.destroy();
        }
        this.debugGui = new GUI({ title: 'Debug', closeFolders: true });

        const togglesFolder = this.debugGui.addFolder('Toggles');
        togglesFolder.add(this, 'enableStats').name('Stats').onChange((value) => {
            if (value) {
                this._createStatsPanels();
                this._setStatsVisibility(true);
            } else {
                this._setStatsVisibility(false);
            }
        });
        togglesFolder.add(this, 'usePostprocessing').name('Post-processing');
        togglesFolder.add(this, '_uiControlsEnabled').name('UI Controls').onChange((v) => {
            this.uiManager?.setControlsEnabled?.(v);
        });
        togglesFolder.close();

        const cameraFolder = this.debugGui.addFolder('Camera');
        const cameraActions = {
            copy: () => {
                const data = {
                    position: this.camera.position.toArray(),
                    rotation: [this.camera.rotation.x, this.camera.rotation.y, this.camera.rotation.z],
                    quaternion: this.camera.quaternion.toArray(),
                    target: this.controls.target.toArray(),
                    fov: this.camera.fov,
                    near: this.camera.near,
                    far: this.camera.far
                };
                const json = JSON.stringify(data, null, 2);
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(json);
                } else {
                    window.prompt('Copy camera JSON:', json);
                }
            },
            log: () => {
                console.log('CAMERA DEBUG:', {
                    position: this.camera.position.clone(),
                    rotation: this.camera.rotation.clone(),
                    quaternion: this.camera.quaternion.clone(),
                    target: this.controls.target.clone(),
                    fov: this.camera.fov,
                    near: this.camera.near,
                    far: this.camera.far
                });
            }
        };
        cameraFolder.add(cameraActions, 'copy').name('Copy camera');
        cameraFolder.add(cameraActions, 'log').name('Log camera');
        cameraFolder.close();
        this.debugGui.close();
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
    
    dispose() {
        window.removeEventListener('resize', this._onResize);
        this.interactionManager.dispose();
        this.popupManager.dispose();
        if (this.debugGui) {
            this.debugGui.destroy();
            this.debugGui = null;
        }
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
}
