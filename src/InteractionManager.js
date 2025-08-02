import * as THREE from 'three';
import { PIN_ASSET_PATH } from './config.js';

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
        this.canvas.addEventListener('pointerdown', this._onPointerDown);
    }

    _createPins(pins) {
        const spriteTexture = new THREE.TextureLoader().load(PIN_ASSET_PATH);
        
        pins.forEach(pin => {
            const material = new THREE.SpriteMaterial({ map: spriteTexture, depthTest: true, depthWrite: true,  });
            const sprite = new THREE.Sprite(material);
            sprite.position.copy(pin.position);
            sprite.scale.set(2, 2, 1);
            sprite.name = pin.id;
            sprite.userData.floorLevel = pin.floorLevel;
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
            const sprite = intersects[0].object;
            this.dispatchEvent({ type: 'pinClick', pin: sprite, pinId: sprite.userData.id, event });
        }

    }

    filterPins(floorLevel) {
    this.interactiveObjects.forEach(sprite => {
        // floorLevel===2 means “show all”
        sprite.visible = (floorLevel === 2) || (sprite.userData.floorLevel === floorLevel);
    });
    }

    dispose() {
        this.canvas.removeEventListener('pointerdown', this._onPointerDown);
        // Clear interactive objects and remove them from the scene if needed
    }
}