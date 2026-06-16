// POST /api/auth/reset-password/direct
// Restablece la contraseña directamente con correo + nueva contraseña (uso interno)
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { registrarLog } from '@/lib/audit'

const SALT_ROUNDS = 12

export async function POST(request: NextRequest) {
  try {
    const { correo, nuevaPassword } = await request.json()

    // Validar campos requeridos
    if (!correo || typeof correo !== 'string') {
      return NextResponse.json({ error: 'Correo electrónico requerido' }, { status: 400 })
    }

    if (!nuevaPassword || typeof nuevaPassword !== 'string') {
      return NextResponse.json({ error: 'Nueva contraseña requerida' }, { status: 400 })
    }

    // Validar complejidad de contraseña
    if (nuevaPassword.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    if (!/[A-Z]/.test(nuevaPassword)) {
      return NextResponse.json({ error: 'La contraseña debe incluir al menos una letra mayúscula' }, { status: 400 })
    }
    if (!/[a-z]/.test(nuevaPassword)) {
      return NextResponse.json({ error: 'La contraseña debe incluir al menos una letra minúscula' }, { status: 400 })
    }
    if (!/\d/.test(nuevaPassword)) {
      return NextResponse.json({ error: 'La contraseña debe incluir al menos un número' }, { status: 400 })
    }
    if (!/[@$!%*?&._\-#]/.test(nuevaPassword)) {
      return NextResponse.json({ error: 'La contraseña debe incluir al menos un carácter especial (@$!%*?&._-#)' }, { status: 400 })
    }

    const correoLimpio = correo.trim().toLowerCase()

    // Buscar usuario por correo
    const usuario = await prisma.usuario.findUnique({
      where: { correo: correoLimpio },
      select: { id: true, activo: true, nombreCompleto: true },
    })

    // Respuesta genérica para no revelar si el correo existe o no
    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: 'No se encontró una cuenta activa con ese correo electrónico' },
        { status: 404 }
      )
    }

    // Hashear nueva contraseña y actualizar
    const passwordHash = await bcrypt.hash(nuevaPassword, SALT_ROUNDS)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash },
    })

    // Registrar en auditoría
    registrarLog({
      accion: 'RESET_PASSWORD_DIRECTO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      idUsuario: usuario.id,
      detalles: { correo: correoLimpio, metodo: 'directo_sin_token' },
    })

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente.',
    })
  } catch (error) {
    console.error('Error en reset-password/direct:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
