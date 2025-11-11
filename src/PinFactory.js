import * as THREE from 'three';
import { PIN_ASSET_PATH } from './config.js';

const LABEL_STYLE = {
    pixelToWorldScale: 0.05, // world units per canvas pixel
    pinMargin: 0.1, // gap between label top and pin bottom
    padding: {
        x: 4,
        y: 2
    }
};

const PIN_LABEL_LINE_LIMIT = 7;
const PIN_SPRITE_SCALE = 1.8;

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
        const displayName = this._formatLabelText(pinData.displayName ?? pinData.id);
        const labelSprite = this._createLabelSprite(pinData, displayName);

        const labelWorldHeight = labelSprite.scale.y;
        const pinWorldHeight = PIN_SPRITE_SCALE;
        const pinOffsetY = labelWorldHeight + (pinWorldHeight / 2) + LABEL_STYLE.pinMargin;

        const pinPosition = pinData.position.clone().add(new THREE.Vector3(0, pinOffsetY, 0));
        const pinSprite = this._createPinSprite(pinData, displayName, pinPosition);

        return { pinSprite, labelSprite };
    }

    _formatLabelText(rawText = '') {
        const withSpaces = rawText.replace(/_/g, ' ');
        const collapsedWhitespace = withSpaces.replace(/\s+/g, ' ').trim();
        const cleanedText = collapsedWhitespace.length > 0 ? collapsedWhitespace : rawText;
        return this._wrapLabelText(cleanedText, PIN_LABEL_LINE_LIMIT);
    }

    _wrapLabelText(text, limit) {
        if (!text || !limit || limit <= 0) {
            return text;
        }

        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        const pushLine = () => {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = '';
            }
        };

        words.forEach((word) => {
            if (!word) {
                return;
            }

            const prospective = currentLine ? `${currentLine} ${word}` : word;
            if (prospective.length > limit && currentLine) {
                pushLine();
                currentLine = word;
            } else {
                currentLine = prospective;
            }
        });

        pushLine();

        return lines.join('\n');
    }

    _createPinSprite(pinData, displayName, position) {
        const material = new THREE.SpriteMaterial({
            map: this.pinTexture,
            color: new THREE.Color(pinData.color || '#1fd97c'),
            depthTest: true,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(PIN_SPRITE_SCALE, PIN_SPRITE_SCALE, 1);
        sprite.renderOrder = 1;
        sprite.name = pinData.id;
        sprite.userData.id = pinData.id;
        sprite.userData.floorLevel = pinData.floorLevel;
        sprite.userData.building = pinData.building;
        sprite.userData.displayName = displayName;
        sprite.userData.opensPopup = pinData.opensPopup !== false;

        return sprite;
    }

    _createLabelSprite(pinData, labelText) {
        const canvas = this._createLabelCanvas(labelText);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        const pixelToWorldScale = LABEL_STYLE.pixelToWorldScale;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const scaleX = canvasWidth * pixelToWorldScale;
        const scaleY = canvasHeight * pixelToWorldScale;
        sprite.scale.set(scaleX, scaleY, 1);
        const labelOffsetY = scaleY / 2;
        sprite.position.copy(pinData.position).add(new THREE.Vector3(0, labelOffsetY, 0));
        sprite.renderOrder = 2;
        sprite.name = `${pinData.id}_label`;
        sprite.userData.displayName = labelText;

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

        const paddingConfig = LABEL_STYLE.padding || {};
        const parsedPaddingLeft = parseInt(style.paddingLeft, 10);
        const parsedPaddingRight = parseInt(style.paddingRight, 10);
        const parsedPaddingTop = parseInt(style.paddingTop, 10);
        const parsedPaddingBottom = parseInt(style.paddingBottom, 10);
        const paddingLeft = paddingConfig.left ?? paddingConfig.x ?? (Number.isNaN(parsedPaddingLeft) ? 10 : parsedPaddingLeft);
        const paddingRight = paddingConfig.right ?? paddingConfig.x ?? (Number.isNaN(parsedPaddingRight) ? paddingLeft : parsedPaddingRight);
        const paddingTop = paddingConfig.top ?? paddingConfig.y ?? (Number.isNaN(parsedPaddingTop) ? 8 : parsedPaddingTop);
        const paddingBottom = paddingConfig.bottom ?? paddingConfig.y ?? (Number.isNaN(parsedPaddingBottom) ? paddingTop : parsedPaddingBottom);
        const borderRadius = parseInt(style.borderRadius, 10) || 8;
        const borderWidth = parseInt(style.borderWidth, 10) || 2;

        const lines = text.split('\n');
        const lineHeight = this._resolveLineHeight(style);
        const lineWidths = lines.map(line => Math.ceil(ctx.measureText(line).width));
        const textWidth = Math.max(...lineWidths, 0);
        const textBlockHeight = lineHeight * lines.length;

        const rectWidth = textWidth + paddingLeft + paddingRight;
        const rectHeight = textBlockHeight + paddingTop + paddingBottom;

        canvas.width = rectWidth + borderWidth * 2;
        canvas.height = rectHeight + borderWidth * 2;

        ctx.font = font;

        // Colors from CSS
        const bgColor = style.backgroundColor || 'white';
        const borderColor = style.borderColor || 'black';
        const textColor = style.color || 'black';

        // Draw background with border
        const rectX = borderWidth;
        const rectY = borderWidth;
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, borderRadius);
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelCenterX = rectX + rectWidth / 2;
        const firstLineY = rectY + paddingTop + lineHeight / 2;
        lines.forEach((line, index) => {
            const lineY = firstLineY + index * lineHeight;
            ctx.fillText(line, labelCenterX, lineY);
        });

        // Clean up temp element
        document.body.removeChild(tempLabel);

        return canvas;
    }

    _resolveLineHeight(style) {
        const rawLineHeight = style.lineHeight;
        if (!rawLineHeight || rawLineHeight === 'normal') {
            const fontSize = parseInt(style.fontSize, 10) || 12;
            return Math.round(fontSize * 1.2);
        }

        const parsed = parseInt(rawLineHeight, 10);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }

        const fontSize = parseInt(style.fontSize, 10) || 12;
        return Math.round(fontSize * 1.2);
    }

}
