import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Derive 32-byte key from ENCRYPTION_KEY or PIPELINE_WORKER_SECRET
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.PIPELINE_WORKER_SECRET || "fallback-dev-encryption-key-32b";

function getSecretKey(): Buffer {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypt a text string.
 * Output is in the format "ivHex:encryptedHex"
 */
export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypt an encrypted text string.
 * Automatically falls back to returning the text as-is if it's not encrypted (no colon separator).
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    // If there is no colon, it's either unencrypted (backward compatibility) or invalid.
    if (parts.length !== 2) {
      return encryptedText;
    }
    const [ivHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    // If decryption fails, fall back to returning the input string (backward compatibility)
    return encryptedText;
  }
}
