// POST /api/auth/reset-password/confirm
// Establece la nueva contraseña después de validar el token
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { registrarLog } from '@/lib/audit'

const SALT_ROUNDS = 12

export async function POST(request: NextRequest) {
  try {
    const { token, nuevaPassword } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    if (!nuevaPassword || typeof nuevaPassword !== 'string') {
      return NextResponse.json({ error: 'Nueva contraseña requerida' }, { status: 400 })
    }

    // Validar longitud y complejidad mínima
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

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex')
    const ahora = new Date()

    // Buscar y validar el token en base de datos
    const registro = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!registro) {
      return NextResponse.json({ error: 'Token inválido o no existe' }, { status: 400 })
    }

    if (registro.usado) {
      return NextResponse.json({ error: 'Este enlace ya fue utilizado. Solicita uno nuevo.' }, { status: 400 })
    }

    if (registro.expiracion < ahora) {
      return NextResponse.json({
        error: 'El enlace ha expirado. Solicita un nuevo enlace de recuperación.',
      }, { status: 400 })
    }

    // Buscar el usuario
    const usuario = await prisma.usuario.findUnique({
      where: { correo: registro.correo },
      select: { id: true, activo: true },
    })

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: 'Usuario no encontrado o desactivado' }, { status: 404 })
    }

    // Hashear nueva contraseña y actualizar usuario + marcar token como usado
    const passwordHash = await bcrypt.hash(nuevaPassword, SALT_ROUNDS)

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: usuario.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usado: true },
      }),
    ])

    // Registrar en auditoría
    registrarLog({
      accion: 'RESET_PASSWORD',
      entidad: 'Usuario',
      entidadId: usuario.id,
      idUsuario: usuario.id,
      detalles: { correo: registro.correo, metodo: 'token_email' },
    })

    return NextResponse.json({
      success: true,
      message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.',
    })
  } catch (error) {
    console.error('Error en reset-password/confirm:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
