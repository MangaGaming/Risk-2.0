# RISK 3D Board — Design Spec

## Overview

Transform the current 2D SVG-based RISK board game into a 3D tabletop experience using Three.js. The game logic layer remains untouched — only the rendering and interaction layers change.

## Architecture

```
[Game Logic Layer]      game.js, state.js, diplo.js, p2p.js, utils.js, config.js
                            ↑ state → render   ↓ events (clicks, phase actions)
[3D Rendering Layer]    renderer3d.js, map3d.js, pieces3d.js
                            ↑ renders to canvas
[Overlay UI Layer]      Modals, HUD, buttons (HTML/CSS positioned over canvas)
```

### Files

**New files:**
- `src/js/renderer3d.js` — Three.js scene, camera, renderer, lights, OrbitControls, resize, render loop
- `src/js/map3d.js` — SVG path → 3D extruded geometry, territory meshes, hover/click via Raycaster, continent coloring
- `src/js/pieces3d.js` — 3D army pieces per territory (cylinders/cones), clusters with count labels

**Modified files:**
- `src/js/ui.js` — Replace `renderMap()` and all SVG rendering with calls to the 3D renderer. Preserve modals, toasts, phase UI, card UI, diplomacy panel in overlay form.
- `src/js/main.js` — Replace DOM-based map events with Three.js Raycaster. Initialize renderer. Wire orbit controls.
- `index.html` — Replace SVG map area with Three.js canvas. Keep all modal HTML. Strip SVG-specific HTML.
- `src/css/style.css` — Strip SVG/carte styles. Keep overlay, modal, typography, animation styles. Add canvas layout styles.
- `package.json` — Add `three` as dependency.

**Unchanged:**
- `game.js`, `state.js`, `config.js` (paths reused by parser), `diplo.js`, `p2p.js`, `utils.js`

## 3D Board (map3d.js)

### SVG Path → 3D Geometry Pipeline

1. Take `TERRITORY_PATHS[name]` SVG path string from `config.js`
2. Wrap in minimal SVG element: `<svg><path d="..."/></svg>`
3. Parse with Three.js `SVGLoader.parse()` → `ShapePath` objects
4. Convert `ShapePath` → `THREE.Shape` → `ExtrudeGeometry` (depth ~2 units)
5. Center and scale geometry to fit scene

### Territory Meshes

- Each territory is an extruded mesh with:
  - `MeshStandardMaterial` colored by continent (from `CONTINENTS[continent].color`)
  - Slightly darker border edge (via `ExtrudeGeometry` bevel)
  - User data: `{ territoryName, continent, index }`
- Hover: increase emissive intensity + outline glow
- Click: Raycaster intersection → same event flow as current (reinf/attack/move selection)

### Ocean Base

- Large plane below territories with dark blue `MeshStandardMaterial`
- Subtle wave animation via vertex shader or texture offset (optional)

## Camera & Controls

- `PerspectiveCamera(fov=45, aspect, near=0.1, far=1000)`
- Position: `(0, 40, 40)` angled down at ~45°
- `OrbitControls` with:
  - `minPolarAngle`: 0.1 (prevent going under board)
  - `maxPolarAngle`: Math.PI / 2.2
  - `minDistance`: 20
  - `maxDistance`: 80
  - `enableDamping`: true
- Target: center of board `(0, 0, 0)`

## Lighting

- `AmbientLight(0xffffff, 0.4)` — base fill
- `DirectionalLight(0xffffff, 0.8)` — from upper right
- `DirectionalLight(0x404060, 0.3)` — cool rim from opposite side

## Army Pieces (pieces3d.js)

- Each territory with `armies > 0` renders 3D pieces
- **CylinderGeometry** (radius 1, height 0.5) per piece
- Color: player color (from state)
- Max 5 visible pieces per territory + floating `CSS2DSprite` label with army count
- Pieces arranged in small cluster using computed positions within territory bounds
- Update on state change: `syncPieces(state)`

## Overlay UI

The following remain as HTML/CSS overlays:

- **HUD**: Current turn, phase name, player stats (territory count, army count per player)
- **Phase buttons**: Renfort, Attaquer, Déplacer, Fin de tour
- **Modals**: Combat (dice roll), Déplacement (slider), Diplomatie (pactes/échanges), Cartes, Sanctions, Victoire
- **Toast notifications**
- **Log de guerre** (collapsible)

Positioned via `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none` on overlay container (with `pointer-events: auto` on interactive elements).

## Data Flow

1. `game.js` updates `state.territories`, `state.players`, `state.phase`, etc.
2. `ui.js` (modified) calls:
   - `renderer3d.syncTerritories(state)` — update territory colors (ownership)
   - `pieces3d.syncPieces(state)` — update army piece positions/counts
   - `renderer3d.setPhase(state.phase)` — update visual phase indicators
3. `main.js` (modified) handles:
   - Raycaster click → `onTerritoryClick(name)` (same flow as before)
   - OrbitControls pan/zoom
   - Window resize

## Skybox / Environment

- Subtle gradient sky (light blue to warm horizon) via `Scene.background` as `Color`
- Optional fog for depth: `FogExp2(0x87CEEB, 0.002)`

## Migration Path

1. Install Three.js via npm
2. Create `renderer3d.js`, `map3d.js`, `pieces3d.js`
3. Modify `index.html` to add canvas container
4. Modify `main.js` to init 3D instead of SVG
5. Modify `ui.js` to delegate to 3D
6. Strip unused SVG/CSS
7. Test full game flow (local mode)
8. Test P2P mode (rendering layer only)
