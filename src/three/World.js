import * as THREE from 'three';
import { GROUND_PLANE_SIZE } from './config.js';

// --- Shaders ---
const groundVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const groundFragmentShader = `
    varying vec2 vUv;
    uniform vec3 colorCenter;
    uniform vec3 colorEdge;
    void main() {
        float dist = distance(vUv, vec2(0.5));
        float t = smoothstep(0.0, 0.15, dist);
        vec3 color = mix(colorCenter, colorEdge, t);
        gl_FragColor = vec4(color, 1.0);
    }
`;

export class World {
    constructor(scene) {
        this.scene = scene;
    }

    setup() {
        this._createLights();
        this._createGround();
    }

    _createLights() {
        const ambientLight = new THREE.AmbientLight(0xfff9f3, 1.2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(15, 10, -5);
        this.scene.add(directionalLight);
    }

    _createGround() {
        const planeGeometry = new THREE.PlaneGeometry(GROUND_PLANE_SIZE, GROUND_PLANE_SIZE);
        const planeMaterial = new THREE.ShaderMaterial({
            vertexShader: groundVertexShader,
            fragmentShader: groundFragmentShader,
            uniforms: {
                colorCenter: { value: new THREE.Color(0xfbfbfb) },
                colorEdge: { value: new THREE.Color(0xbdbdbd) }
            },
        });
        const ground = new THREE.Mesh(planeGeometry, planeMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
    }
}