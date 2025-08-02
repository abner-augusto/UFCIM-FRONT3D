import TWEEN from 'three/examples/jsm/libs/tween.module.js';
import { UI_IDS, UI_CLASSES, ANIMATION_DURATION } from './config.js';

export class PopupManager {
    constructor(camera, controls, uiManager) {
        this.camera = camera;
        this.controls = controls;
        this.uiManager = uiManager;

        this.savedCameraState = null;
        this._currentPopup = null;
        this._handleOutsideClick = null;
    }

    show(pin, event) {
        if (document.getElementById(UI_IDS.popup)) return;

        this.savedCameraState = {
            position: this.camera.position.clone(),
            target: this.controls.target.clone(),
        };

        const popup = this._createPopupElement(
            event.clientX,
            event.clientY,
            pin.userData.id || pin.name || 'Unknown Pin'
        );
        this._currentPopup = popup;

        this._animatePopupOpen(popup);
        this._animateCameraToPin(pin);
        this.uiManager.toggleFloorUI(false);

        popup.querySelector(`.${UI_CLASSES.popupCloseButton}`)
            .addEventListener('click', () => this.close());

        this._handleOutsideClick = (e) => {
            if (!popup.contains(e.target)) this.close();
        };
        setTimeout(() => document.addEventListener('pointerdown', this._handleOutsideClick), 0);
    }

    close() {
        const popup = this._currentPopup;
        if (!popup) return;

        if (this._handleOutsideClick) {
            document.removeEventListener('pointerdown', this._handleOutsideClick);
            this._handleOutsideClick = null;
        }

        this._animateCameraToSavedPosition();
        this.uiManager.toggleFloorUI(true);

        popup.style.transform = 'translate(-50%, 150%) scale(0.5)';
        popup.style.opacity = '0';
        
        popup.addEventListener('transitionend', () => {
            popup.remove();
            this._currentPopup = null;
        }, { once: true });
    }

    _createPopupElement(x, y, pinId) {
        const popup = document.createElement('div');
        popup.id = UI_IDS.popup;
        popup.className = UI_CLASSES.popup;

        popup.innerHTML = `
            <button class="popup-close">&times;</button>
            <div class="popup-header">
                <h2>📍 ${pinId}</h2>
                <div class="status-tag">Disponível</div>
            </div>
            <ul>
                <li>👥 <strong>Capacidade:</strong> 30 lugares</li>
                <li>❄️ <strong>Ar condicionado:</strong> Sim (Funcionando)</li>
                <li>💡 <strong>Iluminação:</strong> Natural + Led</li>
                <li>🪑 <strong>Mobiliário:</strong> Mesas e Cadeiras</li>
                <li>📽️ <strong>Projetor:</strong> Sim (Funcionando)</li>
            </ul>
            <div class="popup-actions">
                <button class="reserve-btn">Reservar</button>
                <button class="details-btn">Mais Detalhes</button>
            </div>
        `;

        document.body.appendChild(popup);
        return popup;
    }



    _animatePopupOpen(popup) {
        requestAnimationFrame(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translateX(-50%)';
        });
    }

    _animateCameraToPin(pin) {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const newTarget = pin.position.clone();
        newTarget.y -= 15;

        const newCamPos = newTarget.clone().add(offset);
        
        new TWEEN.Tween(this.camera.position)
            .to(newCamPos, ANIMATION_DURATION)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onStart(() => {
                this.controls.enabled = false;
            })
            .start();
        
        new TWEEN.Tween(this.controls.target)
            .to(newTarget, ANIMATION_DURATION)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                this.controls.enabled = true;
            })
            .start();
    }

    _animateCameraToSavedPosition() {
        if (!this.savedCameraState) return;

        new TWEEN.Tween(this.camera.position)
            .to(this.savedCameraState.position, ANIMATION_DURATION)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onStart(() => {
                this.controls.enabled = false;
            })
            .start();
            
        new TWEEN.Tween(this.controls.target)
            .to(this.savedCameraState.target, ANIMATION_DURATION)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                this.controls.enabled = true;
            })
            .start();
            
        this.savedCameraState = null;
    }
    
    dispose() {
        if (this._handleOutsideClick) {
            document.removeEventListener('pointerdown', this._handleOutsideClick);
            this._handleOutsideClick = null;
        }
        if (this._currentPopup) {
            this._currentPopup.remove();
            this._currentPopup = null;
        }
    }
}