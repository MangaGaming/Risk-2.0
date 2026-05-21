import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { TERRITORY_PATHS, CONTINENTS, POSITIONS, MARITIME_ROUTES } from './config.js';
import { state } from './state.js';

const loader = new SVGLoader();
const SCALE = 1 / 45;
const EXTRUDE_DEPTH = 0.8;

const territoryMeshes = new Map();
const outlineLines = new Map();
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
      const pts = s.getPoints(50);
      const c = new THREE.Shape();
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
    mesh.rotation.x = -Math.PI / 2;
    territoryGroup.add(mesh);
    territoryMeshes.set(name, mesh);

    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    });
    const line = new THREE.LineSegments(edges, lineMat);
    line.rotation.x = -Math.PI / 2;
    territoryGroup.add(line);
    outlineLines.set(name, line);
  }

  addMaritimeRoutes(scene);
}

function parseSvgPath(pathData) {
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700"><path d="${pathData}"/></svg>`;
  const result = loader.parse(svgText);
  const shapes = [];
  for (const shapePath of result.paths) {
    const s = SVGLoader.createShapes(shapePath);
    shapes.push(...s);
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
  if (!MARITIME_ROUTES) return;
  const mat = new THREE.LineDashedMaterial({
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
      new THREE.Vector3((p1[0] - 500) * SCALE, 0.1, (p1[1] - 350) * SCALE),
      new THREE.Vector3((p2[0] - 500) * SCALE, 0.1, (p2[1] - 350) * SCALE)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    scene.add(line);
  });
}

export function syncTerritories() {
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

export { EXTRUDE_DEPTH };

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
