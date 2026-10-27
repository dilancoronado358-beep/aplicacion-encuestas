const fs = require('fs');
const path = require('path');

const sourceFile = 'C:\\Users\\usuario\\Downloads\\MAN_SAN_GABRIEL.geojson';
console.log('Reading full file from:', sourceFile);

const content = fs.readFileSync(sourceFile, 'utf8');
const parsed = JSON.parse(content);

console.log('✅ Name:', parsed.name);
console.log('✅ Total Features Count:', parsed.features.length);

const pubDest = path.resolve(__dirname, '../../public/manzanas_san_gabriel.json');
const srcDest = path.resolve(__dirname, '../data/manzanas_san_gabriel.json');

fs.writeFileSync(pubDest, content, 'utf8');
fs.writeFileSync(srcDest, content, 'utf8');

console.log('✅ Successfully copied full GeoJSON to:', pubDest);
console.log('✅ Successfully copied full GeoJSON to:', srcDest);
