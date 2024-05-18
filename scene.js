import * as THREE from 'three';


const isWebGLAvailable = () => {
    try {
        const canvas = document.createElement('canvas');
        return !!window.WebGLRenderingContext && (
            canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        );
    } catch (e) {
        return false;
    }
};


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

let renderer;
if (isWebGLAvailable()) {
     renderer = new THREE.WebGLRenderer({
        //antialias: true,
        //precision: 'mediump' // or 'mediump' if performance is an issue
    }); 

    
} else {
     
    alert('WebGL not available');

}

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

camera.position.set(5, 5, 5);
camera.lookAt(new THREE.Vector3(0, 0, 0));

export { scene, camera, renderer };
