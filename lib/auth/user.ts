import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const USER_SESSION_COOKIE = "user_session";
const USER_SESSION_SECRET = process.env.USER_SESSION_SECRET;

function getSessionSecret(): string {
  if (!USER_SESSION_SECRET) {
    throw new Error("USER_SESSION_SECRET is not defined in .env");
  }

  return USER_SESSION_SECRET;
}

function signUserId(userId: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(userId)
    .digest("base64url");
}

function createSessionValue(userId: string): string {
  return `${userId}.${signUserId(userId)}`;
}

function verifySessionValue(value: string): string | null {
  const separator = value.lastIndexOf(".");

  if (separator <= 0) {
    return null;
  }

  const userId = value.slice(0, separator);
  const signature = value.slice(separator + 1);

  if (!userId || !signature) {
    return null;
  }

  const expectedSignature = signUserId(userId);

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  return userId;
}

export async function setUserSession(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(
    USER_SESSION_COOKIE,
    createSessionValue(userId),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    }
  );
}

export async function getUserSession(): Promise<string | null> {
  const cookieStore = await cookies();

  const session = cookieStore.get(USER_SESSION_COOKIE)?.value;

  if (!session) {
    return null;
  }

  return verifySessionValue(session);
}

export async function clearUserSession() {
  const cookieStore = await cookies();

  cookieStore.delete(USER_SESSION_COOKIE);
}
