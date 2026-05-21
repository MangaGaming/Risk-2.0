import { memo, useEffect, useRef, useCallback } from 'react';
import {
  Shape, ExtrudeGeometry, Mesh, MeshStandardMaterial,
  Group, EdgesGeometry, LineSegments, LineBasicMaterial,
  LineDashedMaterial, BufferGeometry, Line, CylinderGeometry,
  Color, Vector2, Vector3, Raycaster, PlaneGeometry
} from 'three';
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

interface ParsedToken { cmd: string; params: number[] }

function tokenize(d: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  const re = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    const params = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    tokens.push({ cmd: m[1], params });
  }
  return tokens;
}

function tokensToShape(tokens: ParsedToken[]): Shape {
  const shape = new Shape();
  let cx = 0, cy = 0, lx = 0, ly = 0;
  let smooth = false;

  for (const { cmd, params: p } of tokens) {
    switch (cmd) {
      case 'M':
        shape.moveTo(p[0], p[1]); cx = p[0]; cy = p[1]; smooth = false;
        for (let j = 2; j < p.length; j += 2) { shape.lineTo(p[j], p[j+1]); cx = p[j]; cy = p[j+1]; }
        break;
      case 'm':
        shape.moveTo(cx + p[0], cy + p[1]); cx += p[0]; cy += p[1]; smooth = false;
        for (let j = 2; j < p.length; j += 2) { shape.lineTo(cx + p[j], cy + p[j+1]); cx += p[j]; cy += p[j+1]; }
        break;
      case 'L':
        for (let j = 0; j < p.length; j += 2) { shape.lineTo(p[j], p[j+1]); cx = p[j]; cy = p[j+1]; }
        smooth = false; break;
      case 'l':
        for (let j = 0; j < p.length; j += 2) { shape.lineTo(cx + p[j], cy + p[j+1]); cx += p[j]; cy += p[j+1]; }
        smooth = false; break;
      case 'H':
        for (const x of p) { shape.lineTo(x, cy); cx = x; }
        smooth = false; break;
      case 'h':
        for (const x of p) { shape.lineTo(cx + x, cy); cx += x; }
        smooth = false; break;
      case 'V':
        for (const y of p) { shape.lineTo(cx, y); cy = y; }
        smooth = false; break;
      case 'v':
        for (const y of p) { shape.lineTo(cx, cy + y); cy += y; }
        smooth = false; break;
      case 'C':
        for (let j = 0; j < p.length; j += 6) {
          shape.bezierCurveTo(p[j], p[j+1], p[j+2], p[j+3], p[j+4], p[j+5]);
          lx = p[j+2]; ly = p[j+3]; cx = p[j+4]; cy = p[j+5];
        }
        smooth = true; break;
      case 'c':
        for (let j = 0; j < p.length; j += 6) {
          shape.bezierCurveTo(cx+p[j], cy+p[j+1], cx+p[j+2], cy+p[j+3], cx+p[j+4], cy+p[j+5]);
          lx = cx + p[j+2]; ly = cy + p[j+3]; cx += p[j+4]; cy += p[j+5];
        }
        smooth = true; break;
      case 'S':
        for (let j = 0; j < p.length; j += 4) {
          const rcp1x = smooth ? cx + (cx - lx) : cx;
          const rcp1y = smooth ? cy + (cy - ly) : cy;
          shape.bezierCurveTo(rcp1x, rcp1y, p[j], p[j+1], p[j+2], p[j+3]);
          lx = p[j]; ly = p[j+1]; cx = p[j+2]; cy = p[j+3];
        }
        smooth = true; break;
      case 's':
        for (let j = 0; j < p.length; j += 4) {
          const rcp1x = smooth ? cx + (cx - lx) : cx;
          const rcp1y = smooth ? cy + (cy - ly) : cy;
          shape.bezierCurveTo(rcp1x, rcp1y, cx+p[j], cy+p[j+1], cx+p[j+2], cy+p[j+3]);
          lx = cx + p[j]; ly = cy + p[j+1]; cx += p[j+2]; cy += p[j+3];
        }
        smooth = true; break;
      case 'Q':
        for (let j = 0; j < p.length; j += 4) {
          const qcx = p[j], qcy = p[j+1], ex = p[j+2], ey = p[j+3];
          shape.bezierCurveTo(
            cx + (qcx - cx) * 2/3, cy + (qcy - cy) * 2/3,
            ex + (qcx - ex) * 2/3, ey + (qcy - ey) * 2/3,
            ex, ey
          );
          lx = qcx; ly = qcy; cx = ex; cy = ey;
        }
        smooth = true; break;
      case 'q':
        for (let j = 0; j < p.length; j += 4) {
          const qcx = cx + p[j], qcy = cy + p[j+1], ex = cx + p[j+2], ey = cy + p[j+3];
          shape.bezierCurveTo(
            cx + (qcx - cx) * 2/3, cy + (qcy - cy) * 2/3,
            ex + (qcx - ex) * 2/3, ey + (qcy - ey) * 2/3,
            ex, ey
          );
          lx = qcx; ly = qcy; cx = ex; cy = ey;
        }
        smooth = true; break;
      case 'T':
        for (let j = 0; j < p.length; j += 2) {
          const qx = smooth ? cx + (cx - lx) : cx;
          const qy = smooth ? cy + (cy - ly) : cy;
          const ex = p[j], ey = p[j+1];
          shape.bezierCurveTo(
            cx + (qx - cx) * 2/3, cy + (qy - cy) * 2/3,
            ex + (qx - ex) * 2/3, ey + (qy - ey) * 2/3,
            ex, ey
          );
          lx = qx; ly = qy; cx = ex; cy = ey;
        }
        smooth = true; break;
      case 't':
        for (let j = 0; j < p.length; j += 2) {
          const qx = smooth ? cx + (cx - lx) : cx;
          const qy = smooth ? cy + (cy - ly) : cy;
          const ex = cx + p[j], ey = cy + p[j+1];
          shape.bezierCurveTo(
            cx + (qx - cx) * 2/3, cy + (qy - cy) * 2/3,
            ex + (qx - ex) * 2/3, ey + (qy - ey) * 2/3,
            ex, ey
          );
          lx = qx; ly = qy; cx = ex; cy = ey;
        }
        smooth = true; break;
      case 'Z': case 'z':
        shape.closePath(); smooth = false; break;
    }
  }
  return shape;
}

const preParsed: Record<string, Shape> = {};
for (const [name, pathData] of Object.entries(TERRITORY_PATHS)) {
  preParsed[name] = tokensToShape(tokenize(pathData));
}

function scaleShape(shape: Shape): Shape {
  const pts = shape.getPoints(20);
  const c = new Shape();
  c.moveTo((pts[0].x - 500) * SCALE, -(pts[0].y - 350) * SCALE);
  for (let i = 1; i < pts.length; i++) {
    c.lineTo((pts[i].x - 500) * SCALE, -(pts[i].y - 350) * SCALE);
  }
  return c;
}

interface Map3DProps {
  onTerritoryClick: (name: string) => void;
}

function Map3D({ onTerritoryClick }: Map3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ReturnType<typeof initRenderer> | null>(null);
  const territoryMeshesRef = useRef<Map<string, Mesh>>(new Map());
  const pieceGroupRef = useRef<Group | null>(null);
  const raycasterRef = useRef(new Raycaster());
  const pointerRef = useRef(new Vector2());

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

    const territoryGroup = new Group();
    scene.add(territoryGroup);

    const oceanGeo = new PlaneGeometry(30, 22);
    const oceanMat = new MeshStandardMaterial({ color: 0x1a3a5c, roughness: 0.9, metalness: 0 });
    const ocean = new Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -EXTRUDE_DEPTH - 0.1;
    scene.add(ocean);

    for (const [name, pathData] of Object.entries(TERRITORY_PATHS)) {
      const shape = preParsed[name];
      if (!shape) continue;

      const scaled = scaleShape(shape);
      const geo = new ExtrudeGeometry(scaled, {
        depth: EXTRUDE_DEPTH,
        bevelEnabled: false,
      });
      geo.computeVertexNormals();

      const contName = Object.keys(CONTINENTS).find((c) =>
        CONTINENTS[c].territories.includes(name)
      );
      const contColor = new Color(CONTINENTS[contName]?.color || '#888888');

      const mat = new MeshStandardMaterial({
        color: contColor,
        roughness: 0.6,
        metalness: 0.1,
      });

      const mesh = new Mesh(geo, mat);
      mesh.userData.territoryName = name;
      mesh.rotation.x = -Math.PI / 2;
      territoryGroup.add(mesh);
      territoryMeshesRef.current.set(name, mesh);

      const edges = new EdgesGeometry(geo);
      const lineMat = new LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
      });
      const line = new LineSegments(edges, lineMat);
      line.rotation.x = -Math.PI / 2;
      territoryGroup.add(line);
    }

    const maritimeMat = new LineDashedMaterial({
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
        new Vector3((p1[0] - 500) * SCALE, 0.1, -(p1[1] - 350) * SCALE),
        new Vector3((p2[0] - 500) * SCALE, 0.1, -(p2[1] - 350) * SCALE),
      ];
      const mGeo = new BufferGeometry().setFromPoints(pts);
      const mLine = new Line(mGeo, maritimeMat);
      mLine.computeLineDistances();
      scene.add(mLine);
    }

    const pGroup = new Group();
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
        (mesh.material as MeshStandardMaterial).color.set(player.color);
      }
    }
  }, [state.territories, state.players]);

  useEffect(() => {
    const pGroup = pieceGroupRef.current;
    if (!pGroup) return;

    while (pGroup.children.length > 0) {
      const child = pGroup.children[0] as Group;
      for (const piece of child.children) {
        if ((piece as Mesh).geometry) (piece as Mesh).geometry.dispose();
        if ((piece as Mesh).material) (piece as Mesh).material.dispose();
      }
      pGroup.remove(child);
    }

    for (const [name, t] of Object.entries(state.territories)) {
      if (t.armies <= 0) continue;
      const pos = POSITIONS[name];
      if (!pos) continue;

      const playerColor = new Color(state.players[t.owner]?.color || '#888');
      const centerX = (pos[0] - 500) * SCALE;
      const centerZ = -(pos[1] - 350) * SCALE;

      const clusterGroup = new Group();
      const count = Math.min(t.armies, MAX_VISIBLE);

      for (let i = 0; i < count; i++) {
        const [dx, dz] = OFFSETS[i % OFFSETS.length];
        const pGeo = new CylinderGeometry(PIECE_RADIUS, PIECE_RADIUS * 1.2, PIECE_HEIGHT, 6);
        const pMat = new MeshStandardMaterial({
          color: playerColor,
          roughness: 0.5,
          metalness: 0.2,
        });
        const piece = new Mesh(pGeo, pMat);
        piece.position.set(centerX + dx, EXTRUDE_DEPTH + PIECE_HEIGHT / 2, centerZ + dz);
        clusterGroup.add(piece);
      }

      pGroup.add(clusterGroup);
    }
  }, [state.territories, state.players]);

  return <div ref={containerRef} />;
}

export default memo(Map3D);
