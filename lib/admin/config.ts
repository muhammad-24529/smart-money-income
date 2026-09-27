const passwordHashBase64 = process.env.ADMIN_PASSWORD_HASH_B64 || "";
const adminPasswordHash = passwordHashBase64 ? Buffer.from(passwordHashBase64, "base64").toString("utf8") : process.env.ADMIN_PASSWORD_HASH || "";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

export const ADMIN_PASSWORD_HASH = adminPasswordHash;

export const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";
