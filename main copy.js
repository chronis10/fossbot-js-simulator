import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(-2, 0.3, 0);
cube.castShadow = true;
scene.add(cube);

const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = Math.PI / 2;
plane.position.y = -0.02;
plane.receiveShadow = true;
plane.userData.isPlane = true;  // Custom property to identify the plane
scene.add(plane);

camera.position.set(5, 5, 5);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// OrbitControls for the fixed camera mode
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false; // Disable controls initially

const mtlLoader = new MTLLoader();
let baseObject;
let wheels = [];

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

                const wheel1 = wheel.clone();
                wheel1.position.set(0.085, 0.015, -0.049);
                wheel1.rotation.set(0, -Math.PI / 2, 0);
                object.add(wheel1);
                wheels.push(wheel1);

                const wheel2 = wheel.clone();
                wheel2.position.set(-0.085, 0.015, -0.049);
                wheel2.rotation.set(0, Math.PI / 2, 0);
                object.add(wheel2);
                wheels.push(wheel2);
            });
        });
    });
});

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
    if (event.key === 'c') {
        followCamera = !followCamera;
        controls.enabled = !followCamera;
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});

let velocity = 0;
const acceleration = 0.0001;
const maxSpeed = 0.01;
const deceleration = 0.98;

// Set the origin of the raycaster to a higher point (e.g., y = 1)
const rayOrigin = new THREE.Vector3(0, -0.2, 0);
const rayDirection = new THREE.Vector3(0, 0, -1).normalize(); // Direction of the ray

const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);

// Create a line to represent the raycaster starting from the new origin
const rayGeometry = new THREE.BufferGeometry().setFromPoints([rayOrigin, rayOrigin.clone().add(rayDirection.clone().multiplyScalar(2))]);
const rayMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const rayLine = new THREE.Line(rayGeometry, rayMaterial);
scene.add(rayLine);


let followCamera = false; // Flag to toggle camera mode

function moveBaseObject() {
    if (baseObject) {
        const turnSpeed = Math.PI / 500;
        const direction = new THREE.Vector3();

        if (keys.ArrowDown) {
            velocity += acceleration;
            if (velocity > maxSpeed) velocity = maxSpeed;
        } else if (keys.ArrowUp) {
            velocity -= acceleration;
            if (velocity < -maxSpeed) velocity = -maxSpeed;
        } else {
            velocity *= deceleration; // Gradually slow down when no key is pressed
        }

        baseObject.getWorldDirection(direction);
        baseObject.position.addScaledVector(direction, velocity);

        wheels.forEach(wheel => {
            wheel.rotation.x += velocity / 0.0001; // Rotate wheels based on velocity
        });

        // Offset point for rotation
        const offset =  0.015;

        if (keys.ArrowLeft) {
            rotateAroundPoint(baseObject, offset, turnSpeed);
        }
        if (keys.ArrowRight) {
            rotateAroundPoint(baseObject, offset, -turnSpeed);
        }

        if (followCamera) {
            // Update camera position to be in front of the robot and look back
            const cameraOffset = new THREE.Vector3(0, 0.2, 0.4); // Adjust the offset to be in front of the robot and closer
            const cameraPosition = cameraOffset.clone().applyMatrix4(baseObject.matrixWorld);
            camera.position.copy(cameraPosition);
            camera.lookAt(baseObject.position);
        }
    }
}

// Function to rotate the object around a point offset from the current position
function rotateAroundPoint(object, offset, angle) {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle); // Y-axis rotation

    // Calculate the pivot point
    const point = new THREE.Vector3(object.position.x, object.position.y - offset, object.position.z);

    // Translate object to the pivot point
    object.position.sub(point);

    // Apply rotation
    object.position.applyQuaternion(quaternion);

    // Translate object back from the pivot point
    object.position.add(point);

    // Rotate object's direction
    object.quaternion.multiplyQuaternions(quaternion, object.quaternion);
}

function checkCollisions() {
    if (baseObject) {
        const baseBox = new THREE.Box3().setFromObject(baseObject);

        scene.traverse((object) => {
            if (object !== baseObject && object.isMesh && !object.userData.isPlane && !object.userData.isRobotPart) {  // Exclude the plane and robot parts from collision detection
                const objectBox = new THREE.Box3().setFromObject(object);
                if (baseBox.intersectsBox(objectBox)) {
                    console.log('Collision detected!');
                }
            }
        });
    }
}

function checkSensor() {
    if (baseObject) {
        // Set the origin and direction of the raycaster based on the robot's position and orientation
      
        raycaster.set(baseObject.position, baseObject.getWorldDirection(rayDirection));
        
        // Check for intersections with objects in the scene
        const intersects = raycaster.intersectObjects(scene.children, true);

        // Exclude the robot's own parts and the plane from sensor detection
        const validIntersects = intersects.filter(intersect => !intersect.object.userData.isRobotPart && !intersect.object.userData.isPlane);

        if (validIntersects.length > 0) {
            console.log(`Distance to nearest object: ${validIntersects[0].distance}`);
        } else {
            console.log('No object detected in front of the robot');
        }

        // Update the position and direction of the rayLine
        const direction = baseObject.getWorldDirection(rayDirection).clone().multiplyScalar(-5); // Adjust the scalar value to change the length of the ray
        rayLine.geometry.setFromPoints([baseObject.position, baseObject.position.clone().add(direction)]);
    }
}

function animate() {
    requestAnimationFrame(animate);

    moveBaseObject();
    checkCollisions();
    checkSensor();

    if (controls.enabled) {
        controls.update();
    }

    renderer.render(scene, camera);
}

animate();
