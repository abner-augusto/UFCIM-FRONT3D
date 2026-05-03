import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { logger } from '../utils/logger.ts';

const MODEL_ROOT = '/assets/models/IAUD';
const MANIFEST_URL = `${MODEL_ROOT}/manifest.json`;
const PIN_NAME_REGEX = /^Pin(#)?_(.+)$/;

export class ModelManager {
  constructor(scene) {
    this.scene = scene;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/libs/draco/');
    dracoLoader.setDecoderConfig({ type: 'wasm' });

    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(dracoLoader);

    this.manifest = {};
    this.entries = new Map();
    this.blockBBoxCache = new Map();
    this.visibleMeshes = [];

    this.enabledBuildings = new Set();
    this.focusedBuilding = null;
    this.maxFloorVisibleByBuilding = new Map();

    this.onPinsLoaded = null;
    this.onPinsVisibilityChange = null;
  }

  async initFromManifest() {
    const res = await fetch(MANIFEST_URL, { cache: 'default' });
    if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
    this.manifest = await res.json();

    Object.entries(this.manifest).forEach(([buildingID, buildingData]) => {
      const floorsMap = new Map();

      if (buildingData.bbox) {
        const box = new THREE.Box3(
          new THREE.Vector3(...buildingData.bbox.min),
          new THREE.Vector3(...buildingData.bbox.max)
        );
        this.blockBBoxCache.set(buildingID, box);
      }

      const sourceDir = buildingData.sourceDir || buildingID;

      buildingData.floors.forEach((floorInfo) => {
        const floorLevel = floorInfo.level;
        const bboxMin = floorInfo?.bbox?.min ?? [0, 0, 0];
        const bboxMax = floorInfo?.bbox?.max ?? [0, 0, 0];
        const floorBBox = new THREE.Box3(
          new THREE.Vector3(...bboxMin),
          new THREE.Vector3(...bboxMax)
        );
        const manifestPins = Array.isArray(floorInfo.pins) ? floorInfo.pins : [];
        const pins = manifestPins
          .map((pin) => {
            if (!pin || !pin.id) return null;
            const posArray = Array.isArray(pin.position) ? pin.position : null;
            if (!posArray || posArray.length !== 3) return null;
            const opensPopup = pin.opensPopup !== false;
            return {
              ...pin,
              opensPopup,
              position: new THREE.Vector3(posArray[0], posArray[1], posArray[2]),
            };
          })
          .filter(Boolean);

        floorsMap.set(floorLevel, {
          key: `${buildingID}:floor${floorLevel}`,
          building: buildingID,
          floor: floorLevel,
          path: `${MODEL_ROOT}/${sourceDir}/${floorInfo.file}`,
          object: null,
          visible: false,
          name: floorInfo.name,
          bbox: floorBBox,
          pins,
          pinsLoaded: false,
          loadingPromise: null,
        });
      });

      this.entries.set(buildingID, new Map([...floorsMap.entries()].sort((a, b) => a[0] - b[0])));
      this.maxFloorVisibleByBuilding.set(buildingID, -1);
    });

    const firstBuilding = Object.keys(this.manifest)[0] ?? null;
    if (firstBuilding) {
      this.focusBuilding(firstBuilding);
    }
  }

  focusBuilding(building) {
    if (!this.entries.has(building)) return;
    this.focusedBuilding = building;
  }

  enableBuilding(building, enabled) {
    if (!this.entries.has(building)) return;
    if (enabled) this.enabledBuildings.add(building);
    else this.enabledBuildings.delete(building);
    this._applyVisibility();
  }

  async setFloorLevel(building, level) {
    if (!this.entries.has(building)) return;
    const floors = this.entries.get(building);
    const needed = [...floors.keys()].filter((f) => f <= level);
    await Promise.all(needed.map((f) => this._ensureLoaded(building, f)));
    this.maxFloorVisibleByBuilding.set(building, level);
    this._applyVisibility();
  }

  async setFloorLevelForFocused(level) {
    if (!this.focusedBuilding) return;
    await this.setFloorLevel(this.focusedBuilding, level);
  }

  async showAllBlocks() {
    // 1. Prepare visibility state first so floors appear immediately upon loading
    for (const [building, floorsMap] of this.entries.entries()) {
      this.enabledBuildings.add(building);
      const floorIndices = [...floorsMap.keys()];
      if (floorIndices.length > 0) {
        const maxLevel = Math.max(...floorIndices);
        this.maxFloorVisibleByBuilding.set(building, maxLevel);
      }
    }

    // Initial visibility apply to set the 'visible' flag on entries
    this._applyVisibility();

    // 2. Load in two waves to prioritize the ground view
    const allEntries = [];
    for (const floorsMap of this.entries.values()) {
      for (const entry of floorsMap.values()) {
        allEntries.push(entry);
      }
    }

    const groundFloors = allEntries.filter(e => e.floor === 0);
    const upperFloors = allEntries.filter(e => e.floor !== 0);

    // Start loading ground floors first
    await Promise.all(groundFloors.map(e => this._ensureLoaded(e.building, e.floor)));
    
    // Then load everything else in the background
    // We don't await this so the UI is interactive sooner
    Promise.all(upperFloors.map(e => this._ensureLoaded(e.building, e.floor)))
      .catch(err => logger.error('failed loading upper floors in background', err));
  }

  getFloorObject(building, floor) {
    const entry = this.entries.get(building)?.get(floor);
    return entry ? entry.object : null;
  }

  getAllMeshes() {
    return this.visibleMeshes.slice();
  }

  getBlockBoundingBox(building) {
      return this.blockBBoxCache.get(building) || new THREE.Box3();
   }

  async _ensureLoaded(building, floor) {
    const floors = this.entries.get(building);
    const entry = floors?.get(floor);
    if (!entry || entry.object) return;
    if (entry.loadingPromise) return entry.loadingPromise;

    entry.loadingPromise = (async () => {
      const gltf = await this.loader.loadAsync(entry.path);
      entry.object = gltf.scene;

      const yOffset = 0.5;
      entry.object.position.y += yOffset;
      entry.object.visible = entry.visible;

      // Optimize for static, non-textured models
      entry.object.traverse((child) => {
        if (child.isObject3D) {
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        }

        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          
          if (child.material) {
            const oldMat = child.material;
            const newMat = new THREE.MeshLambertMaterial({
              color: oldMat.color,
              opacity: oldMat.opacity,
              transparent: oldMat.transparent,
              side: oldMat.side,
              depthWrite: !oldMat.transparent,
              vertexColors: oldMat.vertexColors // Preserve vertex colors if present
            });
            
            child.material.dispose();
            child.material = newMat;
          }

          // Since we are using Lambert with solid colors/vertex colors, 
          // we can strip UVs to save GPU memory if the material doesn't use textures.
          if (child.geometry) {
            child.geometry.deleteAttribute('uv');
            child.geometry.deleteAttribute('uv2');
          }
        }
      });

      this.scene.add(gltf.scene);
      this._emitPinsForEntry(entry);
      this._applyVisibility();
    })();

    try {
      await entry.loadingPromise;
    } catch (err) {
      logger.error(`Failed loading ${building}/floor${floor}:`, err);
    } finally {
      entry.loadingPromise = null;
    }
  }

  _maybePopulatePinsFromScene(entry) {
    if (!entry.object) return;
    const fallbackPins = [];
    entry.object.updateMatrixWorld(true);
    entry.object.traverse((child) => {
      if (!child?.name) return;
      const match = PIN_NAME_REGEX.exec(child.name);
      if (!match) return;
      const [, silentFlag, rawId] = match;
      const id = rawId.trim();
      if (!id) return;
      const opensPopup = silentFlag !== '#';

      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);
      const localPos = worldPos.clone();
      entry.object.worldToLocal(localPos);

      fallbackPins.push({
        id,
        position: new THREE.Vector3(localPos.x, localPos.y, localPos.z),
        opensPopup,
      });
    });
    if (fallbackPins.length > 0) {
      entry.pins = fallbackPins;
    }
  }

  _emitPinsForEntry(entry) {
    if (!entry.object || entry.pinsLoaded) return;
    if (!Array.isArray(entry.pins) || entry.pins.length === 0) {
      this._maybePopulatePinsFromScene(entry);
    }
    if (!Array.isArray(entry.pins) || entry.pins.length === 0) {
      entry.pinsLoaded = true;
      return;
    }
    entry.object.updateMatrixWorld(true);
    if (typeof this.onPinsLoaded === 'function') {
      const payload = entry.pins.map((pin) => ({
        ...pin,
        position: pin.position.clone(),
        building: entry.building,
        floorLevel: entry.floor,
        parent: entry.object,
        displayName: typeof pin.displayName === 'string'
          ? pin.displayName
          : (typeof pin.label === 'string' ? pin.label : pin.id),
      }));
      this.onPinsLoaded(payload);
    }
    entry.pinsLoaded = true;
  }

  _applyVisibility(interactionManager = null) {
    const blockingMeshes = [];
    for (const [building, floors] of this.entries.entries()) {
      const buildingEnabled = this.enabledBuildings.has(building);
      const maxLevel = this.maxFloorVisibleByBuilding.get(building) ?? -1;

      for (const [floor, entry] of floors.entries()) {
        const shouldShow = buildingEnabled && floor <= maxLevel;
        entry.visible = shouldShow;
        if (entry.object) {
          entry.object.visible = shouldShow;
          if (shouldShow) {
            entry.object.traverse((c) => c.isMesh && blockingMeshes.push(c));
          }
        }
        if (typeof this.onPinsVisibilityChange === 'function') {
          this.onPinsVisibilityChange(building, floor, shouldShow);
        }
      }
    }

    this.visibleMeshes = blockingMeshes;
    if (interactionManager) {
      interactionManager.blockingMeshes = blockingMeshes;
    }
  }
}
