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
        this.clickTargets = [];
        this.blockingMeshes = [];
        this.pinFactory = null;
        this.pinGroups = new Map();
        this.activeFloorByBuilding = new Map();
        this._interactionsEnabled = true;

        this._onPointerDown = this._onPointerDown.bind(this);
    }

    async init() {
        this.pinFactory = new PinFactory();
        await this.pinFactory.loadAssets(); // Pre-load assets
        this.canvas.addEventListener('pointerdown', this._onPointerDown);
    }

    _getOrCreateBuildingPinMap(building) {
        if (!this.pinGroups.has(building)) {
            this.pinGroups.set(building, new Map());
        }
        return this.pinGroups.get(building);
    }

    _shouldDisplayPin(building, floorLevel, parentVisible) {
        const activeFloor = this.activeFloorByBuilding.get(building);
        if (activeFloor === null) return false;
        if (activeFloor === undefined) return parentVisible;
        return parentVisible && activeFloor === floorLevel;
    }

    _updateGroupVisibility(building, group) {
        const shouldDisplay = this._shouldDisplayPin(building, group.level, group.parentVisible);
        group.pins.forEach((sprite) => {
            const opensPopup = sprite.userData?.opensPopup !== false;
            sprite.visible = shouldDisplay && opensPopup;
        });
        group.labels.forEach((sprite) => {
            sprite.visible = shouldDisplay;
        });
    }

    _updatePinsForBuilding(building) {
        const buildingMap = this.pinGroups.get(building);
        if (!buildingMap) return;
        buildingMap.forEach((group) => this._updateGroupVisibility(building, group));
    }

    addPins(pins) {
        if (!Array.isArray(pins) || pins.length === 0) return;

        pins.forEach((pinData) => {
            const position = pinData.position instanceof THREE.Vector3
                ? pinData.position.clone()
                : new THREE.Vector3(...(pinData.position ?? [0, 0, 0]));
            const parent = pinData.parent ?? this.scene;

            const preparedData = {
                ...pinData,
                position,
                opensPopup: pinData.opensPopup !== false,
            };
            const { pinSprite, labelSprite } = this.pinFactory.createPinAndLabel(preparedData);

            parent.add(pinSprite);
            parent.add(labelSprite);

            this.interactiveObjects.push(pinSprite);
            this.labelSprites.push(labelSprite);
            labelSprite.userData.pinSprite = pinSprite;
            // Only make the pin sprite a click target if it opens a popup.
            if (preparedData.opensPopup !== false) {
                this.clickTargets.push(pinSprite);
            }
            this.clickTargets.push(labelSprite);

            const building = pinData.building;
            const floorLevel = pinData.floorLevel;

            const buildingMap = this._getOrCreateBuildingPinMap(building);
            const floorGroup = buildingMap.get(floorLevel) ?? {
                pins: [],
                labels: [],
                parentVisible: parent.visible,
                level: floorLevel,
            };
            floorGroup.parentVisible = parent.visible;
            floorGroup.pins.push(pinSprite);
            floorGroup.labels.push(labelSprite);
            buildingMap.set(floorLevel, floorGroup);

            // Ensure initial visibility respects opensPopup flag for the pin sprite
            this._updateGroupVisibility(building, floorGroup);
        });
    }

    _createPins(pins) {
        this.addPins(pins);
    }

    setPinsVisibility(building, floorLevel, visible) {
        const buildingMap = this.pinGroups.get(building);
        if (!buildingMap) return;
        const group = buildingMap.get(floorLevel);
        if (!group) return;

        group.parentVisible = visible;
        this._updateGroupVisibility(building, group);
    }

    resetPinsForBuilding(building) {
        this.activeFloorByBuilding.set(building, null);
        this._updatePinsForBuilding(building);
    }

    activateFloorPins(building, floorLevel) {
        this.activeFloorByBuilding.set(building, floorLevel);
        this._updatePinsForBuilding(building);
    }

    clearFloorSelections(hidePins = false) {
        this.activeFloorByBuilding.clear();
        if (hidePins) {
            this.pinGroups.forEach((_, building) => {
                this.activeFloorByBuilding.set(building, null);
                this._updatePinsForBuilding(building);
            });
            return;
        }
        this.pinGroups.forEach((_, building) => this._updatePinsForBuilding(building));
    }

    getActiveFloor(building) {
        return this.activeFloorByBuilding.get(building);
    }

    getAllPins() {
        return this.interactiveObjects.filter(obj => !obj.name.endsWith('_label'));
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

    _isWorldVisible(object) {
        let current = object;
        while (current) {
            if (!current.visible) return false;
            current = current.parent;
        }
        return true;
    }

    _onPointerDown(event) {
        if (!this._interactionsEnabled) return;
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const visibleTargets = this.clickTargets.filter((obj) => this._isWorldVisible(obj));
        const pinHits = this.raycaster.intersectObjects(visibleTargets, true);
        if (pinHits.length === 0) return;

        const wallHits = this.blockingMeshes.length
            ? this.raycaster.intersectObjects(this.blockingMeshes, true)
            : [];

        const pinDist = pinHits[0].distance;
        const wallDist = wallHits.length ? wallHits[0].distance : Infinity;
        if (wallDist < pinDist) return;

        const hitObject = pinHits[0].object;
        const sprite = hitObject.userData?.pinSprite ?? hitObject;
        this.dispatchEvent({
            type: 'pinClick',
            pin: sprite,
            pinId: sprite.userData.id,
            event
        });
    }

    filterPins(floorLevel) {
        if (floorLevel === 2 || floorLevel === undefined || floorLevel === null) {
            this.clearFloorSelections();
            return;
        }

        this.pinGroups.forEach((_, building) => {
            this.activateFloorPins(building, floorLevel);
        });
    }

    dispose() {
        this.canvas.removeEventListener('pointerdown', this._onPointerDown);
        // Add disposal for factory-created objects if necessary
    }

    setInteractionsEnabled(enabled) {
        this._interactionsEnabled = !!enabled;
    }
}
