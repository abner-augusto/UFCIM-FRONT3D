import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_DEFINITIONS } from './config.js';

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

    async loadAll() {
        const loadPromises = Object.entries(this.models).map(([name, modelData]) => {
            return this.loader.loadAsync(modelData.path).then(gltf => {
                this.models[name].object = gltf.scene;
                this.scene.add(gltf.scene);
            });
        });
        return Promise.all(loadPromises);
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