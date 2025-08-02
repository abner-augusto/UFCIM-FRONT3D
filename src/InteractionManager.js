import * as THREE from 'three';
import { PIN_POSITIONS, PIN_ASSET_PATH } from './config.js';

export class InteractionManager extends THREE.EventDispatcher {
    constructor(camera, scene, canvas) {
        super();
        this.camera = camera;
        this.scene = scene;
        this.canvas = canvas;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.interactiveObjects = [];

        this._onPointerDown = this._onPointerDown.bind(this);
    }

    init() {
        this._createPins();
        this.canvas.addEventListener('pointerdown', this._onPointerDown);
    }

    _createPins() {
        const spriteTexture = new THREE.TextureLoader().load(PIN_ASSET_PATH);
        
        // Use positions from config file
        PIN_POSITIONS.map(p => new THREE.Vector3(p.x, p.y, p.z)).forEach(pos => {
            const spriteMaterial = new THREE.SpriteMaterial({ map: spriteTexture, depthTest: false });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(pos);
            sprite.scale.set(2, 2, 1);
            this.scene.add(sprite);
            this.interactiveObjects.push(sprite);
        });
    }

    _onPointerDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

        if (intersects.length > 0) {
            this.dispatchEvent({ type: 'pinClick', pin: intersects[0].object, event });
        }
    }

    dispose() {
        this.canvas.removeEventListener('pointerdown', this._onPointerDown);
        // Clear interactive objects and remove them from the scene if needed
    }
}