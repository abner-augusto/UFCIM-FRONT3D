import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import FindSurfaces from './postprocessing/FindSurfaces.js';

const MODEL_ROOT = '/assets/models/IAUD';
const MANIFEST_URL = `./manifest.json`;

export class ModelManager {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();

    // manifest: { [building]: ["floor0.glb", "floor1.glb", ...] }
    this.manifest = {};
    // entries[building][floor] = { key, building, floor, path, object|null, visible }
    this.entries = new Map();
    this.blockBBoxCache = new Map();

    // UI state
    this.enabledBuildings = new Set();         // which blocks are toggled on
    this.focusedBuilding = null;               // which block floor buttons control
    this.maxFloorVisibleByBuilding = new Map();// building -> max floor index visible

    // helpers
    this.findSurfaces = new FindSurfaces();
    this.onPinsLoaded = null;                  // optional callback
  }

  async initFromManifest() {
    const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
    this.manifest = await res.json();

    // Iterate the new manifest structure
    Object.entries(this.manifest).forEach(([buildingID, buildingData]) => {
      // buildingData = { name, bbox, floors: [...] }

      const floorsMap = new Map();

      // 1. Read the cached building bounding box
      if (buildingData.bbox) {
        const box = new THREE.Box3(
          new THREE.Vector3(...buildingData.bbox.min),
          new THREE.Vector3(...buildingData.bbox.max)
        );
        this.blockBBoxCache.set(buildingID, box);
      }

      // 2. Iterate the floors array and build the entries
      buildingData.floors.forEach((floorInfo) => {
        // floorInfo = { file, name, level, bbox }
        const floorLevel = floorInfo.level;

        floorsMap.set(floorLevel, {
          key: `${buildingID}:floor${floorLevel}`,
          building: buildingID,
          floor: floorLevel,
          path: `${MODEL_ROOT}/${buildingID}/${floorInfo.file}`,
          object: null,
          visible: false,

          // --- Store the new data ---
          name: floorInfo.name, // e.g., "Térreo"
          bbox: new THREE.Box3( // The floor's specific bbox
            new THREE.Vector3(...floorInfo.bbox.min),
            new THREE.Vector3(...floorInfo.bbox.max)
          )
        });
      });

      // Sort floors by level (key) and store in the entries map
      this.entries.set(buildingID, new Map([...floorsMap.entries()].sort((a, b) => a[0] - b[0])));
      this.maxFloorVisibleByBuilding.set(buildingID, -1);
    });

    const firstBuilding = Object.keys(this.manifest)[0] ?? null;
    if (firstBuilding) {
      this.focusBuilding(firstBuilding);
      this.enableBuilding(firstBuilding, true);
      await this.setFloorLevel(firstBuilding, 0);
    }
  }

  // ---------- Public UI actions ----------------------------------------

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
    // cumulative: show floors 0..level for this building
    if (!this.entries.has(building)) return;

    const floors = this.entries.get(building);
    const needed = [...floors.keys()].filter((f) => f <= level);

    // lazy-load any missing floors we need now
    await Promise.all(needed.map((f) => this._ensureLoaded(building, f)));

    // update max visible level for this building
    this.maxFloorVisibleByBuilding.set(building, level);
    this._applyVisibility();
  }

  async setFloorLevelForFocused(level) {
    if (!this.focusedBuilding) return;
    await this.setFloorLevel(this.focusedBuilding, level);
  }

  // Enable every building and reveal ALL floors for each one.
  async showAllBlocks() {
    const buildingPromises = [];

    for (const [building, floorsMap] of this.entries.entries()) {
      this.enabledBuildings.add(building);

      const floorIndices = [...floorsMap.keys()];
      if (floorIndices.length === 0) continue;

      const maxLevel = Math.max(...floorIndices);

      // Load all floors for this building in parallel
      buildingPromises.push(
        Promise.all(floorIndices.map((f) => this._ensureLoaded(building, f)))
          .then(() => {
            // After all floors are loaded, mark the max visible
            this.maxFloorVisibleByBuilding.set(building, maxLevel);
          })
          .catch((err) => {
            console.error(`showAllBlocks: failed loading floors for ${building}`, err);
          })
      );
    }

    await Promise.all(buildingPromises);
    this._applyVisibility();
  }

  /**
   * Gets the loaded 3D object for a specific building and floor.
   * @param {string} building The building name (e.g., "BlocoA")
   * @param {number} floor The floor index (e.g., 0)
   * @returns {THREE.Object3D | null}
   */
  getFloorObject(building, floor) {
    const entry = this.entries.get(building)?.get(floor);
    return entry ? entry.object : null;
  }

  /**
   * Retrieves all meshes from the loaded models that are currently visible.
   * It iterates through each building and floor, and if the object is visible,
   * it traverses the object to find all meshes and adds them to the result array.
   * @returns {THREE.Mesh[]} An array containing all visible meshes from the loaded models.
   */
  getAllMeshes() {
    const meshes = [];
    for (const [building, floors] of this.entries.entries()) {
      for (const [floor, entry] of floors.entries()) {
        if (entry.object && entry.object.visible) {
          entry.object.traverse((obj) => {
            if (obj.isMesh) {
              meshes.push(obj);
            }
          });
        }
      }
    }
    return meshes;
  }
  /**
   * Calculates a bounding box that encloses all loaded objects for a specific building.
   * @param {string} building The building name
   * @returns {THREE.Box3}
   */
  getBlockBoundingBox(building) {
      return this.blockBBoxCache.get(building) || new THREE.Box3();
   }

  // ---------- Internals ------------------------------------------------

  async _ensureLoaded(building, floor) {
    const floors = this.entries.get(building);
    const entry = floors?.get(floor);
    if (!entry || entry.object) return;

    try {
      const gltf = await this.loader.loadAsync(entry.path);
      entry.object = gltf.scene;

      const yOffset = 0.5;
      entry.object.position.y += yOffset;
      const embeddedPins = [];
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          this._prepMesh(child);
        }
        if (child.name?.startsWith('Pin_')) {
          const id = child.name.slice(4);
          const worldPos = new THREE.Vector3();
          child.getWorldPosition(worldPos);
          embeddedPins.push({ id, position: worldPos, floorLevel: floor, building });
        }
      });

      this.scene.add(gltf.scene);
      if (embeddedPins.length && typeof this.onPinsLoaded === 'function') {
        this.onPinsLoaded(embeddedPins);
      }
    } catch (err) {
      console.error(`Failed loading ${building}/floor${floor}:`, err);
    }
  }

  _prepMesh(mesh) {
    const geom = mesh.geometry;
    if (!geom || !geom.attributes?.position || !geom.index) return;

    const vertexCount = geom.attributes.position.count;
    const surfaceIdAttribute = this.findSurfaces.getSurfaceIdAttribute(mesh);
    if (!(surfaceIdAttribute instanceof Float32Array) || surfaceIdAttribute.length !== vertexCount * 3) return;

    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(surfaceIdAttribute, 3));
    mesh.userData.outlineEligible = true;
    mesh.layers.enable(1);

    // force white material for unified look
    const whitePixel = new Uint8Array([255, 255, 255, 255]);
    const whiteTexture = new THREE.DataTexture(whitePixel, 1, 1, THREE.RGBAFormat);
    whiteTexture.needsUpdate = true;
    const applyWhite = (mat) => {
      if (!mat) return;
      if ('color' in mat) mat.color.setHex(0xffffff);
      mat.map = whiteTexture;
      if (mat.emissive) mat.emissive.setHex(0x000000);
      mat.needsUpdate = true;
    };
    if (Array.isArray(mesh.material)) mesh.material.forEach(applyWhite);
    else applyWhite(mesh.material);
  }

  _applyVisibility(interactionManager = null) {
    const blockingMeshes = [];

    for (const [building, floors] of this.entries.entries()) {
      const buildingEnabled = this.enabledBuildings.has(building);
      const maxLevel = this.maxFloorVisibleByBuilding.get(building) ?? -1;

      for (const [floor, entry] of floors.entries()) {
        const shouldShow = buildingEnabled && floor <= maxLevel;
        if (entry.object) {
          entry.object.visible = shouldShow;
          if (shouldShow) {
            entry.object.traverse((c) => c.isMesh && blockingMeshes.push(c));
          }
        }
      }
    }

    if (interactionManager) {
      interactionManager.blockingMeshes = blockingMeshes;
    }
  }

}
