export const generateUniqueId = (): string => {
    const randomId = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit random number
    return `#${randomId}`;
  };