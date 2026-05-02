import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

export interface TokenPayload {
  id: number
  correo: string
  idRol: number
  nombreCompleto: string
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "secret_key_default_min_32_chars_long")

export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as TokenPayload
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
