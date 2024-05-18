import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { camera, renderer } from './scene.js';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false; // Disable controls initially

export { controls };
