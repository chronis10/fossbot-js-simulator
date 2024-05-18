import * as THREE from 'three';
import { scene, camera, renderer } from './scene.js';
import { ambientLight, directionalLight } from './lights.js';
import { plane } from './objects.js';
import { controls } from './controls.js';
import { loadBaseObject } from './loaders.js';
import { animate } from './animate.js';
import { loadObjectsFromJSON} from './stage_loader.js';


// Add lights to the scene
scene.add(ambientLight);
scene.add(directionalLight);

// // Add objects to the scene
// scene.add(cube);
scene.add(plane);


// Load the base object and wheels
loadBaseObject(scene);
loadObjectsFromJSON('./stage.json', scene);

// Start the animation loop
animate();
