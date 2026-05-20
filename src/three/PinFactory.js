import * as THREE from 'three';
import { PIN_ASSET_PATH } from './config.js';
import { logger } from '../utils/logger.ts';

const LABEL_STYLE = {
    pixelToWorldScale: 0.05, // world units per canvas pixel
    pinMargin: 0.1, // gap between label top and pin bottom
    padding: {
        x: 4,
        y: 2
    },
    font: "600 12px 'Roboto', sans-serif", // locked font for consistent label rendering
    colors: {
        background: 'rgba(255, 255, 255, 0.98)',
        border: '#549ba8',
        text: '#0f1e22'
    },
    border: {
        radius: 3,
        width: 1
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
        // Preload the label font so canvas measurements stay consistent
        if (LABEL_STYLE.font && document.fonts?.load) {
            try {
                await document.fonts.load(LABEL_STYLE.font);
            } catch (err) {
                logger.warn('Pin label font failed to preload; falling back to default', err);
            }
        }
    }

    createPinAndLabel(pinData) {
        const displayName = this._formatLabelText(pinData.displayName ?? pinData.id);
        const labelSprite = this._createLabelSprite(pinData, {
            displayName,
            statusText: pinData.statusText ?? null,
            statusColor: pinData.statusColor ?? null,
        });

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
            transparent: true,
            alphaTest: 0.05,
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

    _createLabelSprite(pinData, labelParams) {
        const canvas = this._createLabelCanvas(labelParams);
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
        sprite.userData.displayName = labelParams.displayName;
        sprite.userData.baseDisplayName = labelParams.displayName;

        return sprite;
    }

    _createLabelCanvas({ displayName, statusText, statusColor }) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Get computed style from a temporary DOM element
        const tempLabel = document.createElement('div');
        tempLabel.className = 'pin-label'; // match your CSS class
        tempLabel.style.position = 'absolute'; // off-screen
        tempLabel.style.visibility = 'hidden';

        // Build text: displayName always, statusText on second line if present
        const hasStatus = statusText != null && statusText !== '';
        const labelText = hasStatus ? `${displayName}\n${statusText}` : displayName;
        tempLabel.textContent = labelText;
        document.body.appendChild(tempLabel);
        try {
            const style = getComputedStyle(tempLabel);
            const font = LABEL_STYLE.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            // Status line font: smaller (10px vs 12px)
            const statusFont = hasStatus ? '400 10px Roboto, sans-serif' : font;
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

            const borderConfig = LABEL_STYLE.border || {};
            const borderRadius = (borderConfig.radius ?? parseInt(style.borderRadius, 10)) || 8;
            const borderWidth = (borderConfig.width ?? parseInt(style.borderWidth, 10)) || 2;

            const lines = labelText.split('\n');
            const lineHeight = this._resolveLineHeight(style);
            // Status line gets a smaller line height
            const statusLineHeight = hasStatus ? Math.round(10 * 1.2) : lineHeight;

            // Measure each line with appropriate font
            const lineWidths = lines.map((line, i) => {
                const useFont = hasStatus && i === 1 ? statusFont : font;
                ctx.font = useFont;
                return Math.ceil(ctx.measureText(line).width);
            });
            const textWidth = Math.max(...lineWidths, 0);
            const textBlockHeight = (lines.length === 2)
                ? lineHeight + statusLineHeight + 2  // 2px gap between lines
                : lineHeight * lines.length;

            const rectWidth = textWidth + paddingLeft + paddingRight;
            const rectHeight = textBlockHeight + paddingTop + paddingBottom;

            canvas.width = rectWidth + borderWidth * 2;
            canvas.height = rectHeight + borderWidth * 2;

            // Colors: prefer locked palette to avoid dark-mode overrides
            const bgColor = LABEL_STYLE.colors?.background || style.backgroundColor || 'white';
            const borderColor = LABEL_STYLE.colors?.border || style.borderColor || 'black';
            const textColor = LABEL_STYLE.colors?.text || style.color || 'black';

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
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelCenterX = rectX + rectWidth / 2;
            let currentY = rectY + paddingTop;

            lines.forEach((line, index) => {
                const useFont = hasStatus && index === 1 ? statusFont : font;
                const useColor = hasStatus && index === 1 && statusColor ? statusColor : textColor;
                const lh = (hasStatus && index === 0) ? lineHeight : (hasStatus && index === 1 ? statusLineHeight : lineHeight);
                ctx.font = useFont;
                ctx.fillStyle = useColor;
                currentY += lh / 2;
                ctx.fillText(line, labelCenterX, currentY);
                currentY += lh / 2;
                if (hasStatus && index === 0) currentY += 2; // 2px gap
            });

            return canvas;
        } finally {
            tempLabel.remove();
        }
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
