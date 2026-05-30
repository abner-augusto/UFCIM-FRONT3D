/**
 * UIManager — thin bridge between the Vue layer and the Three.js model/interaction managers.
 *
 * All DOM rendering (building bars, floor bars, search) now lives in Vue components
 * (ViewerDesktopControls, ViewerControlsRail, ViewerSearchSheet). This class only
 * holds the business-logic methods that the Vue layer calls through ThreeViewer.expose().
 */

export class UIManager {
  constructor() {
    this.modelManager = null;
    this.interactionManager = null;
    this.cameraManager = null;
    /** @type {string|null} Currently focused building ID, or null for "Todos". */
    this._activeBuildingId = null;
    /** @type {number|null} Active floor level within the focused building. */
    this._activeFloorLevel = null;
  }

  /**
   * Initialise with the Three.js managers. Called once from App._initializeUI().
   * The old version also created DOM elements; this version only stores references.
   */
  init(modelManager, interactionManager, cameraManager) {
    this.modelManager = modelManager;
    this.interactionManager = interactionManager;
    this.cameraManager = cameraManager;
  }

  // ----------------------------------------------------------------
  //  Business logic — called by the Vue layer via ThreeViewer.expose()
  // ----------------------------------------------------------------

  /** Select a building (or null for "Todos"). */
  async selectBuilding(buildingID) {
    if (buildingID === null) {
      return this.selectAll();
    }

    for (const b of Object.keys(this.modelManager.manifest)) {
      this.modelManager.enableBuilding(b, false);
    }
    this.modelManager.enableBuilding(buildingID, true);
    this.modelManager.focusBuilding(buildingID);
    this.interactionManager.resetPinsForBuilding(buildingID);

    if ((this.modelManager.maxFloorVisibleByBuilding.get(buildingID) ?? -1) < 0) {
      await this.modelManager.setFloorLevel(buildingID, 0);
    }

    const floorsMap = this.modelManager.entries.get(buildingID);
    let newActiveFloor = 0;
    if (floorsMap && floorsMap.size > 0) {
      newActiveFloor = Math.min(...floorsMap.keys());
    }

    await this.modelManager.setFloorLevel(buildingID, newActiveFloor);
    this.interactionManager.activateFloorPins(buildingID, newActiveFloor);
    this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
    this.cameraManager?.applyBlockFocusZoomLimits?.();

    const blockBox = this.modelManager.getBlockBoundingBox(buildingID);
    if (!blockBox.isEmpty()) {
      this.cameraManager.fitCameraToBox(blockBox);
    }

    this._activeBuildingId = buildingID;
    this._activeFloorLevel = newActiveFloor;

    window.dispatchEvent(new CustomEvent('ufcim:building-changed', {
      detail: { buildingID, activeFloor: newActiveFloor }
    }));
  }

  /** Select "Todos" (no building focus). */
  async selectAll() {
    await this.modelManager.showAllBlocks();
    this.interactionManager.clearFloorSelections(true);
    this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
    this.cameraManager?.applyDefaultZoomLimits?.();
    this.cameraManager.resetToDefaultState();

    this._activeBuildingId = null;
    this._activeFloorLevel = null;

    window.dispatchEvent(new CustomEvent('ufcim:building-changed', {
      detail: { buildingID: null, activeFloor: null }
    }));
  }

  /** Select a floor on the active building. */
  async selectFloor(level) {
    const focused = this.modelManager.focusedBuilding;
    if (!focused) return;

    for (let f = 0; f <= level; f++) {
      await this.modelManager.setFloorLevelForFocused(f);
    }
    const floorObject = this.modelManager.getFloorObject(focused, level);
    if (floorObject) {
      this.cameraManager.focusOnObjectAtCurrentDistance(floorObject);
    }
    this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
    this.interactionManager.activateFloorPins(focused, level);

    this._activeFloorLevel = level;

    window.dispatchEvent(new CustomEvent('ufcim:floor-changed', {
      detail: { level }
    }));
  }

  /** Navigate the camera to a specific pin by modelId. */
  async navigateToSpaceByModelId(modelId) {
    const allPins = this.interactionManager?.getAllPins?.() ?? [];
    const pin = allPins.find((p) => p.userData?.id === modelId);
    if (!pin) return;

    const building = pin.userData.building;
    const floorLevel = pin.userData.floorLevel;
    if (!building || typeof floorLevel !== 'number') return;

    for (const b of Object.keys(this.modelManager.manifest)) {
      this.modelManager.enableBuilding(b, false);
    }
    this.modelManager.enableBuilding(building, true);
    await this.modelManager.setFloorLevel(building, floorLevel);

    this.interactionManager.activateFloorPins(building, floorLevel);
    this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();

    this.modelManager.focusBuilding(building);

    this._activeBuildingId = building;
    this._activeFloorLevel = floorLevel;

    this.cameraManager.focusOnPin(pin);

    window.dispatchEvent(new CustomEvent('ufcim:building-changed', {
      detail: { buildingID: building, activeFloor: floorLevel },
    }));

    window.dispatchEvent(new CustomEvent('ufcim:pin-click', {
      detail: {
        pinId: modelId,
        displayName: pin.userData?.displayName || pin.userData?.id || modelId,
        building,
        floorLevel,
      },
    }));
  }

  // ----------------------------------------------------------------
  //  State getters — called by Vue components
  // ----------------------------------------------------------------

  getBuildingsList() {
    const list = [];
    if (!this.modelManager?.manifest) return list;
    for (const [id, data] of Object.entries(this.modelManager.manifest)) {
      if (data.hidden) continue;
      list.push({ id, name: data.name || id });
    }
    return list;
  }

  getFloorsForBuilding(buildingID) {
    if (!this.modelManager?.manifest) return [];
    const data = this.modelManager.manifest[buildingID];
    if (!data?.floors) return [];
    return data.floors
      .map(f => ({ level: f.level, name: f.name }))
      .sort((a, b) => a.level - b.level);
  }

  getActiveBuildingId() {
    return this._activeBuildingId;
  }

  getActiveFloorLevel() {
    return this._activeFloorLevel;
  }

  // ----------------------------------------------------------------
  //  Stubs — kept for backward compat with PopUpManager / ThreeViewer
  // ----------------------------------------------------------------

  /** No-op: visibility is now controlled by the Vue layer. */
  toggleFloorUI(_show) {}

  /** No-op: controls are now Vue components. */
  setControlsEnabled(_enabled) {}

  dispose() {
    this.modelManager = null;
    this.interactionManager = null;
    this.cameraManager = null;
  }
}
