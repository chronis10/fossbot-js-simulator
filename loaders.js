import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
// import { scene } from './scene.js';
import { rayLine } from './utils.js';

let baseObject;
let wheels = [];
// const rgbLED = new THREE.PointLight(0xffffff, 1, 0.5);
const rgbLED = new THREE.SpotLight(0xffffff, 100, 100, Math.PI / 3, 0.5, 2); // White light initially
const rgbLEDVisual = new THREE.Mesh(
    new THREE.SphereGeometry(0.005, 16, 16),  // Small sphere geometry
    new THREE.MeshBasicMaterial({ color: 0xffffff })  // Red color material
);


function loadBaseObject(scene) {
    const mtlLoader = new MTLLoader();
    mtlLoader.load('base1.mtl', (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load('base1.obj', (object) => {
            object.position.set(0, 0, 0);
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.isRobotPart = true;  // Custom property to identify robot parts
                }
            });

            const boundingBox = new THREE.Box3().setFromObject(object);
            const center = boundingBox.getCenter(new THREE.Vector3());
            const size = boundingBox.getSize(new THREE.Vector3());
            object.position.sub(center);
            object.position.y += size.y / 2;

            scene.add(object);
            
            baseObject = object;
            
            // Set initial position and add RGB LED to baseObject
            //rgbLED.position.set(0.06, 0.01, -0.08); // Adjust position relative to baseObject
            //rgbLED.target.position.set(0, 1, -1); // Point the light forward
            rgbLED.position.set(0.07, 0.052, -0.08);
            rgbLED.target.position.set(0, 0, 1);
            baseObject.add(rgbLED);
            scene.add(rgbLED.target);
            rgbLEDVisual.position.copy(rgbLED.position);
            baseObject.add(rgbLEDVisual);

            baseObject.name = 'robot_body';  // Custom property to identify the base object

            loadWheels(object);
            scene.add(rayLine);
        });
    });
}

function loadWheels(object) {
    const wheelMtlLoader = new MTLLoader();
    wheelMtlLoader.load('wheel.mtl', (wheelMaterials) => {
        wheelMaterials.preload();
        const wheelObjLoader = new OBJLoader();
        wheelObjLoader.setMaterials(wheelMaterials);
        wheelObjLoader.load('wheel.obj', (wheel) => {
            wheel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.isRobotPart = true;  // Custom property to identify robot parts
                }
            });

            const wheelScale = 0.001;
            wheel.scale.set(wheelScale, wheelScale, wheelScale);
            wheel.name = 'wheel1';  // Custom property to identify the wheel
            const wheel1 = wheel.clone();
            wheel1.position.set(0.085, 0.015, -0.049);
            wheel1.rotation.set(0, -Math.PI / 2, 0);
            object.add(wheel1);
            wheels.push(wheel1);

            const wheel2 = wheel.clone();
            wheel2.position.set(-0.085, 0.015, -0.049);
            wheel2.rotation.set(0, Math.PI / 2, 0);
            wheel2.name = 'wheel2';  // Custom property to identify the wheel
            object.add(wheel2);
            wheels.push(wheel2);
        });
    });
}

export { loadBaseObject, baseObject, wheels, rgbLED,rgbLEDVisual };
