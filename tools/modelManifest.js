#!/usr/bin/env node
/* Generate a manifest.json for IAUD models.
   - Parses GLB structure directly to avoid Draco decoding dependencies in Node.js
   - Requires: three (for Matrix/Vector math)
*/

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three'; 

const FLOOR_RX = /^floor(\d+)\.glb$/i;
const PIN_NAME_REGEX = /^Pin(#)?_(.+)$/;

// --- 1. LOW LEVEL GLB PARSER -----------------------------------
// We parse the GLB binary chunks to extract the JSON without decoding geometry.

async function parseGLB(filePath) {
    const buffer = await fs.readFile(filePath);
    
    // Header: magic(4) + version(4) + length(4)
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x46546C67) throw new Error('Not a valid GLB file'); // 'glTF'
    
    const length = buffer.readUInt32LE(8);
    let offset = 12;
    
    let json = null;

    while (offset < length) {
        const chunkLength = buffer.readUInt32LE(offset);
        const chunkType = buffer.readUInt32LE(offset + 4);
        
        // chunkType 0x4E4F534A is 'JSON'
        if (chunkType === 0x4E4F534A) {
            const jsonBuf = buffer.subarray(offset + 8, offset + 8 + chunkLength);
            json = JSON.parse(jsonBuf.toString('utf8'));
            break; // We only need the JSON
        }
        
        offset += 8 + chunkLength;
    }

    if (!json) throw new Error('No JSON chunk found in GLB');
    return json;
}

// --- 2. HIERARCHY TRAVERSAL ------------------------------------

function getAccessorBounds(json, accessorIndex) {
    const accessor = json.accessors?.[accessorIndex];
    if (!accessor || !accessor.min || !accessor.max) return null;
    return {
        min: new THREE.Vector3(...accessor.min),
        max: new THREE.Vector3(...accessor.max)
    };
}

function traverseNodes(json, nodeIndex, parentMatrix, result) {
    const node = json.nodes?.[nodeIndex];
    if (!node) return;

    // 1. Calculate Local Matrix
    const localMatrix = new THREE.Matrix4();
    if (node.matrix) {
        localMatrix.fromArray(node.matrix);
    } else {
        if (node.translation) localMatrix.setPosition(new THREE.Vector3(...node.translation));
        if (node.rotation) {
            const q = new THREE.Quaternion(...node.rotation);
            localMatrix.makeRotationFromQuaternion(q);
        }
        if (node.scale) localMatrix.scale(new THREE.Vector3(...node.scale));
    }

    // 2. Calculate World Matrix
    const worldMatrix = parentMatrix.clone().multiply(localMatrix);

    // 3. Process Name (Pins)
    if (node.name) {
        const match = PIN_NAME_REGEX.exec(node.name);
        if (match) {
            const [, silentFlag, rawId] = match;
            const id = rawId.trim();
            if (id) {
                const pos = new THREE.Vector3().setFromMatrixPosition(worldMatrix);
                result.pins.push({
                    id,
                    position: [pos.x, pos.y, pos.z], // Save as array
                    opensPopup: silentFlag !== '#'
                });
            }
        }
    }

    // 4. Process Mesh (Bounding Box)
    if (node.mesh !== undefined) {
        const mesh = json.meshes[node.mesh];
        if (mesh && mesh.primitives) {
            mesh.primitives.forEach(prim => {
                const posAccessor = prim.attributes.POSITION;
                if (posAccessor !== undefined) {
                    const bounds = getAccessorBounds(json, posAccessor);
                    if (bounds) {
                        // Transform the AABB corners to finding the world AABB
                        const box = new THREE.Box3(bounds.min, bounds.max);
                        box.applyMatrix4(worldMatrix);
                        result.bbox.expandByPoint(box.min);
                        result.bbox.expandByPoint(box.max);
                    }
                }
            });
        }
    }

    // 5. Recurse Children
    if (node.children) {
        node.children.forEach(childIdx => {
            traverseNodes(json, childIdx, worldMatrix, result);
        });
    }
}

// --- 3. LOGIC & OUTPUT -----------------------------------------

async function computeFloorData(filePath) {
    try {
        const json = await parseGLB(filePath);
        
        const result = {
            bbox: new THREE.Box3(),
            pins: []
        };
        
        // Scene Root
        const scene = json.scenes?.[json.scene || 0];
        if (scene && scene.nodes) {
            const rootMatrix = new THREE.Matrix4();
            // In GLTF, Y is up, but sometimes tools export differently. 
            // Usually standard Three.js loading handles rotation.
            // Assuming standard GLTF (Y-Up), no extra rotation needed unless file is weird.
            
            scene.nodes.forEach(nodeIdx => {
                traverseNodes(json, nodeIdx, rootMatrix, result);
            });
        }

        // Handle empty boxes
        let finalBBox = { min: [0,0,0], max: [0,0,0] };
        if (!result.bbox.isEmpty()) {
            finalBBox = {
                min: [result.bbox.min.x, result.bbox.min.y, result.bbox.min.z],
                max: [result.bbox.max.x, result.bbox.max.y, result.bbox.max.z]
            };
        }

        return {
            bbox: finalBBox,
            pins: result.pins
        };

    } catch (e) {
        console.warn(`    [WARN] Failed to process ${path.basename(filePath)}: ${e.message}`);
        return {
            bbox: { min: [0, 0, 0], max: [0, 0, 0] },
            pins: [],
        };
    }
}

// ---------------- AABB helper for Global Building ----------------
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
  toJSON() {
    return !Number.isFinite(this.min[0])
      ? { min: [0, 0, 0], max: [0, 0, 0] }
      : { min: this.min, max: this.max };
  }
}

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

// ---------------- Manifest build ----------------
async function buildManifest(rootPath) {
  try {
    const st = await fs.stat(rootPath);
    if (!st.isDirectory()) throw new Error('Root exists but is not a directory');
  } catch {
    console.error(`Error: Root directory does not exist: ${rootPath}`);
    process.exit(1);
  }

  const manifest = {};
  const allEntries = await fs.readdir(rootPath, { withFileTypes: true });
  const buildingDirs = allEntries
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const buildingEntry of buildingDirs) {
    const buildingID_raw = buildingEntry.name;
    const buildingDir = path.join(rootPath, buildingID_raw);
    console.log(`\n--- Processing Building: ${buildingID_raw} ---`);

    let isHidden = false;
    let manifestKey = buildingID_raw;
    if (buildingID_raw.toLowerCase().endsWith('_hidden')) {
        isHidden = true;
        manifestKey = buildingID_raw.substring(0, buildingID_raw.length - 7);
    }

    const buildingBBox = new SimpleBox3();
    const floorsData = [];
    let dirFiles = [];
    try { dirFiles = await fs.readdir(buildingDir); } catch(e) {}
    
    const glbFiles = dirFiles.filter((f) => f.toLowerCase().endsWith('.glb'));

    for (const glbName of glbFiles) {
      const m = FLOOR_RX.exec(glbName);
      if (!m) continue;

      const floorNum = parseInt(m[1], 10);
      const filePath = path.join(buildingDir, glbName);
      console.log(`  [MATCH] Floor ${floorNum}: ${glbName}`);

      const floorData = await computeFloorData(filePath);
      
      console.log(`    -> Pins: ${floorData.pins.length}`);
      
      floorsData.push({
        file: glbName,
        name: getPrettyFloorName(floorNum),
        level: floorNum,
        bbox: floorData.bbox,
        pins: floorData.pins,
      });
      buildingBBox.expandByBox(floorData.bbox);
    }

    floorsData.sort((a, b) => a.level - b.level);
    if (floorsData.length > 0) {
      manifest[manifestKey] = {
        name: getPrettyBuildingName(manifestKey),
        bbox: buildingBBox.toJSON(),
        floors: floorsData,
        sourceDir: buildingID_raw,
      };
      if (isHidden) manifest[manifestKey].hidden = true;
    }
  }
  return manifest;
}

// ---------------- CLI main ----------------
async function main() {
  const program = new Command();
  program
    .description('Generate manifest.json from GLB files (supports Draco)')
    .option('--root <path>', 'Root folder', 'public/assets/models/IAUD')
    .option('--out <path>', 'Output file', 'public/assets/models/IAUD/manifest.json')
    .parse(process.argv);
  
  const opts = program.opts();
  const root = path.resolve(opts.root);
  const out = path.resolve(opts.out);

  console.log(`Generating manifest from: ${root}`);
  const manifest = await buildManifest(root);
  
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nSaved manifest to: ${out}`);
}

const currentScriptPath = fileURLToPath(import.meta.url);
const nodeProcessPath = path.resolve(process.argv[1] || '');
if (currentScriptPath === nodeProcessPath) {
  main().catch(console.error);
}