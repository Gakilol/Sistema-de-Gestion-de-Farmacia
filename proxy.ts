import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const secretKey = process.env.JWT_SECRET || "build_time_fallback_key_dont_use_in_production"
const JWT_SECRET = new TextEncoder().encode(secretKey)

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname } = request.nextUrl

  const isApiRoute = pathname.startsWith("/api")
  const isAuthApi = pathname.startsWith("/api/auth")

  // Excluir APIs de autenticación y la página de acceso denegado
  if (isAuthApi || pathname === "/acceso-denegado") {
    return NextResponse.next()
  }

  // 1. Verificar si el usuario no tiene token
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.next()
  }

  let rolNombre = ""
  let userId = 0

  // 2. Validar el token JWT
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    rolNombre = (payload as any).rolNombre || ""
    userId = (payload as any).id || 0
  } catch (err) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete("token")
    return response
  }

  if (!rolNombre) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Token desactualizado. Por favor inicie sesión nuevamente." }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete("token")
    return response
  }

  // 3. Redirigir si ya está logueado e intenta entrar a /login
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // 4. Reglas de Autorización por Rol en APIs y Páginas Frontend

  const pathsBloqueadosParaDoctor = [
    "/ventas",
    "/compras",
    "/inventario",
    "/proveedores",
    "/reportes",
    "/usuarios",
    "/productos",
    "/clientes",
    "/admin"
  ]

  const pathsBloqueadosParaEmpleado = [
    "/clinica",
    "/pacientes"
  ]

  if (rolNombre === "DOCTOR") {
    // Para APIs
    if (isApiRoute) {
      const apiPrefixes = pathsBloqueadosParaDoctor.map(p => `/api${p}`)
      const esApiBloqueada = apiPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      )
      if (esApiBloqueada) {
        return NextResponse.json(
          { error: "Acceso denegado. El rol Doctor no tiene acceso a este recurso de farmacia." },
          { status: 403 }
        )
      }
      
      // Guard especial para servicios-podologia: Doctor puede GET, POST, PUT, pero NO DELETE
      if (pathname.startsWith("/api/servicios-podologia")) {
        if (request.method === "DELETE") {
          return NextResponse.json(
            { error: "Acceso denegado. Solo administradores pueden eliminar servicios." },
            { status: 403 }
          )
        }
      }
    } else {
      // Para Páginas Frontend
      const esPaginaBloqueada = pathsBloqueadosParaDoctor.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      )
      if (esPaginaBloqueada) {
        return NextResponse.redirect(new URL("/acceso-denegado", request.url))
      }
    }
  }

  if (rolNombre === "EMPLEADO") {
    // Para APIs
    if (isApiRoute) {
      const apiPrefixes = pathsBloqueadosParaEmpleado.map(p => `/api${p}`)
      apiPrefixes.push("/api/servicios-podologia")

      const esApiBloqueada = apiPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      )
      if (esApiBloqueada) {
        return NextResponse.json(
          { error: "Acceso denegado. El rol Empleado no tiene acceso a este recurso clínico." },
          { status: 403 }
        )
      }
    } else {
      // Para Páginas Frontend
      const pathsParaBloquear = [...pathsBloqueadosParaEmpleado, "/clinica/servicios"]
      const esPaginaBloqueada = pathsParaBloquear.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      )
      if (esPaginaBloqueada) {
        return NextResponse.redirect(new URL("/acceso-denegado", request.url))
      }
    }
  }

  // Rutas de administración general
  if (rolNombre !== "ADMIN") {
    if (isApiRoute) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json(
          { error: "Acceso denegado. Se requieren privilegios de Administrador." },
          { status: 403 }
        )
      }
    } else {
      if (pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/acceso-denegado", request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|assets|favicon.ico|sw.js).*)",
  ],
}
