const fs = require('fs');

const configSrc = fs.readFileSync('js/config.js', 'utf8');
const pathsData = fs.readFileSync('paths_out.txt', 'utf8');

// Replace TERRITORY_PATHS and POSITIONS
let modified = configSrc.replace(/const TERRITORY_PATHS = \{[\s\S]*?^};\n/m, '')
                        .replace(/const POSITIONS = \{[\s\S]*?^};\n/m, '');

// Insert the new ones before MARITIME_ROUTES
modified = modified.replace('// ============================================================', 
  pathsData + '\n// ============================================================');

// We just replace the first occurence or right after ADJACENCY.
// Let's do it right. Let's find MARITIME_ROUTES and insert right before it.

let configLines = configSrc.split('\n');
let insertIndex = configLines.findIndex(l => l.includes('MARITIME_ROUTES'));

// Just to be safe, rewrite the file using replace
const justTop = configSrc.split('const TERRITORY_PATHS =')[0];
const justBottom = configSrc.substring(configSrc.indexOf('// ============================================================\n// MARITIME ROUTES'));

const newConfig = justTop + '\n// ============================================================\n// SVG POLYGON POINTS\n// ============================================================\n' + pathsData + '\n' + justBottom;

fs.writeFileSync('js/config.js', newConfig);
console.log("Config updated successfully.");
