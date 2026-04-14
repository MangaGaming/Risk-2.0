const fs = require('fs');
const svgData = fs.readFileSync('risk_board_real.svg', 'utf8');

const mapping = {
  'alaska': 'Alaska', 'northwest_territory': 'Nord-Ouest', 'greenland': 'Groenland',
  'alberta': 'Alberta', 'ontario': 'Ontario', 'quebec': 'Québec',
  'western_united_states': "États-Unis de l'Ouest", 'eastern_united_states': "États-Unis de l'Est",
  'central_america': 'Amérique Centrale', 'venezuela': 'Venezuela', 'peru': 'Pérou',
  'brazil': 'Brésil', 'argentina': 'Argentine', 'iceland': 'Islande',
  'scandinavia': 'Scandinavie', 'great_britain': 'Grande-Bretagne',
  'northern_europe': 'Europe du Nord', 'western_europe': "Europe de l'Ouest",
  'southern_europe': 'Europe du Sud', 'ukraine': 'Ukraine',
  'north_africa': 'Afrique du Nord', 'egypt': 'Égypte', 'east_africa': "Afrique de l'Est",
  'congo': 'Afrique Centrale', 'south_africa': 'Afrique du Sud', 'madagascar': 'Madagascar',
  'ural': 'Oural', 'siberia': 'Sibérie', 'yakursk': 'Yakoutsk', // Note: typo in wiki SVG 'yakursk'
  'kamchatka': 'Kamchatka', 'irkutsk': 'Irkoutsk', 'mongolia': 'Mongolie',
  'japan': 'Japon', 'china': 'Chine', 'afghanistan': 'Afghanistan',
  'middle_east': 'Moyen-Orient', 'india': 'Inde', 'siam': 'Siam',
  'indonesia': 'Indonésie', 'new_guinea': 'Nouvelle-Guinée',
  'western_australia': "Australie de l'Ouest", 'eastern_australia': "Australie de l'Est"
};

const regex1 = /<path[^>]*id="([^"]+)"[^>]*d="([^"]+)"/g;
const regex2 = /<path[^>]*d="([^"]+)"[^>]*id="([^"]+)"/g;

let territories = {};
let match;
while ((match = regex1.exec(svgData)) !== null) {
  if (mapping[match[1]]) territories[mapping[match[1]]] = match[2];
}
while ((match = regex2.exec(svgData)) !== null) {
  if (mapping[match[2]]) territories[mapping[match[2]]] = match[1];
}

// Ensure all 42 mapped
let out = "const TERRITORY_PATHS = {\n";
let centers = "const POSITIONS = {\n";

for (let key in mapping) {
  let frName = mapping[key];
  if (territories[frName]) {
    out += `  "${frName}": '${territories[frName]}',\n`;
    
    // Estimate centroid
    let pts = territories[frName].match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (pts && pts.length >= 2) {
      let sx = 0, sy = 0, count = 0;
      for (let i=0; i<pts.length; i+=2) {
        let px = parseFloat(pts[i]);
        let py = parseFloat(pts[i+1]);
        if (!isNaN(px) && !isNaN(py)) {
           sx+=px; sy+=py; count++;
        }
      }
      centers += `  "${frName}": [${Math.round(sx/count)}, ${Math.round(sy/count)}],\n`;
    }
  } else {
    console.log("MISSING:", frName);
  }
}
out += "};\n";
centers += "};\n";

fs.writeFileSync('paths_out.txt', out + '\n' + centers);
console.log("Done");
