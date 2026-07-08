const buildRouteCoordinates = async (routeSeed) => {
  if (Array.isArray(routeSeed.pathCoordinates) && routeSeed.pathCoordinates.length > 1) {
    return routeSeed.pathCoordinates;
  }

  const startCoordinate = routeSeed.startCoordinate;
  const endCoordinate = routeSeed.endCoordinate;

  if (!Array.isArray(startCoordinate) || !Array.isArray(endCoordinate) || startCoordinate.length < 2 || endCoordinate.length < 2) {
    throw new Error(`Route ${routeSeed.routeId} is missing startCoordinate/endCoordinate`);
  }

  const [startLat, startLon] = startCoordinate;
  const [endLat, endLon] = endCoordinate;
  const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to resolve OSRM route for ${routeSeed.routeId}`);
  }

  const data = await response.json();
  const coordinates = data?.routes?.[0]?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error(`OSRM returned no geometry for ${routeSeed.routeId}`);
  }

  return coordinates.map(([lon, lat]) => [lat, lon]);
};

module.exports = {
  buildRouteCoordinates
};