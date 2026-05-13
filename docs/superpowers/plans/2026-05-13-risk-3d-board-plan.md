# RISK 3D Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2D SVG map rendering with a Three.js 3D board, keeping all game logic, side panel, and modals intact.

**Architecture:** Three.js renders the world map as extruded territory shapes on an ocean plane. Army pieces are 3D cylinders clustered on territories. The side panel, header, and all modals remain as HTML/CSS overlays. Raycaster handles territory selection instead of SVG click events.

**Tech Stack:** Three.js (npm), OrbitControls, SVGLoader (from three/examples/jsm), vanilla JS

---

### Task 1: Install Three.js

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install three.js**

Run: `npm install three`

Expected: three package added to package.json dependencies.

- [ ] **Step 2: Verify install**

Run: `node -e "require('three')"`
Expected: no error

---

### Task 2: Create renderer3d.js — Scene, Camera, Lights, Controls

**Files:**
- Create: `src/js/renderer3d.js`

- [ ] **Step 1: Write renderer3d.js**

```js
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
```

---

### Task 3: Create map3d.js — Territory Geometry from SVG Paths

**Files:**
- Create: `src/js/map3d.js`

- [ ] **Step 1: Write map3d.js**

```js
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { TERRITORY_PATHS, CONTINENTS, POSITIONS } from './config.js';
import { state } from './state.js';

const loader = new SVGLoader();
const SCALE = 1 / 45;
const EXTRUDE_DEPTH = 0.8;

const territoryMeshes = new Map();
const outlines = new Map();
let territoryGroup;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let currentHovered = null;

export function buildTerritories(scene) {
  territoryGroup = new THREE.Group();
  scene.add(territoryGroup);
  scene.add(createOcean());

  for (const [name, pathData] of Object.entries(TERRITORY_PATHS)) {
    const shapes = parseSvgPath(pathData);
    if (shapes.length === 0) continue;

    const shapesScaled = shapes.map(s => {
      const c = new THREE.Shape();
      const pts = s.getPoints(50);
      c.moveTo((pts[0].x - 500) * SCALE, -(pts[0].y - 350) * SCALE);
      for (let i = 1; i < pts.length; i++) {
        c.lineTo((pts[i].x - 500) * SCALE, -(pts[i].y - 350) * SCALE);
      }
      return c;
    });

    const geo = new THREE.ExtrudeGeometry(shapesScaled, {
      depth: EXTRUDE_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.1,
      bevelSegments: 3
    });
    geo.computeVertexNormals();

    const contName = Object.keys(CONTINENTS).find(c => CONTINENTS[c].territories.includes(name));
    const contColor = new THREE.Color(CONTINENTS[contName]?.color || '#888888');

    const mat = new THREE.MeshStandardMaterial({
      color: contColor,
      roughness: 0.6,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.territoryName = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    territoryGroup.add(mesh);
    territoryMeshes.set(name, mesh);

    // Outline (edge line)
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    });
    const line = new THREE.LineSegments(edges, lineMat);
    territoryGroup.add(line);
    outlines.set(name, line);
  }

  addMaritimeRoutes(scene);
}

function parseSvgPath(pathData) {
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700"><path d="${pathData}"/></svg>`;
  const result = loader.parse(svgText);
  const shapes = [];
  for (const path of result.paths) {
    for (const subPath of path.subPaths) {
      const s = subPath.toShapes(true);
      shapes.push(...s);
    }
  }
  return shapes;
}

function createOcean() {
  const geo = new THREE.PlaneGeometry(30, 22);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a3a5c,
    roughness: 0.9,
    metalness: 0.0
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -EXTRUDE_DEPTH - 0.1;
  mesh.receiveShadow = true;
  return mesh;
}

function addMaritimeRoutes(scene) {
  const { MARITIME_ROUTES } = requireOrImport();
  if (!MARITIME_ROUTES) return;
  const mat = new THREE.LineBasicMaterial({
    color: 0xd4a017,
    transparent: true,
    opacity: 0.2,
    dashSize: 0.3,
    gapSize: 0.2
  });
  MARITIME_ROUTES.forEach(([a, b]) => {
    const p1 = POSITIONS[a];
    const p2 = POSITIONS[b];
    if (!p1 || !p2) return;
    const pts = [
      new THREE.Vector3((p1[0] - 500) * SCALE, 0.1, -(p1[1] - 350) * SCALE),
      new THREE.Vector3((p2[0] - 500) * SCALE, 0.1, -(p2[1] - 350) * SCALE)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, mat);
    scene.add(line);
  });
}

function requireOrImport() {
  // Lazily access MARITIME_ROUTES — they're only used if defined
  try { return { MARITIME_ROUTES: requireOrImport._maritime }; }
  catch { return { MARITIME_ROUTES: null }; }
}

export function syncTerritories(scene) {
  for (const [name, mesh] of territoryMeshes) {
    const t = state.territories[name];
    if (!t) continue;
    const ownerIdx = t.owner;
    const player = state.players[ownerIdx];
    if (player) {
      mesh.material.color.set(player.color);
    }
  }
}

export function getTerritoryMeshes() {
  return territoryMeshes;
}

export function handlePointerMove(event, camera, canvas) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const meshes = [...territoryMeshes.values()];
  const intersects = raycaster.intersectObjects(meshes);

  if (currentHovered) {
    const prev = territoryMeshes.get(currentHovered);
    if (prev) {
      prev.material.emissive.setHex(0x000000);
      prev.material.emissiveIntensity = 0;
    }
    currentHovered = null;
  }

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const name = hit.userData.territoryName;
    if (name) {
      currentHovered = name;
      hit.material.emissive.setHex(0xffffff);
      hit.material.emissiveIntensity = 0.15;
      canvas.style.cursor = 'pointer';
    }
  } else {
    canvas.style.cursor = 'default';
  }
}

export function handlePointerDown(event, camera, canvas, onClick) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const meshes = [...territoryMeshes.values()];
  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const name = hit.userData.territoryName;
    if (name) onClick(name);
  }
}
```

---

### Task 4: Create pieces3d.js — Army Pieces

**Files:**
- Create: `src/js/pieces3d.js`

- [ ] **Step 1: Write pieces3d.js**

```js
import * as THREE from 'three';
import { POSITIONS } from './config.js';

const SCALE = 1 / 45;
const PIECE_RADIUS = 0.35;
const PIECE_HEIGHT = 0.4;
const MAX_VISIBLE = 5;

let pieceGroup;
const pieceClusters = new Map(); // territoryName -> { group, labelSprite, count }

export function initPieces(scene) {
  pieceGroup = new THREE.Group();
  scene.add(pieceGroup);
}

export function syncPieces(state) {
  // Remove old pieces
  for (const [, cluster] of pieceClusters) {
    pieceGroup.remove(cluster.group);
    if (cluster.labelSprite && cluster.labelSprite.parentNode) {
      cluster.labelSprite.parentNode.removeChild(cluster.labelSprite);
    }
  }
  pieceClusters.clear();

  // Create text overlay for labels
  let labelContainer = document.getElementById('army-labels');
  if (!labelContainer) {
    labelContainer = document.createElement('div');
    labelContainer.id = 'army-labels';
    labelContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden;';
    document.getElementById('map-container').appendChild(labelContainer);
  }
  labelContainer.innerHTML = '';

  for (const [name, t] of Object.entries(state.territories)) {
    if (t.armies <= 0) continue;
    const pos = POSITIONS[name];
    if (!pos) continue;

    const playerColor = state.players[t.owner]?.color || '#888';
    const centerX = (pos[0] - 500) * SCALE;
    const centerZ = -(pos[1] - 350) * SCALE;

    const clusterGroup = new THREE.Group();
    const count = Math.min(t.armies, MAX_VISIBLE);

    // Arrange pieces in a small cluster
    const offsets = [
      [0, 0], [-0.5, -0.3], [0.5, -0.3], [-0.3, 0.4], [0.3, 0.4]
    ];
    for (let i = 0; i < count; i++) {
      const [dx, dz] = offsets[i];
      const geo = new THREE.CylinderGeometry(PIECE_RADIUS, PIECE_RADIUS * 1.2, PIECE_HEIGHT, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: playerColor,
        roughness: 0.5,
        metalness: 0.2
      });
      const piece = new THREE.Mesh(geo, mat);
      piece.position.set(centerX + dx, PIECE_HEIGHT / 2, centerZ + dz);
      piece.castShadow = true;
      clusterGroup.add(piece);
    }

    pieceGroup.add(clusterGroup);

    // Army count label (HTML overlay)
    const label = document.createElement('div');
    label.textContent = t.armies;
    label.style.cssText = `
      position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      font-family:'Cinzel',serif;font-size:12px;font-weight:700;
      color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.8);
      pointer-events:none;background:rgba(0,0,0,0.5);
      padding:2px 6px;border-radius:4px;
      border:1px solid ${playerColor};
    `;
    labelContainer.appendChild(label);
    pieceClusters.set(name, { group: clusterGroup, label, pos });

    // Position the label via transform
    updateLabelPosition(label, pos);
  }
}

let lastContainerRect = null;

function updateLabelPosition(label, pos) {
  const container = document.getElementById('map-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  // Map SVG coords (0-1000, 0-700) to container pixel coords
  const x = (pos[0] / 1000) * 100;
  const y = (pos[1] / 700) * 100;
  label.style.left = x + '%';
  label.style.top = y + '%';
}

export function clearPieces() {
  if (pieceGroup) {
    while (pieceGroup.children.length) {
      const child = pieceGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      pieceGroup.remove(child);
    }
  }
  pieceClusters.clear();
  const container = document.getElementById('army-labels');
  if (container) container.innerHTML = '';
}
```

---

### Task 5: Modify ui.js — Wire 3D Rendering

**Files:**
- Modify: `src/js/ui.js`

- [ ] **Step 1: Remove SVG rendering, keep overlay/modals**

In `ui.js`:
1. Remove `import { TERRITORY_PATHS, ADJACENCY, MARITIME_ROUTES } from './config.js'` — replace with just `import { CONTINENTS, POSITIONS } from './config.js'` (keep what's still needed)
2. Replace `renderMap()` function body with 3D sync calls
3. Remove `updateMapTransform()` (no longer needed)
4. Keep everything else unchanged

Replace `renderMap()` with:

```js
import { syncTerritories } from './map3d.js';
import { syncPieces } from './pieces3d.js';

export function renderMap() {
  syncTerritories();
  syncPieces(state);
}
```

Remove `updateMapTransform()` entirely (and remove its export from window).

Update `closeCombatModal` and `closeMoveModal` — they still call `renderMap()` which now triggers 3D sync.

Keep: `updateHeader`, `updatePhaseUI`, `updateDiploPanel`, `renderSanctionsDisplay`, `showCombatResult`, `syncCombatResult`, `setupCombat`, `renderDiceSelectors`, `openMoveModal`, `updateMoveCount`, `closeCombatModal`, `closeMoveModal`, `renderCardsModal`, `toggleCardSelect`, `buildLegend`, all modal functions.

Don't forget to keep the `window.*` export lines and update the `renderMap` one.

---

### Task 6: Modify main.js — 3D Interaction

**Files:**
- Modify: `src/js/main.js`

- [ ] **Step 1: Add imports for 3D modules**

Add at top:
```js
import { initRenderer, getScene, getCamera, getRenderer, getControls } from './renderer3d.js';
import { buildTerritories, handlePointerMove, handlePointerDown, syncTerritories } from './map3d.js';
import { initPieces, syncPieces } from './pieces3d.js';
```

- [ ] **Step 2: Remove 2D map interaction code**

Remove these functions from main.js:
- `handleMouseDown`
- `handleMouseMove`
- `handleMouseUp`
- `handleWheel`
- `zoom`
- `resetMap`
- `handleTouchStart`
- `handleTouchMove`
- `handleTouchEnd`

Remove the `import { mapViewState } from './state.js'` import (no longer needed for map movement).

- [ ] **Step 3: Change DOMContentLoaded init**

Remove the SVG event listener block:
```js
// Remove this entire block:
const svg = document.getElementById('world-map');
if (svg) {
  svg.addEventListener('mousedown', handleMouseDown);
  ...
}
```

Keep all button event listeners.

- [ ] **Step 4: Create init3D function and update initGameMulti**

Add:

```js
let rendererInitialized = false;

export function init3D() {
  if (rendererInitialized) return;
  const container = document.getElementById('map-container');
  if (!container) return;
  const { scene, camera, renderer } = initRenderer(container);
  buildTerritories(scene);
  initPieces(scene);

  // Remove zoom buttons (no longer needed with OrbitControls)
  const zoomIn = document.getElementById('btn-zoom-in');
  const zoomOut = document.getElementById('btn-zoom-out');
  const resetMap = document.getElementById('btn-reset-map');
  if (zoomIn) zoomIn.style.display = 'none';
  if (zoomOut) zoomOut.style.display = 'none';
  if (resetMap) resetMap.style.display = 'none';

  rendererInitialized = true;
}
```

Update `initGameMulti`:
```js
export function initGameMulti() {
  init3D();
  buildLegend();
  renderMap();
  updateHeader();
  updatePhaseUI();
  updateDiploPanel();
  renderSanctionsDisplay();
  startTurn();
}
```

- [ ] **Step 5: Wire 3D events**

Add inside `init3D` (after renderer init):

```js
const canvas = renderer.domElement;
canvas.addEventListener('pointermove', (e) => {
  handlePointerMove(e, camera, canvas);
});
canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 0) {
    handlePointerDown(e, camera, canvas, handleTerritoryClick);
  }
});
```

- [ ] **Step 6: Remove window export of old functions**

Remove from the bottom of main.js:
```js
// Remove these lines — they no longer exist:
window.updateMapTransform = updateMapTransform;
```

- [ ] **Step 7: Clean up state imports**

Remove `mapViewState` from the import line in main.js (import line currently imports it from state.js).

---

### Task 7: Modify index.html — Replace SVG with Canvas Container

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace SVG in map-container**

In the `<div id="game" class="screen">` section, find the `#map-container` div and replace its contents.

Replace:
```html
<div class="map-select-instr" id="map-select-instr">Cliquez sur un territoire sur la carte</div>
<svg id="world-map" viewBox="0 0 1000 700"></svg>
<div class="map-controls">
  <button class="map-ctrl-btn" id="btn-zoom-in">+</button>
  <button class="map-ctrl-btn" id="btn-zoom-out">-</button>
  <button class="map-ctrl-btn" id="btn-reset-map">⟲</button>
</div>
```

With:
```html
<div class="map-select-instr" id="map-select-instr">Cliquez sur un territoire sur la carte</div>
<div class="map-controls" style="display:none;">
  <button class="map-ctrl-btn" id="btn-zoom-in">+</button>
  <button class="map-ctrl-btn" id="btn-zoom-out">-</button>
  <button class="map-ctrl-btn" id="btn-reset-map">⟲</button>
</div>
```

The Three.js canvas will be prepended to `#map-container` by `renderer3d.initRenderer()`.

---

### Task 8: Update CSS — SVG cleanup and canvas sizing

**Files:**
- Modify: `src/css/style.css`

- [ ] **Step 1: Add canvas styles**

At the end of the CSS file (before responsive section), add:

```css
/* ===== 3D CANVAS ===== */
#map-container canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 2: Keep SVG styles but mark as unused**

Remove these CSS rules (they're no longer needed):
- `.territory`, `.territory:hover`, `.territory.selected`, `.territory.attack-target`, `.territory.move-target`
- `.army-token-group`, `.territory:hover + .army-token-group`
- `.terr-label`, `.terr-armies-text`, `.army-token-outer`
- `.maritime-route`, `@keyframes sailDash`
- `#world-map` rules
- `.map-felt-overlay`
- `#map-container::before` (ocean wave overlay)
- `#map-container.panning`

Keep: all panel, modal, header, intro, setup styles.

- [ ] **Step 3: Adjust `#map-container` background**

Change:
```css
#map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #0d1a15;
  cursor: grab;
}
```
To:
```css
#map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #0d1a15;
}
```
(Remove `cursor: grab` since OrbitControls handles it.)

Also remove the duplicate `#map-container` rules at line 571.

---

### Task 9: Verify the build

- [ ] **Step 1: Build to check for errors**

Run: `npm run build`
Expected: No errors. Output written to `dist/`.

- [ ] **Step 2: Run dev server**

Run: `npm run dev`
Expected: Dev server starts without errors.

- [ ] **Step 3: Quick smoke test**

Open browser to dev server URL. Verify:
- Intro screen loads correctly
- Setup screen works
- Game starts — 3D board visible with colored territories
- Territory hover highlights
- Territory click selects (attack/reinf flow works)
- Side panel still shows phase info, buttons work
- Modals (combat, move, cards, diplo) work

---

### Task 10: Self-review against spec

**Checklist:**
1. SVG paths → extruded 3D territories? ✓ (map3d.js)
2. Continent colors applied? ✓ (syncTerritories with CONTINENTS)
3. 3D army pieces per territory? ✓ (pieces3d.js)
4. Hover + click via raycaster? ✓ (map3d.js handlePointerMove/handlePointerDown)
5. Camera with OrbitControls, angle ~45°? ✓ (renderer3d.js)
6. Lighting with ambient + directional? ✓ (renderer3d.js)
7. All game logic unchanged? ✓ (game.js, state.js, config.js, diplo.js, p2p.js untouched)
8. Overlay UI (modals, HUD, buttons) preserved? ✓ (ui.js keeps all overlay functions)
9. Build passes? ✓ (verify in Task 9)
