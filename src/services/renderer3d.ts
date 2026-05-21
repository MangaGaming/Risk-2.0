import { Scene, OrthographicCamera, WebGLRenderer, Color, AmbientLight, DirectionalLight, MOUSE } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Renderer3D {
  scene: Scene;
  camera: OrthographicCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  dispose: () => void;
}

export function initRenderer(container: HTMLElement): Renderer3D {
  const w = container.clientWidth;
  const h = container.clientHeight;

  const scene = new Scene();
  scene.background = new Color(0x1a3a5c);

  const frustumSize = 24;
  const aspect = w / h;

  const camera = new OrthographicCamera(
    -frustumSize * aspect * 0.5,
    frustumSize * aspect * 0.5,
    frustumSize * 0.5,
    -frustumSize * 0.5,
    0.1,
    1000
  );
  camera.position.set(16, 20, 16);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({ antialias: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(1);
  container.prepend(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = false;
  controls.enableRotate = false;
  controls.mouseButtons = {
    LEFT: MOUSE.PAN,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.PAN,
  };
  controls.update();

  const ambient = new AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const mainLight = new DirectionalLight(0xffffff, 0.9);
  mainLight.position.set(20, 30, 20);
  scene.add(mainLight);

  const fillLight = new DirectionalLight(0x8888ff, 0.3);
  fillLight.position.set(-20, 10, -20);
  scene.add(fillLight);

  const renderOnce = () => renderer.render(scene, camera);
  renderOnce();
  controls.addEventListener('change', renderOnce);

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
    renderOnce();
  });
  resizeObserver.observe(container);

  return {
    scene,
    camera,
    renderer,
    controls,
    dispose: () => {
      controls.removeEventListener('change', renderOnce);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  };
}
