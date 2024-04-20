import CryptoES from "../node_modules/crypto-es/lib/index";

/**
 * Desired maximum encoded length for the key.
 * Adjust this value according to your requirements.
 */
const desiredMaxEncodedLength = 50;

/**
 * Approximate bytes per character in base64 encoding.
 * Used for calculating the maximum key length in bytes.
 */
const approxBytesPerCharBase64 = 1.33;

/**
 * Calculate the maximum key length in bytes based on the desired maximum encoded length.
 */
const maxKeyLengthBytes = Math.floor(desiredMaxEncodedLength / approxBytesPerCharBase64);

/**
 * Generates a random key of the specified length.
 * @param {number} length - The length of the key to generate, in bytes.
 * @returns {string} A randomly generated key.
 */
const generateRandomKey = (length: number): string => {
    const randomBytes = CryptoES.lib.WordArray.random(length);
    return CryptoES.enc.Base64.stringify(randomBytes);
};

/**
 * The secret key used for encryption/decryption.
 * Initialized with a randomly generated key.
 */
export let secretKey = generateRandomKey(maxKeyLengthBytes);

/**
 * Clears the secret key by setting it to null.
 */
export function clearSecretKey(): void {
    secretKey = null;
}
