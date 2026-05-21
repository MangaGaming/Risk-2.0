import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Renderer3D {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  dispose: () => void;
}

export function initRenderer(container: HTMLElement): Renderer3D {
  const w = container.clientWidth;
  const h = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a3a5c);

  const frustumSize = 24;
  const aspect = w / h;

  const camera = new THREE.OrthographicCamera(
    -frustumSize * aspect * 0.5,
    frustumSize * aspect * 0.5,
    frustumSize * 0.5,
    -frustumSize * 0.5,
    0.1,
    1000
  );
  camera.position.set(16, 20, 16);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.prepend(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enableRotate = false;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.update();

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

  let animationId: number | null = null;

  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  const resizeObserver = new ResizeObserver(() => {
    const w2 = container.clientWidth;
    const h2 = container.clientHeight;
    const a2 = w2 / h2;
    camera.left = -frustumSize * a2 * 0.5;
    camera.right = frustumSize * a2 * 0.5;
    camera.top = frustumSize * 0.5;
    camera.bottom = -frustumSize * 0.5;
    camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
  });
  resizeObserver.observe(container);

  return {
    scene,
    camera,
    renderer,
    controls,
    dispose: () => {
      if (animationId !== null) cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  };
}
