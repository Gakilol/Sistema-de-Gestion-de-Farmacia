import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

export interface TokenPayload {
  id: number
  correo: string
  idRol: number
  nombreCompleto: string
  rolNombre: string
}

const secretKey = process.env.JWT_SECRET || "build_time_fallback_key_dont_use_in_production";
const JWT_SECRET = new TextEncoder().encode(secretKey);

export async function signToken(payload: TokenPayload): Promise<string> {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("FATAL: La variable de entorno JWT_SECRET no está definida en producción.");
  }
  return await new SignJWT(payload as any).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("FATAL: La variable de entorno JWT_SECRET no está definida en producción.");
  }
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return (verified.payload as unknown) as TokenPayload
  } catch {
    return null
  }
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get("token")?.value || null
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getTokenFromCookies()
  if (!token) return null

  return verifyToken(token)
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("token")
}
