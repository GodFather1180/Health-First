// src/lib/server/auth.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "healthfirst_session";
const JWT_SECRET = process.env.JWT_SECRET!;

const isProd = process.env.NODE_ENV === "production";

export async function setSessionCookie(userId: string) {
  if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");

  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}

export async function getUserIdFromCookie(): Promise<string | null> {
  if (!JWT_SECRET) return null;

  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
