// نظام المصادقة باستخدام signed cookies

import { cookies } from "next/headers";
import crypto from "crypto";

const SECRET_KEY = process.env.AUTH_SECRET || "tareeq-aljannah-secret-key-2024";
const COOKIE_NAME = "tareeq_session";

export interface SessionUser {
  userId: string;
  email: string;
  name?: string | null;
}

export function createToken(payload: SessionUser): string {
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
  return Buffer.from(`${data}.${signature}`).toString("base64");
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [data, signature] = decoded.split(".");
    if (!data || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
    if (signature !== expectedSignature) return null;

    return JSON.parse(data) as SessionUser;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionUser) {
  const cookieStore = await cookies();
  const token = createToken(payload);
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
