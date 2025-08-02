import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
    }

    setup() {
        this._createLights();
        this._createGround();
    }

    _createLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight.position.set(-5, 3, 10);
        this.scene.add(directionalLight);
    }

    _createGround() {
        const planeSize = 2000.0;
        const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
        const planeMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform vec3 colorCenter;
                uniform vec3 colorEdge;
                void main() {
                    float dist = distance(vUv, vec2(0.5));
                    float t = smoothstep(0.0, 0.5, dist);
                    vec3 color = mix(colorCenter, colorEdge, t);
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            uniforms: {
                colorCenter: { value: new THREE.Color(0xfbfbfb) },
                colorEdge: { value: new THREE.Color(0xf0f0f0) }
            },
        });

        const ground = new THREE.Mesh(planeGeometry, planeMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
    }
}