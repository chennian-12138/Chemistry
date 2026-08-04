import "./env";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// BYOK 密钥加密：AES-256-GCM。加密密钥由 BYOK_SECRET（缺省回退 BETTER_AUTH_SECRET）
// 经 SHA-256 派生，固定 32 字节。
const KEY = createHash("sha256")
  .update(process.env.BYOK_SECRET || process.env.BETTER_AUTH_SECRET || "")
  .digest();

// 落库格式：base64url(iv).base64url(tag).base64url(cipher)
// iv 每次写入随机生成 12 字节（GCM 推荐长度），同一把明文 key 每次存储密文都不同
export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64url")).join(".");
}

export function decryptApiKey(stored: string): string {
  const parts = stored.split(".");
  if (parts.length !== 3) throw new Error("BYOK 密文格式非法");
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const decipher = createDecipheriv(
    "aes-256-gcm",
    KEY,
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
