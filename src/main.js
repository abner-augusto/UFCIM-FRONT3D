import { App } from './App.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('canvas.webgl');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    const app = new App(canvas);
    app.init();
});