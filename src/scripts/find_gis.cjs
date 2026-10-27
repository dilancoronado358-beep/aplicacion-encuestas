const fs = require('fs');
const path = require('path');
const os = require('os');

const home = os.homedir();
const dirsToSearch = [
  path.join(home, 'Downloads'),
  path.join(home, 'Documents'),
  path.join(home, 'Desktop'),
  path.join(home, 'AppData', 'LocalLow', 'Google', 'GoogleEarth')
];

console.log('Searching dirs:', dirsToSearch);

function searchDir(dir, depth = 0) {
  if (depth > 2) return;
  if (!fs.existsSync(dir)) return;
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          searchDir(full, depth + 1);
        } else if (stat.isFile()) {
          const lower = f.toLowerCase();
          if (
            lower.includes('san gabriel') ||
            lower.includes('manzana') ||
            lower.endsWith('.kml') ||
            lower.endsWith('.kmz') ||
            lower.endsWith('.geojson') ||
            (lower.endsWith('.json') && stat.size > 50000)
          ) {
            console.log('FOUND:', full, 'Size:', stat.size);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

for (const d of dirsToSearch) {
  searchDir(d);
}
console.log('Done searching.');
