import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { initRenderer } from '@/services/renderer3d';
import { TERRITORY_PATHS, CONTINENTS, POSITIONS, MARITIME_ROUTES } from '@/types/config';
import { useGame } from '@/context/GameContext';

const SCALE = 1 / 45;
const EXTRUDE_DEPTH = 0.8;
const PIECE_RADIUS = 0.3;
const PIECE_HEIGHT = 0.4;
const MAX_VISIBLE = 12;

const OFFSETS: [number, number][] = [
  [0, 0], [-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3],
  [0, -0.6], [-0.8, 0], [0.8, 0], [0, 0.6],
  [-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6],
];

const loader = new SVGLoader();

function parseSvgPath(pathData: string): THREE.Shape[] {
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700"><path d="${pathData}"/></svg>`;
  const result = loader.parse(svgText);
  const shapes: THREE.Shape[] = [];
  for (const shapePath of result.paths) {
    const s = SVGLoader.createShapes(shapePath);
    shapes.push(...s);
  }
  return shapes;
}

function scaleShape(shape: THREE.Shape): THREE.Shape {
  const pts = shape.getPoints(50);
  const c = new THREE.Shape();
  c.moveTo((pts[0].x - 500) * SCALE, -(pts[0].y - 350) * SCALE);
  for (let i = 1; i < pts.length; i++) {
    c.lineTo((pts[i].x - 500) * SCALE, -(pts[i].y - 350) * SCALE);
  }
  return c;
}

interface Map3DProps {
  onTerritoryClick: (name: string) => void;
}

export default function Map3D({ onTerritoryClick }: Map3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ReturnType<typeof initRenderer> | null>(null);
  const territoryMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const pieceGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());

  const { state } = useGame();

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const canvas = rendererRef.current?.renderer.domElement;
    const camera = rendererRef.current?.camera;
    if (!canvas || !camera) return;

    const rect = canvas.getBoundingClientRect();
    const p = pointerRef.current;
    p.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    p.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(p, camera);
    const meshes = [...territoryMeshesRef.current.values()];
    const hits = raycasterRef.current.intersectObjects(meshes);

    for (const [, mesh] of territoryMeshesRef.current) {
      mesh.material.emissive.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
    }

    if (hits.length > 0) {
      const name = hits[0].object.userData.territoryName as string;
      if (name) {
        const mesh = territoryMeshesRef.current.get(name);
        if (mesh) {
          mesh.material.emissive.setHex(0xffffff);
          mesh.material.emissiveIntensity = 0.15;
        }
        canvas.style.cursor = 'pointer';
      }
    } else {
      canvas.style.cursor = 'default';
    }
  }, []);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    const canvas = rendererRef.current?.renderer.domElement;
    const camera = rendererRef.current?.camera;
    if (!canvas || !camera) return;

    const rect = canvas.getBoundingClientRect();
    const p = pointerRef.current;
    p.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    p.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(p, camera);
    const meshes = [...territoryMeshesRef.current.values()];
    const hits = raycasterRef.current.intersectObjects(meshes);

    if (hits.length > 0) {
      const name = hits[0].object.userData.territoryName as string;
      if (name) onTerritoryClick(name);
    }
  }, [onTerritoryClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const r3d = initRenderer(container);
    rendererRef.current = r3d;
    const { scene } = r3d;

    const territoryGroup = new THREE.Group();
    scene.add(territoryGroup);

    const oceanGeo = new THREE.PlaneGeometry(30, 22);
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5c, roughness: 0.9, metalness: 0 });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -EXTRUDE_DEPTH - 0.1;
    ocean.receiveShadow = true;
    scene.add(ocean);

    for (const [name, pathData] of Object.entries(TERRITORY_PATHS)) {
      const shapes = parseSvgPath(pathData);
      if (shapes.length === 0) continue;

      const scaled = shapes.map(scaleShape);
      const geo = new THREE.ExtrudeGeometry(scaled, {
        depth: EXTRUDE_DEPTH,
        bevelEnabled: true,
        bevelThickness: 0.2,
        bevelSize: 0.1,
        bevelSegments: 3,
      });
      geo.computeVertexNormals();

      const contName = Object.keys(CONTINENTS).find((c) =>
        CONTINENTS[c].territories.includes(name)
      );
      const contColor = new THREE.Color(CONTINENTS[contName]?.color || '#888888');

      const mat = new THREE.MeshStandardMaterial({
        color: contColor,
        roughness: 0.6,
        metalness: 0.1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.territoryName = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.x = -Math.PI / 2;
      territoryGroup.add(mesh);
      territoryMeshesRef.current.set(name, mesh);

      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
      });
      const line = new THREE.LineSegments(edges, lineMat);
      line.rotation.x = -Math.PI / 2;
      territoryGroup.add(line);
    }

    const maritimeMat = new THREE.LineDashedMaterial({
      color: 0xd4a017,
      transparent: true,
      opacity: 0.2,
      dashSize: 0.3,
      gapSize: 0.2,
    });

    for (const [a, b] of MARITIME_ROUTES) {
      const p1 = POSITIONS[a];
      const p2 = POSITIONS[b];
      if (!p1 || !p2) continue;
      const pts = [
        new THREE.Vector3((p1[0] - 500) * SCALE, 0.1, -(p1[1] - 350) * SCALE),
        new THREE.Vector3((p2[0] - 500) * SCALE, 0.1, -(p2[1] - 350) * SCALE),
      ];
      const mGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const mLine = new THREE.Line(mGeo, maritimeMat);
      mLine.computeLineDistances();
      scene.add(mLine);
    }

    const pGroup = new THREE.Group();
    scene.add(pGroup);
    pieceGroupRef.current = pGroup;

    const canvas = r3d.renderer.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      r3d.dispose();
    };
  }, [handlePointerMove, handlePointerDown]);

  useEffect(() => {
    const meshes = territoryMeshesRef.current;
    for (const [name, mesh] of meshes) {
      const t = state.territories[name];
      if (!t) continue;
      const player = state.players[t.owner];
      if (player) {
        (mesh.material as THREE.MeshStandardMaterial).color.set(player.color);
      }
    }
  }, [state.territories, state.players]);

  useEffect(() => {
    const pGroup = pieceGroupRef.current;
    if (!pGroup) return;

    while (pGroup.children.length > 0) {
      const child = pGroup.children[0] as THREE.Group;
      for (const piece of child.children) {
        if ((piece as THREE.Mesh).geometry) (piece as THREE.Mesh).geometry.dispose();
        if ((piece as THREE.Mesh).material) (piece as THREE.Mesh).material.dispose();
      }
      pGroup.remove(child);
    }

    for (const [name, t] of Object.entries(state.territories)) {
      if (t.armies <= 0) continue;
      const pos = POSITIONS[name];
      if (!pos) continue;

      const playerColor = new THREE.Color(state.players[t.owner]?.color || '#888');
      const centerX = (pos[0] - 500) * SCALE;
      const centerZ = -(pos[1] - 350) * SCALE;

      const clusterGroup = new THREE.Group();
      const count = Math.min(t.armies, MAX_VISIBLE);

      for (let i = 0; i < count; i++) {
        const [dx, dz] = OFFSETS[i % OFFSETS.length];
        const pGeo = new THREE.CylinderGeometry(PIECE_RADIUS, PIECE_RADIUS * 1.2, PIECE_HEIGHT, 8);
        const pMat = new THREE.MeshStandardMaterial({
          color: playerColor,
          roughness: 0.5,
          metalness: 0.2,
        });
        const piece = new THREE.Mesh(pGeo, pMat);
        piece.position.set(centerX + dx, EXTRUDE_DEPTH + PIECE_HEIGHT / 2, centerZ + dz);
        piece.castShadow = true;
        clusterGroup.add(piece);
      }

      pGroup.add(clusterGroup);
    }
  }, [state.territories, state.players]);

  return <div id="map-container" ref={containerRef} />;
}
