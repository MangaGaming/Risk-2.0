import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let scene, camera, renderer, controls;
let animationId = null;

export function initRenderer(container) {
  const w = container.clientWidth;
  const h = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1428);

  const frustumSize = 24;
  const aspect = w / h;
  camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2, frustumSize * aspect / 2,
    frustumSize / 2, -frustumSize / 2,
    0.1, 1000
  );
  camera.position.set(16, 20, 16);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.prepend(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableRotate = true;
  controls.maxPolarAngle = Math.PI / 2.4;
  controls.minDistance = 10;
  controls.maxDistance = 50;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE_PAN,
    TWO: THREE.TOUCH.DOLLY_PAN
  };
  controls.update();

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  const ambient = new THREE.AmbientLight(0x404060, 0.15);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362d1a, 0.7);
  scene.add(hemi);

  const mainLight = new THREE.DirectionalLight(0xffeedd, 1.8);
  mainLight.position.set(15, 25, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 60;
  mainLight.shadow.camera.left = -20;
  mainLight.shadow.camera.right = 20;
  mainLight.shadow.camera.top = 20;
  mainLight.shadow.camera.bottom = -20;
  mainLight.shadow.bias = -0.001;
  mainLight.shadow.normalBias = 0.02;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
  fillLight.position.set(-10, 15, -10);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffeedd, 0.3);
  rimLight.position.set(0, -10, -15);
  scene.add(rimLight);

  const resizeObserver = new ResizeObserver(() => {
    const w2 = container.clientWidth;
    const h2 = container.clientHeight;
    const aspect = w2 / h2;
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
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
