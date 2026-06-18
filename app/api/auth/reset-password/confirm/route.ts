// POST /api/auth/reset-password/confirm
// Establece la nueva contraseña después de validar el código de 6 dígitos.
// Doble verificación: valida el código OTRA VEZ antes de cambiar la contraseña.
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { registrarLog } from '@/lib/audit'

const SALT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5

export async function POST(request: NextRequest) {
  try {
    const { correo, codigo, nuevaPassword } = await request.json()

    // Validar campos requeridos
    if (!correo || typeof correo !== 'string') {
      return NextResponse.json({ error: 'Correo electrónico requerido' }, { status: 400 })
    }
    if (!codigo || typeof codigo !== 'string') {
      return NextResponse.json({ error: 'Código de verificación requerido' }, { status: 400 })
    }
    if (!nuevaPassword || typeof nuevaPassword !== 'string') {
      return NextResponse.json({ error: 'Nueva contraseña requerida' }, { status: 400 })
    }

    // Validar formato de código
    const codigoLimpio = codigo.trim()
    if (!/^\d{6}$/.test(codigoLimpio)) {
      return NextResponse.json({ error: 'Código de verificación inválido' }, { status: 400 })
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
    const tokenHash = crypto.createHash('sha256').update(codigoLimpio).digest('hex')
    const ahora = new Date()

    // Buscar el token más reciente no usado para este correo
    const registro = await prisma.passwordResetToken.findFirst({
      where: {
        correo: correoLimpio,
        usado: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!registro) {
      return NextResponse.json({ error: 'No hay solicitudes de recuperación pendientes.' }, { status: 400 })
    }

    // Verificar brute force
    if (registro.intentosFallidos >= MAX_FAILED_ATTEMPTS) {
      await prisma.passwordResetToken.update({
        where: { id: registro.id },
        data: { usado: true },
      })
      return NextResponse.json({
        error: 'Código bloqueado por demasiados intentos fallidos. Solicita uno nuevo.',
      }, { status: 400 })
    }

    // Verificar expiración
    if (registro.expiracion < ahora) {
      return NextResponse.json({
        error: 'El código ha expirado. Solicita un nuevo código.',
      }, { status: 400 })
    }

    // DOBLE VERIFICACIÓN: verificar hash del código
    if (registro.tokenHash !== tokenHash) {
      await prisma.passwordResetToken.update({
        where: { id: registro.id },
        data: { intentosFallidos: { increment: 1 } },
      })
      return NextResponse.json({ error: 'Código de verificación incorrecto.' }, { status: 400 })
    }

    // Buscar el usuario
    const usuario = await prisma.usuario.findUnique({
      where: { correo: correoLimpio },
      select: { id: true, activo: true },
    })

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: 'Usuario no encontrado o desactivado' }, { status: 404 })
    }

    // ── TRANSACCIÓN ATÓMICA: cambiar contraseña + invalidar TODOS los tokens ──
    const passwordHash = await bcrypt.hash(nuevaPassword, SALT_ROUNDS)

    await prisma.$transaction([
      // Actualizar contraseña del usuario
      prisma.usuario.update({
        where: { id: usuario.id },
        data: { passwordHash },
      }),
      // Marcar el token actual como usado
      prisma.passwordResetToken.update({
        where: { id: registro.id },
        data: { usado: true },
      }),
      // Invalidar TODOS los tokens pendientes del correo (seguridad extra)
      prisma.passwordResetToken.updateMany({
        where: { correo: correoLimpio, usado: false },
        data: { usado: true },
      }),
    ])

    // Registrar en auditoría
    registrarLog({
      accion: 'RESET_PASSWORD',
      entidad: 'Usuario',
      entidadId: usuario.id,
      idUsuario: usuario.id,
      detalles: { correo: correoLimpio, metodo: 'codigo_6_digitos_email' },
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
