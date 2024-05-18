import { scene, camera, renderer } from './scene.js';
import { controls } from './controls.js';
import { baseObject, wheels, rgbLED,rgbLEDVisual } from './loaders.js';
import { rotateAroundPoint, keys, raycaster, rayLine, rayDirection } from './utils.js';
import * as THREE from 'three';
import Stats from 'stats.js'; // Import Stats.js

let stats; // Declare stats variable
let statsEnabled = false; // Variable to track the stats visibility

let followCamera = false;
controls.enabled = true;
let velocity = 0;
const acceleration = 0.001;
const maxSpeed = 0.01;
const deceleration = 0.1;
const max_ray_distance = 3.0;

// RGB colors and off state
const colors = [0xff0000, 0x00ff00, 0x0000ff, 0x000000]; // Red, Green, Blue, Off
let currentColorIndex = 0;

document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
    if (event.key === 'c') {
        followCamera = !followCamera;
        controls.enabled = !followCamera;
    } else if (event.key === 'l') {
        // Cycle through the colors
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        rgbLED.color.setHex(colors[currentColorIndex]);
        rgbLEDVisual.material.color.setHex(colors[currentColorIndex]);

    } else if (event.key === 'd') {
        traceEnabled = !traceEnabled;
        traceLine.visible = traceEnabled;
        if (!traceEnabled) {
            // Clear the trace points
            tracePoints.length = 0;
            traceGeometry.setFromPoints(tracePoints);
        }
    } else if (event.key === 'm') {
        statsEnabled = !statsEnabled;
        stats.dom.style.display = statsEnabled ? 'block' : 'none';
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});

function moveBaseObject() {
    if (baseObject) {
        const turnSpeed = Math.PI / 100;
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
        const offset = 0.015;

        if (keys.ArrowLeft) {
            rotateAroundPoint(baseObject, offset, turnSpeed);
            wheels[0].rotation.x -= turnSpeed * 3;
            wheels[1].rotation.x += turnSpeed * 3;
        }
        if (keys.ArrowRight) {
            rotateAroundPoint(baseObject, offset, -turnSpeed);
            wheels[0].rotation.x += turnSpeed * 3;
            wheels[1].rotation.x -= turnSpeed * 3;
        }

        if (followCamera) {
            // Update camera position to be in front of the robot and look back
            const cameraOffset = new THREE.Vector3(0, 0.3, 0.5); // Adjust the offset to be in front of the robot and closer
            const cameraPosition = cameraOffset.clone().applyMatrix4(baseObject.matrixWorld);
            camera.position.copy(cameraPosition);
            camera.lookAt(baseObject.position);
        }

        if (traceEnabled) {
            updateTraceLine();
        }

        // Update the RGB LED direction to match the baseObject's direction
        updateRgbLedDirection();
    }
}

function updateRgbLedDirection() {
    // Get the direction the baseObject is facing
    const direction = new THREE.Vector3();
    baseObject.getWorldDirection(direction);
    // Reverse the direction to match the new front
    direction.negate();
    // Update the RGB LED's target to match the baseObject's direction
    rgbLED.target.position.copy(baseObject.position).add(direction);
    rgbLED.target.updateMatrixWorld();
}

function checkCollisions() {
    if (baseObject) {
        const baseBox = new THREE.Box3().setFromObject(baseObject);

        scene.traverse((object) => {
            if (object !== baseObject && object.isMesh && !object.userData.isPlane && object.name !== "route" && !object.userData.isRobotPart) {  // Exclude the plane and robot parts from collision detection
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
        // Ensure the baseObject's world matrix is up-to-date
        baseObject.updateMatrixWorld(true);

        // Define the offset and apply the world matrix transformation
        const offset = new THREE.Vector3(0, 0.06, -0.1);
        const origin = offset.clone().applyMatrix4(baseObject.matrixWorld);

        // Define the direction in the local space of the baseObject
        const localDirection = new THREE.Vector3(0, 0, -1);

        // Apply the quaternion of the baseObject to get the world direction
        const worldDirection = localDirection.clone().applyQuaternion(baseObject.quaternion).normalize();

        // Set the raycaster with the calculated origin and direction
        raycaster.set(origin, worldDirection);

        // Check for intersections with objects in the scene
        const intersects = raycaster.intersectObjects(scene.children, true);

        // Exclude the robot's own parts and the plane from sensor detection
        const validIntersects = intersects.filter(intersect =>
            intersect.object !== baseObject &&
            !intersect.object.userData.isRobotPart &&
            !intersect.object.userData.isPlane &&
            intersect.object.name !== ''
        );

        if (validIntersects.length > 0 && validIntersects[0].distance < max_ray_distance) {
            console.log(`Distance to nearest object: ${validIntersects[0].distance}`);
        } else {
            console.log(`Distance to nearest object: ${max_ray_distance}`);
        }

        // Update the position and direction of the rayLine for visualization
        const lineEnd = origin.clone().add(worldDirection.clone().multiplyScalar(max_ray_distance));
        rayLine.geometry.setFromPoints([origin, lineEnd]);
    }
}

const sensorCameras = [];
const sensorRenderTargets = [];
const sensorSize = 64; // Size of the sensor "camera"
const sensorLines = []; // Array to hold the sensor line objects

// Create cameras and render targets for each sensor
const sensorOffsets = [
    new THREE.Vector3(0, -0.005, -0.05),  // Front-middle
    new THREE.Vector3(-0.03, -0.005, -0.05), // Left-middle
    new THREE.Vector3(0.03, -0.005, -0.05)  // Right-middle
];

sensorOffsets.forEach(offset => {
    const camera = new THREE.OrthographicCamera(-0.05, 0.05, 0.05, -0.05, 0.01, 1);
    sensorCameras.push(camera);

    const renderTarget = new THREE.WebGLRenderTarget(sensorSize, sensorSize);
    sensorRenderTargets.push(renderTarget);

    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const points = [new THREE.Vector3(), new THREE.Vector3(0, -0.1, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    sensorLines.push(line);
    scene.add(line);
});

function updateSensorTextures() {
    sensorOffsets.forEach((offset, index) => {
        const sensorOrigin = offset.clone().applyMatrix4(baseObject.matrixWorld);

        // Update the sensor camera position and orientation
        const sensorCamera = sensorCameras[index];
        sensorCamera.position.copy(sensorOrigin);
        sensorCamera.lookAt(sensorOrigin.clone().add(new THREE.Vector3(0, -1, 0)));
        sensorCamera.updateMatrixWorld(true);

        // Render the scene from the sensor's perspective
        renderer.setRenderTarget(sensorRenderTargets[index]);
        renderer.render(scene, sensorCamera);
        renderer.setRenderTarget(null);
    });
}

function checkLineSensors() {
    if (baseObject) {
        // Ensure the baseObject's world matrix is up-to-date
        baseObject.updateMatrixWorld(true);

        // Update sensor textures
        updateSensorTextures();

        sensorOffsets.forEach((offset, index) => {
            const renderTarget = sensorRenderTargets[index];
            const pixelBuffer = new Uint8Array(4 * sensorSize * sensorSize);

            // Read the pixels from the render target
            renderer.readRenderTargetPixels(renderTarget, 0, 0, sensorSize, sensorSize, pixelBuffer);

            // Function to sample the center pixel color
            function getCenterPixelColor() {
                const centerIndex = (Math.floor(sensorSize / 2) + Math.floor(sensorSize / 2) * sensorSize) * 4;
                return {
                    r: pixelBuffer[centerIndex],
                    g: pixelBuffer[centerIndex + 1],
                    b: pixelBuffer[centerIndex + 2],
                    a: pixelBuffer[centerIndex + 3]
                };
            }

            const color = getCenterPixelColor();

            // Check if the color is black (assuming black line is (0,0,0) in RGB)
            if (color.r === 0 && color.g === 0 && color.b === 0) {
                console.log(`Sensor ${index + 1} detected a black line!`);
            }

            // Update the position and direction of the sensor line for visualization
            const sensorDirection = new THREE.Vector3(0, -1, 0);
            const sensorOrigin = offset.clone().applyMatrix4(baseObject.matrixWorld);
            const lineEnd = sensorOrigin.clone().add(sensorDirection.clone().multiplyScalar(0.1));
            sensorLines[index].geometry.setFromPoints([sensorOrigin, lineEnd]);
        });
    }
}

// Trace functionality
let traceEnabled = false;
const tracePoints = [];

const traceMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
});
const traceGeometry = new THREE.BufferGeometry().setFromPoints(tracePoints);
const traceLine = new THREE.Line(traceGeometry, traceMaterial);
traceMaterial.polygonOffset = true;
traceMaterial.polygonOffsetFactor = -1; // Adjust these values as necessary
traceMaterial.polygonOffsetUnits = -1;
traceLine.renderOrder = 1;
scene.add(traceLine);

function updateTraceLine() {
    if (traceEnabled) {
        const newPoint = baseObject.position.clone();
        
        newPoint.y += 0.00001; 
        tracePoints.push(newPoint);

        // Update the geometry with the new points
        traceGeometry.setFromPoints(tracePoints);
    }
}

// Initialize and add Stats
function initStats() {
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.display = 'none'; // Start with stats hidden
    document.body.appendChild(stats.dom);
}

function animate() {
    requestAnimationFrame(animate);
    if (statsEnabled) {
        stats.begin();
    }

    moveBaseObject();
    checkCollisions();
    checkSensor();
    checkLineSensors();

    if (controls.enabled) {
        controls.update();
    }

    renderer.render(scene, camera);
    if (statsEnabled) {
        stats.end();
    }
}
initStats();
export { animate };
