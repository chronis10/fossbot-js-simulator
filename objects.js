import * as THREE from 'three';
import { loadObjectsFromJSON } from './stage_loader.js';
// const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
// const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
// const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
// cube.position.set(-2, 0.49, 0);
// cube.name = 'cube'; // Custom property to identify the cube
// cube.castShadow = true;




// Load the texture
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('bgr.png', (texture) => {
  // This function is called after the texture has loaded
  console.log('Texture loaded', texture);
  // Set texture properties
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  // Set how many times the texture repeats
  texture.repeat.set(10, 10); // Adjust the values as needed
  texture.offset.set(0, 0); // Adjust the values as needed
  texture
});


const planeGeometry = new THREE.PlaneGeometry(10, 10);
//const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const planeMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.name = 'plane'; // Custom property to identify the plane
plane.rotation.x = Math.PI / 2;
plane.position.y = -0.02;
plane.material.polygonOffset = false;
plane.renderOrder = 0;
plane.receiveShadow = true;
plane.userData.isPlane = true; // Custom property to identify the plane


// // Create a multipoint line on top of the plane
// const points = [
//     new THREE.Vector3(-5, -0.019, -2), // Point 1
//     new THREE.Vector3(-3, -0.019, -1), // Point 2
//     new THREE.Vector3(0, -0.019, 0),   // Point 3
//     new THREE.Vector3(3, -0.019, 1),   // Point 4
//     new THREE.Vector3(5, -0.019, 2)    // Point 5
// ];

// const positions = [];
// points.forEach(point => {
//     positions.push(point.x, point.y, point.z);
// });

// const lineGeometry = new LineGeometry();
// lineGeometry.setPositions(positions);

// // Create a material with desired line width
// const lineMaterial = new LineMaterial({
//     color: 0x000000,
//     linewidth: 0.05, // Line width in world units
//     dashed: false,
//     dashScale: 0.1,
// });

// const route = new Line2(lineGeometry, lineMaterial);
// route.computeLineDistances(); // Required for dashed lines
// route.name = 'route'; // Custom property to identify the line
// route.scale.set(1, 1, 1); // To ensure correct scaling

export { plane };
