import { UI_IDS, UI_CLASSES } from './config.js';

export class UIManager {
    constructor() {
        this.floorUIContainer = null;
    }

    createFloorUI(modelManager, interactionManager) {
        const uiContainer = document.createElement('div');
        uiContainer.id = UI_IDS.floorUI;
        uiContainer.className = UI_CLASSES.floorUIContainer;

        const floorActions = [
            { label: '2', level: 2 },
            { label: '1', level: 1 },
            { label: '0', level: 0 }
        ];

        floorActions.forEach(({ label, level }) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.onclick = () => {
                modelManager.setVisibility(level, interactionManager);
                interactionManager.filterPins(level);
            };
            uiContainer.appendChild(btn);
        });

        document.body.appendChild(uiContainer);
        this.floorUIContainer = uiContainer;
    }

    toggleFloorUI(show) {
        if (this.floorUIContainer) {
            this.floorUIContainer.style.opacity = show ? '1' : '0.1';
            this.floorUIContainer.style.pointerEvents = show ? 'auto' : 'none';
        }
    }
}