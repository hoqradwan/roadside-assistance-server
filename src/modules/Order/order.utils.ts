export const generateUniqueId = (): string => {
    const randomId = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit random number
    return `#${randomId}`;
  };


  export const calculateDistance = (coord1: [number, number], coord2: [number, number]) => {
  const R = 6371; // Radius of the Earth in kilometers
  const φ1 = coord1[1] * Math.PI / 180; // Convert latitude to radians
  const φ2 = coord2[1] * Math.PI / 180; // Convert latitude to radians
  const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180; // Difference in latitude
  const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180; // Difference in longitude

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers

  return distance; // You can return in kilometers or miles based on your needs
};