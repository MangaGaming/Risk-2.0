const s = require('fs').readFileSync('risk_board_real.svg', 'utf8');
// Extract full opening svg tag
const match = s.match(/<svg[^>]*>/s);
if (match) {
  console.log('SVG tag:', match[0].substring(0, 1000));
}
// Also look for inkscape:document-units or docbase
const vbMatch = s.match(/viewBox\s*=\s*"([^"]+)"/i);
console.log('viewBox:', vbMatch ? vbMatch[1] : 'NOT FOUND');
