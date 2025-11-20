import { App } from './App.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('canvas.webgl');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const app = new App(canvas);
    app.init()
        .then(() => {
            window.UFCIM = app.getAPI();

            window.addEventListener('message', async (event) => {
                const data = event.data || {};
                const { type, payload } = data;

                if (!type) return;

                try {
                    switch (type) {
                        case 'ufcim.focusOnPin':
                            await window.UFCIM.focusOnPin(
                                payload?.pinId,
                                payload?.options || {}
                            );
                            break;
                        case 'ufcim.focusOnFloor':
                            await window.UFCIM.focusOnFloor(
                                payload?.buildingId,
                                payload?.floorLevel,
                                payload?.options || {}
                            );
                            break;
                        case 'ufcim.focusOnBuilding':
                            await window.UFCIM.focusOnBuilding(
                                payload?.buildingId,
                                payload?.options || {}
                            );
                            break;
                        case 'ufcim.resetCamera':
                            window.UFCIM.resetCamera();
                            break;
                        case 'ufcim.setPinColor':
                            window.UFCIM.setPinColor(
                                payload?.pinId,
                                payload?.color
                            );
                            break;
                        case 'ufcim.setPinColorPreset':
                            window.UFCIM.setPinColorPreset(
                                payload?.pinId,
                                payload?.presetIndex
                            );
                            break;
                        default:
                            console.warn('UFCIM postMessage: unknown type', type);
                    }
                } catch (err) {
                    console.error('UFCIM postMessage handler error', err);
                }
            });
        })
        .catch((err) => {
            console.error('Failed to initialize app', err);
        });
});
