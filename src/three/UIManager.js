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
    /** @type {Array<{modelId: string|null, name: string, number: string, block: string, type: string, reservable: boolean}>} */
    this._searchSpaces = [];
  }

  /**
   * Set backend space data for search. Replaces manifest-based pin search.
   * @param {Array<{modelId: string|null, name: string, number: string, block: string, type: string, reservable: boolean}>} spaces
   */
  setSearchSpaces(spaces) {
    this._searchSpaces = spaces.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
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
    showAllBtn.addEventListener('click', () => this.selectAll());
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

      btn.addEventListener('click', () => this.selectBuilding(buildingID));

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

    // --- MOBILE COLLAPSE TOGGLE -------------------------------------
    const isMobile = () => window.matchMedia('(max-width: 480px)').matches;
    this._userExpanded = false;

    // Only create the toggle button if on mobile (legacy behavior)
    if (isMobile()) {
      this._toggleBtn = document.createElement('button');
      this._toggleBtn.className = 'floor-ui-toggle';
      this._toggleBtn.setAttribute('aria-label', 'Expandir/colapsar controles');
      this._toggleBtn.textContent = '▲ Controles';

      this._toggleBtn.addEventListener('click', () => {
        const collapsed = this.floorUIContainer.classList.toggle('collapsed');
        this._userExpanded = !collapsed;
        this._toggleBtn.textContent = collapsed ? '▲ Controles' : '▼ Fechar';
      });

      // Insert as the FIRST child of the container
      this.floorUIContainer.insertBefore(this._toggleBtn, this.floorUIContainer.firstChild);

      // Default: collapsed on mobile
      this.floorUIContainer.classList.add('collapsed');
      this._toggleBtn.textContent = '▲ Controles';
    }

    // Re-evaluate on resize (e.g., landscape rotation)
    window.addEventListener('resize', () => {
      if (!this.floorUIContainer) return;
      if (!isMobile()) {
        this.floorUIContainer.classList.remove('collapsed');
      } else if (this._toggleBtn && !this._userExpanded) {
        this.floorUIContainer.classList.add('collapsed');
        this._toggleBtn.textContent = '▲ Controles';
      }
    });

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

  /**
   * Programmatically select a building. Used by ViewerControlsRail.
   * Pass null to deselect (equivalent to "Todos").
   */
  async selectBuilding(buildingID) {
    if (buildingID === null) {
      return this.selectAll();
    }

    for (const b of Object.keys(this.modelManager.manifest)) {
      this.modelManager.enableBuilding(b, false);
    }
    this.modelManager.enableBuilding(buildingID, true);
    this.modelManager.focusBuilding(buildingID);
    this.interactionManager.resetPinsForBuilding(buildingID);
    this._updateBuildingFocus(buildingID);

    if ((this.modelManager.maxFloorVisibleByBuilding.get(buildingID) ?? -1) < 0) {
      await this.modelManager.setFloorLevel(buildingID, 0);
    }

    const floorsMap = this.modelManager.entries.get(buildingID);
    let newActiveFloor = 0;
    if (floorsMap && floorsMap.size > 0) {
      newActiveFloor = Math.min(...floorsMap.keys());
    }

    await this.modelManager.setFloorLevel(buildingID, newActiveFloor);
    this.interactionManager.activateFloorPins(buildingID, newActiveFloor);
    this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
    this.cameraManager?.applyBlockFocusZoomLimits?.();

    const blockBox = this.modelManager.getBlockBoundingBox(buildingID);
    if (!blockBox.isEmpty()) {
      this.cameraManager.fitCameraToBox(blockBox);
    }

    this._renderFloorButtons(buildingID);

    // Notify listeners (Vue layer) so the rail can update its state.
    window.dispatchEvent(new CustomEvent('ufcim:building-changed', {
      detail: { buildingID, activeFloor: newActiveFloor }
    }));
  }

  /** Programmatically select "Todos" (no building focus). */
  async selectAll() {
    await this.modelManager.showAllBlocks();
    this.interactionManager.clearFloorSelections(true);
    this._updateBuildingFocus(null);
    this._renderFloorButtons(null);
    this.interactionManager.blockingMeshes = this.modelManager.getAllMeshes();
    this.cameraManager?.applyDefaultZoomLimits?.();
    this.cameraManager.resetToDefaultState();

    window.dispatchEvent(new CustomEvent('ufcim:building-changed', {
      detail: { buildingID: null, activeFloor: null }
    }));
  }

  /** Programmatically select a floor on the active building. */
  async selectFloor(level) {
    await this._handleFloorClick(level);
    window.dispatchEvent(new CustomEvent('ufcim:floor-changed', {
      detail: { level }
    }));
  }

  getBuildingsList() {
    const list = [];
    if (!this.modelManager?.manifest) return list;
    for (const [id, data] of Object.entries(this.modelManager.manifest)) {
      if (data.hidden) continue;
      list.push({ id, name: data.name || id });
    }
    return list;
  }

  getFloorsForBuilding(buildingID) {
    if (!this.modelManager?.manifest) return [];
    const data = this.modelManager.manifest[buildingID];
    if (!data?.floors) return [];
    return data.floors
      .map(f => ({ level: f.level, name: f.name }))
      .sort((a, b) => a.level - b.level);
  }

  getActiveBuildingId() {
    const active = this.buildingBar?.querySelector('button.active[data-building]');
    if (!active) return null;
    const id = active.dataset.building;
    return id === 'all' ? null : id;
  }

  getActiveFloorLevel() {
    const activeId = this.getActiveBuildingId();
    if (!activeId || !this.interactionManager) return null;
    const f = this.interactionManager.getActiveFloor(activeId);
    return typeof f === 'number' ? f : null;
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
        await this.selectFloor(level);
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

  dispose() {
    if (this._handleDocumentClick) {
      document.removeEventListener('click', this._handleDocumentClick);
      this._handleDocumentClick = null;
    }
    if (this.floorUIContainer) {
      this.floorUIContainer.remove();
      this.floorUIContainer = null;
    }
  }

  toggleFloorUI(show) {
    if (this.floorUIContainer) {
      this.floorUIContainer.style.opacity = show ? '1' : '0';
      this.floorUIContainer.style.pointerEvents = show ? 'auto' : 'none';
      this.floorUIContainer.style.visibility = show ? 'visible' : 'hidden';
    }
  }

  _onSearchInput() {
    if (!this.searchInput) return;
    const searchTerm = this.searchInput.value.trim().toLowerCase();
    if (searchTerm.length < 2) {
      this._clearSearchResults();
      return;
    }

    const results = this._searchSpaces.filter((space) =>
      space.name.toLowerCase().includes(searchTerm) ||
      space.number.toLowerCase().includes(searchTerm),
    );

    this._renderSearchResults(results);
  }

  _showAllPinsSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this._renderSearchResults(this._searchSpaces);
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

    results.forEach((space) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';

      const nameEl = document.createElement('span');
      nameEl.className = 'search-result-name';
      nameEl.textContent = space.name;

      const metaEl = document.createElement('span');
      metaEl.className = 'search-result-meta';
      metaEl.textContent = space.block;

      if (!space.reservable) {
        const tag = document.createElement('span');
        tag.className = 'search-result-tag';
        tag.textContent = '(indisponível)';
        metaEl.appendChild(tag);
      }

      item.appendChild(nameEl);
      item.appendChild(metaEl);
      item.addEventListener('click', () => this._handleSearchResultClick(space));
      this.searchResultsContainer.appendChild(item);
    });

    this.searchResultsContainer.style.display = 'block';
  }

  async _handleSearchResultClick(space) {
    if (!space?.modelId) return;

    // Find the corresponding 3D pin
    const allPins = this.interactionManager?.getAllPins?.() ?? [];
    const pin = allPins.find((p) => p.userData?.id === space.modelId);
    if (!pin) return;

    const building = pin.userData.building;
    const floorLevel = pin.userData.floorLevel;
    if (!building || typeof floorLevel !== 'number') return;

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

    // Expand the panel so the user sees which floor/building activated
    if (window.matchMedia('(max-width: 480px)').matches) {
      this.floorUIContainer.classList.remove('collapsed');
      this._userExpanded = true;
      if (this._toggleBtn) this._toggleBtn.textContent = '▼ Fechar';
    }

    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this._clearSearchResults();

    // Notify Vue layer: close search sheet + open popup for this pin
    window.dispatchEvent(new CustomEvent('ufcim:pin-click', {
      detail: {
        pinId: space.modelId,
        displayName: space.name,
        building: building,
        floorLevel: floorLevel,
      },
    }));
  }

  _clearSearchResults() {
    if (!this.searchResultsContainer) return;
    this.searchResultsContainer.innerHTML = '';
    this.searchResultsContainer.style.display = 'none';
  }
}
