import * as THREE from 'three';
import { PinFactory } from './PinFactory.js'; // Import the new factory

export class InteractionManager extends THREE.EventDispatcher {
    constructor(camera, scene, canvas) {
        super();
        this.camera = camera;
        this.scene = scene;
        this.canvas = canvas;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.interactiveObjects = [];
        this.labelSprites = [];
        this.blockingMeshes = [];
        this.pinFactory = null;

        this._onPointerDown = this._onPointerDown.bind(this);
    }

    async init() {
        this.pinFactory = new PinFactory();
        await this.pinFactory.loadAssets(); // Pre-load assets
        this.canvas.addEventListener('pointerdown', this._onPointerDown);
    }

    _createPins(pins) {
        pins.forEach(pinData => {
            // Use the factory to create the pin and label
            const { pinSprite, labelSprite } = this.pinFactory.createPinAndLabel(pinData);

            this.scene.add(pinSprite);
            this.interactiveObjects.push(pinSprite);

            this.scene.add(labelSprite);
            this.labelSprites.push(labelSprite);
        });
    }

    changePinColor(pinId, hexColor) {
        const sprite = this.interactiveObjects.find(s => s.userData.id === pinId);
        if (!sprite) return;
        sprite.material.color.set(hexColor);
    }

    promptPinColor(pinId) {
        const hex = window.prompt(`Enter a hex color for pin ${pinId} (e.g. #ff0000):`, '#ffffff');
        if (hex) {
            this.changePinColor(pinId, hex);
        }
    }

    _onPointerDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const pinHits = this.raycaster.intersectObjects(this.interactiveObjects, true);
        if (pinHits.length === 0) return;

        const wallHits = this.blockingMeshes.length
            ? this.raycaster.intersectObjects(this.blockingMeshes, true)
            : [];

        const pinDist = pinHits[0].distance;
        const wallDist = wallHits.length ? wallHits[0].distance : Infinity;
        if (wallDist < pinDist) return;

        const sprite = pinHits[0].object;
        this.dispatchEvent({
            type: 'pinClick',
            pin: sprite,
            pinId: sprite.userData.id,
            event
        });
    }

    filterPins(floorLevel) {
        this.interactiveObjects.forEach(sprite => {
            // Show all for the top level (2), otherwise match the floor level
            sprite.visible = (floorLevel === 2) || (sprite.userData.floorLevel === floorLevel);
        });
        this.labelSprites.forEach(label => {
            const id = label.name.replace(/_label$/, '');
            const sprite = this.interactiveObjects.find(s => s.userData.id === id);
            label.visible = sprite ? sprite.visible : false;
        });
    }

    dispose() {
        this.canvas.removeEventListener('pointerdown', this._onPointerDown);
        // Add disposal for factory-created objects if necessary
    }
}