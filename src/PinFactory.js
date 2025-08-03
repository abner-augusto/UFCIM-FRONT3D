import * as THREE from 'three';
import { PIN_ASSET_PATH } from './config.js';

const LABEL_STYLE = {
    scale: {
        x: 16,
        y: 8,
    }
};

export class PinFactory {
    constructor() {
        this.pinTexture = null;
        this.textureLoader = new THREE.TextureLoader();
    }

    async loadAssets() {
        // Pre-load the pin texture so it's ready for use
        this.pinTexture = await this.textureLoader.loadAsync(PIN_ASSET_PATH);
    }

    createPinAndLabel(pinData) {
        const pinSprite = this._createPinSprite(pinData);
        const labelSprite = this._createLabelSprite(pinData);
        return { pinSprite, labelSprite };
    }

    _createPinSprite(pinData) {
        const material = new THREE.SpriteMaterial({
            map: this.pinTexture,
            color: new THREE.Color(pinData.color || '#1fd97c'),
            depthTest: true,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        const labelOffset = 1.5; // Position pin icon slightly above the label
        sprite.position.copy(pinData.position).add(new THREE.Vector3(0, labelOffset, 0));
        sprite.scale.set(2, 2, 1);
        sprite.name = pinData.id;
        sprite.userData.id = pinData.id;
        sprite.userData.floorLevel = pinData.floorLevel;

        return sprite;
    }

    _createLabelSprite(pinData) {
        const canvas = this._createLabelCanvas(pinData.id);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        const scaleX = canvas.width / LABEL_STYLE.scale.x;
        const scaleY = canvas.height / (LABEL_STYLE.scale.y * 2); // Adjust based on canvas height calculation
        sprite.scale.set(scaleX, scaleY, 1);
        sprite.position.copy(pinData.position);
        sprite.name = `${pinData.id}_label`;

        return sprite;
    }

    _createLabelCanvas(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Get computed style from a temporary DOM element
        const tempLabel = document.createElement('div');
        tempLabel.className = 'pin-label'; // match your CSS class
        tempLabel.style.position = 'absolute'; // off-screen
        tempLabel.style.visibility = 'hidden';
        tempLabel.textContent = text;
        document.body.appendChild(tempLabel);

        const style = getComputedStyle(tempLabel);
        const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        ctx.font = font;
        const textMetrics = ctx.measureText(text);
        const textWidth = Math.ceil(textMetrics.width);
        const padding = parseInt(style.paddingLeft) || 10;
        const borderRadius = parseInt(style.borderRadius) || 8;
        const rectHeight = parseInt(style.height) || 40;

        const canvasWidth = textWidth + padding * 2;
        const canvasHeight = rectHeight * 2;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.font = font;

        // Colors from CSS
        const bgColor = style.backgroundColor || 'white';
        const borderColor = style.borderColor || 'black';
        const textColor = style.color || 'black';
        const borderWidth = parseInt(style.borderWidth) || 2;

        // Draw background with border
        const rectY = (canvasHeight - rectHeight) / 2;
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.roundRect(0, rectY, canvasWidth, rectHeight, borderRadius);
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

        // Clean up temp element
        document.body.removeChild(tempLabel);

        return canvas;
    }

}