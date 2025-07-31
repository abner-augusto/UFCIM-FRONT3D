import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Get the canvas element
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(30, 20, 30);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xeeeeee);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minPolarAngle = 0;             // Prevent looking below horizon
controls.maxPolarAngle = Math.PI / 2;   // Lock to horizontal ground
controls.maxDistance = 100;
controls.minDistance = 30;
controls.target.set(0, 0, 0);           // Keep target at ground level
controls.update();

// Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(-5, 3, 10);
scene.add(directionalLight);

// Infinite radial gradient ground
const planeSize = 2000.0;
const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1);
const planeMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision mediump float;
    varying vec2 vUv;
    uniform vec3 colorCenter;
    uniform vec3 colorEdge;

    void main() {
      vec2 pos = (vUv - 0.5) * ${planeSize.toFixed(1)};
      float dist = length(pos);
      float t = smoothstep(0.0, 100.0, dist);
      vec3 color = mix(colorCenter, colorEdge, t);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  uniforms: {
    colorCenter: { value: new THREE.Color(0xfbfbfb) },
    colorEdge: { value: new THREE.Color(0xf0f0f0) }
  },
  side: THREE.DoubleSide
});
const ground = new THREE.Mesh(planeGeometry, planeMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Model definitions
const models = {
  'Térreo': { path: './iaud-terreo.glb', object: null },
  '1º Pavimento': { path: './iaud-1opav.glb', object: null },
  'Coberta': { path: './iaud-coberta.glb', object: null },
};

// Create UI buttons once all models are loaded
const loader = new GLTFLoader();
let loadedCount = 0;
const totalModels = Object.keys(models).length;
Object.keys(models).forEach(label => {
  loader.load(
    models[label].path,
    gltf => {
      const obj = gltf.scene;
      models[label].object = obj;
      scene.add(obj);
            loadedCount++;
    },
    undefined,
    error => console.error(`Error loading ${label}:`, error)
  );
});

// Create panel buttons
function createButtonUI() {
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.top = '50%';
  ui.style.right = '20px';
  ui.style.transform = 'translateY(-50%)';
  ui.style.display = 'flex';
  ui.style.flexDirection = 'column';
  ui.style.gap = '8px';
  ui.style.background = 'rgba(255,255,255,0.8)';
  ui.style.padding = '10px';
  ui.style.borderRadius = '4px';
  ui.style.zIndex = '10';

  const actions = {
    Geral: () => Object.values(models).forEach(m => m.object && (m.object.visible = true)),
    '1º Pavimento': () => Object.entries(models).forEach(([l,m]) => m.object && (m.object.visible = l!=='Coberta')),
    'Térreo': () => Object.entries(models).forEach(([l,m]) => m.object && (m.object.visible = l==='Térreo'))
  };
  Object.entries(actions).forEach(([label, fn]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.onclick = fn;
    ui.appendChild(btn);
  });
  document.body.appendChild(ui);
}

// Wait until all loaded then add UI
const uiCheck = setInterval(() => {
  if (loadedCount === totalModels) {
    clearInterval(uiCheck);
    createButtonUI();
  }
}, 100);

// Popup logic
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
canvas.addEventListener('pointerdown', event => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(
    Object.values(models).map(m => m.object).filter(o => o), true
  );
  if (intersects.length) {
    showPopup(event.clientX, event.clientY);
  }
});

function showPopup(x, y) {
  if (document.getElementById('popup')) return;
  const popup = document.createElement('div');
  popup.id = 'popup';
  popup.style.position = 'absolute';
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  popup.style.transform = 'translate(-50%,-50%) scale(0)';
  popup.style.background = '#fff';
  popup.style.border = '1px solid #333';
  popup.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  popup.style.borderRadius = '8px';
  popup.style.padding = '10px';
  popup.style.zIndex = '20';
  popup.innerHTML = `
    <button id="popup-close" style="position:absolute;top:5px;right:5px;background:none;border:none;font-size:18px;cursor:pointer;">&times;</button>
    <div>Environment Preview</div>
  `;
  document.body.appendChild(popup);

  // Animate in
  requestAnimationFrame(() => {
    popup.style.transition = 'all 0.3s ease-out';
    popup.style.left = '50%';
    popup.style.bottom = '0';
    popup.style.top = '';
    popup.style.transform = 'translateX(-50%) scale(1)';
    popup.style.width = '85vw';
    popup.style.height = '50vh';
  });

  // Close on close button
  popup.querySelector('#popup-close').addEventListener('click', () => {
    popup.style.transform = 'translate(-50%,-50%) scale(0)';
    popup.addEventListener('transitionend', () => popup.remove(), { once: true });
  });

  // Close on outside click
  function handleOutsideClick(e) {
    if (!popup.contains(e.target)) {
      popup.style.transform = 'translate(-50%,-50%) scale(0)';
      popup.addEventListener('transitionend', () => popup.remove(), { once: true });
      document.removeEventListener('pointerdown', handleOutsideClick);
    }
  }
  setTimeout(() => {
    document.addEventListener('pointerdown', handleOutsideClick);
  }, 0);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
