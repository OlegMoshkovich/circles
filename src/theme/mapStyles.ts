/** Google Maps JSON style — desaturated grayscale (Android Google provider fallback). */
export const GRAYSCALE_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#ebebeb" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a4a4a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#d4d4d4" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f0f0f0" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cccccc" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

/** Carto Positron — light grayscale tiles. Works on iOS (Apple Maps) and Android. */
export const GRAYSCALE_TILE_URL =
  "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
