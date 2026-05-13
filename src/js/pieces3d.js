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
