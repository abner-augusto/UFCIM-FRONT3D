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
function createButtonUI() {
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.top = '50%';
  ui.style.right = '20px';
  ui.style.transform = 'translateY(-50%)';
  ui.style.display = 'flex';
  ui.style.flexDirection = 'column';
  ui.style.gap = '8px';
  ui.style.background = 'rgba(255, 255, 255, 0.8)';
  ui.style.padding = '10px';
  ui.style.borderRadius = '4px';
  ui.style.zIndex = '10';

  // Geral: all models on
  const geralBtn = document.createElement('button');
  geralBtn.textContent = 'Geral';
  geralBtn.onclick = () => {
    Object.values(models).forEach(m => m.object && (m.object.visible = true));
  };
  ui.appendChild(geralBtn);

  // 1º Pavimento: terreo + 1º Pavimento on, Coberta off
  const firstPavBtn = document.createElement('button');
  firstPavBtn.textContent = '1º Pavimento';
  firstPavBtn.onclick = () => {
    Object.entries(models).forEach(([label, m]) => {
      if (label === 'Coberta') m.object && (m.object.visible = false);
      else m.object && (m.object.visible = true);
    });
  };
  ui.appendChild(firstPavBtn);

  // Térreo: only ground floor on
  const terreoBtn = document.createElement('button');
  terreoBtn.textContent = 'Térreo';
  terreoBtn.onclick = () => {
    Object.entries(models).forEach(([label, m]) => {
      if (label === 'Térreo') m.object && (m.object.visible = true);
      else m.object && (m.object.visible = false);
    });
  };
  ui.appendChild(terreoBtn);

  document.body.appendChild(ui);
}

// Load all models
const loader = new GLTFLoader();
let loadedCount = 0;
const totalModels = Object.keys(models).length;

Object.keys(models).forEach(label => {
  loader.load(
    models[label].path,
    gltf => {
      const obj = gltf.scene;
      scene.add(obj);
      models[label].object = obj;
      loadedCount++;
      if (loadedCount === totalModels) {
        createButtonUI();
      }
    },
    undefined,
    error => console.error(`Error loading ${label}:`, error)
  );
});

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
