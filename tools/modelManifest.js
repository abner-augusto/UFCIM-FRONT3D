#!/usr/bin/env node
/* Generate a manifest.json for IAUD models.
   - package.json should include: "type": "module"
   - Requires @gltf-transform/core AND three
*/

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
import { TextDecoder } from 'util';

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

const FLOOR_RX = /^floor(\d+)\.glb$/i;
const PIN_NAME_REGEX = /^Pin(#)?_(.+)$/;
const loader = new GLTFLoader();

// ---------------- AABB helper ----------------
class SimpleBox3 {
  constructor() {
    this.min = [Infinity, Infinity, Infinity];
    this.max = [-Infinity, -Infinity, -Infinity];
  }
  expandByBox(bbox) {
    if (!bbox || !bbox.min || !bbox.max) return;
    if (!Number.isFinite(bbox.min[0])) return;
    this.min[0] = Math.min(this.min[0], bbox.min[0]);
    this.min[1] = Math.min(this.min[1], bbox.min[1]);
    this.min[2] = Math.min(this.min[2], bbox.min[2]);
    this.max[0] = Math.max(this.max[0], bbox.max[0]);
    this.max[1] = Math.max(this.max[1], bbox.max[1]);
    this.max[2] = Math.max(this.max[2], bbox.max[2]);
  }
  isEmpty() {
    return !Number.isFinite(this.min[0]);
  }
  toJSON() {
    return this.isEmpty()
      ? { min: [0, 0, 0], max: [0, 0, 0] }
      : { min: [this.min[0], this.min[1], this.min[2]], max: [this.max[0], this.max[1], this.max[2]] };
  }
}

// ---------------- Pretty names ----------------
function getPrettyBuildingName(folderName) {
  return folderName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
function getPrettyFloorName(floorNum) {
  return floorNum === 0 ? 'Térreo' : `${floorNum}º Pavimento`;
}


// --- 2. BOUNDS CALCULATION ---
async function computeFloorData(filePath) {
  let data;
  try {
    data = await fs.readFile(filePath);
  } catch (e) {
    console.warn(`    [WARN] Failed to read file: ${filePath}`);
    return {
      bbox: { min: [0, 0, 0], max: [0, 0, 0] },
      pins: [],
    };
  }

  // Convert Node.js Buffer to ArrayBuffer
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

  try {
    // Parse the GLB data in memory
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, '', resolve, reject);
    });

    // Use Three.js to calculate the bounding box of the whole scene
    const bbox = new Box3();
    gltf.scene.updateMatrixWorld(true);
    bbox.setFromObject(gltf.scene);

    const pins = [];
    gltf.scene.traverse((child) => {
      if (!child?.name) return;
      const match = PIN_NAME_REGEX.exec(child.name);
      if (!match) return;
      const [, silentFlag, rawId] = match;
      const id = rawId.trim();
      if (!id) return;

      const opensPopup = silentFlag !== '#';

      const worldPos = new Vector3();
      child.getWorldPosition(worldPos);
      const localPos = worldPos.clone();
      gltf.scene.worldToLocal(localPos);

      const pinEntry = {
        id,
        position: [localPos.x, localPos.y, localPos.z],
      };
      if (!opensPopup) pinEntry.opensPopup = false;

      pins.push(pinEntry);
    });

    if (bbox.isEmpty()) {
      console.warn(`    [WARN] Three.js found an empty bounding box for: ${filePath}`);
      return {
        bbox: { min: [0, 0, 0], max: [0, 0, 0] },
        pins,
      };
    }

    // Return the bbox in our simple format
    return {
      bbox: {
        min: [bbox.min.x, bbox.min.y, bbox.min.z],
        max: [bbox.max.x, bbox.max.y, bbox.max.z],
      },
      pins,
    };

  } catch (e) {
    console.warn(`    [WARN] Three.js failed to parse GLB: ${filePath} -> ${e.message}`);
    return {
      bbox: { min: [0, 0, 0], max: [0, 0, 0] },
      pins: [],
    };
  }
}

// ---------------- Manifest build ----------------
async function buildManifest(rootPath) {
  try {
    const st = await fs.stat(rootPath);
    if (!st.isDirectory()) throw new Error('Root exists but is not a directory');
  } catch {
    console.error(`Error: Root directory does not exist or is not a directory: ${rootPath}`);
    process.exit(1);
  }

  console.log(`[DEBUG] Scanning root: ${rootPath}`);

  const manifest = {};
  const allEntries = await fs.readdir(rootPath, { withFileTypes: true });

  console.log(`[DEBUG] Found ${allEntries.length} total entries in root:`);
  for (const entry of allEntries) {
    console.log(`  - ${entry.name} (is directory: ${entry.isDirectory()})`);
  }

  const buildingDirs = allEntries
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`[DEBUG] Filtered down to ${buildingDirs.length} building directories.`);

  for (const buildingEntry of buildingDirs) {
    const buildingID_raw = buildingEntry.name;
    const buildingDir = path.join(rootPath, buildingID_raw);
    console.log(`\n--- Processing Building: ${buildingID_raw} ---`);

    let isHidden = false;
    let manifestKey = buildingID_raw; // This will be the key in the JSON

    // Check for the _hidden suffix
    if (buildingID_raw.toLowerCase().endsWith('_hidden')) {
        isHidden = true;
        // Get the name before "_hidden" (e.g., "entorno")
        manifestKey = buildingID_raw.substring(0, buildingID_raw.length - 7);
        console.log(`  [INFO] Folder marked as hidden. Manifest key will be: ${manifestKey}`);
    }

    const buildingBBox = new SimpleBox3();
    const floorsData = [];

    let dirFiles = [];
    try {
        dirFiles = await fs.readdir(buildingDir);
    } catch (e) {
        console.warn(` [WARN] Could not read directory: ${buildingDir}. Skipping.`);
        continue;
    }
    
    const glbFiles = dirFiles.filter((f) => f.toLowerCase().endsWith('.glb'));
    console.log(`[DEBUG] Found ${glbFiles.length} glb files in this directory:`);
    console.log(glbFiles);

    for (const glbName of glbFiles) {
      const m = FLOOR_RX.exec(glbName);
      if (!m) {
        console.log(`  [SKIP] ${glbName} does not match 'floor<N>.glb'`);
        continue;
      }

      const floorNum = parseInt(m[1], 10);
      const filePath = path.join(buildingDir, glbName);
      console.log(`  [MATCH] Found floor file: ${glbName}`);

      let floorBBox = { min: [0, 0, 0], max: [0, 0, 0] };
      let pins = [];
      try {
        const floorData = await computeFloorData(filePath);
        floorBBox = floorData.bbox;
        pins = floorData.pins;
      } catch (e) {
        console.warn(`    [WARN] Could not process bounds for: ${filePath} -> ${e.message}`);
      }

      console.log(`    -> bbox ${JSON.stringify(floorBBox)}`);
      if (pins.length) {
        console.log(`    -> pins ${pins.length}`);
      }

      floorsData.push({
        file: glbName,
        name: getPrettyFloorName(floorNum),
        level: floorNum,
        bbox: floorBBox,
        pins,
      });

      buildingBBox.expandByBox(floorBBox);
    }

    floorsData.sort((a, b) => a.level - b.level);

    if (floorsData.length > 0) {
      // Use the clean 'manifestKey' as the property in the JSON
      manifest[manifestKey] = {
        name: getPrettyBuildingName(manifestKey), // Get pretty name from the clean key
        bbox: buildingBBox.toJSON(),
        floors: floorsData,
        sourceDir: buildingID_raw,
      };

      // Add the hidden flag if it was set
      if (isHidden) {
          manifest[manifestKey].hidden = true;
      }
    } else {
      console.log(`[WARN] No floor files found for building: ${buildingID_raw}`);
    }
  }

  return manifest;
}

// ---------------- CLI main ----------------
async function main() {
  const program = new Command();
  program
    .description('Generate a manifest.json with bounds and names.')
    .option('--root <path>', 'Root folder that contains building folders', 'public/assets/models/IAUD')
    .option('--out <path>', 'Output path for manifest.json (default: <root>/manifest.json)')
    .parse(process.argv);

  const opts = program.opts();
  const resolvedRoot = path.resolve(opts.root);
  const outPath = opts.out ? path.resolve(opts.out) : path.join(resolvedRoot, 'manifest.json');

  console.log('--- Manifest Generator ---');
  console.log(`[DEBUG] Resolved Root Path: ${resolvedRoot}`);
  console.log(`[DEBUG] Resolved Out Path:  ${outPath}`);
  console.log('--------------------------');

  console.log('Generating manifest... (this may take a moment)');
  const manifest = await buildManifest(resolvedRoot);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(manifest, null, 2), 'utf-8');

  const totalBuildings = Object.keys(manifest).length;
  const totalFloors = Object.values(manifest).reduce((sum, b) => sum + (b.floors?.length || 0), 0);
  console.log(`\nWrote ${outPath}  (buildings: ${totalBuildings}, floors: ${totalFloors})`);
}

// Run only when invoked directly
const currentScriptPath = fileURLToPath(import.meta.url);
const nodeProcessPath = path.resolve(process.argv[1] || '');
if (currentScriptPath === nodeProcessPath) {
  main().catch((err) => {
    console.error('[FATAL ERROR]', err);
    process.exit(1);
  });
}
