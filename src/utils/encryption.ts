import CryptoJS from 'crypto-js';

// For Vite, environment variables must be prefixed with VITE_
const SECRET_KEY = import.meta.env.VITE_SECRET_KEY || 'your-secret-key-change-this-in-production';

export const encrypt = (text: string): string => {
  const ciphertext = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  return ciphertext;
};

export const decrypt = (text: string): string => {
  const bytes = CryptoJS.AES.decrypt(text, SECRET_KEY);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  return originalText;
};

