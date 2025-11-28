export class UFCIMAPI {
    constructor({ modelManager, interactionManager, cameraManager, uiManager, popupManager }) {
        this.modelManager = modelManager;
        this.interactionManager = interactionManager;
        this.cameraManager = cameraManager;
        this.uiManager = uiManager;
        this.popupManager = popupManager;
    }

    getAPI() {
        return {
            focusOnPin: (pinId, options) => this.focusOnPin(pinId, options),
            focusOnFloor: (buildingId, floorLevel, options) =>
                this.focusOnFloor(buildingId, floorLevel, options),
            focusOnBuilding: (buildingId, options) =>
                this.focusOnBuilding(buildingId, options),
            setPinColor: (pinId, color) => this.setPinColor(pinId, color),
            setPinColorPreset: (pinId, presetIndex) =>
                this.setPinColorPreset(pinId, presetIndex),
            resetCamera: () => this.cameraManager?.resetToDefaultState?.(),
        };
    }

    _closePopupIfOpen(options = {}) {
        if (this.popupManager?._currentPopup) {
            this.popupManager.close({ restoreCamera: false, ...options });
        }
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

        this.cameraManager?.applyBlockFocusZoomLimits?.();

        if (openPopup && this.popupManager?.show) {
            await this.popupManager.show(pin, null);
        } else if (this.cameraManager.focusOnPin) {
            this.cameraManager.focusOnPin(pin);
        } else {
            console.warn('UFCIM API: cameraManager.focusOnPin not implemented');
        }

        return true;
    }

    async focusOnPin(pinId, options = {}) {
        const { openPopup = false } = options;

        if (!this.interactionManager || !this.modelManager || !this.cameraManager) {
            console.warn('UFCIM API: focusOnPin called before app initialized');
            return false;
        }

        const pin = this._findPinById(pinId);
        if (!pin) {
            console.warn(`UFCIM API: pin not found: ${pinId}`);
            return false;
        }

        return this._focusPinInternal(pin, { openPopup });
    }

    async focusOnFloor(buildingId, floorLevel, options = {}) {
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
        this.cameraManager?.applyBlockFocusZoomLimits?.();

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

    async focusOnBuilding(buildingId, options = {}) {
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
        this.cameraManager?.applyBlockFocusZoomLimits?.();

        return true;
    }

    setPinColor(pinId, color) {
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

    setPinColorPreset(pinId, presetIndex) {
        const color = this._getPresetColor(presetIndex);
        if (!color) {
            console.warn(`UFCIM API: invalid preset index ${presetIndex}`);
            return false;
        }
        return this.setPinColor(pinId, color);
    }
}
