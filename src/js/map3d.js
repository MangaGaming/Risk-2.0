import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { TERRITORY_PATHS, CONTINENTS, POSITIONS, MARITIME_ROUTES } from './config.js';
import { state } from './state.js';

const loader = new SVGLoader();
const SCALE = 1 / 45;
const EXTRUDE_DEPTH = 0.8;

const territoryMeshes = new Map();
let territoryGroup;
let maritimeLines = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let currentHovered = null;

function createTerritoryTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const v = Math.floor(Math.random() * 30 + 225);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

const territoryTex = createTerritoryTexture();

export function buildTerritories(scene) {
  territoryGroup = new THREE.Group();
  scene.add(territoryGroup);
  scene.add(createOcean());

  for (const [name, pathData] of Object.entries(TERRITORY_PATHS)) {
    const shapes = parseSvgPath(pathData);
    if (shapes.length === 0) continue;

    const shapesScaled = shapes.map(s => {
      const pts = s.getPoints(20);
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
      bevelThickness: 0.06,
      bevelSize: 0.04,
      bevelSegments: 4
    });
    geo.computeVertexNormals();

    const contName = Object.keys(CONTINENTS).find(c => CONTINENTS[c].territories.includes(name));
    const contColor = new THREE.Color(CONTINENTS[contName]?.color || '#888888');

    const mat = new THREE.MeshStandardMaterial({
      color: contColor,
      map: territoryTex,
      roughness: 0.65,
      metalness: 0.05,
      envMapIntensity: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.territoryName = name;
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    territoryGroup.add(mesh);
    territoryMeshes.set(name, mesh);

    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    );
    line.rotation.x = -Math.PI / 2;
    territoryGroup.add(line);
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
  const group = new THREE.Group();

  const geo = new THREE.PlaneGeometry(32, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a2848,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.95,
    envMapIntensity: 0.3
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -EXTRUDE_DEPTH - 0.1;
  mesh.receiveShadow = true;
  group.add(mesh);

  const geo2 = new THREE.PlaneGeometry(34, 26);
  const mat2 = new THREE.MeshStandardMaterial({
    color: 0x061830,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.6
  });
  const mesh2 = new THREE.Mesh(geo2, mat2);
  mesh2.rotation.x = -Math.PI / 2;
  mesh2.position.y = -EXTRUDE_DEPTH - 0.3;
  group.add(mesh2);

  return group;
}

function addMaritimeRoutes(scene) {
  if (!MARITIME_ROUTES) return;
  const mat = new THREE.LineDashedMaterial({
    color: 0xd4a017,
    transparent: true,
    opacity: 0.4,
    dashSize: 0.2,
    gapSize: 0.15
  });
  MARITIME_ROUTES.forEach(([a, b]) => {
    const p1 = POSITIONS[a];
    const p2 = POSITIONS[b];
    if (!p1 || !p2) return;
    const pts = [
      new THREE.Vector3((p1[0] - 500) * SCALE, 0.15, (p1[1] - 350) * SCALE),
      new THREE.Vector3((p2[0] - 500) * SCALE, 0.15, (p2[1] - 350) * SCALE)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    scene.add(line);
    maritimeLines.push(line);
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
      hit.material.emissiveIntensity = 0.25;
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
