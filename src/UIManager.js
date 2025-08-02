import TWEEN from 'three/examples/jsm/libs/tween.module.js';

export class UIManager {
    constructor() {
        this.floorUIName = 'floor-ui';
        this.popupName = 'info-popup';
        this.savedCameraState = null;
    }

    createFloorUI(modelManager) {
        const uiContainer = document.createElement('div');
        uiContainer.id = this.floorUIName;
        Object.assign(uiContainer.style, {
            position: 'absolute', top: '50%', right: '20px', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.8)',
            padding: '10px', borderRadius: '4px', zIndex: '10', transition: 'opacity 0.3s ease'
        });

        const floorActions = [
            { label: '2', level: 2 },
            { label: '1', level: 1 },
            { label: '0', level: 0 }
        ];

        floorActions.forEach(({ label, level }) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.onclick = () => modelManager.setVisibility(level);
            uiContainer.appendChild(btn);
        });
        document.body.appendChild(uiContainer);
    }

    showPopup(pin, event, camera, controls) {
        if (document.getElementById(this.popupName)) return;

        this.savedCameraState = {
            position: camera.position.clone(),
            target: controls.target.clone()
        };

        const popup = this._createPopupElement(event.clientX, event.clientY);
        this._currentPopup = popup;

        this._animatePopupOpen(popup);
        this._animateCameraToPin(pin, camera, controls);
        this._toggleFloorUI(false);

        // Close via button
        popup.querySelector('.popup-close').addEventListener('click', () => this.closePopup(camera, controls));

        // Close via outside click
        this._handleOutsideClick = (e) => {
            if (!popup.contains(e.target)) {
                this.closePopup(camera, controls);
                document.removeEventListener('pointerdown', this._handleOutsideClick);
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', this._handleOutsideClick), 0);
    }


    closePopup(camera, controls) {
        const popup = document.getElementById(this.popupName);
        if (!popup) return;

        popup.style.transform = 'translate(-50%, 150%) scale(0.5)';
        popup.style.opacity = '0';
        popup.addEventListener('transitionend', () => popup.remove(), { once: true });

        this._animateCameraToSavedPosition(camera, controls);
        this._toggleFloorUI(true);

        // Remove outside click listener and popup reference
        if (this._handleOutsideClick) {
            document.removeEventListener('pointerdown', this._handleOutsideClick);
            this._handleOutsideClick = null;
        }
        this._currentPopup = null;
    }

    
    _createPopupElement(x, y) {
        const popup = document.createElement('div');
        popup.id = this.popupName;
        popup.innerHTML = `
            <button class="popup-close" style="position:absolute;top:5px;right:5px;background:none;border:none;font-size:18px;cursor:pointer;">&times;</button>
            <div>Environment Preview</div>
            <p>Details about the object at position (${x.toFixed(0)}, ${y.toFixed(0)}) would go here.</p>
        `;
        Object.assign(popup.style, {
            position: 'absolute', left: '50%', bottom: '20px', transform: 'translateX(-50%)',
            width: '80%', height: '50vh', padding: '20px', background: '#fff',
            border: '1px solid #ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px', zIndex: '20', opacity: '0',
            transition: 'opacity 0.3s ease, transform 0.4s ease-out'
        });
        document.body.appendChild(popup);
        return popup;
    }

    _animatePopupOpen(popup) {
        requestAnimationFrame(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translateX(-50%)';
        });
    }
    
    _animateCameraToPin(pin, camera, controls) {
        const offset = camera.position.clone().sub(controls.target);
        const newTarget = pin.position.clone();

        const verticalOffset = 15; 
        newTarget.y -= verticalOffset;

        const newCamPos = newTarget.clone().add(offset);
        
        new TWEEN.Tween(camera.position)
            .to(newCamPos, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        new TWEEN.Tween(controls.target)
            .to(newTarget, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
        
    _animateCameraToSavedPosition(camera, controls) {
        if (!this.savedCameraState) return;
        new TWEEN.Tween(camera.position).to(this.savedCameraState.position, 1000).easing(TWEEN.Easing.Quadratic.Out).start();
        new TWEEN.Tween(controls.target).to(this.savedCameraState.target, 1000).easing(TWEEN.Easing.Quadratic.Out).start();
        this.savedCameraState = null;
    }
    
    _toggleFloorUI(show) {
        const floorMenu = document.getElementById(this.floorUIName);
        if (floorMenu) {
            floorMenu.style.opacity = show ? '1' : '0.1';
            floorMenu.style.pointerEvents = show ? 'auto' : 'none';
        }
    }
}