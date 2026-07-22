import crypto from "crypto";

// bunq application-layer encryption (on top of TLS) for sensitive endpoints
// such as card PAN/CVC2. Mirrors core CryptographySymmetric +
// ViewPreProcessorEncryption / ViewPostProcessorEncryption:
//   - AES-256-CBC, PKCS#7 padding, 32-byte key, 16-byte IV.
//   - AES key RSA-encrypted (PKCS#1 v1.5) with the counterparty public key.
//   - HMAC-SHA1 over (IV || ciphertext), keyed with the raw AES key.
//   - Wire body is the raw ciphertext bytes; all header values are base64.

export const HEADER_CLIENT_ENCRYPTION_IV = "X-Bunq-Client-Encryption-Iv";
export const HEADER_CLIENT_ENCRYPTION_KEY = "X-Bunq-Client-Encryption-Key";
export const HEADER_CLIENT_ENCRYPTION_HMAC = "X-Bunq-Client-Encryption-Hmac";
export const HEADER_SERVER_ENCRYPTION_IV = "X-Bunq-Server-Encryption-Iv";
export const HEADER_SERVER_ENCRYPTION_KEY = "X-Bunq-Server-Encryption-Key";
export const HEADER_SERVER_ENCRYPTION_HMAC = "X-Bunq-Server-Encryption-Hmac";

const AES_KEY_LENGTH_BYTE = 32;
const AES_IV_LENGTH_BYTE = 16;
const ERROR_RESPONSE_HMAC = "Response HMAC verification failed";

/**
 * Encrypts a request body for an encrypted endpoint. Returns the raw ciphertext
 * (the wire body) plus the three X-Bunq-Client-Encryption-* headers.
 */
export function encryptRequest(
  plaintext: string,
  serverPublicKeyPem: string
): { cipher: Buffer; headers: Record<string, string> } {
  const key = crypto.randomBytes(AES_KEY_LENGTH_BYTE);
  const iv = crypto.randomBytes(AES_IV_LENGTH_BYTE);

  const cipherAes = crypto.createCipheriv("aes-256-cbc", key, iv);
  const cipher = Buffer.concat([cipherAes.update(plaintext, "utf8"), cipherAes.final()]);

  const encryptedKey = crypto.publicEncrypt(
    { key: serverPublicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    key
  );

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(Buffer.concat([iv, cipher]));

  return {
    cipher,
    headers: {
      [HEADER_CLIENT_ENCRYPTION_IV]: iv.toString("base64"),
      [HEADER_CLIENT_ENCRYPTION_KEY]: encryptedKey.toString("base64"),
      [HEADER_CLIENT_ENCRYPTION_HMAC]: hmac.digest("base64"),
    },
  };
}

/**
 * Decrypts an encrypted response body sent with X-Bunq-Server-Encryption-*
 * headers. The AES key is RSA-encrypted with our own public key, so we decrypt
 * it with our private key.
 */
export function decryptResponse(
  cipher: Buffer,
  serverHeaders: { key: string; iv: string; hmac: string },
  clientPrivateKeyPem: string
): string {
  const key = crypto.privateDecrypt(
    { key: clientPrivateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(serverHeaders.key, "base64")
  );
  const iv = Buffer.from(serverHeaders.iv, "base64");

  const expectedHmac = crypto.createHmac("sha1", key);
  expectedHmac.update(Buffer.concat([iv, cipher]));
  const actual = Buffer.from(serverHeaders.hmac, "base64");
  const expected = expectedHmac.digest();
  if (actual.length !== expected.length || crypto.timingSafeEqual(actual, expected) === false) {
    throw new Error(ERROR_RESPONSE_HMAC);
  }

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(cipher), decipher.final()]).toString("utf8");
}
