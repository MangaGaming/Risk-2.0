const fs = require('fs');

const svg = fs.readFileSync('risk_board_real.svg', 'utf8');

// Find all path 'd' attributes
const dRegex = /d=['\"]([^'\"]+)['\"]/g;
let m;
const svgPaths = [];
while((m = dRegex.exec(svg)) !== null) {
  if (m[1].length > 100) {
    svgPaths.push(m[1]);
  }
}

// Sample from paths_out.txt (provided in previous context)
const pathsAlaska = { x: 254.5, y: 242.25 };
const pathsAustralia = { x: 832.08, y: 509.72 };

// Find SVG path for Alaska (starts near 219, 183)
const svgAlaskaPath = svgPaths.find(d => d.includes('219.726'));
const svgAlaskaMatch = svgAlaskaPath ? svgAlaskaPath.match(/[ml]\s*([\d.]+),([\d.]+)/i) : null;
const svgAlaska = svgAlaskaMatch ? { x: parseFloat(svgAlaskaMatch[1]), y: parseFloat(svgAlaskaMatch[2]) } : null;

// Find SVG path for Australia (starts near 800+, 450+)
const svgAustraliaPath = svgPaths.find(d => d.includes('832.08') || d.includes('832.75'));
// Wait, maybe the SVG path for Australia starts differently.
// Let's just find the path that has the highest X.
let maxX = 0;
let svgLast = null;
svgPaths.forEach(d => {
  const pts = d.match(/[MLml]\s*([\d.]+),([\d.]+)/);
  if (pts) {
    const x = parseFloat(pts[1]);
    if (x > maxX) {
      maxX = x;
      svgLast = { x, y: parseFloat(pts[2]) };
    }
  }
});

console.log('Alaska SVG:', svgAlaska);
console.log('Alaska Paths:', pathsAlaska);
if (svgAlaska) console.log('Alaska Diff:', { dx: pathsAlaska.x - svgAlaska.x, dy: pathsAlaska.y - svgAlaska.y });

console.log('Max X SVG:', svgLast);
// In paths_out.txt, Australia East is at X=832 (start) and goes to 899.
const pathsAustraliaEast = { x: 832.087, y: 509.729 };
if (svgLast) console.log('Australia Diff:', { dx: pathsAustraliaEast.x - svgLast.x, dy: pathsAustraliaEast.y - svgLast.y });

// Also check scale
if (svgAlaska && svgLast) {
    const dSvgX = svgLast.x - svgAlaska.x;
    const dSvgY = svgLast.y - svgAlaska.y;
    const dPathX = pathsAustraliaEast.x - pathsAlaska.x;
    const dPathY = pathsAustraliaEast.y - pathsAlaska.y;
    console.log('Scale X:', dPathX / dSvgX);
    console.log('Scale Y:', dPathY / dSvgY);
}
