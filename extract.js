const fs = require('fs');

const svgData = fs.readFileSync('risk_board_real.svg', 'utf8');

// Regex to find paths with an id
// <path ... id="alaska" d="..." />
const regex = /<path[^>]*id="([^"]+)"[^>]*d="([^"]+)"/g;
const regex2 = /<path[^>]*d="([^"]+)"[^>]*id="([^"]+)"/g;

let match;
const territories = {};

while ((match = regex.exec(svgData)) !== null) {
  let [full, id, d] = match;
  territories[id.toLowerCase()] = d;
}

while ((match = regex2.exec(svgData)) !== null) {
  let [full, d, id] = match;
  territories[id.toLowerCase()] = d;
}

fs.writeFileSync('extracted_paths.json', JSON.stringify(territories, null, 2));
console.log("Extracted IDs:", Object.keys(territories).join(", "));
