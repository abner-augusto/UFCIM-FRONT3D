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
import { PopupManager } from './PopupManager.js';
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
        this.usePostprocessing = true;
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
            this.cameraManager
            );

        // Bind 'this' to methods
        this.animate = this.animate.bind(this);
        this._onResize = this._onResize.bind(this);
    }

    async init() {
        this.world.setup();

        this.interactionManager.addEventListener('pinClick', (e) => {
            this.popupManager.show(e.pin, e.event);
        });
        
        await this.interactionManager.init();

        this.modelManager.onPinsLoaded = (pins) => {
        this.interactionManager._createPins(pins);
        };
      
        try {
            await this.modelManager.initFromManifest();

            await this.modelManager.showAllBlocks();

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

        toggleButton.onclick = () => {
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        };

        panel.appendChild(statsToggle);
        panel.appendChild(postToggle);
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
    
    dispose() {
        window.removeEventListener('resize', this._onResize);
        this.interactionManager.dispose();
        this.popupManager.dispose();
    }
}
