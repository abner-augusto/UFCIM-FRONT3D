import { App } from './App.js';

function createLoadingScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-screen';

    const content = document.createElement('div');
    content.className = 'loading-content';

    const logo = document.createElement('img');
    logo.src = '/favicon.ico';
    logo.alt = 'UFCIM logo';
    logo.className = 'loading-logo';

    const text = document.createElement('div');
    text.className = 'loading-text';
    text.textContent = 'carregando...';

    content.appendChild(logo);
    content.appendChild(text);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    return {
        show: () => overlay.classList.remove('hidden'),
        hide: () => {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 400);
        },
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = createLoadingScreen();
    loadingScreen.show();

    const canvas = document.querySelector('canvas.webgl');
    if (!canvas) {
        console.error('Canvas element not found!');
        loadingScreen.hide();
        return;
    }

    const app = new App(canvas);
    try {
        await app.init();
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
    } catch (err) {
        console.error('Failed to initialize app', err);
    } finally {
        loadingScreen.hide();
    }
});
