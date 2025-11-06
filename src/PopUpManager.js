import { UI_IDS, UI_CLASSES } from './config.js';

const POPUP_DB_URL = '/assets/pins_db_popup.json';

// Load popup DB once and keep it cached.
let POPUP_DB = null;

async function getPopupDB() {
  if (POPUP_DB) return POPUP_DB;
  const response = await fetch(POPUP_DB_URL, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to fetch popup DB: ${response.status}`);
  }
  const payload = await response.json();
  POPUP_DB = Object.fromEntries((payload.rooms || []).map((room) => [room.id, room]));
  return POPUP_DB;
}

export class PopupManager {
  constructor(camera, controls, uiManager, cameraManager, interactionManager = null) {
    this.camera = camera;
    this.controls = controls;
    this.uiManager = uiManager;
    this.cameraManager = cameraManager;
    this.interactionManager = interactionManager;

    this._currentPopup = null;
    this._handleOutsideClick = null;
    this._selectedPin = null;
    this._selectedPinState = null;
    this._selectedLabel = null;
    this._selectedLabelState = null;
    this._interactionLocked = false;
    this._controlsLocked = false;
    this._pendingControlUnlock = null;
  }

  async show(pin, event) {
    if (pin?.userData?.opensPopup === false) {
      this._focusPinWithoutPopup(pin);
      return;
    }
    if (document.getElementById(UI_IDS.popup)) return;

    if (!this._interactionLocked && this.interactionManager && typeof this.interactionManager.setInteractionsEnabled === 'function') {
      this.interactionManager.setInteractionsEnabled(false);
      this._interactionLocked = true;
    }

    this.cameraManager.saveCurrentState();

    const label =
      pin.userData?.displayName ||
      pin.userData?.id ||
      pin.name ||
      'Unknown Pin';

    this._applySelectedPin(pin);

    let roomRecord = null;
    try {
      if (pin?.userData?.id) {
        const db = await getPopupDB();
        roomRecord = db[pin.userData.id] || null;
      }
    } catch (error) {
      console.error('Failed to load popup DB', error);
    }

    const pointerX = event?.clientX ?? window.innerWidth / 2;
    const pointerY = event?.clientY ?? window.innerHeight / 2;

    const popup = this._createPopupElement(
      pointerX,
      pointerY,
      label,
      roomRecord
    );
    this._currentPopup = popup;

    this._animatePopupOpen(popup);

    this.cameraManager.focusOnPin(pin);

    this.uiManager.toggleFloorUI(false);

    popup.querySelector(`.${UI_CLASSES.popupCloseButton}`)
      .addEventListener('click', () => this.close({ triggeredByPointer: true }));
    
    if (this._handleOutsideClick) {
      document.removeEventListener('pointerdown', this._handleOutsideClick);
      this._handleOutsideClick = null;
    }

    this._handleOutsideClick = (e) => {
      if (!popup.contains(e.target)) this.close({ triggeredByPointer: true });
    };
    setTimeout(() => document.addEventListener('pointerdown', this._handleOutsideClick), 0);
  }

  close(options = {}) {
    const {
      restoreCamera = true,
      triggeredByPointer = false,
    } = options;
    const popup = this._currentPopup;
    const controlsLocked = this._controlsLocked;

    this._restoreSelectedPin();

    if (this._handleOutsideClick) {
      document.removeEventListener('pointerdown', this._handleOutsideClick);
      this._handleOutsideClick = null;
    }

    if (restoreCamera) {
      this.cameraManager.restoreSavedState({ keepControlsDisabled: controlsLocked });
    } else {
      this.cameraManager.savedCameraState = null;
    }

    this.uiManager.toggleFloorUI(true);

    if (popup) {
      popup.style.transform = 'translate(-50%, 150%) scale(0.5)';
      popup.style.opacity = '0';

      popup.addEventListener('transitionend', () => {
        popup.remove();
        this._currentPopup = null;
      }, { once: true });
    } else {
      this._currentPopup = null;
    }

    if (this._interactionLocked) {
      this._interactionLocked = false;
      if (this.interactionManager && typeof this.interactionManager.setInteractionsEnabled === 'function') {
        this.interactionManager.setInteractionsEnabled(true);
      }
    }

    if (controlsLocked) {
      this._scheduleControlsUnlock(triggeredByPointer);
      this._controlsLocked = false;
    }
  }

  _createPopupElement(x, y, pinLabel, roomRecord) {
    const capacityDisplay = roomRecord?.capacidade ?? '--';
    const acValue = Number.isFinite(roomRecord?.ar_condicionado) ? roomRecord.ar_condicionado : null;
    const acDisplay = acValue === null ? '--' : acValue === 0 ? 'Não disponível' : acValue;
    const lightDisplay = roomRecord?.iluminacao ?? 'Natural + Led';
    const furnitureRaw = roomRecord?.mobiliario ?? '';
    const furnitureDisplay = furnitureRaw || 'Sem itens registrados';
    const projectorValue = Number.isFinite(roomRecord?.projetor) ? roomRecord.projetor : null;
    const projectorDisplay = projectorValue === null ? '--' : projectorValue === 0 ? 'Não disponível' : projectorValue;
    const headerLabel = roomRecord?.displayName ?? pinLabel;

    const popup = document.createElement('div');
    popup.id = UI_IDS.popup;
    popup.className = UI_CLASSES.popup;

    popup.innerHTML = `
            <button class="popup-close">&times;</button>
            <div class="popup-header">
                <h2>${headerLabel}</h2>
                <!-- <div class="status-tag">Disponivel</div> -->
            </div>
            <div class="popup-info">
                <ul>
                    <li>👥 <strong>Capacidade:</strong> ${capacityDisplay}</li>
                    <li>❄️ <strong>Ar condicionado:</strong> ${acDisplay}</li>
                    <li>💡 <strong>Iluminacao:</strong> ${lightDisplay}</li>
                    <li>🪑 <strong>Mobiliario:</strong> ${furnitureDisplay}</li>
                    <li>📽️ <strong>Projetor:</strong> ${projectorDisplay}</li>
                </ul>
            </div>
            <!--
            <div class="popup-actions">
                <button class="reserve-btn">Reservar</button>
                <button class="details-btn">Mais Detalhes</button>
            </div>
            -->
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
    this.close({ restoreCamera: false });
  }

  _focusPinWithoutPopup(pin) {
    if (!pin) return;

    if (!this._interactionLocked && this.interactionManager && typeof this.interactionManager.setInteractionsEnabled === 'function') {
      this.interactionManager.setInteractionsEnabled(false);
      this._interactionLocked = true;
    }

    this.cameraManager.saveCurrentState();
    this._applySelectedPin(pin);
    this._currentPopup = null;

    this._clearPendingControlUnlock();
    this.cameraManager.focusOnPin(pin, undefined, { keepControlsDisabled: true });
    this._controlsLocked = true;
    this.controls.enabled = false;
    this.uiManager.toggleFloorUI(false);

    if (this._handleOutsideClick) {
      document.removeEventListener('pointerdown', this._handleOutsideClick);
      this._handleOutsideClick = null;
    }

    this._handleOutsideClick = () => this.close({ triggeredByPointer: true });
    setTimeout(() => document.addEventListener('pointerdown', this._handleOutsideClick), 0);
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

  _scheduleControlsUnlock(triggeredByPointer) {
    if (!this.controls) return;

    const unlock = () => {
      this.controls.enabled = true;
      this._clearPendingControlUnlock();
    };

    if (triggeredByPointer) {
      this._clearPendingControlUnlock();
      this._pendingControlUnlock = () => {
        unlock();
      };
      window.addEventListener('pointerup', this._pendingControlUnlock, false);
    } else {
      unlock();
    }
  }

  _clearPendingControlUnlock() {
    if (this._pendingControlUnlock) {
      window.removeEventListener('pointerup', this._pendingControlUnlock, false);
      this._pendingControlUnlock = null;
    }
  }
}
