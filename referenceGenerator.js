/**
 * Generates a unique appointment reference number.
 * Format: MD-YYYYMMDD-XXXX
 * where XXXX is a random uppercase alphanumeric string.
 */
const generateReferenceNumber = (dateString) => {
  const cleanDate = dateString.replace(/-/g, '');
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `MD-${cleanDate}-${randomPart}`;
};

module.exports = generateReferenceNumber;
