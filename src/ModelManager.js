import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_DEFINITIONS } from './config.js';
import FindSurfaces from './postprocessing/FindSurfaces.js';

export class ModelManager {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();

        this.models = Object.fromEntries(
            Object.entries(MODEL_DEFINITIONS).map(([key, value]) => [
                value.name || key,
                { path: value.path, object: null, visible: true }
            ])
        );
    }

    sanityCheckMesh(mesh, findSurfaces) {
    const geom = mesh.geometry;
    if (!geom) throw new Error('mesh has no geometry');
    if (!geom.attributes.position) throw new Error('geometry missing position attribute');
    if (!geom.index) throw new Error('geometry missing index buffer');
    const vertexCount = geom.attributes.position.count;

    // generate and validate surface-id attribute
    const surfaceIdAttr = findSurfaces.getSurfaceIdAttribute(mesh);
    if (!(surfaceIdAttr instanceof Float32Array)) throw new Error('surfaceIdAttribute not Float32Array');
    if (surfaceIdAttr.length !== vertexCount * 3) {
        throw new Error(
        `unexpected surfaceId attribute length: got ${surfaceIdAttr.length}, expected ${vertexCount * 4}`
        );
    }

    // quick scan: no NaNs, no infinities, surfaceId (r channel) should be integer-ish
    for (let i = 0; i < surfaceIdAttr.length; i += 3) {
        const r = surfaceIdAttr[i];
        if (!Number.isFinite(r)) throw new Error(`non-finite surfaceId at vertex index ${i / 4}`);
        if (Math.abs(r - Math.round(r)) > 1e-3) {
        console.warn(`surfaceId r channel not near integer at vertex ${i / 3}:`, r);
        }
    }

    return surfaceIdAttr;
    }


    async loadAll() {
    const findSurfaces = new FindSurfaces();
    const loaded = [];
    const failed = [];
    const embeddedPins = [];
    const whitePixel = new Uint8Array([255, 255, 255, 255]); // rgba
    const whiteTexture = new THREE.DataTexture(whitePixel, 1, 1, THREE.RGBAFormat);
    whiteTexture.needsUpdate = true;

    await Promise.all(
        Object.entries(this.models).map(async ([name, modelData]) => {
        try {
            const gltf = await this.loader.loadAsync(modelData.path);
            this.models[name].object = gltf.scene;
            const floorLevel = Object.keys(this.models).indexOf(name);

            gltf.scene.traverse(child => {
            if (child.isMesh) {
                // make surface-id / outline candidate
                const surfaceIdAttribute = this.sanityCheckMesh(child, findSurfaces);
                child.geometry.setAttribute(
                'color',
                new THREE.BufferAttribute(surfaceIdAttribute, 3)
                );
                child.userData.outlineEligible = true;
                child.layers.enable(1);

                // ====== force white appearance ======
                if (Array.isArray(child.material)) {
                child.material.forEach(mat => applyWhite(mat));
                } else {
                applyWhite(child.material);
                }
            }
              // collect embedded pin points
            if (child.name?.startsWith("Pin_")) {
                const id = child.name.slice(4);
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);
                embeddedPins.push({ id, position: worldPos, floorLevel }); 
            }
            });

            // helper
            function applyWhite(mat) {
            if (!mat) return;
            // preserve original type if you want lighting; just override base color / texture
            if ('color' in mat) mat.color.setHex(0xffffff);
            // remove any existing albedo/diffuse maps so they don't modulate
            mat.map = whiteTexture;
            mat.emissive && mat.emissive.setHex(0x000000); // avoid glow
            mat.needsUpdate = true;
}
            this.scene.add(gltf.scene);
            loaded.push(name);

            if (embeddedPins.length > 0 && typeof this.onPinsLoaded === 'function') {
            this.onPinsLoaded(embeddedPins);
            }
        } catch (err) {
            console.error(`error loading model "${name}" from ${modelData.path}:`, err);
            failed.push({ name, path: modelData.path, error: err });
        }
        })
    );

    return { loaded, failed };
    }


    setVisibility(floorLevel) {
        Object.entries(this.models).forEach(([name, modelData]) => {
            if (!modelData.object) return;

            let isVisible = false;
            if (floorLevel === 2) {
                isVisible = true; // Show all
            } else if (floorLevel === 1) {
                isVisible = (name !== 'Coberta');
            } else if (floorLevel === 0) {
                isVisible = (name === 'Térreo');
            }
            modelData.object.visible = isVisible;
        });
    }
}
