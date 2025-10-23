import { UI_IDS, UI_CLASSES } from './config.js';

export class UIManager {
  constructor() {
    this.floorUIContainer = null;
    this.buildingBar = null;
    this.floorBar = null;
    this.modelManager = null;
    this.interactionManager = null;
    this.cameraManager = null;
  }

  async createFloorUI(modelManager, interactionManager, cameraManager) {
    this.modelManager = modelManager;
    this.interactionManager = interactionManager;
    this.cameraManager = cameraManager;

    // --- ROOT CONTAINER ---------------------------------------------
    const uiContainer = document.createElement('div');
    uiContainer.id = UI_IDS.floorUI;
    uiContainer.className = UI_CLASSES.floorUIContainer;

    // --- BUILDING BUTTON BAR ----------------------------------------
    const buildingBar = document.createElement('div');
    buildingBar.id = 'buildings-bar';

    // --- "TODOS" (SHOW ALL) BUTTON ----------------------------------
    const showAllBtn = document.createElement('button');
    showAllBtn.textContent = 'Todos';
    showAllBtn.className = 'ui-btn'; // <-- Set class
    showAllBtn.dataset.building = 'all';
    showAllBtn.addEventListener('click', async () => {
      await modelManager.showAllBlocks();
      this._updateBuildingFocus(null);
      this._renderFloorButtons(null);
      this.cameraManager.resetToDefaultState();
    });
    buildingBar.appendChild(showAllBtn);

    // --- INDIVIDUAL BUILDING BUTTONS ---------------------------------
    for (const buildingID of Object.keys(modelManager.manifest)) {
      const buildingData = modelManager.manifest[buildingID];
      if (buildingData.hidden) {
        continue;
      }
      const btn = document.createElement('button');
      
      // Use the pretty name from the manifest
      btn.textContent = buildingData.name || buildingID;
      
      btn.className = 'ui-btn'; // <-- Set class
      // The data attribute still uses the unique ID
      btn.dataset.building = buildingID;

      btn.addEventListener('click', async () => {
        for (const b of Object.keys(this.modelManager.manifest)) {
          this.modelManager.enableBuilding(b, false);
        }
        // All logic continues to use the buildingID
        this.modelManager.enableBuilding(buildingID, true);

        modelManager.focusBuilding(buildingID);
        this._updateBuildingFocus(buildingID);

        if ((modelManager.maxFloorVisibleByBuilding.get(buildingID) ?? -1) < 0) {
          await modelManager.setFloorLevel(buildingID, 0);
        }
        
        const blockBox = this.modelManager.getBlockBoundingBox(buildingID);
        if (!blockBox.isEmpty()) {
          this.cameraManager.fitCameraToBox(blockBox);
        }

        this._renderFloorButtons(buildingID);
      });

      buildingBar.appendChild(btn);
    }
    // --- END MODIFICATION ---

    uiContainer.appendChild(buildingBar);
    this.buildingBar = buildingBar;

    // --- FLOOR BUTTON BAR -------------------------------------------
    const floorBar = document.createElement('div');
    floorBar.id = 'floor-bar';
    uiContainer.appendChild(floorBar);
    this.floorBar = floorBar;

    // --- SEARCH BAR (Row 3 Placeholder) -----------------------
    const searchBar = document.createElement('div');
    searchBar.id = 'search-bar';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Pesquisa';
    searchInput.id = 'search-input';
    searchInput.className = 'ui-btn';
    
    const filterBtn = document.createElement('button');
    filterBtn.innerHTML = '▼';
    filterBtn.id = 'filter-btn';
    filterBtn.className = 'ui-btn active';

    searchBar.appendChild(searchInput);
    searchBar.appendChild(filterBtn);
    uiContainer.appendChild(searchBar);

    // --- DATE/TIME BAR (Row 4 Placeholder) --------------------
    const dateTimeBar = document.createElement('div');
    dateTimeBar.id = 'datetime-bar';

    const dateBtn = document.createElement('button');
    dateBtn.textContent = 'Data 📅';
    dateBtn.className = 'ui-btn';

    const turnoBtn = document.createElement('button');
    turnoBtn.textContent = 'Turno 🕒';
    turnoBtn.className = 'ui-btn';

    dateTimeBar.appendChild(dateBtn);
    dateTimeBar.appendChild(turnoBtn);
    uiContainer.appendChild(dateTimeBar);

    // --- INITIAL RENDER ---------------------------------------------
    document.body.appendChild(uiContainer);
    this.floorUIContainer = uiContainer;

    this._updateBuildingFocus(null);
    this._renderFloorButtons(null);
  }

  // ------------------------------------------------------------------

  async _handleFloorClick(level) {
    const { modelManager, interactionManager, cameraManager } = this;
    const focused = modelManager.focusedBuilding;
    if (!focused) return;

    for (let f = 0; f <= level; f++) {
      await modelManager.setFloorLevelForFocused(f);
    }
    const floorObject = this.modelManager.getFloorObject(focused, level);
    if (floorObject) {
      cameraManager.focusOnObjectAtCurrentDistance(floorObject);
    }
    interactionManager.blockingMeshes = modelManager.getAllMeshes();
    this._highlightActiveFloors(level);
  }

  _renderFloorButtons(buildingID) {
    this.floorBar.innerHTML = '';
    if (!buildingID) {
      return;
    }

    // Get the .floors array from the manifest for this building
    const buildingData = this.modelManager.manifest[buildingID];
    const floors = buildingData?.floors || [];

    if (floors.length === 0) {
        return; // Nothing to render
    }
    
    // Iterate over the floor data objects directly
    for (const floorData of floors) {
      const level = floorData.level;
      const prettyName = floorData.name;

      const btn = document.createElement('button');
      
      // Use the pretty name
      btn.textContent = prettyName;
      
      // Store the numeric level
      btn.dataset.floor = level.toString();
      btn.className = 'ui-btn';

      btn.addEventListener('click', async () => {
        // Pass the numeric level
        await this._handleFloorClick(level);
      });

      this.floorBar.appendChild(btn);
    }

    const level = this.modelManager.maxFloorVisibleByBuilding.get(buildingID) ?? 0;
    this._highlightActiveFloors(level);
  }

  _highlightActiveFloors(level) {
    const buttons = this.floorBar.querySelectorAll('button');
    buttons.forEach((b) => {
      const f = Number(b.dataset.floor);
      b.classList.toggle('active', f <= level);
    });
  }

  _updateBuildingFocus(focusedBuilding) {
    const btns = this.buildingBar.querySelectorAll('button[data-building]');

    btns.forEach((btn) => {
      const b = btn.dataset.building;
      let isActive = false;

      if (b === 'all') {
        isActive = (focusedBuilding === null);
      } else {
        isActive = (b === focusedBuilding);
      }
      
      btn.classList.toggle('active', isActive);
    });
  }

  toggleFloorUI(show) {
    if (this.floorUIContainer) {
      this.floorUIContainer.style.opacity = show ? '1' : '0.1';
      this.floorUIContainer.style.pointerEvents = show ? 'auto' : 'none';
    }
  }
}