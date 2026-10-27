const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function main() {
  const logPath = 'C:\\Users\\usuario\\.gemini\\antigravity-ide\\brain\\742391f2-bafa-4498-a942-0b5a791e398f\\.system_generated\\logs\\transcript_full.jsonl';
  console.log('Reading log:', logPath);

  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lastUserInputContent = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT') {
        lastUserInputContent = obj.content;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!lastUserInputContent) {
    console.error('No USER_INPUT found');
    return;
  }

  console.log('Last USER_INPUT length:', lastUserInputContent.length);

  // The content might contain the JSON starting with {"type":"FeatureCollection"
  const startIdx = lastUserInputContent.indexOf('{"type":"FeatureCollection"');
  if (startIdx === -1) {
    console.error('{"type":"FeatureCollection" not found in input');
    return;
  }

  // Find matching closing brace or extract until end of json
  // Usually the geojson is the main json object. Let's find the valid JSON substring.
  let geojsonStr = null;
  // Let's try searching backwards from the end for '}'
  const sub = lastUserInputContent.slice(startIdx);
  console.log('Snippet of sub at the end:');
  console.log(sub.slice(-300));

  // The user input was truncated mid-feature at character ~191931!
  // We can find the last complete feature ending with '}}' or '}]}'
  const lastFeatureEnd = sub.lastIndexOf('}},{"type":"Feature"');
  console.log('lastFeatureEnd index:', lastFeatureEnd);

  let cleanSub = '';
  if (lastFeatureEnd !== -1) {
    // Keep everything up to the last complete feature
    cleanSub = sub.slice(0, lastFeatureEnd + 2) + ']}';
  } else {
    // Search for last '}}'
    const lastDoubleBrace = sub.lastIndexOf('}}');
    if (lastDoubleBrace !== -1) {
      cleanSub = sub.slice(0, lastDoubleBrace + 2) + ']}';
    }
  }

  try {
    const parsed = JSON.parse(cleanSub);
    console.log('Successfully repaired and parsed GeoJSON!');
    console.log('Name:', parsed.name);
    console.log('Features count:', parsed.features.length);
    geojsonStr = JSON.stringify(parsed);
  } catch (err) {
    console.error('Failed to parse repaired JSON:', err.message);
  }

  if (!geojsonStr) {
    console.error('Could not extract GeoJSON');
    return;
  }

  const outDir = path.resolve(__dirname, '../../public');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'manzanas_san_gabriel.json');
  fs.writeFileSync(outPath, geojsonStr, 'utf8');
  console.log('Saved GeoJSON to:', outPath);

  const srcDataDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(srcDataDir)) fs.mkdirSync(srcDataDir, { recursive: true });
  fs.writeFileSync(path.join(srcDataDir, 'manzanas_san_gabriel.json'), geojsonStr, 'utf8');
  console.log('Also saved to src/data/manzanas_san_gabriel.json');
}

main().catch(console.error);
