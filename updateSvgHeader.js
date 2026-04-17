const fs = require('fs');
let s = fs.readFileSync('risk_board_real.svg', 'utf8');
// Update width and height to cover all paths
s = s.replace(/width="749.81909"/, 'width="1000"');
s = s.replace(/height="519.06781"/, 'height="700"');
fs.writeFileSync('risk_board_real.svg', s);
console.log('SVG Header Updated');
