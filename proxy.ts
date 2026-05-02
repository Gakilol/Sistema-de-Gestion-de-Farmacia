import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

const publicRoutes = ["/login"]
const adminRoutes = ["/usuarios"]

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname } = request.nextUrl

  // ⛔️ IMPORTANTE: no intervenir en rutas de API
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Rutas públicas (solo páginas)
  if (publicRoutes.includes(pathname)) {
    if (token && (await verifyToken(token))) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // Si no hay token, redirigir a login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Proteger rutas de ADMIN (aquí solo decides, la verificación fina puede ir en la página)
  if (adminRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
