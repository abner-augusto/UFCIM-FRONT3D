import { UI_IDS, UI_CLASSES, ANIMATION_DURATION } from './config.js';

export class PopupManager {
  constructor(camera, controls, uiManager, cameraManager) {
    this.camera = camera;
    this.controls = controls;
    this.uiManager = uiManager;
    this.cameraManager = cameraManager;

    this._currentPopup = null;
    this._handleOutsideClick = null;
    this._selectedPin = null;
    this._selectedPinState = null;
    this._selectedLabel = null;
    this._selectedLabelState = null;
  }

  show(pin, event) {
    if (document.getElementById(UI_IDS.popup)) return;

    this.cameraManager.saveCurrentState();

    const label =
      pin.userData?.displayName ||
      pin.userData?.id ||
      pin.name ||
      'Unknown Pin';

    this._applySelectedPin(pin);

    const popup = this._createPopupElement(
      event.clientX,
      event.clientY,
      label
    );
    this._currentPopup = popup;

    this._animatePopupOpen(popup);

    this.cameraManager.focusOnPin(pin);

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

    this._restoreSelectedPin();

    if (this._handleOutsideClick) {
      document.removeEventListener('pointerdown', this._handleOutsideClick);
      this._handleOutsideClick = null;
    }

    this.cameraManager.restoreSavedState();

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

  dispose() {
    this._restoreSelectedPin();
    if (this._handleOutsideClick) {
      document.removeEventListener('pointerdown', this._handleOutsideClick);
      this._handleOutsideClick = null;
    }
    if (this._currentPopup) {
      this._currentPopup.remove();
      this._currentPopup = null;
    }
  }

  _applySelectedPin(pin) {
    if (!pin || !pin.material) return;

    this._restoreSelectedPin();

    this._selectedPin = pin;
    this._selectedPinState = {
      depthTest: pin.material.depthTest,
      renderOrder: pin.renderOrder,
    };
    pin.material.depthTest = false;
    pin.renderOrder = 10000;

    const label = this._findLabelSprite(pin);
    if (label) {
      this._selectedLabel = label;
      this._selectedLabelState = {
        depthTest: label.material?.depthTest ?? null,
        renderOrder: label.renderOrder,
      };
      if (label.material) label.material.depthTest = false;
      label.renderOrder = 10000;
    }
  }

  _restoreSelectedPin() {
    if (this._selectedPin && this._selectedPinState) {
      if (this._selectedPin.material) {
        this._selectedPin.material.depthTest = this._selectedPinState.depthTest;
      }
      this._selectedPin.renderOrder = this._selectedPinState.renderOrder;
    }
    this._selectedPin = null;
    this._selectedPinState = null;

    if (this._selectedLabel && this._selectedLabelState) {
      if (this._selectedLabel.material && this._selectedLabelState.depthTest !== null) {
        this._selectedLabel.material.depthTest = this._selectedLabelState.depthTest;
      }
      this._selectedLabel.renderOrder = this._selectedLabelState.renderOrder;
    }
    this._selectedLabel = null;
    this._selectedLabelState = null;
  }

  _findLabelSprite(pin) {
    const labelName = `${pin.userData?.id || pin.name}_label`;
    if (!pin.parent) return null;
    return pin.parent.getObjectByName(labelName);
  }
}
