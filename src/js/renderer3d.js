import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let animationId = null;

export function initRenderer(container) {
  const w = container.clientWidth;
  const h = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a3a5c);

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.set(0, 25, 30);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.prepend(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minPolarAngle = 0.1;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.minDistance = 15;
  controls.maxDistance = 60;
  controls.update();

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
  mainLight.position.set(20, 30, 20);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
  fillLight.position.set(-20, 10, -20);
  scene.add(fillLight);

  // Resize
  const resizeObserver = new ResizeObserver(() => {
    const w2 = container.clientWidth;
    const h2 = container.clientHeight;
    camera.aspect = w2 / h2;
    camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
  });
  resizeObserver.observe(container);

  animate();
  return { scene, camera, renderer, controls };
}

function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getControls() { return controls; }

export function destroyRenderer(container) {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) {
    renderer.dispose();
    const canvas = renderer.domElement;
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }
  scene = null; camera = null; renderer = null; controls = null;
}
