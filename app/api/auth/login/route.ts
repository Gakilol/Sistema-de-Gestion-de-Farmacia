// app/api/auth/login/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"             // 👈 bcryptjs
import { signToken } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const { correo, password } = await request.json()

    if (!correo || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña requeridos" },
        { status: 400 }
      )
    }

    // Buscar usuario por correo
    const usuario = await prisma.usuario.findUnique({
      where: { correo },
      include: { rol: true },
    })

    if (!usuario) {
      registrarLog({
        accion: "LOGIN_FALLIDO",
        entidad: "Usuario",
        detalles: { correo, motivo: "Usuario no registrado" },
      })
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    if (!usuario.activo) {
      registrarLog({
        accion: "LOGIN_FALLIDO",
        entidad: "Usuario",
        entidadId: usuario.id,
        detalles: { correo, motivo: "Usuario inactivo" },
      })
      return NextResponse.json(
        { error: "Usuario desactivado" },
        { status: 401 }
      )
    }

    // Verificar contraseña (campo passwordHash en tu schema)
    const passwordMatch = await bcrypt.compare(password, usuario.passwordHash)
    if (!passwordMatch) {
      registrarLog({
        accion: "LOGIN_FALLIDO",
        entidad: "Usuario",
        entidadId: usuario.id,
        detalles: { correo, motivo: "Contraseña incorrecta" },
      })
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    // Generar JWT con la info principal del usuario
    const token = await signToken({
      id: usuario.id,
      correo: usuario.correo,
      idRol: usuario.idRol,
      nombreCompleto: usuario.nombreCompleto,
    })

    // Respuesta JSON para el front
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: usuario.id,
          correo: usuario.correo,
          nombreCompleto: usuario.nombreCompleto,
          rol: usuario.rol.nombre,
        },
      },
      { status: 200 }
    )

    // Cookie HTTP-only con el token
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 días
    })

    // Registrar auditoría de inicio de sesión exitoso
    registrarLog({
      accion: "LOGIN_EXITOSO",
      entidad: "Usuario",
      entidadId: usuario.id,
      idUsuario: usuario.id,
      detalles: { correo: usuario.correo, rol: usuario.rol.nombre },
    })

    return response
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    )
  }
}
