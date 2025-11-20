import { UI_IDS, UI_CLASSES } from './config.js';

export class UIManager {
  constructor() {
    this.floorUIContainer = null;
    this.buildingBar = null;
    this.floorBar = null;
    this.searchBar = null;
    this.searchInput = null;
    this.searchResultsContainer = null;
    this._handleDocumentClick = null;
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
      this.interactionManager.clearFloorSelections(true);
      this._updateBuildingFocus(null);
      this._renderFloorButtons(null);
      this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
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
        this.interactionManager.resetPinsForBuilding(buildingID);
        this._updateBuildingFocus(buildingID);

        if ((modelManager.maxFloorVisibleByBuilding.get(buildingID) ?? -1) < 0) {
          await modelManager.setFloorLevel(buildingID, 0);
        }

        const floorsMap = this.modelManager.entries.get(buildingID);
        let newActiveFloor = 0;
        if (floorsMap && floorsMap.size > 0) {
          newActiveFloor = Math.min(...floorsMap.keys());
        }

        await this.modelManager.setFloorLevel(buildingID, newActiveFloor);
        this.interactionManager.activateFloorPins(buildingID, newActiveFloor);
        this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
        
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
    this.searchInput = searchInput;
    
    const filterBtn = document.createElement('button');
    filterBtn.innerHTML = '▼';
    filterBtn.id = 'filter-btn';
    filterBtn.className = 'ui-btn active';
    filterBtn.addEventListener('click', () => this._showAllPinsSearch());

    const searchResultsContainer = document.createElement('div');
    searchResultsContainer.id = 'search-results';
    this.searchResultsContainer = searchResultsContainer;

    searchBar.appendChild(searchInput);
    searchBar.appendChild(filterBtn);
    searchBar.appendChild(searchResultsContainer);
    uiContainer.appendChild(searchBar);
    this.searchBar = searchBar;

    this.searchInput.addEventListener('input', () => this._onSearchInput());
    this._handleDocumentClick = (event) => {
      if (!searchBar.contains(event.target)) {
        this._clearSearchResults();
      }
    };
    document.addEventListener('click', this._handleDocumentClick);

    // --- DATE/TIME BAR (Row 4 Placeholder) --------------------
    const dateTimeBar = document.createElement('div');
    dateTimeBar.id = 'datetime-bar';

    // const dateBtn = document.createElement('button');
    // dateBtn.textContent = 'Data 📅';
    // dateBtn.className = 'ui-btn';

    // const turnoBtn = document.createElement('button');
    // turnoBtn.textContent = 'Turno 🕒';
    // turnoBtn.className = 'ui-btn';

    // dateTimeBar.appendChild(dateBtn);
    // dateTimeBar.appendChild(turnoBtn);
    uiContainer.appendChild(dateTimeBar);

    // --- INITIAL RENDER ---------------------------------------------
    document.body.appendChild(uiContainer);
    this.floorUIContainer = uiContainer;

    this._updateBuildingFocus(null);
    this._renderFloorButtons(null);
  }

  setControlsEnabled(enabled) {
    if (this.floorUIContainer) {
      this.floorUIContainer.style.display = enabled ? '' : 'none';
    }
    if (!enabled) {
      this._clearSearchResults();
    }
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
    interactionManager.activateFloorPins(focused, level);
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

    const activeFloor = this.interactionManager.getActiveFloor(buildingID);
    this._highlightActiveFloors(typeof activeFloor === 'number' ? activeFloor : null);
  }

  _highlightActiveFloors(level) {
    const buttons = this.floorBar.querySelectorAll('button');
    buttons.forEach((b) => {
      const f = Number(b.dataset.floor);
      const highlight = typeof level === 'number' ? f === level : false;
      b.classList.toggle('active', highlight);
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

  _onSearchInput() {
    if (!this.searchInput) return;
    const searchTerm = this.searchInput.value.trim().toLowerCase();
    if (searchTerm.length < 2) {
      this._clearSearchResults();
      return;
    }

    const allPins = this.interactionManager?.getAllPins?.() ?? [];
    const results = allPins.filter((pin) => {
      const label = pin.userData.displayName ?? pin.userData.id ?? '';
      return label.toLowerCase().includes(searchTerm);
    });

    this._renderSearchResults(results);
  }

  _showAllPinsSearch() {
    const allPins = this.interactionManager?.getAllPins?.() ?? [];
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this._renderSearchResults(allPins);
  }

  _renderSearchResults(results) {
    if (!this.searchResultsContainer) return;
    this.searchResultsContainer.innerHTML = '';

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-result-item no-results';
      empty.textContent = 'Nenhum resultado';
      this.searchResultsContainer.appendChild(empty);
      this.searchResultsContainer.style.display = 'block';
      return;
    }

    results.forEach((pin) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.textContent = pin.userData.displayName ?? pin.userData.id ?? 'Pin';
      item.addEventListener('click', () => this._handleSearchResultClick(pin));
      this.searchResultsContainer.appendChild(item);
    });

    this.searchResultsContainer.style.display = 'block';
  }

  async _handleSearchResultClick(pin) {
    if (!pin) return;
    const building = pin.userData.building;
    const floorLevel = pin.userData.floorLevel;
    if (!building || typeof floorLevel !== 'number') {
      console.warn('Search result missing building or floor info', pin);
      return;
    }

    for (const b of Object.keys(this.modelManager.manifest)) {
      this.modelManager.enableBuilding(b, false);
    }
    this.modelManager.enableBuilding(building, true);
    await this.modelManager.setFloorLevel(building, floorLevel);

    this.interactionManager.activateFloorPins(building, floorLevel);
    this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();

    this.modelManager.focusBuilding(building);
    this._updateBuildingFocus(building);
    this._renderFloorButtons(building);
    this._highlightActiveFloors(floorLevel);

    this.cameraManager.focusOnPin(pin);

    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this._clearSearchResults();
  }

  _clearSearchResults() {
    if (!this.searchResultsContainer) return;
    this.searchResultsContainer.innerHTML = '';
    this.searchResultsContainer.style.display = 'none';
  }
}
