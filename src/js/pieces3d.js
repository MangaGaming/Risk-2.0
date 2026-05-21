import * as THREE from 'three';
import { POSITIONS } from './config.js';
import { EXTRUDE_DEPTH } from './map3d.js';

const SCALE = 1 / 45;
const PIECE_RADIUS = 0.3;
const PIECE_HEIGHT = 0.4;
const MAX_VISIBLE = 12;

const OFFSETS = [
  [0, 0],
  [-0.4, -0.3], [0.4, -0.3],
  [-0.4, 0.3], [0.4, 0.3],
  [0, -0.6],
  [-0.8, 0], [0.8, 0],
  [0, 0.6],
  [-0.8, -0.6], [0.8, -0.6],
  [-0.8, 0.6], [0.8, 0.6]
];

let pieceGroup;
const pieceClusters = new Map();
const sharedGeo = new THREE.CylinderGeometry(PIECE_RADIUS, PIECE_RADIUS * 1.2, PIECE_HEIGHT, 6);

export function initPieces(scene) {
  pieceGroup = new THREE.Group();
  scene.add(pieceGroup);
}

export function syncPieces(state) {
  for (const [, cluster] of pieceClusters) {
    cluster.traverse(child => {
      if (child.isMesh && child.material) child.material.dispose();
    });
    pieceGroup.remove(cluster);
  }
  pieceClusters.clear();

  for (const [name, t] of Object.entries(state.territories)) {
    if (t.armies <= 0) continue;
    const pos = POSITIONS[name];
    if (!pos) continue;

    const playerColor = new THREE.Color(state.players[t.owner]?.color || '#888');
    const centerX = (pos[0] - 500) * SCALE;
    const centerZ = (pos[1] - 350) * SCALE;

    const clusterGroup = new THREE.Group();
    const count = Math.min(t.armies, MAX_VISIBLE);

    for (let i = 0; i < count; i++) {
      const [dx, dz] = OFFSETS[i];
      const mat = new THREE.MeshLambertMaterial({ color: playerColor });
      const piece = new THREE.Mesh(sharedGeo, mat);
      piece.position.set(centerX + dx, EXTRUDE_DEPTH + PIECE_HEIGHT / 2, centerZ + dz);
      clusterGroup.add(piece);
    }

    pieceGroup.add(clusterGroup);
    pieceClusters.set(name, clusterGroup);
  }
}

export function clearPieces() {
  if (pieceGroup) {
    while (pieceGroup.children.length) {
      const child = pieceGroup.children[0];
      child.traverse(c => {
        if (c.isMesh && c.material) c.material.dispose();
      });
      pieceGroup.remove(child);
    }
  }
  pieceClusters.clear();
}
