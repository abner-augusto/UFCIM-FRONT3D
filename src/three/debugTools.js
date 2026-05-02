import Stats from 'stats.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { logger } from '../utils/logger.ts';

export function installDebugTools(app) {
    app.devTools?.dispose?.();

    const state = { enableStats: false };
    let debugGui = null;
    let statsPanels = [];

    const createStatsPanels = () => {
        if (statsPanels.length > 0) return;
        for (let i = 0; i < 3; i++) {
            const panel = new Stats();
            panel.showPanel(i); // 0: fps, 1: ms, 2: mb
            panel.dom.classList.add('stats-panel');
            panel.dom.style.left = `${i * 80}px`;
            panel.dom.style.display = 'block';
            document.body.appendChild(panel.dom);
            statsPanels.push(panel);
        }
    };

    const setStatsVisibility = (show) => {
        statsPanels.forEach((panel) => {
            panel.dom.style.display = show ? 'block' : 'none';
        });
    };

    const dispose = () => {
        debugGui?.destroy();
        debugGui = null;
        statsPanels.forEach((panel) => panel.dom.remove());
        statsPanels = [];
    };

    app.devTools = {
        beginFrame: () => {
            if (state.enableStats) statsPanels.forEach((panel) => panel.begin());
        },
        endFrame: () => {
            if (state.enableStats) statsPanels.forEach((panel) => panel.end());
        },
        dispose,
    };

    debugGui = new GUI({ title: 'Debug', closeFolders: true, width: 140 });

    debugGui.add(state, 'enableStats').name('Stats').onChange((value) => {
        if (value) {
            createStatsPanels();
            setStatsVisibility(true);
        } else {
            setStatsVisibility(false);
        }
    });

    const cameraFolder = debugGui.addFolder('Câmera');
    const cameraActions = {
        copy: () => {
            const data = {
                position: app.camera.position.toArray(),
                target: app.controls.target.toArray(),
                fov: app.camera.fov,
            };
            const json = JSON.stringify(data, null, 2);
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(json);
            } else {
                window.prompt('Copy camera JSON:', json);
            }
        },
        log: () => {
            logger.log('[UFCIM Camera]', {
                position: app.camera.position.clone(),
                target: app.controls.target.clone(),
                fov: app.camera.fov,
            });
        },
    };
    cameraFolder.add(cameraActions, 'copy').name('Copiar JSON');
    cameraFolder.add(cameraActions, 'log').name('Log console');
    cameraFolder.close();

    debugGui.add({ hide: () => { debugGui.domElement.style.display = 'none'; } }, 'hide').name('Ocultar');

    debugGui.close();
    const el = debugGui.domElement;
    el.style.position = 'fixed';
    el.style.bottom = 'calc(var(--bottom-bar-h, 0px) + var(--safe-bottom, 0px) + 12px)';
    el.style.right = '12px';
    el.style.top = 'auto';
    el.style.left = 'auto';
    el.style.opacity = '0.55';
    el.style.transition = 'opacity 0.2s ease';
    el.addEventListener('mouseenter', () => { el.style.opacity = '1'; });
    el.addEventListener('mouseleave', () => { el.style.opacity = '0.55'; });
}
