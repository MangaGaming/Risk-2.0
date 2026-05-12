# RISK — Le Jeu Mondial de la Stratégie

Portage digital du célèbre jeu de plateau **Risk**, optimisé pour le web.

## Fonctionnalités

- Carte mondiale interactive en SVG (zoom, panoramique, tactile)
- Multijoueur en peer-to-peer via PeerJS
- Diplomatie : pactes de non-agression, alliances, sanctions
- Mode solo (hot-seat) et multijoueur en ligne
- Application web progressive (PWA) — jouable hors ligne
- Interface en français

## Prérequis

- [Node.js](https://nodejs.org/) 18+

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
```

Génère les fichiers dans le dossier `dist/`.

## Aperçu de la build

```bash
npm run preview
```

## Structure du projet

```
├── index.html              # Point d'entrée
├── src/
│   ├── assets/             # Icônes et ressources
│   ├── css/                # Styles
│   ├── html/               # Pages HTML additionnelles
│   └── js/
│       ├── main.js         # Point d'entrée JS
│       ├── game.js         # Logique du jeu
│       ├── state.js        # Gestion d'état
│       ├── p2p.js          # Réseau peer-to-peer
│       ├── ui.js           # Interface utilisateur
│       ├── diplo.js        # Système de diplomatie
│       ├── config.js       # Configuration (adjacences, positions)
│       └── utils.js        # Utilitaires
├── sw.js                   # Service Worker (PWA)
├── manifest.json           # Manifeste PWA
└── start.bat               # Lancement rapide (Windows)
```

## Licence

Projet personnel.
