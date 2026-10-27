import defaultManzanasGeoJSON from '../data/manzanas_san_gabriel.json';

/**
 * Determina si un punto [x=lng, y=lat] está dentro de un anillo de coordenadas
 */
function isPointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Determina si un punto está dentro de un Polígono GeoJSON (incluyendo verificación de agujeros)
 */
function isPointInPolygon(point, coordinates) {
  if (!coordinates || !coordinates.length) return false;
  // Primer anillo es el límite exterior
  if (!isPointInRing(point, coordinates[0])) return false;
  // Anillos posteriores son agujeros (si está dentro de un agujero, no está en el polígono)
  for (let i = 1; i < coordinates.length; i++) {
    if (isPointInRing(point, coordinates[i])) return false;
  }
  return true;
}

/**
 * Busca automáticamente el código de la manzana censal a partir de coordenadas GPS [lat, lng].
 * 1. Primero busca inclusión exacta en el polígono.
 * 2. Si el encuestador está en la vereda o acera justo afuera, busca la manzana más cercana dentro de un radio de ~100 metros.
 */
export function findManzanaByCoords(lat, lng, customGeoJSON = null) {
  const geojson = customGeoJSON || defaultManzanasGeoJSON;
  if (!lat || !lng || !geojson || !geojson.features) return null;

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return null;

  const point = [lngNum, latNum]; // GeoJSON usa [lng, lat]

  // 1. Coincidencia exacta de contención
  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;

    if (geom.type === 'Polygon') {
      if (isPointInPolygon(point, geom.coordinates)) {
        return {
          manzana: feature.properties?.man || feature.properties?.name || '040550001010002',
          nombre: feature.properties?.name || '',
          parroquia: feature.properties?.par || 'SAN GABRIEL',
          exactMatch: true,
        };
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const polyCoords of geom.coordinates) {
        if (isPointInPolygon(point, polyCoords)) {
          return {
            manzana: feature.properties?.man || feature.properties?.name || '040550001010002',
            nombre: feature.properties?.name || '',
            parroquia: feature.properties?.par || 'SAN GABRIEL',
            exactMatch: true,
          };
        }
      }
    }
  }

  // 2. Si está en la acera o calle inmediata (tolerancia de aprox. 100m)
  let closestFeature = null;
  let minDistanceSq = 0.0012 * 0.0012; // ~130 metros en grados lat/lng

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;

    const rings = geom.type === 'Polygon'
      ? geom.coordinates
      : (geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : []);

    for (const ring of rings) {
      for (const pt of ring) {
        const dx = pt[0] - point[0];
        const dy = pt[1] - point[1];
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          closestFeature = feature;
        }
      }
    }
  }

  if (closestFeature) {
    return {
      manzana: closestFeature.properties?.man || closestFeature.properties?.name || '040550001010002',
      nombre: closestFeature.properties?.name || '',
      parroquia: closestFeature.properties?.par || 'SAN GABRIEL',
      exactMatch: false,
    };
  }

  return null;
}
