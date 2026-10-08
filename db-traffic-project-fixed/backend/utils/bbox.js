// Bounding boxes are [minLat, minLng, maxLat, maxLng].

// True when the two boxes share any area (touching edges count).
const overlaps = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

module.exports = { overlaps };
