/**
 * Tiles del mapa: OpenStreetMap (gratis, sin clave). CARTO pasó a exigir una
 * API key y sin ella sirve "API KEY REQUIRED" en cada tile.
 *
 * OSM no tiene estilo oscuro: en modo oscuro se invierten los colores de los
 * tiles por CSS (clase `map-dark`, ver globals.css). La atribución es
 * obligatoria según la política de uso de OSM.
 */
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export const TILE_MAX_ZOOM = 19;
