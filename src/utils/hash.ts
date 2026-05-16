import SHA256 from 'crypto-js/sha256';

export const generateHash = (data: string): string => {
  return SHA256(data).toString();
};

export const generateJobHash = (description: string, location: string, category: string): string => {
  return generateHash(description + location + category);
};
