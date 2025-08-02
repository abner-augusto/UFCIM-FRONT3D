import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';

import { World } from './World.js';
import { ModelManager } from './ModelManager.js';
import { UIManager } from './UIManager.js';
import { InteractionManager } from './InteractionManager.js';

export class App {
    constructor(canvas) {
        this.canvas = canvas;

        // Core Three.js components
        this.scene = new THREE.Scene();
        this.camera = this._createCamera();
        this.renderer = this._createRenderer();
        this.controls = this._createControls();

        // App components
        this.world = new World(this.scene);
        this.modelManager = new ModelManager(this.scene);
        this.uiManager = new UIManager();
        this.interactionManager = new InteractionManager(this.camera, this.scene, this.canvas);

        // Bind 'this' to methods that are used as callbacks
        this.animate = this.animate.bind(this);
        this._onResize = this._onResize.bind(this);
    }

    async init() {
        this.world.setup();
        
        // Listen for pin clicks from the interaction manager
        this.interactionManager.addEventListener('pinClick', (e) => {
            this.uiManager.showPopup(e.pin, e.event, this.camera, this.controls);
        });
        
        this.interactionManager.init();

        try {
            await this.modelManager.loadAll();
            this.uiManager.createFloorUI(this.modelManager);
        } catch (error) {
            console.error("Failed to load models:", error);
        }

        window.addEventListener('resize', this._onResize);
        this.animate();
    }
    
    _createCamera() {
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(30, 20, 30);
        this.scene.add(camera);
        return camera;
    }

    _createRenderer() {
        const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0xeeeeee);
        return renderer;
    }

    _createControls() {
        const controls = new OrbitControls(this.camera, this.canvas);
        controls.enableDamping = true;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI / 2;
        controls.maxDistance = 100;
        controls.minDistance = 30;
        controls.target.set(0, 0, 0);
        controls.update();
        return controls;
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        TWEEN.update();
        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
}