import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  encryptRequest,
  decryptResponse,
  HEADER_CLIENT_ENCRYPTION_IV,
  HEADER_CLIENT_ENCRYPTION_KEY,
  HEADER_CLIENT_ENCRYPTION_HMAC,
} from "../src/encryption.ts";

// These tests reproduce the bunq server side (core CryptographySymmetric +
// ViewPreProcessorEncryption / ViewPostProcessorEncryption) to prove the client
// crypto interoperates with it.

function generateKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

// Server side of ViewPreProcessorEncryption::process — decrypts the request.
function serverDecryptRequest(
  cipher: Buffer,
  headers: Record<string, string>,
  serverPrivateKeyPem: string
): string {
  const key = crypto.privateDecrypt(
    { key: serverPrivateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(headers[HEADER_CLIENT_ENCRYPTION_KEY], "base64")
  );
  const iv = Buffer.from(headers[HEADER_CLIENT_ENCRYPTION_IV], "base64");

  const expected = crypto.createHmac("sha1", key).update(Buffer.concat([iv, cipher])).digest();
  const actual = Buffer.from(headers[HEADER_CLIENT_ENCRYPTION_HMAC], "base64");
  assert.equal(Buffer.compare(actual, expected), 0, "server: HMAC must match");

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(cipher), decipher.final()]).toString("utf8");
}

// Server side of ViewPostProcessorEncryption::process — encrypts the response
// with a fresh AES key, RSA-encrypted using the client's public key.
function serverEncryptResponse(
  plaintext: string,
  clientPublicKeyPem: string
): { cipher: Buffer; headers: { key: string; iv: string; hmac: string } } {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipherAes = crypto.createCipheriv("aes-256-cbc", key, iv);
  const cipher = Buffer.concat([cipherAes.update(plaintext, "utf8"), cipherAes.final()]);
  const encryptedKey = crypto.publicEncrypt(
    { key: clientPublicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    key
  );
  const hmac = crypto.createHmac("sha1", key).update(Buffer.concat([iv, cipher])).digest();
  return {
    cipher,
    headers: { key: encryptedKey.toString("base64"), iv: iv.toString("base64"), hmac: hmac.toString("base64") },
  };
}

test("encryptRequest produces all three base64 headers", () => {
  const { publicKeyPem } = generateKeyPair();
  const { cipher, headers } = encryptRequest('{"type":"STATIC"}', publicKeyPem);

  assert.ok(headers[HEADER_CLIENT_ENCRYPTION_IV]);
  assert.ok(headers[HEADER_CLIENT_ENCRYPTION_KEY]);
  assert.ok(headers[HEADER_CLIENT_ENCRYPTION_HMAC]);
  // IV is a 16-byte value → 24 base64 chars.
  assert.equal(Buffer.from(headers[HEADER_CLIENT_ENCRYPTION_IV], "base64").length, 16);
  // Ciphertext is a whole number of 16-byte AES blocks.
  assert.equal(cipher.length % 16, 0);
});

test("server can decrypt a request encrypted by the client", () => {
  const { privateKeyPem, publicKeyPem } = generateKeyPair();
  const plaintext = '{"type":"GENERATED","note":"café ☕"}';

  const { cipher, headers } = encryptRequest(plaintext, publicKeyPem);
  const decrypted = serverDecryptRequest(cipher, headers, privateKeyPem);

  assert.equal(decrypted, plaintext);
});

test("empty request body encrypts and round-trips (e.g. primary-account-number)", () => {
  const { privateKeyPem, publicKeyPem } = generateKeyPair();

  const { cipher, headers } = encryptRequest("", publicKeyPem);
  const decrypted = serverDecryptRequest(cipher, headers, privateKeyPem);

  assert.equal(decrypted, "");
});

test("server sees an HMAC over IV || ciphertext (tamper is detected)", () => {
  const { privateKeyPem, publicKeyPem } = generateKeyPair();
  const { cipher, headers } = encryptRequest('{"a":1}', publicKeyPem);

  const tampered = Buffer.from(cipher);
  tampered[0] ^= 0xff;

  assert.throws(() => serverDecryptRequest(tampered, headers, privateKeyPem));
});

test("decryptResponse reverses a server-encrypted response", () => {
  const { privateKeyPem, publicKeyPem } = generateKeyPair();
  const plaintext = '{"Response":[{"CardGeneratedCvc2":{"cvc2":"123"}}]}';

  const { cipher, headers } = serverEncryptResponse(plaintext, publicKeyPem);
  const decrypted = decryptResponse(cipher, headers, privateKeyPem);

  assert.equal(decrypted, plaintext);
});

test("decryptResponse rejects a response with a bad HMAC", () => {
  const { privateKeyPem, publicKeyPem } = generateKeyPair();
  const { cipher, headers } = serverEncryptResponse('{"x":1}', publicKeyPem);

  const badHmac = Buffer.from(headers.hmac, "base64");
  badHmac[0] ^= 0xff;

  assert.throws(
    () => decryptResponse(cipher, { ...headers, hmac: badHmac.toString("base64") }, privateKeyPem),
    /HMAC/
  );
});
