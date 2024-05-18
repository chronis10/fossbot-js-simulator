import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as OIMO from 'oimo';

let physicsWorld, rigidBodies = [];
let clock = new THREE.Clock();

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

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false; // Disable controls initially

const mtlLoader = new MTLLoader();
let baseObject;
let wheels = [];

// Oimo.js setup
function setupPhysicsWorld() {
    physicsWorld = new OIMO.World({ timestep: 1 / 60, iterations: 8 });
    createPhysicsObjects();
    loadRobot();
    animate();
}

function createPhysicsObjects() {
    createGround();
    createCube();
}

function createGround() {
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Correct plane orientation
    plane.position.y = 0; // Position the plane as the ground
    plane.receiveShadow = true;
    scene.add(plane);

    const planeBody = physicsWorld.add({
        type: 'box',
        size: [10, 1, 10],
        pos: [0, -0.5, 0], // Position the physics plane slightly below the visual plane
        rot: [0, 0, 0],
        move: false,
        density: 1
    });

    rigidBodies.push({ mesh: plane, body: planeBody });
}

function createCube() {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(-2, 1, 0); // Position the cube above the ground
    cube.castShadow = true;
    scene.add(cube);

    const cubeBody = physicsWorld.add({
        type: 'box',
        size: [1, 1, 1],
        pos: [-2, 1, 0], // Match the cube's position
        rot: [0, 0, 0],
        move: true,
        density: 1
    });

    cube.userData.physicsBody = cubeBody;
    rigidBodies.push({ mesh: cube, body: cubeBody });
}

function loadRobot() {
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
                    child.userData.isRobotPart = true;
                }
            });

            const boundingBox = new THREE.Box3().setFromObject(object);
            const center = boundingBox.getCenter(new THREE.Vector3());
            const size = boundingBox.getSize(new THREE.Vector3());
            object.position.sub(center);
            object.position.y += size.y / 2;

            scene.add(object);
            baseObject = object;

            const robotBody = physicsWorld.add({
                type: 'box',
                size: [size.x, size.y, size.z],
                pos: [0, size.y / 2, 0],
                rot: [0, 0, 0],
                move: true,
                density: 1
            });

            object.userData.physicsBody = robotBody;
            rigidBodies.push({ mesh: object, body: robotBody });

            loadWheels(object, size);
        });
    });
}

function loadWheels(object, size) {
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
                    child.userData.isRobotPart = true;
                }
            });

            const wheelScale = 0.001;
            wheel.scale.set(wheelScale, wheelScale, wheelScale);

            const wheel1 = wheel.clone();
            wheel1.position.set(size.x / 2 - 0.1, 0, size.z / 2 - 0.1);
            wheel1.rotation.set(0, -Math.PI / 2, 0);
            object.add(wheel1);
            wheels.push(wheel1);

            const wheel2 = wheel.clone();
            wheel2.position.set(-size.x / 2 + 0.1, 0, size.z / 2 - 0.1);
            wheel2.rotation.set(0, Math.PI / 2, 0);
            object.add(wheel2);
            wheels.push(wheel2);

            const wheel3 = wheel.clone();
            wheel3.position.set(size.x / 2 - 0.1, 0, -size.z / 2 + 0.1);
            wheel3.rotation.set(0, -Math.PI / 2, 0);
            object.add(wheel3);
            wheels.push(wheel3);

            const wheel4 = wheel.clone();
            wheel4.position.set(-size.x / 2 + 0.1, 0, -size.z / 2 + 0.1);
            wheel4.rotation.set(0, Math.PI / 2, 0);
            object.add(wheel4);
            wheels.push(wheel4);
        });
    });
}

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

const rayOrigin = new THREE.Vector3(0, -0.2, 0);
const rayDirection = new THREE.Vector3(0, 0, -1).normalize();

const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);

const rayGeometry = new THREE.BufferGeometry().setFromPoints([rayOrigin, rayOrigin.clone().add(rayDirection.clone().multiplyScalar(2))]);
const rayMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const rayLine = new THREE.Line(rayGeometry, rayMaterial);
scene.add(rayLine);

let followCamera = false;

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
            velocity *= deceleration;
        }

        baseObject.getWorldDirection(direction);
        baseObject.position.addScaledVector(direction, velocity);

        wheels.forEach(wheel => {
            wheel.rotation.x += velocity / 0.0001;
        });

        const offset = 0.015;

        if (keys.ArrowLeft) {
            rotateAroundPoint(baseObject, offset, turnSpeed);
        }
        if (keys.ArrowRight) {
            rotateAroundPoint(baseObject, offset, -turnSpeed);
        }

        if (followCamera) {
            const cameraOffset = new THREE.Vector3(0, 0.2, 0.4);
            const cameraPosition = cameraOffset.clone().applyMatrix4(baseObject.matrixWorld);
            camera.position.copy(cameraPosition);
            camera.lookAt(baseObject.position);
        }
    }
}

function rotateAroundPoint(object, offset, angle) {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

    const point = new THREE.Vector3(object.position.x, object.position.y - offset, object.position.z);

    object.position.sub(point);

    object.position.applyQuaternion(quaternion);

    object.position.add(point);

    object.quaternion.multiplyQuaternions(quaternion, object.quaternion);
}

function checkCollisions() {
    // Oimo.js handles collisions, so this is no longer necessary.
}

function checkSensor() {
    if (baseObject) {
        raycaster.set(baseObject.position, baseObject.getWorldDirection(rayDirection));

        const intersects = raycaster.intersectObjects(scene.children, true);

        const validIntersects = intersects.filter(intersect => !intersect.object.userData.isRobotPart && !intersect.object.userData.isPlane);

        if (validIntersects.length > 0) {
            console.log(`Distance to nearest object: ${validIntersects[0].distance}`);
        } else {
            console.log('No object detected in front of the robot');
        }

        const direction = baseObject.getWorldDirection(rayDirection).clone().multiplyScalar(-5);
        rayLine.geometry.setFromPoints([baseObject.position, baseObject.position.clone().add(direction)]);
    }
}

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    moveBaseObject();
    checkCollisions();
    checkSensor();

    physicsWorld.step();

    rigidBodies.forEach((obj) => {
        const body = obj.body;
        const mesh = obj.mesh;
        const pos = body.getPosition();
        const rot = body.getQuaternion();

        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    });

    if (controls.enabled) {
        controls.update();
    }

    renderer.render(scene, camera);
}

setupPhysicsWorld();
