import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelManager {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.models = {
            'Térreo': { path: './assets/iaud-terreo.glb', object: null, visible: true },
            '1º Pavimento': { path: './assets/iaud-1opav.glb', object: null, visible: true },
            'Coberta': { path: './assets/iaud-coberta.glb', object: null, visible: true },
        };
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